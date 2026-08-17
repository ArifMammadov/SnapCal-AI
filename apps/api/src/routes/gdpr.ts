import { z } from 'zod'
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@snapcal/database'
import { requireAuth } from './users.js'
import { AuditEvent, auditLog } from '../lib/audit.js'

const exportRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAuth)

  app.get('/export-data', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.userId
    const [user, profile, foodLogs, chatMessages, activityLogs, metricLogs, subscriptions, notifications, enrollments] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.foodLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.activityLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 500 }),
      prisma.metricLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 500 }),
      prisma.subscription.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 500 }),
      prisma.enrollment.findMany({ where: { userId }, include: { program: true } }),
    ])

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      user: user
        ? {
            id: user.id,
            telegramId: user.telegramId?.toString() ?? null,
            telegramUsername: user.telegramUsername,
            firstName: user.firstName,
            lastName: user.lastName,
            languageCode: user.languageCode,
            role: user.role,
            subscriptionStatus: user.subscriptionStatus,
            createdAt: user.createdAt.toISOString(),
          }
        : null,
      profile,
      foodLogs,
      chatMessages: chatMessages.map((m: typeof chatMessages[0]) => ({
        ...m,
        content: m.content.slice(0, 1000),
        attachments: m.attachments,
      })),
      activityLogs,
      metricLogs,
      subscriptions,
      notifications,
      enrollments,
    }

    await auditLog({
      userId,
      event: AuditEvent.DATA_EXPORTED,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      severity: 'info',
    })

    return reply.header('Content-Disposition', 'attachment; filename="snapcal-data-export.json"').send(exportPayload)
  })

  app.delete('/delete-account', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.userId
    await auditLog({
      userId,
      event: AuditEvent.ACCOUNT_DELETED,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { deletedAt: new Date().toISOString() },
      severity: 'critical',
    })
    await prisma.$transaction([
      prisma.aiAuditLog.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ])
    return { success: true, deletedAt: new Date().toISOString() }
  })
}

export const gdprRoutes = exportRoutes
