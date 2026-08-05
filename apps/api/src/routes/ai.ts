import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod'
import axios from 'axios'
import { prisma } from '@snapcal/database'
import { requireAuth } from './users.js'
import { env } from '../lib/env.js'
import { DEFAULT_FREE_AI_DAILY_LIMIT } from '@snapcal/shared'

const chatSchema = z.object({
  message: z.string().max(4000),
  attachments: z.array(z.object({ type: z.enum(['image', 'audio']), url: z.string().url() })).optional(),
})

const analyzePhotoSchema = z.object({
  imageUrl: z.string().url(),
})

const feedbackSchema = z.object({
  messageId: z.string().uuid(),
  rating: z.enum(['UP', 'DOWN']),
  correction: z.string().max(1000).optional(),
})

interface AiAgentResponse {
  message: string
  type: 'text' | 'food-analysis' | 'macro-card'
  foodData?: {
    name: string
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
    serving: string
    suggestedMealType: string
  }
  usedFallback: boolean
}

async function checkAiLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { allowed: false, reason: 'USER_NOT_FOUND' }

  const now = new Date()
  if (user.trialEndsAt && user.trialEndsAt > now) return { allowed: true }
  if (['active', 'trialing'].includes(user.subscriptionStatus)) return { allowed: true }

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
  const count = await prisma.chatMessage.count({
    where: { userId, role: 'USER', createdAt: { gte: start, lt: end } },
  })

  if (count >= DEFAULT_FREE_AI_DAILY_LIMIT) {
    return { allowed: false, reason: 'DAILY_LIMIT_REACHED' }
  }
  return { allowed: true }
}

const aiRoutesPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAuth)

  app.post('/chat', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request: FastifyRequest, reply) => {
    const userId = request.user!.userId
    const limit = await checkAiLimit(userId)
    if (!limit.allowed) {
      return reply.status(429).send({ error: { code: limit.reason, message: 'AI daily limit reached. Upgrade to Pro.' } })
    }

    const { message } = chatSchema.parse(request.body)

    const userMessage = await prisma.chatMessage.create({
      data: { userId, role: 'USER', type: 'TEXT', content: message },
    })

    try {
      const { data: aiResponse } = await axios.post<AiAgentResponse>(
        `${env.AI_AGENT_URL}/agent/chat`,
        { userId, message, messageId: userMessage.id },
        { timeout: 30000 }
      )

      const aiMessage = await prisma.chatMessage.create({
        data: {
          userId,
          role: 'AI',
          type: aiResponse.type,
          content: aiResponse.message,
          attachments: aiResponse.foodData ? { foodData: aiResponse.foodData } : undefined,
        },
      })

      return {
        message: {
          id: aiMessage.id,
          role: 'ai',
          type: aiResponse.type,
          content: aiResponse.message,
          foodData: aiResponse.foodData,
          timestamp: aiMessage.createdAt.toISOString(),
        },
      }
    } catch (err) {
      await prisma.chatMessage.update({
        where: { id: userMessage.id },
        data: { content: `${message} [FAILED]` },
      })
      throw err
    }
  })

  app.post('/analyze-photo', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request: FastifyRequest, reply) => {
    const userId = request.user!.userId
    const limit = await checkAiLimit(userId)
    if (!limit.allowed) {
      return reply.status(429).send({ error: { code: limit.reason, message: 'AI daily limit reached. Upgrade to Pro.' } })
    }

    const { imageUrl } = analyzePhotoSchema.parse(request.body)

    const userMessage = await prisma.chatMessage.create({
      data: { userId, role: 'USER', type: 'TEXT', content: '[food photo]', attachments: { imageUrl } },
    })

    const { data } = await axios.post(`${env.AI_AGENT_URL}/agent/analyze-photo`, { userId, imageUrl }, { timeout: 30000 })

    await prisma.chatMessage.create({
      data: {
        userId,
        role: 'AI',
        type: 'FOOD_ANALYSIS',
        content: data.message,
        attachments: { foodData: data.foodData },
      },
    })

    return data
  })

  app.post('/feedback', async (request: FastifyRequest) => {
    const userId = request.user!.userId
    const { messageId, rating, correction } = feedbackSchema.parse(request.body)

    const message = await prisma.chatMessage.findFirst({
      where: { id: messageId, userId, role: 'AI' },
    })
    if (!message) {
      return request.server.httpHandler
    }

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { feedbackRating: rating, feedbackCorrection: correction },
    })

    if (correction) {
      await prisma.trainingExample.create({
        data: {
          skillId: 'nutrition',
          inputText: message.content,
          expectedOutput: correction,
          source: 'feedback',
        },
      })
    }

    return { success: true }
  })
}

export const aiRoutes = fp(aiRoutesPlugin)
