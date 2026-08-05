import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod'
import { handleChat, analyzeFoodPhoto } from '../agent/orchestrator.js'

const chatSchema = z.object({
  userId: z.string().uuid(),
  message: z.string().max(4000),
  messageId: z.string().uuid(),
  attachments: z.array(z.object({ type: z.enum(['image', 'audio']), url: z.string().url() })).optional(),
})

const analyzePhotoSchema = z.object({
  userId: z.string().uuid(),
  imageUrl: z.string().url(),
})

const aiAgentRoutesPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post('/chat', async (request: FastifyRequest, reply) => {
    const input = chatSchema.parse(request.body)
    const output = await handleChat(input)
    return output
  })

  app.post('/analyze-photo', async (request: FastifyRequest) => {
    const { userId, imageUrl } = analyzePhotoSchema.parse(request.body)
    return analyzeFoodPhoto(userId, imageUrl)
  })
}

export const aiRoutes = fp(aiAgentRoutesPlugin)
