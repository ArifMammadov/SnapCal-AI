import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma, indexArticleVector, generateEmbedding, prismaRead } from '@snapcal/database'
import { requireAuth } from './users.js'
import { env } from '../lib/env.js'
import { enqueueKnowledgeIndex, enqueueKnowledgeIndexAll } from '@snapcal/shared'
import { logger } from '@snapcal/shared'

const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
  if (request.user?.role !== 'ADMIN') {
    await prisma.auditLog.create({
      data: {
        action: 'ADMIN_ACCESS_DENIED',
        userId: request.user?.userId,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']?.slice(0, 255) || null,
        details: { path: request.url, method: request.method },
      },
    })
    return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Admin access required' } })
  }

  await prisma.auditLog.create({
    data: {
      action: 'ADMIN_ACCESS',
      userId: request.user.userId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']?.slice(0, 255) || null,
      details: { path: request.url, method: request.method },
    },
  })
}

const loginSchema = z.object({
  secret: z.string().min(1),
})

const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
})

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
  app.post('/login', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { secret } = loginSchema.parse(request.body)
    if (secret !== env.ADMIN_SECRET) {
      await prisma.auditLog.create({
        data: {
          action: 'ADMIN_LOGIN_FAILED',
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']?.slice(0, 255) || null,
          details: { reason: 'invalid_secret' },
        },
      })
      return reply.status(401).send({ error: { code: 'INVALID_SECRET', message: 'Invalid admin secret' } })
    }
    const token = app.jwt.sign({ userId: 'admin', role: 'ADMIN' }, { expiresIn: '24h' })
    return { accessToken: token }
  })

  app.addHook('preHandler', requireAuth)

  const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    role: z.enum(['USER', 'ADMIN', 'SUPPORT', 'VIEWER']).optional(),
    status: z.enum(['ACTIVE', 'TRIALING', 'INACTIVE', 'CANCELED']).optional(),
  })

  app.get('/users', { preHandler: requireAdmin }, async (request: FastifyRequest) => {
    const { page, limit, search, role, status } = paginationSchema.parse(request.query)
    const where: any = {}
    if (role) where.role = role
    if (status) where.subscriptionStatus = status
    if (search) {
      where.OR = [
        { telegramUsername: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        ...(Number.isNaN(Number(search)) ? [] : [{ telegramId: { equals: BigInt(search) } }]),
      ]
    }

    const [users, total] = await Promise.all([
      prismaRead.user.findMany({
        where,
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      prismaRead.user.count({ where }),
    ])

    return {
      data: users.map((u) => ({ ...u, telegramId: u.telegramId.toString() })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  })

  app.patch('/users/:id', { preHandler: requireAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({
      role: z.enum(['USER', 'ADMIN']).optional(),
      subscriptionStatus: z.enum(['ACTIVE', 'TRIALING', 'INACTIVE', 'CANCELED']).optional(),
    })
    const data = schema.parse(request.body)
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } })
    }
    return prisma.user.update({ where: { id }, data })
  })

  app.get('/users/:id', { preHandler: requireAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true, subscriptions: true, enrollments: { include: { program: true } } },
    })
    if (!user) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } })
    }
    return { ...user, telegramId: user.telegramId.toString() }
  })

  app.get('/audit-logs', { preHandler: requireAdmin }, async (request: FastifyRequest) => {
    const { page, limit, userId } = auditLogQuerySchema.parse(request.query)
    const where: any = {}
    if (userId) where.userId = userId

    const [logs, total] = await Promise.all([
      prisma.aiAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.aiAuditLog.count({ where }),
    ])

    return {
      data: logs.map((l) => ({ ...l, costUsd: l.costUsd ? Number(l.costUsd) : null })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  })

  app.get('/kb/articles', async () => {
    return prisma.knowledgeArticle.findMany({ orderBy: { updatedAt: 'desc' } })
  })

  app.post('/kb/articles', { preHandler: requireAdmin }, async (request: FastifyRequest) => {
    const data = kbArticleSchema.parse(request.body)
    const article = await prisma.knowledgeArticle.create({
      data: { ...data, createdBy: request.user!.userId },
    })
    // Trigger async indexing if published
    if (article.isPublished) {
      try {
        await enqueueKnowledgeIndex(article.id)
      } catch (err) {
        logger.warn({ err, articleId: article.id }, 'failed to enqueue knowledge index')
      }
    }
    return article
  })

  app.patch('/kb/articles/:id', { preHandler: requireAdmin }, async (request: FastifyRequest, reply) => {
    const { id } = request.params as { id: string }
    const data = kbArticleSchema.partial().parse(request.body)
    const article = await prisma.knowledgeArticle.findUnique({ where: { id } })
    if (!article) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Article not found' } })
    }
    const updated = await prisma.knowledgeArticle.update({ where: { id }, data })
    if (updated.isPublished) {
      try {
        await enqueueKnowledgeIndex(updated.id)
      } catch (err) {
        logger.warn({ err, articleId: updated.id }, 'failed to enqueue knowledge index')
      }
    }
    return updated
  })

  app.post('/kb/articles/:id/index', { preHandler: requireAdmin }, async (request: FastifyRequest, reply) => {
    const { id } = request.params as { id: string }
    const article = await prisma.knowledgeArticle.findUnique({ where: { id } })
    if (!article) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Article not found' } })
    }
    try {
      const result = await indexArticleVector(
        id,
        (text) => generateEmbedding(text, env.OPENROUTER_API_KEY ?? '', env.OPENROUTER_BASE_URL),
      )
      return { success: true, result }
    } catch (err) {
      logger.error({ err, articleId: id }, 'failed to index knowledge article')
      return reply.status(500).send({ error: { code: 'INDEX_FAILED', message: 'Failed to index article' } })
    }
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
    const programs = await prisma.program.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
    return programs.map((p) => ({ ...p, priceUsd: p.priceUsd ? Number(p.priceUsd) : null }))
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
