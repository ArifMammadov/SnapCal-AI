import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod'
import { prisma } from '@snapcal/database'
import { requireAuth } from './users.js'

const categoryQuerySchema = z.object({
  category: z.string().optional(),
})

const marketplaceRoutesPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAuth)

  app.get('/programs', async (request: FastifyRequest) => {
    const { category } = categoryQuerySchema.parse(request.query)
    return prisma.program.findMany({
      where: {
        isActive: true,
        category: category ? { equals: category, mode: 'insensitive' } : undefined,
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.get('/programs/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string }
    return prisma.program.findUnique({ where: { id } })
  })

  app.post('/programs/:id/enroll', async (request: FastifyRequest, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user!.userId

    const program = await prisma.program.findUnique({ where: { id } })
    if (!program) {
      return reply.status(404).send({ error: { code: 'PROGRAM_NOT_FOUND', message: 'Program not found' } })
    }

    const existing = await prisma.enrollment.findUnique({
      where: { userId_programId: { userId, programId: id } },
    })
    if (existing) {
      return reply.status(409).send({ error: { code: 'ALREADY_ENROLLED', message: 'Already enrolled' } })
    }

    // Payment integration placeholder for Stripe/TON
    return reply.status(501).send({ error: { code: 'PAYMENT_NOT_IMPLEMENTED', message: 'Payment integration pending' } })
  })

  app.get('/my-enrollments', async (request: FastifyRequest) => {
    return prisma.enrollment.findMany({
      where: { userId: request.user!.userId },
      include: { program: true },
    })
  })
}

export const marketplaceRoutes = fp(marketplaceRoutesPlugin)
