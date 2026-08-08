import { prisma } from '@snapcal/database'

export async function auditLog(event: { userId: string; action: string; metadata?: object }) {
  try {
    await prisma.aiAuditLog.create({
      data: {
        userId: event.userId,
        skillName: event.action,
        metadata: event.metadata ?? {},
      },
    })
  } catch {
    // Audit logging must not break AI responses
  }
}
