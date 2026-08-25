import crypto from 'node:crypto'
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../lib/env.js'
import { z } from 'zod'
import { handleChat, analyzeFoodPhoto } from '../agent/orchestrator.js'
import type { ChatInput } from '../types/index.js'
import { checkAiUsageLimits, getUserSubscriptionStatus, recordAiUsage } from '../lib/limits.js'
import { enqueueVisionAnalysis, getVisionJobStatus } from '../lib/visionQueue.js'
import { isAllowedImageUrl } from '../lib/imageUrl.js'

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  userId: z.string().uuid(),
})

const photoSchema = z.object({
  imageUrl: z.string().url(),
  userId: z.string().uuid(),
})

function requireAgentSecret(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const header = request.headers['x-snapcal-secret']
  if (!header || header !== env.AGENT_SECRET) {
    request.log.warn({ ip: request.ip }, 'AI agent request rejected: invalid or missing x-snapcal-secret')
    reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Invalid agent secret' } })
    return
  }
  done()
}

const agentRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAgentSecret)

  app.post('/chat', async (request: FastifyRequest, reply) => {
    const body = chatSchema.parse(request.body)
    const subscriptionStatus = await getUserSubscriptionStatus(body.userId)
    const limit = await checkAiUsageLimits(body.userId, subscriptionStatus, body.message.length / 4, 1024)
    if (!limit.allowed) {
      return reply.status(429).send({ error: { code: limit.reason, message: 'AI usage limit reached.' } })
    }

    const input: ChatInput = {
      userId: body.userId,
      messageId: crypto.randomUUID(),
      message: body.message,
    }
    const result = await handleChat(input)
    await recordAiUsage(body.userId, body.message.length / 4, result.message.content.length / 4, result.message.modelUsed ?? 'unknown', 'openrouter')
    return reply.send(result)
  })

  app.post('/analyze-photo', async (request: FastifyRequest, reply) => {
    const body = photoSchema.parse(request.body)
    if (!isAllowedImageUrl(body.imageUrl)) {
      request.log.warn({ imageUrl: body.imageUrl }, 'Rejected analyze-photo with disallowed image URL')
      return reply.status(400).send({ error: { code: 'INVALID_IMAGE_URL', message: 'Image URL is not allowed' } })
    }

    const subscriptionStatus = await getUserSubscriptionStatus(body.userId)
    const limit = await checkAiUsageLimits(body.userId, subscriptionStatus, 200, 512)
    if (!limit.allowed) {
      return reply.status(429).send({ error: { code: limit.reason, message: 'AI usage limit reached.' } })
    }

    const job = await enqueueVisionAnalysis({
      userId: body.userId,
      imageUrl: body.imageUrl,
      messageId: crypto.randomUUID(),
    })

    return reply.send({
      accepted: true,
      jobId: job.id,
      statusUrl: `/ai-agent/vision-status/${job.id}`,
    })
  })

  app.get('/vision-status/:jobId', async (request: FastifyRequest, reply) => {
    const { jobId } = request.params as { jobId: string }
    const status = await getVisionJobStatus(jobId)
    if (status.status === 'not_found') {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Job not found' } })
    }
    // If the job failed, still return 200 with failedReason so the API can stop polling
    if (status.status === 'failed' && !status.result) {
      return reply.send({
        status: 'failed',
        failedReason: status.failedReason ?? 'Vision analysis failed',
        result: {
          message: {
            id: crypto.randomUUID(),
            role: 'ai',
            content: JSON.stringify({
              name: 'Could not identify food',
              calories: 0,
              proteinG: 0,
              carbsG: 0,
              fatG: 0,
              serving: 'unknown',
              suggestedMealType: 'SNACK',
              confidence: 0,
              error: status.failedReason ?? 'Vision analysis failed',
            }),
            type: 'text',
            modelUsed: 'fallback',
            usedFallback: true,
          },
        },
      })
    }
    return reply.send(status)
  })
}

export default agentRoutes
