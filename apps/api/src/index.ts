import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import { env } from './lib/env.js'
import { getRedis, initTracing, installShutdownHandlers, logger } from '@snapcal/shared'
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/users.js'
import { trackingRoutes } from './routes/tracking.js'
import { aiRoutes } from './routes/ai.js'
import { subscriptionRoutes } from './routes/subscriptions.js'
import { marketplaceRoutes } from './routes/marketplace.js'
import { adminRoutes } from './routes/admin.js'
import { goalRoutes } from './routes/goals.js'
import { notificationsRoutes } from './routes/notifications.js'
import { gdprRoutes } from './routes/gdpr.js'
import { errorHandler } from './lib/error-handler.js'
import { registerMetricsEndpoint, requestMetricsHook } from './lib/metrics.js'
import { initSentry } from './lib/sentry.js'

initSentry('snapcal-api')

export async function buildApp() {
  initTracing('snapcal-api')

  const app = fastify({
    loggerInstance: logger.child({ service: 'snapcal-api' }),
    genReqId: () => `req_${crypto.randomUUID()}`,
  })

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://*.snapcal.health", "https://telegram.org"],
        connectSrc: ["'self'", env.MOBILE_APP_URL, env.ADMIN_APP_URL, env.AI_AGENT_URL],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    dnsPrefetchControl: { allow: false },
  })

  await app.register(cors, {
    origin: [env.MOBILE_APP_URL, env.ADMIN_APP_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: 'refreshToken',
      signed: false,
    },
  })

  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

  await app.register(rateLimit, {
    max: 100,
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

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id)
  })

  app.addHook('onResponse', async (request, reply) => {
    request.log.info({
      req: {
        method: request.method,
        url: request.url,
        remoteAddress: request.ip,
        userId: (request.user as { userId?: string } | undefined)?.userId,
      },
      res: {
        statusCode: reply.statusCode,
      },
      responseTime: reply.elapsedTime,
    }, 'request completed')
  })

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  registerMetricsEndpoint(app)
  requestMetricsHook(app)

  app.setErrorHandler(errorHandler)

  // Send unhandled errors to Sentry and log metric; keep the original errorHandler as final responder
  app.setErrorHandler(async (err: any, request: any, reply: any) => {
    const { captureException } = await import('./lib/sentry.js')
    captureException(err, { route: request.routerPath || request.url, userId: request.user?.userId })
    return errorHandler(err as any, request, reply)
  })

  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(userRoutes, { prefix: '/api/users' })
  await app.register(trackingRoutes, { prefix: '/api/tracking' })
  await app.register(aiRoutes, { prefix: '/api/ai' })
  await app.register(subscriptionRoutes, { prefix: '/api/subscriptions' })
  await app.register(marketplaceRoutes, { prefix: '/api/marketplace' })
  await app.register(adminRoutes, { prefix: '/api/admin' })
  await app.register(goalRoutes, { prefix: '/api/goals' })
  await app.register(notificationsRoutes, { prefix: '/api/notifications' })
  await app.register(gdprRoutes, { prefix: '/api/gdpr' })

  return app
}

async function main() {
  const app = await buildApp()
  installShutdownHandlers(app)
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  app.log.info(`API service running on port ${env.PORT}`)
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start api')
  process.exit(1)
})