import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import axios from 'axios'
import { prisma } from '@snapcal/database'
import { requireAuth } from './users.js'
import { env } from '../lib/env.js'
import { normalizeLanguage, t } from '../lib/i18n.js'
import { enqueuePhotoAnalysis, finalizePhotoAnalysis, getVisionJobContext, pollPhotoAnalysisStatus } from '../lib/aiAgentClient.js'
import { checkPhotoScanLimit, checkTextMessageLimit, logAiUsage } from '../lib/subscriptionLimits.js'

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
    structured?: {
      emoji: string
      mealLabel: string
      foodName: string
      calories: number
      proteinG: number
      carbsG: number
      fatG: number
      serving: string
      evaluation: string
      recommendations: { emoji: string; text: string }[]
      dailyProgress: { consumed: number; target: number; unit: string }
    }
    usedFallback?: boolean
  }
}

const aiRoutesPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAuth)

  app.get('/history', async (request: FastifyRequest) => {
    const userId = request.user!.userId
    const messages = await prisma.chatMessage.findMany({
      where: { userId, role: { not: 'SYSTEM' } },
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

  app.post('/clear-history', async (request: FastifyRequest) => {
    const userId = request.user!.userId
    await prisma.chatMessage.deleteMany({ where: { userId } })
    return { success: true, deletedCount: await prisma.chatMessage.count({ where: { userId } }) }
  })

  app.post('/chat', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request: FastifyRequest, reply) => {
    const userId = request.user!.userId
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { languageCode: true } })
    if (!user) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: t('user_not_found', normalizeLanguage(null)) } })
    }
    const lang = normalizeLanguage(user.languageCode)
    const textLimit = await checkTextMessageLimit(userId)
    if (!textLimit.allowed) {
      return reply.status(429).send({ error: { code: textLimit.paywallCode || 'DAILY_TEXT_LIMIT_REACHED', message: t('daily_text_limit', lang) } })
    }

    const { message, attachments } = chatSchema.parse(request.body)

    const userMessage = await prisma.chatMessage.create({
      data: { userId, role: 'USER', type: 'TEXT', content: message, attachments: attachments ? { attachments } : undefined },
    })

    await logAiUsage(userId, 'TEXT_MESSAGE').catch(() => {})

    try {
      const { data: aiResponse } = await agent.post<AiAgentResponse>(
        '/chat',
        { userId, message, messageId: userMessage.id, language: lang },
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
          attachments: aiResponse.message.foodData || aiResponse.message.structured
            ? { foodData: aiResponse.message.foodData, structured: aiResponse.message.structured }
            : undefined,
        },
      })

      return {
        message: {
          id: aiMessage.id,
          role: 'ai',
          type: (aiResponse.message.type?.toUpperCase() as any) ?? 'TEXT',
          content: aiResponse.message.content,
          foodData: aiResponse.message.foodData,
          structured: aiResponse.message.structured,
          timestamp: aiMessage.createdAt.toISOString(),
        },
      }
    } catch (err: any) {
      let fallbackMessage = t('fallback_error', lang)
      let usedFallback = false

      if (axios.isAxiosError(err) && !err.response) {
        usedFallback = true
        fallbackMessage = t('ai_unavailable', lang)
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
    const userLang = await prisma.user.findUnique({ where: { id: userId }, select: { languageCode: true } })
    const lang = normalizeLanguage(userLang?.languageCode)
    const limit = await checkPhotoScanLimit(userId)
    if (!limit.allowed) {
      return reply.status(429).send({ error: { code: limit.paywallCode || 'DAILY_SCAN_LIMIT_REACHED', message: t('daily_scan_limit', lang) } })
    }

    const { imageUrl } = analyzePhotoSchema.parse(request.body)

    await logAiUsage(userId, 'PHOTO_SCAN').catch(() => {})

    try {
      const { jobId, statusUrl, messageId } = await enqueuePhotoAnalysis(userId, imageUrl)

      return {
        accepted: true,
        jobId,
        statusUrl,
        messageId,
      }
    } catch (err: any) {
      const errorMessage = axios.isAxiosError(err) && !err.response
        ? t('photo_analysis_unavailable', lang)
        : t('photo_analysis_failed', lang)

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

  app.get('/analyze-photo/:jobId', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request: FastifyRequest, reply) => {
    const userId = request.user!.userId
    const { jobId } = request.params as { jobId: string }

    const status = await pollPhotoAnalysisStatus(jobId)

    if (status.status !== 'completed') {
      return reply.send({
        jobId,
        status: status.status,
        failedReason: status.failedReason,
      })
    }
    try {
      const ctx = await getVisionJobContext(jobId)
      if (!ctx) {
        return reply.status(404).send({ error: { code: 'JOB_NOT_FOUND', message: 'Photo analysis job not found or expired' } })
      }
      if (ctx.userId !== userId) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not your photo analysis job' } })
      }
      const result = await finalizePhotoAnalysis(userId, ctx.imageUrl, jobId)
      return reply.send(result)
    } catch (err: any) {
      return reply.status(500).send({
        error: {
          code: 'FINALIZE_FAILED',
          message: err instanceof Error ? err.message : 'Could not finalize photo analysis',
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
