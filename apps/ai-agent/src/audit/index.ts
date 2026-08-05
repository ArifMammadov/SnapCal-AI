import { prisma } from '@snapcal/database'

export async function auditLog(event: { userId: string; action: string; metadata?: object }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: event.userId,
        action: event.action,
        metadata: event.metadata ?? {},
        ip: 'unknown',
        userAgent: 'ai-agent',
      },
    })
  } catch {
    // Audit logging must not break AI responses
  }
}
