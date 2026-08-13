import { startVisionWorker } from './lib/visionQueue.js'
import { initTracing, installShutdownHandlers, logger, onShutdown } from '@snapcal/shared'

initTracing('snapcal-ai-agent-worker')

const worker = startVisionWorker()

onShutdown(() => worker.close())
installShutdownHandlers()

logger.info('vision worker started')
