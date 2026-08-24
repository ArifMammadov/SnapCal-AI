import { env } from './lib/env.js'
import fastify from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import agentRoutes from './routes/agent.js'
import { startVisionWorker } from './lib/visionQueue.js'
import { registerMetricsEndpoint } from './lib/metrics.js'
import { getRedis, initTracing, installShutdownHandlers, logger, onShutdown } from '@snapcal/shared'

async function buildApp() {
  initTracing('snapcal-ai-agent')

  const app = fastify({
    loggerInstance: logger.child({ service: 'snapcal-ai-agent' }),
    genReqId: () => `req_${crypto.randomUUID()}`,
  })

  await app.register(helmet, {
    contentSecurityPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  })
  await app.register(cors, { origin: true, credentials: true })
  await app.register(rateLimit, {
    max: (req) => {
      const remote = req.ip ?? req.socket?.remoteAddress ?? 'unknown'
      // Internal API → no rate limit; external users → per-user/IP limit
      return isPrivateIp(remote) ? 10000 : 60
    },
    timeWindow: '1 minute',
    keyGenerator: (req) => {
      const remote = req.ip ?? req.socket?.remoteAddress ?? 'unknown'
      if (isPrivateIp(remote)) return `internal:${remote}`
      return (req as { user?: { userId: string } }).user?.userId ?? remote
    },
    skipOnError: false,
    redis: getRedis(),
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry in ${context.after}`,
      retryAfter: context.after,
    }),
  })

  function isPrivateIp(ip: string): boolean {
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return true
    if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true
    if (ip.startsWith('172.')) {
      const second = Number(ip.split('.')[1])
      if (second >= 16 && second <= 31) return true
    }
    return false
  }

  await app.register(agentRoutes)

  registerMetricsEndpoint(app)

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id)
  })

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}

async function start() {
  const app = await buildApp()
  let worker: ReturnType<typeof startVisionWorker> | undefined

  if (env.WORKER_ONLY === 'true') {
    worker = startVisionWorker()
    if (worker) onShutdown(() => worker!.close())
  }

  installShutdownHandlers(app)

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    app.log.info(`AI Agent running on port ${env.PORT}`)
  } catch (err) {
    app.log.error(err)
    if (worker) await worker.close()
    process.exit(1)
  }
}

start()
