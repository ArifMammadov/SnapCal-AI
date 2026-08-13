import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import crypto from 'node:crypto'
import { prisma } from '@snapcal/database'
import { env } from '../lib/env.js'
import { getRegionLanguage } from '@snapcal/shared'

const telegramAuthSchema = z.object({
  initData: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

function verifyTelegramInitData(initData: string): Record<string, string> | null {
  const urlParams = new URLSearchParams(initData)
  const hash = urlParams.get('hash')
  if (!hash) return null
  urlParams.delete('hash')

  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(env.TELEGRAM_BOT_TOKEN).digest()
  const checkHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  if (checkHash !== hash) return null

  return Object.fromEntries(urlParams.entries())
}

function parseUser(userJson: string) {
  try {
    return JSON.parse(userJson)
  } catch {
    return null
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/demo', async (request: FastifyRequest, reply: FastifyReply) => {
    if (env.NODE_ENV === 'production') {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Demo login only in non-production' } })
    }

    const demoTelegramId = 999999999
    let user = await prisma.user.findUnique({
      where: { telegramId: BigInt(demoTelegramId) },
      include: { profile: true },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: BigInt(demoTelegramId),
          telegramUsername: 'demo_user',
          firstName: 'Demo',
          lastName: 'User',
          avatarUrl: null,
          languageCode: 'ru',
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          profile: { create: {} },
        },
        include: { profile: true },
      })
    }

    const accessToken = app.jwt.sign(
      { userId: user.id, telegramId: user.telegramId.toString(), role: user.role },
      { expiresIn: '15m' }
    )
    const refreshToken = app.jwt.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    )

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        firstName: user.firstName,
        languageCode: user.languageCode,
        role: user.role,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
        profile: user.profile,
      },
    }
  })

  app.post('/telegram', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { initData } = telegramAuthSchema.parse(request.body)
    const data = verifyTelegramInitData(initData)

    if (!data) {
      return reply.status(401).send({ error: { code: 'INVALID_INIT_DATA', message: 'Telegram init data invalid' } })
    }

    const authDate = Number(data.auth_date)
    const now = Math.floor(Date.now() / 1000)
    if (now - authDate > 86400) {
      return reply.status(401).send({ error: { code: 'INIT_DATA_EXPIRED', message: 'Init data expired' } })
    }

    const tgUser = parseUser(data.user)
    if (!tgUser?.id) {
      return reply.status(401).send({ error: { code: 'NO_USER', message: 'No user in init data' } })
    }

    const languageCode = getRegionLanguage(tgUser.language_code, tgUser.region)

    let user = await prisma.user.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
      include: { profile: true },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: BigInt(tgUser.id),
          telegramUsername: tgUser.username,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name,
          avatarUrl: tgUser.photo_url,
          languageCode,
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          profile: {
            create: {},
          },
        },
        include: { profile: true },
      })
    } else if (user.languageCode !== languageCode) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { languageCode },
        include: { profile: true },
      })
    }

    const accessToken = app.jwt.sign(
      { userId: user.id, telegramId: user.telegramId.toString(), role: user.role },
      { expiresIn: '15m' }
    )
    const refreshToken = app.jwt.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    )

    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        firstName: user.firstName,
        languageCode: user.languageCode,
        role: user.role,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
        profile: user.profile,
      },
    }
  })

  app.post('/refresh', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = refreshSchema.parse(request.body)

    try {
      const payload = app.jwt.verify<{ userId: string; type: string }>(refreshToken)
      if (payload.type !== 'refresh') throw new Error('Invalid token type')

      const user = await prisma.user.findUnique({ where: { id: payload.userId } })
      if (!user) throw new Error('User not found')

      const newAccessToken = app.jwt.sign(
        { userId: user.id, telegramId: user.telegramId.toString(), role: user.role },
        { expiresIn: '15m' }
      )
      const newRefreshToken = app.jwt.sign(
        { userId: user.id, type: 'refresh' },
        { expiresIn: '7d' }
      )

      return { accessToken: newAccessToken, refreshToken: newRefreshToken }
    } catch {
      return reply.status(401).send({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' } })
    }
  })
}
