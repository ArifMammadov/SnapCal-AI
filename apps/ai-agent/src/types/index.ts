export interface Skill {
  name: string
  description?: string
  systemPrompt: string
  tools: string[]
  allowedModels: string[]
  fallbackModel: string
  isActive: boolean
}

export interface ToolContext {
  userId: string
  message: string
  skillName: string
  attachments?: { type: string; url: string }[]
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

export type Tool = (context: ToolContext) => Promise<ToolResult>

export interface ChatInput {
  userId: string
  message: string
  messageId: string
  attachments?: { type: 'image' | 'audio'; url: string }[]
}

export interface ChatOutput {
  message: string
  type: 'text' | 'food-analysis' | 'macro-card' | 'voice'
  foodData?: {
    name: string
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
    serving: string
    suggestedMealType: string
  }
  usedFallback: boolean
}
