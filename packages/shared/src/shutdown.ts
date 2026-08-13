import { closeRedis } from './redis.js'
import { prisma } from '@snapcal/database'
import { shutdownTracing } from './tracing.js'
import { logger } from './logger.js'

export interface Shutdownable {
  close: () => Promise<unknown> | unknown
}

const handlers: Array<() => Promise<unknown> | unknown> = []

export function onShutdown(fn: () => Promise<unknown> | unknown) {
  handlers.push(fn)
}

export async function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down gracefully')

  for (const fn of handlers) {
    try {
      await fn()
    } catch (err) {
      logger.error({ err }, 'shutdown handler failed')
    }
  }

  try {
    await prisma.$disconnect()
  } catch (err) {
    logger.error({ err }, 'prisma disconnect failed')
  }

  try {
    await closeRedis()
  } catch (err) {
    logger.error({ err }, 'redis disconnect failed')
  }

  try {
    await shutdownTracing()
  } catch (err) {
    logger.error({ err }, 'tracing shutdown failed')
  }

  logger.info('shutdown complete')
  process.exit(0)
}

export function installShutdownHandlers(app?: Shutdownable) {
  if (app) {
    onShutdown(() => app.close())
  }

  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.once(signal, () => shutdown(signal))
  }

  process.once('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaught exception')
    shutdown('uncaughtException')
  })

  process.once('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'unhandled rejection')
    shutdown('unhandledRejection')
  })
}
