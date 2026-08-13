import { z } from 'zod'
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@snapcal/database'
import { requireAuth } from './users.js'

const exportRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAuth)

  app.get('/export-data', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.userId
    const [user, profile, foodLogs, chatMessages, activityLogs, metricLogs, subscriptions, notifications, enrollments] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.foodLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 500 }),
      prisma.activityLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.metricLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.subscription.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.enrollment.findMany({ where: { userId }, include: { program: true } }),
    ])

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      user: user
        ? {
            id: user.id,
            telegramId: user.telegramId.toString(),
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

    return reply.header('Content-Disposition', 'attachment; filename="snapcal-data-export.json"').send(exportPayload)
  })

  app.delete('/delete-account', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.userId
    await prisma.$transaction([
      prisma.aiAuditLog.deleteMany({ where: { userId } }),
      prisma.auditLog.deleteMany({ where: { userId } }),
      prisma.chatMessage.deleteMany({ where: { userId } }),
      prisma.foodLog.deleteMany({ where: { userId } }),
      prisma.activityLog.deleteMany({ where: { userId } }),
      prisma.metricLog.deleteMany({ where: { userId } }),
      prisma.notification.deleteMany({ where: { userId } }),
      prisma.reminderPreference.deleteMany({ where: { userId } }),
      prisma.enrollment.deleteMany({ where: { userId } }),
      prisma.subscription.deleteMany({ where: { userId } }),
      prisma.profile.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ])
    return { success: true, deletedAt: new Date().toISOString() }
  })
}

export const gdprRoutes = exportRoutes
