import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { aiRoutes } from './routes/agent.js'
import { env } from './lib/env.js'

export async function buildApp() {
  const app = fastify({
    logger: env.NODE_ENV === 'development',
  })

  await app.register(helmet)
  await app.register(cors, { origin: env.API_SERVICE_URL })
  await app.register(jwt, { secret: env.JWT_SECRET })
  await app.register(rateLimit, { max: 50, timeWindow: '1 minute' })

  app.get('/health', async () => ({ status: 'ok' }))

  await app.register(aiRoutes, { prefix: '/agent' })

  return app
}

async function main() {
  const app = await buildApp()
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  app.log.info(`AI agent running on port ${env.PORT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
