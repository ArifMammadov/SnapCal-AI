export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

export interface JwtPayload {
  userId: string
  telegramId: string
  role: string
  iat: number
  exp: number
}

export interface ApiError {
  code: string
  message: string
  statusCode: number
}

export interface DailySummary {
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
  activities: number
  healthScore: number
}

export interface FoodAnalysisResult {
  name: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  serving: string
  suggestedMealType: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'ai' | 'system'
  type: 'text' | 'food-analysis' | 'macro-card' | 'voice'
  content: string
  timestamp: string
  foodData?: FoodAnalysisResult
}

export type UserRole = 'user' | 'support' | 'admin' | 'viewer'

export type SubscriptionStatus = 'active' | 'inactive' | 'trialing' | 'canceled' | 'past_due'

export type PlanInterval = 'monthly' | 'six_month' | 'yearly'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type MetricType = 'water_ml' | 'sleep_h' | 'weight_kg' | 'steps'

export type SupportedLanguage = 'en' | 'ru' | 'uz' | 'kk' | 'ar'
