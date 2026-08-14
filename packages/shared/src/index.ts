export interface DailySummary {
  date: string
  caloriesConsumed: number
  calorieGoal: number
  proteinG: number
  proteinGoal: number
  carbsG: number
  fatG: number
  waterMl: number
  waterGoalMl: number
  sleepH: number
  sleepGoalH: number
  steps: number
  stepsGoal: number
  weightKg: number
  activitiesCount: number
  caloriesBurned: number
  healthScore: number
  foodLogs: Array<{ id: string; name: string; calories: number }>
  activities: Array<unknown>
}

export * from './constants/index.js'
export * from './types/index.js'
export * from './utils/index.js'
export * from './redis.js'
export * from './cache.js'
export * from './logger.js'
export * from './tracing.js'
export * from './shutdown.js'
export * from './env.js'
export * from './secrets.js'
export * from './knowledgeQueue.js'
