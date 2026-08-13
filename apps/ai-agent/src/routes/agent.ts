import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../lib/env.js'
import { z } from 'zod'
import { handleChat, analyzeFoodPhoto } from '../agent/orchestrator.js'
import type { ChatInput } from '../types/index.js'
import { checkAiUsageLimits, getUserSubscriptionStatus, recordAiUsage } from '../lib/limits.js'

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
    const subscriptionStatus = await getUserSubscriptionStatus(body.userId)
    const limit = await checkAiUsageLimits(body.userId, subscriptionStatus, 200, 512)
    if (!limit.allowed) {
      return reply.status(429).send({ error: { code: limit.reason, message: 'AI usage limit reached.' } })
    }

    const result = await analyzeFoodPhoto(body.userId, body.imageUrl)
    await recordAiUsage(body.userId, 200, result.message.content.length / 4, result.message.modelUsed ?? 'unknown', 'openrouter')
    return reply.send(result)
  })
}

export default agentRoutes
