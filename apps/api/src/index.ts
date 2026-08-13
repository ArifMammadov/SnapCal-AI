import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import { env } from './lib/env.js'
import { getRedis } from '@snapcal/shared'
import { logger } from './lib/logger.js'
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

export async function buildApp() {
  const app = fastify({
    logger,
    genReqId: () => `req_${Math.random().toString(36).slice(2)}`,
  })

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", env.MOBILE_APP_URL, env.ADMIN_APP_URL, env.AI_AGENT_URL],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
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

  app.setErrorHandler(errorHandler)

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
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  app.log.info(`API service running on port ${env.PORT}`)
}

main().catch((err) => {
  if (env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(err)
  }
  process.exit(1)
})
