import { startVisionWorker } from './lib/visionQueue.js'

const worker = startVisionWorker()

process.on('SIGTERM', async () => {
  console.log('Vision worker received SIGTERM, closing...')
  await worker.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('Vision worker received SIGINT, closing...')
  await worker.close()
  process.exit(0)
})

console.log('Vision worker started')
