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
    const input: ChatInput = {
      userId: 'demo-user',
      messageId: crypto.randomUUID(),
      message: body.message,
    }
    const result = await handleChat(input)
    return reply.send(result)
  })

  app.post('/analyze-photo', async (request: FastifyRequest, reply) => {
    const body = photoSchema.parse(request.body)
    const result = await analyzeFoodPhoto('demo-user', body.imageUrl)
    return reply.send(result)
  })
}

export default fp(agentRoutes, { name: 'agentRoutes' })
