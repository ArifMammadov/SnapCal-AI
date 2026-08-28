import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import crypto from 'node:crypto'
import { prisma } from '@snapcal/database'
import { env } from '../lib/env.js'
import { getRegionLanguage, TRIAL_DAYS } from '@snapcal/shared'
import { AuditEvent, auditLog } from '../lib/audit.js'

const telegramAuthSchema = z.object({
  initData: z.string().min(1),
})

const startTokenSchema = z.object({
  token: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const linkTelegramSchema = z.object({
  initData: z.string().min(1),
})

const guestSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  languageCode: z.string().max(10).optional(),
  telegramId: z.union([z.string(), z.number()]).optional(),
  telegramUsername: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
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
  // Guest auth creates a real user without requiring Telegram initData.
  // Used as a fallback when Telegram WebApp cannot provide initData.
  app.post('/guest', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = guestSchema.parse(request.body)
    const languageCode = getRegionLanguage(body.languageCode)
    const telegramId = body.telegramId ? BigInt(body.telegramId) : null

    const existingByTelegram = telegramId
      ? await prisma.user.findUnique({ where: { telegramId }, include: { profile: true } })
      : null

    const user = existingByTelegram
      ? existingByTelegram
      : await prisma.user.create({
          data: {
            telegramId,
            telegramUsername: body.telegramUsername ?? null,
            firstName: body.firstName ?? 'Guest',
            lastName: body.lastName ?? null,
            avatarUrl: body.avatarUrl ?? null,
            languageCode,
            trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
            profile: { create: {} },
          },
          include: { profile: true },
        })

    const accessToken = app.jwt.sign(
      { userId: user.id, telegramId: user.telegramId ? user.telegramId.toString() : undefined, role: user.role },
      { expiresIn: '1h' }
    )
    const refreshToken = app.jwt.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    )

    await auditLog({
      userId: user.id,
      event: AuditEvent.LOGIN,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { via: 'guest' },
      severity: 'info',
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        telegramId: null,
        telegramUsername: user.telegramUsername,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        languageCode: user.languageCode,
        role: user.role,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
        profile: user.profile,
      },
    }
  })

  // Demo auth is disabled in production. It remains available in development/test and for non-Telegram browser fallback.
  app.post('/demo', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (env.NODE_ENV === 'production') {
      await auditLog({
        userId: 'anonymous',
        event: AuditEvent.LOGIN_FAILED,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { reason: 'demo_disabled_in_production' },
        severity: 'warning',
      })
      return reply.status(403).send({ error: { code: 'DEMO_DISABLED', message: 'Demo access is disabled in production.' } })
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
          trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
          profile: { create: {} },
        },
        include: { profile: true },
      })
    }

    const accessToken = app.jwt.sign(
      { userId: user.id, telegramId: user.telegramId ? user.telegramId.toString() : undefined, role: user.role },
      { expiresIn: '1h' }
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
        telegramId: user.telegramId?.toString() ?? null,
        telegramUsername: user.telegramUsername,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
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
      await auditLog({
        userId: 'anonymous',
        event: AuditEvent.LOGIN_FAILED,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { reason: 'invalid_init_data' },
        severity: 'warning',
      })
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
          trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
          profile: {
            create: {},
          },
        },
        include: { profile: true },
      })
    } else {
      // Keep Telegram profile data in sync on every login
      const updateData: any = {}
      if (user.telegramUsername !== tgUser.username) updateData.telegramUsername = tgUser.username
      if (user.firstName !== tgUser.first_name) updateData.firstName = tgUser.first_name
      if (user.lastName !== tgUser.last_name) updateData.lastName = tgUser.last_name
      if (user.avatarUrl !== tgUser.photo_url) updateData.avatarUrl = tgUser.photo_url
      if (user.languageCode !== languageCode) updateData.languageCode = languageCode

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          include: { profile: true },
        })
      }
    }

    const accessToken = app.jwt.sign(
      { userId: user.id, telegramId: user.telegramId ? user.telegramId.toString() : undefined, role: user.role },
      { expiresIn: '1h' }
    )
    const refreshToken = app.jwt.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    )

    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    })

    await auditLog({
      userId: user.id,
      event: AuditEvent.LOGIN,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { telegramId: user.telegramId?.toString() ?? null },
      severity: 'info',
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        telegramId: user.telegramId?.toString() ?? null,
        telegramUsername: user.telegramUsername,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        languageCode: user.languageCode,
        role: user.role,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
        profile: user.profile,
      },
    }
  })

  app.post('/start-token', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = startTokenSchema.parse(request.body)

    const startToken = await prisma.telegramStartToken.findUnique({
      where: { token },
    })

    if (!startToken || startToken.usedAt || startToken.expiresAt < new Date()) {
      await auditLog({
        userId: 'anonymous',
        event: AuditEvent.LOGIN_FAILED,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { reason: 'invalid_or_expired_start_token' },
        severity: 'warning',
      })
      return reply.status(401).send({ error: { code: 'INVALID_START_TOKEN', message: 'Invalid or expired start token' } })
    }

    let user = await prisma.user.findUnique({
      where: { telegramId: startToken.telegramId },
      include: { profile: true },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: startToken.telegramId,
          telegramUsername: null,
          firstName: null,
          lastName: null,
          avatarUrl: null,
          languageCode: 'ru',
          trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
          profile: { create: {} },
        },
        include: { profile: true },
      })
    }

    await prisma.telegramStartToken.update({
      where: { id: startToken.id },
      data: { usedAt: new Date() },
    })

    const accessToken = app.jwt.sign(
      { userId: user.id, telegramId: user.telegramId ? user.telegramId.toString() : undefined, role: user.role },
      { expiresIn: '1h' }
    )
    const refreshToken = app.jwt.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    )

    await auditLog({
      userId: user.id,
      event: AuditEvent.LOGIN,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { telegramId: user.telegramId?.toString() ?? null, via: 'start_token' },
      severity: 'info',
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        telegramId: user.telegramId?.toString() ?? null,
        telegramUsername: user.telegramUsername,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        languageCode: user.languageCode,
        role: user.role,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
        profile: user.profile,
      },
    }
  })

  app.post('/link-telegram', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const payload = await request.server.jwt.verify<{ userId: string }>(request.headers.authorization?.replace('Bearer ', '') ?? '')
        request.user = payload
      } catch {
        reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } })
      }
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { initData } = linkTelegramSchema.parse(request.body)
    const data = verifyTelegramInitData(initData)

    if (!data) {
      return reply.status(401).send({ error: { code: 'INVALID_INIT_DATA', message: 'Telegram init data invalid' } })
    }

    const tgUser = parseUser(data.user)
    if (!tgUser?.id) {
      return reply.status(401).send({ error: { code: 'NO_USER', message: 'No user in init data' } })
    }

    const existing = await prisma.user.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
    })

    if (existing && existing.id !== request.user!.userId) {
      return reply.status(409).send({ error: { code: 'TELEGRAM_ALREADY_LINKED', message: 'This Telegram account is already linked to another profile' } })
    }

    const languageCode = getRegionLanguage(tgUser.language_code, tgUser.region)

    const updated = await prisma.user.update({
      where: { id: request.user!.userId },
      data: {
        telegramId: BigInt(tgUser.id),
        telegramUsername: tgUser.username,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        avatarUrl: tgUser.photo_url,
        languageCode,
      },
      include: { profile: true },
    })

    await auditLog({
      userId: updated.id,
      event: AuditEvent.LOGIN,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { telegramId: updated.telegramId?.toString(), via: 'link_telegram' },
      severity: 'info',
    })

    return {
      user: {
        id: updated.id,
        telegramId: updated.telegramId?.toString() ?? null,
        telegramUsername: updated.telegramUsername,
        firstName: updated.firstName,
        lastName: updated.lastName,
        avatarUrl: updated.avatarUrl,
        languageCode: updated.languageCode,
        role: updated.role,
        subscriptionStatus: updated.subscriptionStatus,
        trialEndsAt: updated.trialEndsAt,
        profile: updated.profile,
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
        { userId: user.id, telegramId: user.telegramId ? user.telegramId.toString() : undefined, role: user.role },
        { expiresIn: '1h' }
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
