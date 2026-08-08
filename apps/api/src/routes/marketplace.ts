import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '@snapcal/database'
import { requireAuth } from './users.js'

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60)
}

const categoryQuerySchema = z.object({
  category: z.string().optional(),
})

function serializeProgram(p: Awaited<ReturnType<typeof prisma.program.findFirst>>) {
  if (!p) return null
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    category: p.category,
    level: p.level,
    durationWeeks: p.durationWeeks,
    price: p.priceUsd ? Number(p.priceUsd) : 0,
    rating: p.rating ? Number(p.rating) : 4.5,
    reviews: p.reviewsCount,
    enrolled: p.enrolledCount,
    emoji: p.emoji,
    gradient: p.gradient,
    includes: p.includes,
    isActive: p.isActive,
    instructor: p.instructor,
    tag: p.tag,
    createdAt: p.createdAt,
  }
}

export const marketplaceRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAuth)

  app.get('/programs', async (request: FastifyRequest) => {
    const { category } = categoryQuerySchema.parse(request.query)
    const programs = await prisma.program.findMany({
      where: {
        isActive: true,
        category: category ? { equals: category, mode: 'insensitive' } : undefined,
      },
      orderBy: { createdAt: 'desc' },
    })
    return programs.map(serializeProgram).filter(Boolean)
  })

  app.get('/programs/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string }
    const program = await prisma.program.findUnique({ where: { id } })
    return serializeProgram(program)
  })

  app.post('/programs/:id/enroll', async (request: FastifyRequest, reply: FastifyReply) => {
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

export { slugify }
