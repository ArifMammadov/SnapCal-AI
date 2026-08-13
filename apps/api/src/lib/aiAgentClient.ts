import axios from 'axios'
import { env } from '../lib/env.js'
import { prisma } from '@snapcal/database'
import { logger } from '@snapcal/shared'
import { parseFoodJson, saveFoodLogFromAnalysis } from '../lib/foodAnalysis.js'

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
    type: 'FOOD_ANALYSIS' | 'TEXT'
    foodData?: ReturnType<typeof parseFoodJson>
    imageUrl: string
    timestamp: string
  }
}

export async function enqueuePhotoAnalysis(userId: string, imageUrl: string): Promise<{ jobId: string; statusUrl: string }> {
  const { data } = await agent.post('/analyze-photo', { userId, imageUrl })
  if (!data.jobId || !data.statusUrl) {
    throw new Error('AI agent did not return async job details')
  }
  return { jobId: data.jobId, statusUrl: data.statusUrl }
}

export async function pollPhotoAnalysisStatus(jobId: string): Promise<{ state: string; result?: any; failedReason?: string }> {
  const { data } = await agent.get(`/vision-status/${jobId}`)
  return data
}

export async function finalizePhotoAnalysis(
  userId: string,
  imageUrl: string,
  userMessageId: string,
): Promise<AnalyzePhotoResult> {
  const status = await pollPhotoAnalysisStatus(userMessageId)
  if (status.state !== 'completed' || !status.result) {
    throw new Error(status.failedReason || 'Vision analysis did not complete')
  }

  const content = status.result.message?.content ?? ''
  const foodData = typeof content === 'string' ? parseFoodJson(content) : null
  if (foodData) {
    await saveFoodLogFromAnalysis(userId, imageUrl, foodData)
  }

  const aiMessage = await prisma.chatMessage.create({
    data: {
      userId,
      role: 'AI',
      type: 'FOOD_ANALYSIS',
      content,
      modelUsed: status.result.message?.modelUsed,
      attachments: { foodData, imageUrl },
    },
  })

  return {
    message: {
      id: aiMessage.id,
      role: 'ai',
      type: 'FOOD_ANALYSIS',
      content,
      foodData,
      imageUrl,
      timestamp: aiMessage.createdAt.toISOString(),
    },
  }
}
