import { startVisionWorker } from './lib/visionQueue.js'
import { startKnowledgeIndexWorker, closeKnowledgeIndexWorker } from '@snapcal/shared'
import { initTracing, installShutdownHandlers, logger, onShutdown } from '@snapcal/shared'
import { env } from './lib/env.js'

initTracing('snapcal-ai-agent-worker')

const visionWorker = startVisionWorker()
onShutdown(() => visionWorker.close())

const knowledgeWorker = startKnowledgeIndexWorker({
  apiKey: env.OPENROUTER_API_KEY ?? '',
  baseUrl: env.OPENROUTER_BASE_URL,
})
onShutdown(() => closeKnowledgeIndexWorker())

installShutdownHandlers()

logger.info('ai agent worker started')
