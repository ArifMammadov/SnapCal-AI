import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod'
import { handleChat, analyzeFoodPhoto } from '../agent/orchestrator.js'
import type { ChatInput } from '../types/index.js'

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
})

const photoSchema = z.object({
  imageUrl: z.string().url(),
})

const agentRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
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

export default fp(agentRoutes, { name: 'agentRoutes' })
