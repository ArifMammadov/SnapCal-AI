import { z } from 'zod'
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@snapcal/database'
import { requireAuth } from './users.js'

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
const dayRegex = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/

const preferencesSchema = z.object({
  breakfastAt: z.string().regex(timeRegex).optional().nullable(),
  lunchAt: z.string().regex(timeRegex).optional().nullable(),
  dinnerAt: z.string().regex(timeRegex).optional().nullable(),
  weightDay: z.string().regex(dayRegex).optional().nullable(),
  weightAt: z.string().regex(timeRegex).optional().nullable(),
  workoutDays: z.array(z.string().regex(dayRegex)).optional(),
  workoutAt: z.string().regex(timeRegex).optional().nullable(),
  waterReminders: z.boolean().optional(),
  enabled: z.boolean().optional(),
  timezone: z.string().max(50).optional(),
})

function coerceNullableString(value: string | null | undefined): string | undefined | null {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return value
}

export async function notificationsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  const listQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })

  app.get('/', async (request: FastifyRequest) => {
    const { page, limit } = listQuerySchema.parse(request.query)
    const [notifications, unreadCount, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: request.user!.userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: request.user!.userId, isRead: false },
      }),
      prisma.notification.count({
        where: { userId: request.user!.userId },
      }),
    ])
    return { notifications, unreadCount, total, page, limit }
  })

  app.patch('/:id/read', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const notification = await prisma.notification.findUnique({ where: { id } })
    if (!notification || notification.userId !== request.user!.userId) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Notification not found' } })
    }
    return prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    })
  })

  app.post('/read-all', async (request: FastifyRequest) => {
    await prisma.notification.updateMany({
      where: { userId: request.user!.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
    return { success: true }
  })

  app.get('/preferences', async (request: FastifyRequest) => {
    const prefs = await prisma.reminderPreference.findUnique({
      where: { userId: request.user!.userId },
    })
    return prefs || {
      breakfastAt: '08:00',
      lunchAt: '13:00',
      dinnerAt: '19:00',
      weightDay: 'monday',
      weightAt: '08:30',
      workoutDays: ['monday', 'wednesday', 'friday'],
      workoutAt: '07:00',
      waterReminders: true,
      enabled: true,
      timezone: request.user?.languageCode === 'ru' ? 'Europe/Moscow' : 'UTC',
    }
  })

  app.put('/preferences', async (request: FastifyRequest, reply: FastifyReply) => {
    const raw = preferencesSchema.parse(request.body)
    const data: Record<string, any> = {}
    ;['breakfastAt', 'lunchAt', 'dinnerAt', 'weightAt', 'workoutAt'].forEach((k) => {
      if (k in raw) data[k] = coerceNullableString((raw as any)[k])
    })
    if (raw.weightDay !== undefined) data.weightDay = raw.weightDay
    if (raw.workoutDays !== undefined) data.workoutDays = raw.workoutDays
    if (raw.waterReminders !== undefined) data.waterReminders = raw.waterReminders
    if (raw.enabled !== undefined) data.enabled = raw.enabled
    if (raw.timezone !== undefined) data.timezone = raw.timezone

    const prefs = await prisma.reminderPreference.upsert({
      where: { userId: request.user!.userId },
      create: { ...data, userId: request.user!.userId },
      update: data,
    })
    return prefs
  })

  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const notification = await prisma.notification.findUnique({ where: { id } })
    if (!notification || notification.userId !== request.user!.userId) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Notification not found' } })
    }
    await prisma.notification.delete({ where: { id } })
    return { success: true }
  })
}

export default notificationsRoutes as FastifyPluginAsync