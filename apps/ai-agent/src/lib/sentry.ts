import { env } from './env.js'
import { logger } from '@snapcal/shared'

let sentry: typeof import('@sentry/node') | null = null

export async function initSentry(serviceName: string) {
  if (!env.SENTRY_DSN || env.SENTRY_DSN === 'placeholder') {
    logger.info({ service: serviceName }, 'SENTRY_DSN not configured, skipping Sentry')
    return null
  }
  try {
    sentry = await import('@sentry/node')
    sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      release: process.env.GIT_COMMIT_SHA || 'unknown',
      serverName: serviceName,
      tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: env.NODE_ENV === 'production' ? 0.05 : 0.0,
      beforeSend(event) {
        if (event.request?.headers?.authorization) event.request.headers.authorization = '[REDACTED]'
        if (event.request?.headers?.cookie) event.request.headers.cookie = '[REDACTED]'
        return event
      },
    })
    logger.info({ service: serviceName }, 'Sentry initialized')
    return sentry
  } catch (err) {
    logger.warn({ err, service: serviceName }, 'failed to initialize Sentry')
    return null
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!sentry) return
  try { sentry.captureException(err, { extra: context }) } catch (e) { logger.warn({ e }, 'Sentry capture failed') }
}

export function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' = 'info', context?: Record<string, unknown>) {
  if (!sentry) return
  try { sentry.captureMessage(message, { level, extra: context }) } catch (e) { logger.warn({ e }, 'Sentry message failed') }
}
