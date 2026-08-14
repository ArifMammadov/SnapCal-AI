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
    max: 60,
    timeWindow: '1 minute',
    keyGenerator: (req) => (req as { user?: { userId: string } }).user?.userId ?? req.ip,
    skipOnError: false,
    redis: getRedis(),
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry in ${context.after}`,
      retryAfter: context.after,
    }),
  })

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

  if (!env.WORKER_ONLY) {
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
