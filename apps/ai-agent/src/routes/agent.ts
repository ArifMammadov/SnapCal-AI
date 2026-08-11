import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../lib/env.js'
import { z } from 'zod'
import { handleChat, analyzeFoodPhoto } from '../agent/orchestrator.js'
import type { ChatInput } from '../types/index.js'

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
})

const photoSchema = z.object({
  imageUrl: z.string().url(),
})

function requireAgentSecret(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!env.AGENT_SECRET) return done()
  const header = request.headers['x-snapcal-secret']
  if (header !== env.AGENT_SECRET) {
    return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Invalid agent secret' } })
  }
  done()
}

const agentRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAgentSecret)

  app.post('/chat', async (request: FastifyRequest, reply) => {
    const body = chatSchema.parse(request.body)
    const userId = (request.body as any)?.userId ?? 'demo-user'
    const input: ChatInput = {
      userId,
      messageId: crypto.randomUUID(),
      message: body.message,
    }
    const result = await handleChat(input)
    return reply.send(result)
  })

  app.post('/analyze-photo', async (request: FastifyRequest, reply) => {
    const body = photoSchema.parse(request.body)
    const userId = (request.body as any)?.userId ?? 'demo-user'
    const result = await analyzeFoodPhoto(userId, body.imageUrl)
    return reply.send(result)
  })
}

export default agentRoutes
