import { Queue, Worker, Job } from 'bullmq'
import { getRedis } from '@snapcal/shared'
import { visionQueueJobsTotal } from '../lib/metrics.js'
import { analyzeFoodPhoto } from '../agent/orchestrator.js'
import { estimateTokens } from '../llm/client.js'
import { recordAiUsage } from '../lib/limits.js'

const redisConnection = getRedis()
const blockingRedisConnection = getRedis({ maxRetriesPerRequest: null })

export const visionQueue = new Queue('vision-analysis', { connection: redisConnection })

export interface VisionJobData {
  userId: string
  imageUrl: string
  messageId: string
}

export interface VisionJobResult {
  message: {
    id: string
    role: 'ai'
    content: string
    type: 'text'
    modelUsed?: string
    usedFallback?: boolean
  }
}

export function startVisionWorker(): Worker {
  const worker = new Worker(
    'vision-analysis',
    async (job: Job<VisionJobData>) => {
      visionQueueJobsTotal.inc({ state: 'completed' })
      const { userId, imageUrl } = job.data
      const result = await analyzeFoodPhoto(userId, imageUrl)
      const outputTokens = estimateTokens(result.message.content)
      await recordAiUsage(userId, 200, outputTokens, result.message.modelUsed ?? 'unknown', 'openrouter')
      return result
    },
    { connection: blockingRedisConnection, concurrency: 6 }
  )

  worker.on('completed', () => {
    visionQueueJobsTotal.inc({ state: 'completed' })
  })

  worker.on('failed', (job, err) => {
    visionQueueJobsTotal.inc({ state: 'failed' })
    console.error(`Vision job ${job?.id} failed:`, err)
  })

  return worker
}

export async function enqueueVisionAnalysis(data: VisionJobData): Promise<Job<VisionJobData, VisionJobResult>> {
  visionQueueJobsTotal.inc({ state: 'enqueued' })
  return visionQueue.add('analyze', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  })
}

export async function getVisionJobStatus(jobId: string): Promise<{ status: string; result?: VisionJobResult; failedReason?: string }> {
  const job = await visionQueue.getJob(jobId)
  if (!job) return { status: 'not_found' }
  const state = await job.getState()
  const result = await job.returnvalue
  const failedReason = job.failedReason ?? undefined
  return { status: state, result, failedReason }
}
