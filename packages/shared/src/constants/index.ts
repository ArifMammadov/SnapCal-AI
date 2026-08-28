export const USER_ROLES = ['user', 'support', 'admin', 'viewer'] as const

export const SUBSCRIPTION_STATUSES = ['active', 'inactive', 'trialing', 'canceled', 'past_due'] as const

export const PLAN_INTERVALS = ['monthly', 'six_month', 'yearly'] as const

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

export const METRIC_TYPES = ['water_ml', 'sleep_h', 'weight_kg', 'steps'] as const

export const ACTIVITY_TYPES = [
  'Running',
  'Walking',
  'Gym',
  'Cycling',
  'Swimming',
  'Yoga',
  'Football',
  'Tennis',
  'Volleyball',
  'Water',
  'Sleep',
  'Weight',
] as const

export const SUPPORTED_LANGUAGES = ['en', 'ru', 'uz', 'kk', 'ar'] as const

export const PROGRAM_CATEGORIES = [
  'All',
  'Yoga',
  'Home Fitness',
  'Gym',
  'Weight Loss',
  'Muscle Gain',
  'Running',
] as const

export const DEFAULT_FREE_AI_DAILY_LIMIT = 10

export const DEFAULT_FREE_PHOTO_SCANS_DAILY_LIMIT = 1

export const TRIAL_DAYS = 1
