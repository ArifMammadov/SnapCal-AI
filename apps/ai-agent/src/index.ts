import { env } from './lib/env.js'
import fastify from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import agentRoutes from './routes/agent.js'

async function buildApp() {
  const app = fastify({ logger: env.NODE_ENV === 'development' })

  await app.register(helmet)
  await app.register(cors, { origin: true, credentials: true })
  await app.register(rateLimit, {
    max: 60,
    timeWindow: '1 minute',
  })

  await app.register(agentRoutes)

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}

async function start() {
  const app = await buildApp()
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    app.log.info(`AI Agent running on port ${env.PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
