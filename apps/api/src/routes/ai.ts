import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import axios from 'axios'
import { prisma } from '@snapcal/database'
import { requireAuth } from './users.js'
import { env } from '../lib/env.js'
import { DEFAULT_FREE_AI_DAILY_LIMIT } from '@snapcal/shared'
import { parseFoodJson, saveFoodLogFromAnalysis } from '../lib/foodAnalysis.js'
import { checkAiLimit } from '../lib/subscriptionLimits.js'

const agent = axios.create({
  baseURL: env.AI_AGENT_URL,
  timeout: 30000,
  headers: env.AI_AGENT_SECRET ? { 'x-snapcal-secret': env.AI_AGENT_SECRET } : undefined,
})

const analyzePhotoSchema = z.object({
  imageUrl: z.string().url(),
})

const feedbackSchema = z.object({
  messageId: z.string().uuid(),
  rating: z.enum(['UP', 'DOWN']),
  correction: z.string().max(1000).optional(),
})

const chatSchema = z.object({
  message: z.string().max(4000),
  attachments: z.array(z.object({ type: z.enum(['image', 'audio']), url: z.string().url() })).optional(),
})

interface AiAgentResponse {
  message: {
    id: string
    role: 'ai'
    content: string
    type?: string
    modelUsed?: string
    foodData?: {
      name: string
      calories: number
      proteinG: number
      carbsG: number
      fatG: number
      serving: string
      suggestedMealType: string
    }
    usedFallback?: boolean
  }
}

async function checkAiLimitOld(userId: string): Promise<{ allowed: boolean; reason?: string }> {
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

  app.get('/history', async (request: FastifyRequest) => {
    const userId = request.user!.userId
    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return {
      messages: messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        type: m.type,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        attachments: m.attachments as any,
      })),
    }
  })

  app.get('/limits', async (request: FastifyRequest) => {
    return checkAiLimit(request.user!.userId)
  })

  app.post('/chat', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request: FastifyRequest, reply) => {
    const userId = request.user!.userId
    const limit = await checkAiLimit(userId)
    if (!limit.allowed) {
      return reply.status(429).send({ error: { code: limit.reason, message: limit.paywallMessage || 'AI daily limit reached. Upgrade to Pro.' } })
    }

    const { message, attachments } = chatSchema.parse(request.body)

    const userMessage = await prisma.chatMessage.create({
      data: { userId, role: 'USER', type: 'TEXT', content: message, attachments: attachments ? { attachments } : undefined },
    })

    try {
      const { data: aiResponse } = await agent.post<AiAgentResponse>(
        '/chat',
        { userId, message, messageId: userMessage.id },
      )

      if (!aiResponse.message || !aiResponse.message.content) {
        throw new Error('AI agent returned empty message')
      }

      // Enrich audit with usage/cost from AI agent if available
      const aiMessage = await prisma.chatMessage.create({
        data: {
          userId,
          role: 'AI',
          type: (aiResponse.message.type?.toUpperCase() as any) ?? 'TEXT',
          content: aiResponse.message.content,
          modelUsed: aiResponse.message.modelUsed,
          attachments: aiResponse.message.foodData ? { foodData: aiResponse.message.foodData } : undefined,
        },
      })

      return {
        message: {
          id: aiMessage.id,
          role: 'ai',
          type: (aiResponse.message.type?.toUpperCase() as any) ?? 'TEXT',
          content: aiResponse.message.content,
          foodData: aiResponse.message.foodData,
          timestamp: aiMessage.createdAt.toISOString(),
        },
      }
    } catch (err: any) {
      let fallbackMessage = 'Sorry, I could not process your request right now. Please try again in a moment.'
      let usedFallback = false

      if (axios.isAxiosError(err) && !err.response) {
        usedFallback = true
        fallbackMessage = 'AI Coach is temporarily unavailable. Please try again later.'
      }

      await prisma.chatMessage.update({
        where: { id: userMessage.id },
        data: { content: `${message} [FAILED]` },
      })

      const aiMessage = await prisma.chatMessage.create({
        data: {
          userId,
          role: 'AI',
          type: 'TEXT',
          content: fallbackMessage,
        },
      })

      return {
        message: {
          id: aiMessage.id,
          role: 'ai',
          type: 'TEXT',
          content: fallbackMessage,
          foodData: undefined,
          timestamp: aiMessage.createdAt.toISOString(),
          usedFallback,
        },
      }
    }
  })

  app.post('/analyze-photo', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request: FastifyRequest, reply) => {
    const userId = request.user!.userId
    const limit = await checkAiLimit(userId)
    if (!limit.allowed) {
      return reply.status(429).send({ error: { code: limit.reason, message: limit.paywallMessage || 'AI daily limit reached. Upgrade to Pro.' } })
    }

    const { imageUrl } = analyzePhotoSchema.parse(request.body)

    const userMessage = await prisma.chatMessage.create({
      data: { userId, role: 'USER', type: 'TEXT', content: '[food photo]', attachments: { imageUrl } },
    })

    try {
      const { data } = await agent.post('/analyze-photo', { userId, imageUrl }, { timeout: 60000 })

      const foodData = typeof data.message.content === 'string' ? parseFoodJson(data.message.content) : null
      if (foodData) {
        await saveFoodLogFromAnalysis(userId, imageUrl, foodData)
      }

      const aiMessage = await prisma.chatMessage.create({
        data: {
          userId,
          role: 'AI',
          type: 'FOOD_ANALYSIS',
          content: data.message.content,
          modelUsed: data.message.modelUsed,
          attachments: { foodData, imageUrl },
        },
      })

      return {
        message: {
          id: aiMessage.id,
          role: 'ai',
          type: 'FOOD_ANALYSIS',
          content: data.message.content,
          foodData,
          imageUrl,
          timestamp: aiMessage.createdAt.toISOString(),
        },
      }
    } catch (err: any) {
      const errorMessage = axios.isAxiosError(err) && !err.response
        ? 'AI vision service is temporarily unavailable. Please try again later.'
        : 'Could not analyze this photo. Please try again.'

      await prisma.chatMessage.update({
        where: { id: userMessage.id },
        data: { content: '[food photo] [FAILED]' },
      })

      const aiMessage = await prisma.chatMessage.create({
        data: {
          userId,
          role: 'AI',
          type: 'TEXT',
          content: errorMessage,
        },
      })

      return reply.status(503).send({
        message: {
          id: aiMessage.id,
          role: 'ai',
          type: 'TEXT',
          content: errorMessage,
          timestamp: aiMessage.createdAt.toISOString(),
        },
      })
    }
  })

  app.post('/feedback', async (request: FastifyRequest) => {
    const userId = request.user!.userId
    const { messageId, rating, correction } = feedbackSchema.parse(request.body)

    const message = await prisma.chatMessage.findFirst({
      where: { id: messageId, userId, role: 'AI' },
    })
    if (!message) {
      throw new Error('Message not found')
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

export const aiRoutes = aiRoutesPlugin
