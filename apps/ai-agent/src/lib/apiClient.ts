import axios from 'axios'
import { env } from '../lib/env.js'

export const apiClient = axios.create({
  baseURL: env.API_URL ?? env.API_SERVICE_URL,
  timeout: 15000,
  headers: env.AGENT_SECRET ? { 'x-snapcal-secret': env.AGENT_SECRET } : undefined,
})

export interface FoodLogPayload {
  userId: string
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
  name: string
  calories: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  imageUrl?: string
  aiAnalyzed?: boolean
}

export interface ActivityLogPayload {
  userId: string
  type: string
  durationMin: number
  caloriesBurned?: number
  startedAt: string
  notes?: string
}

export async function createFoodLog(payload: FoodLogPayload): Promise<{ id: string }> {
  const { data } = await apiClient.post('/api/tracking/food', payload)
  return data
}

export async function createActivityLog(payload: ActivityLogPayload): Promise<{ id: string }> {
  const { data } = await apiClient.post('/api/tracking/activity', payload)
  return data
}
