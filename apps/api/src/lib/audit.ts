import { prisma } from '@snapcal/database'
import { logger } from './logger.js'

export enum AuditEvent {
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  TOKEN_REFRESHED = 'TOKEN_REFRESHED',
  DATA_EXPORTED = 'DATA_EXPORTED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  AI_CHAT = 'AI_CHAT',
  AI_PHOTO_SCAN = 'AI_PHOTO_SCAN',
  PASSWORD_OR_SECRET_CHANGED = 'PASSWORD_OR_SECRET_CHANGED',
  ADMIN_ACTION = 'ADMIN_ACTION',
  SENSITIVE_VIEW = 'SENSITIVE_VIEW',
}

interface AuditMeta {
  userId: string
  event: AuditEvent
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  severity?: 'info' | 'warning' | 'critical'
}

export async function auditLog(meta: AuditMeta): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: meta.userId,
        action: meta.event,
        event: meta.event,
        ipAddress: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        details: meta.metadata as never,
        metadata: meta.metadata as never,
        severity: meta.severity ?? 'info',
      },
    })
  } catch (err) {
    logger.error({ err, meta }, 'failed to write audit log')
  }
}
