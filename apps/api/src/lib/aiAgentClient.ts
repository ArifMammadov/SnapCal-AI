import axios from 'axios'
import { env } from '../lib/env.js'
import { prisma } from '@snapcal/database'
import { getRedis, logger } from '@snapcal/shared'
import { parseFoodJson, saveFoodLogFromAnalysis } from '../lib/foodAnalysis.js'

const redis = getRedis()

const VISION_JOB_TTL_SECONDS = 600

const agent = axios.create({
  baseURL: env.AI_AGENT_URL,
  timeout: 30000,
  headers: env.AI_AGENT_SECRET ? { 'x-snapcal-secret': env.AI_AGENT_SECRET } : undefined,
})

agent.interceptors.request.use((config) => {
  logger.debug({ url: config.url, method: config.method }, 'ai agent client request')
  return config
})

agent.interceptors.response.use(
  (response) => response,
  (error) => {
    logger.warn({ err: error, url: error.config?.url }, 'ai agent client error')
    return Promise.reject(error)
  },
)

export interface AnalyzePhotoResult {
  message: {
    id: string
    role: 'ai'
    content: string
    type: 'FOOD_ANALYSIS' | 'TEXT' | 'STRUCTURED'
    foodData?: ReturnType<typeof parseFoodJson>
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
    imageUrl: string
    timestamp: string
  }
}

export async function enqueuePhotoAnalysis(userId: string, imageUrl: string): Promise<{ jobId: string; statusUrl: string; messageId: string }> {
  const userMessage = await prisma.chatMessage.create({
    data: { userId, role: 'USER', type: 'TEXT', content: '[food photo]', attachments: { imageUrl } },
  })

  const { data } = await agent.post('/analyze-photo', { userId, imageUrl })
  if (!data.jobId || !data.statusUrl) {
    throw new Error('AI agent did not return async job details')
  }

  await redis.setex(
    `vision:${data.jobId}`,
    VISION_JOB_TTL_SECONDS,
    JSON.stringify({ userId, imageUrl, messageId: userMessage.id }),
  )

  return { jobId: data.jobId, statusUrl: data.statusUrl, messageId: userMessage.id }
}

export async function getVisionJobContext(jobId: string): Promise<{ userId: string; imageUrl: string; messageId: string } | null> {
  const raw = await redis.get(`vision:${jobId}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as { userId: string; imageUrl: string; messageId: string }
  } catch {
    return null
  }
}

export async function pollPhotoAnalysisStatus(jobId: string): Promise<{ status: string; result?: any; failedReason?: string }> {
  const { data } = await agent.get(`/vision-status/${jobId}`)
  return data
}

export async function finalizePhotoAnalysis(
  userId: string,
  imageUrl: string,
  jobId: string,
): Promise<AnalyzePhotoResult> {
  // Prevent concurrent finalization from multiple polling clients
  const lockKey = `finalize:${jobId}`
  const acquired = await redis.set(lockKey, '1', 'EX', 60, 'NX')
  if (!acquired) {
    // Another request is finalizing; wait briefly and then return the existing message
    await new Promise((resolve) => setTimeout(resolve, 500))
    const existing = await prisma.chatMessage.findFirst({
      where: { userId, role: 'AI', attachments: { path: ['imageUrl'], equals: imageUrl } },
      orderBy: { createdAt: 'desc' },
    })
    if (existing) {
      return {
        message: {
          id: existing.id,
          role: 'ai',
          type: (existing.type as any) ?? 'FOOD_ANALYSIS',
          content: existing.content,
          foodData: (existing.attachments as any)?.foodData,
          structured: (existing.attachments as any)?.structured,
          imageUrl,
          timestamp: existing.createdAt.toISOString(),
        },
      }
    }
  }

  try {
    const status = await pollPhotoAnalysisStatus(jobId)
    if (status.status !== 'completed' || !status.result) {
      throw new Error(status.failedReason || 'Vision analysis did not complete')
    }

    const content = status.result.message?.content ?? ''
    const foodData = typeof content === 'string' ? parseFoodJson(content) : null
    if (foodData) {
      await saveFoodLogFromAnalysis(userId, imageUrl, foodData)
    }

    // Avoid duplicate AI messages when the client polls more than once
    const existingAiMessage = await prisma.chatMessage.findFirst({
      where: { userId, role: 'AI', attachments: { path: ['imageUrl'], equals: imageUrl } },
      orderBy: { createdAt: 'desc' },
    })
    if (existingAiMessage) {
      return {
        message: {
          id: existingAiMessage.id,
          role: 'ai',
          type: (existingAiMessage.type as any) ?? 'FOOD_ANALYSIS',
          content: existingAiMessage.content,
          foodData: (existingAiMessage.attachments as any)?.foodData,
          structured: (existingAiMessage.attachments as any)?.structured,
          imageUrl,
          timestamp: existingAiMessage.createdAt.toISOString(),
        },
      }
    }

    const aiMessage = await prisma.chatMessage.create({
      data: {
        userId,
        role: 'AI',
        type: (status.result.message?.type === 'STRUCTURED' ? 'STRUCTURED' : 'FOOD_ANALYSIS') as any, // TODO: remove cast after migration applied
        content,
        modelUsed: status.result.message?.modelUsed,
        attachments: { foodData, imageUrl, structured: status.result.message?.structured },
      },
    })

    return {
      message: {
        id: aiMessage.id,
        role: 'ai',
        type: (status.result.message?.type === 'STRUCTURED' ? 'STRUCTURED' : 'FOOD_ANALYSIS') as any, // TODO: remove cast after migration applied
        content,
        foodData,
        structured: status.result.message?.structured,
        imageUrl,
        timestamp: aiMessage.createdAt.toISOString(),
      },
    }
  } catch (err) {
    // Re-throw so the route can return an error; lock will expire automatically
    throw err
  }
}
