import crypto from 'node:crypto'
import { Queue, Worker, Job } from 'bullmq'
import { getRedis, logger } from '@snapcal/shared'
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
    type: 'text' | 'STRUCTURED'
    modelUsed?: string
    usedFallback?: boolean
    structured?: {
      emoji: string
      mealLabel: string
      foodName: string
      calories: number
      proteinG: number
      carbsG: number
      fatG: number
      serving: string
      evaluation: string
      recommendations: { emoji: string; text: string }[]
      dailyProgress: { consumed: number; target: number; unit: string }
    }
    foodData?: any
  }
  confidence?: number
}

export function startVisionWorker(): Worker {
  const worker = new Worker(
    'vision-analysis',
    async (job: Job<VisionJobData>) => {
      const { userId, imageUrl } = job.data
      logger.info({ userId, imageUrl, jobId: job.id }, 'vision worker processing job')
      try {
        const result = await analyzeFoodPhoto(userId, imageUrl)
        const outputTokens = estimateTokens(result.message.content)
        await recordAiUsage(userId, 200, outputTokens, result.message.modelUsed ?? 'unknown', 'openrouter')
        return {
          ...result,
          confidence: result.message.foodData?.confidence ?? result.message.confidence ?? 0,
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Vision analysis failed'
        logger.error({ err, userId, imageUrl, jobId: job.id }, `Vision job failed: ${errorMessage}`)
        // Return a graceful fallback so the API polling can complete
        const fallback: VisionJobResult = {
          message: {
            id: crypto.randomUUID(),
            role: 'ai',
            content: JSON.stringify({
              name: 'Could not identify food',
              calories: 0,
              proteinG: 0,
              carbsG: 0,
              fatG: 0,
              serving: 'unknown',
              suggestedMealType: 'SNACK',
              confidence: 0,
              error: errorMessage,
            }),
            type: 'text',
            modelUsed: 'fallback',
            usedFallback: true,
          },
        }
        return { ...fallback, confidence: 0 }
      }
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
