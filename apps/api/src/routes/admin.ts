import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '@snapcal/database'
import { requireAuth } from './users.js'

const requireAdmin = async (request: FastifyRequest, reply: any) => {
  if (request.user?.role !== 'ADMIN') {
    return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Admin access required' } })
  }
}

const kbArticleSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1).max(200),
  content: z.string().min(10),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sourceUrl: z.string().url().optional(),
})

const programSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  instructor: z.string().optional(),
  category: z.string().optional(),
  description: z.string().min(10),
  durationWeeks: z.number().int().min(1).optional(),
  priceUsd: z.number().min(0).optional(),
  includes: z.array(z.string()).optional(),
  level: z.string().optional(),
  emoji: z.string().optional(),
  gradient: z.string().optional(),
  tag: z.string().optional(),
  isActive: z.boolean().default(true),
})

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60)
}

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/users', { preHandler: requireAdmin }, async () => {
    return prisma.user.findMany({
      select: {
        id: true,
        telegramId: true,
        telegramUsername: true,
        firstName: true,
        languageCode: true,
        role: true,
        subscriptionStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  })

  app.get('/users/:id', { preHandler: requireAdmin }, async (request: FastifyRequest) => {
    const { id } = request.params as { id: string }
    return prisma.user.findUnique({
      where: { id },
      include: { profile: true, subscriptions: true, enrollments: true },
    })
  })

  app.get('/ai/logs', { preHandler: requireAdmin }, async () => {
    return prisma.aiAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  })

  app.get('/kb/articles', async () => {
    return prisma.knowledgeArticle.findMany({ orderBy: { updatedAt: 'desc' } })
  })

  app.post('/kb/articles', { preHandler: requireAdmin }, async (request: FastifyRequest) => {
    const data = kbArticleSchema.parse(request.body)
    return prisma.knowledgeArticle.create({
      data: { ...data, createdBy: request.user!.userId },
    })
  })

  app.patch('/kb/articles/:id', { preHandler: requireAdmin }, async (request: FastifyRequest, reply) => {
    const { id } = request.params as { id: string }
    const data = kbArticleSchema.partial().parse(request.body)
    const article = await prisma.knowledgeArticle.findUnique({ where: { id } })
    if (!article) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Article not found' } })
    }
    return prisma.knowledgeArticle.update({ where: { id }, data })
  })

  app.delete('/kb/articles/:id', { preHandler: requireAdmin }, async (request: FastifyRequest, reply) => {
    const { id } = request.params as { id: string }
    const article = await prisma.knowledgeArticle.findUnique({ where: { id } })
    if (!article) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Article not found' } })
    }
    await prisma.knowledgeArticle.delete({ where: { id } })
    return { success: true }
  })

  app.get('/programs', { preHandler: requireAdmin }, async () => {
    return prisma.program.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  })

  app.post('/programs', { preHandler: requireAdmin }, async (request: FastifyRequest) => {
    const data = programSchema.parse(request.body)
    const slug = data.slug || slugify(data.name)
    return prisma.program.create({ data: { ...data, slug } })
  })

  app.patch('/programs/:id', { preHandler: requireAdmin }, async (request: FastifyRequest, reply) => {
    const { id } = request.params as { id: string }
    const data = programSchema.partial().parse(request.body)
    const program = await prisma.program.findUnique({ where: { id } })
    if (!program) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Program not found' } })
    }
    return prisma.program.update({ where: { id }, data })
  })

  app.delete('/programs/:id', { preHandler: requireAdmin }, async (request: FastifyRequest, reply) => {
    const { id } = request.params as { id: string }
    const program = await prisma.program.findUnique({ where: { id } })
    if (!program) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Program not found' } })
    }
    await prisma.program.update({ where: { id }, data: { isActive: false } })
    return { success: true }
  })
}
