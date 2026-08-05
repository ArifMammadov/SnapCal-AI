import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { env } from './lib/env.js'
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/users.js'
import { trackingRoutes } from './routes/tracking.js'
import { aiRoutes } from './routes/ai.js'
import { subscriptionRoutes } from './routes/subscriptions.js'
import { marketplaceRoutes } from './routes/marketplace.js'
import { adminRoutes } from './routes/admin.js'
import { errorHandler } from './lib/error-handler.js'

export async function buildApp() {
  const app = fastify({
    logger: env.NODE_ENV === 'development',
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
        connectSrc: ["'self'", env.MOBILE_APP_URL, env.ADMIN_APP_URL],
      },
    },
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

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => (req as { user?: { userId: string } }).user?.userId ?? req.ip,
  })

  app.setErrorHandler(errorHandler)

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(userRoutes, { prefix: '/api/users' })
  await app.register(trackingRoutes, { prefix: '/api/tracking' })
  await app.register(aiRoutes, { prefix: '/api/ai' })
  await app.register(subscriptionRoutes, { prefix: '/api/subscriptions' })
  await app.register(marketplaceRoutes, { prefix: '/api/marketplace' })
  await app.register(adminRoutes, { prefix: '/api/admin' })

  return app
}

async function main() {
  const app = await buildApp()
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  app.log.info(`API service running on port ${env.PORT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
