import axios from 'axios'
import { env } from '../lib/env.js'
import { logger } from '@snapcal/shared'

export const apiClient = axios.create({
  baseURL: env.API_URL ?? env.API_SERVICE_URL,
  timeout: 15000,
  headers: env.AGENT_SECRET ? { 'x-snapcal-secret': env.AGENT_SECRET } : undefined,
})

apiClient.interceptors.request.use((config) => {
  logger.debug({ url: config.url, method: config.method }, 'api client request')
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    logger.warn({ err: error, url: error.config?.url }, 'api client error')
    return Promise.reject(error)
  },
)

interface FoodLogPayload {
  userId: string
  mealType: string
  name: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  aiAnalyzed: boolean
}

interface ActivityLogPayload {
  userId: string
  type: string
  durationMin: number
  caloriesBurned?: number
  startedAt: string
  notes?: string
}

export async function createFoodLog(payload: FoodLogPayload) {
  const { data } = await apiClient.post('/api/tracking/food', payload)
  return data
}

export async function createActivityLog(payload: ActivityLogPayload) {
  const { data } = await apiClient.post('/api/tracking/activity', payload)
  return data
}

export async function updateGoalPlan(userId: string, plan: any) {
  const { data } = await apiClient.put('/api/users/me/goal-plan', plan)
  return data
}
