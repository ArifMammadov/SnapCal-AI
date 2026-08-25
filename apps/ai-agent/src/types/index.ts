export interface Attachment {
  type: 'image' | 'audio'
  url: string
}

export interface FoodAnalysisData {
  name: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  serving: string
  suggestedMealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
  confidence: number
  ingredients?: string[]
  alternativeNames?: string[]
}

export interface StructuredAiResponse {
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
  dailyProgress: {
    consumed: number
    target: number
    unit: string
  }
}

export interface ChatInput {
  userId: string
  messageId: string
  message?: string
  attachments?: Attachment[]
  user?: any
  language?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  type?: 'TEXT' | 'text' | 'FOOD_ANALYSIS' | 'MACRO_CARD' | 'VOICE' | 'STRUCTURED'
  content: string
  structured?: StructuredAiResponse
  foodData?: FoodAnalysisData
  usedFallback?: boolean
  modelUsed?: string
  skillName?: string
  confidence?: number
}

export interface ChatOutput {
  message: ChatMessage
}

export interface ToolContext {
  userId: string
  message: string
  attachments?: Attachment[]
  metadata?: {
    language?: string
    subscriptionStatus?: string | null
    region?: string
  }
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

export interface Skill {
  name: string
  description?: string
  systemPrompt: string
  tools: string[]
  allowedModels: string[]
  fallbackModel: string
  isActive: boolean
}
