export interface Attachment {
  type: 'image' | 'audio'
  url: string
}

export interface ChatInput {
  userId: string
  messageId: string
  message?: string
  attachments?: Attachment[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  type?: 'TEXT' | 'text' | 'FOOD_ANALYSIS' | 'MACRO_CARD'
  content: string
  usedFallback?: boolean
  foodData?: {
    name: string
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
    serving: string
    suggestedMealType: string
  }
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
