import { prisma } from '@snapcal/database'
import type { ToolContext, ToolResult } from '../types/index.js'
import { createActivityLog, createFoodLog } from '../lib/apiClient.js'
import { parseFoodJson } from '../lib/foodParser.js'

export async function getUserSummary(context: ToolContext): Promise<ToolResult> {
  const { userId } = context
  const [user, foodLogs, activities, metrics, facts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    }),
    prisma.foodLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.activityLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.metricLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.userFact.findMany({ where: { userId } }),
  ])

  return {
    success: true,
    data: {
      profile: user?.profile,
      today: { foodLogs, activities, metrics },
      facts: facts.map((f: { key: string; value: string; confidence: any }) => ({ key: f.key, value: f.value, confidence: Number(f.confidence) })),
      subscriptionStatus: user?.subscriptionStatus,
    },
  }
}

import { searchKnowledgeWithVector } from './knowledge.js'
import { webSearch } from './webSearch.js'

export { searchKnowledgeWithVector as searchKnowledge, webSearch }

export async function recommendProgram(context: ToolContext): Promise<ToolResult> {
  const { userId } = context
  const programs = await prisma.program.findMany({ where: { isActive: true }, take: 3 })
  const enrollments = await prisma.enrollment.findMany({ where: { userId }, select: { programId: true } })
  const enrolledIds = new Set(enrollments.map((e: { programId: string }) => e.programId))

  return {
    success: true,
    data: programs.map((p: { id: string }) => ({ ...p, isEnrolled: enrolledIds.has(p.id) })),
  }
}

export async function analyzePhoto(context: ToolContext): Promise<ToolResult> {
  const imageUrl = context.attachments?.find((a: { type: string }) => a.type === 'image')?.url
  if (!imageUrl) {
    return { success: false, error: 'No image URL provided' }
  }

  const { isAllowedImageUrl } = await import('../lib/imageUrl.js')
  if (!isAllowedImageUrl(imageUrl)) {
    return { success: false, error: 'Image URL is not allowed' }
  }

  return {
    success: true,
    data: { imageUrl, requiresVision: true },
  }
}

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const

type MealType = (typeof MEAL_TYPES)[number]

function detectMealType(message: string): MealType {
  const lower = message.toLowerCase()
  if (/breakfast|утро|завтрак/i.test(lower)) return 'BREAKFAST'
  if (/lunch|обед|день/i.test(lower)) return 'LUNCH'
  if (/dinner|evening|ужин|вечер/i.test(lower)) return 'DINNER'
  return 'SNACK'
}

export async function logFood(context: ToolContext): Promise<ToolResult> {
  const { userId, message } = context
  if (!message) {
    return { success: false, error: 'No food description provided' }
  }

  try {
    // Ask a tiny LLM call to extract structured food data from free text
    const { callLlm } = await import('../llm/client.js')
    const extractionPrompt = [
      {
        role: 'system' as const,
        content:
          'Extract food data from the user message. Return ONLY valid JSON: { "name": string, "calories": integer, "proteinG": number, "carbsG": number, "fatG": number }. Guess macros if the user only named a food.',
      },
      { role: 'user' as const, content: message },
    ]
    const result = await callLlm('openai/gpt-4o-mini', extractionPrompt, 256, 0.1)
    const foodData = parseFoodJson(result.content)

    if (!foodData) {
      return { success: false, error: 'Could not parse food data from message' }
    }

    const created = await createFoodLog({
      userId,
      mealType: detectMealType(message),
      name: foodData.name,
      calories: foodData.calories,
      proteinG: Math.round(foodData.proteinG),
      carbsG: Math.round(foodData.carbsG),
      fatG: Math.round(foodData.fatG),
      aiAnalyzed: true,
    })

    return {
      success: true,
      data: { foodLogId: created.id, foodData },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to log food' }
  }
}

export async function logActivity(context: ToolContext): Promise<ToolResult> {
  const { userId, message } = context
  if (!message) {
    return { success: false, error: 'No activity description provided' }
  }

  try {
    const { callLlm } = await import('../llm/client.js')
    const extractionPrompt = [
      {
        role: 'system' as const,
        content:
          'Extract activity data from the user message. Return ONLY valid JSON: { "type": string, "durationMin": integer, "caloriesBurned": integer (optional, null if unknown) }. Example: "ran 30 minutes" -> { "type": "running", "durationMin": 30, "caloriesBurned": null }.',
      },
      { role: 'user' as const, content: message },
    ]
    const result = await callLlm('openai/gpt-4o-mini', extractionPrompt, 256, 0.1)
    const parsed = JSON.parse(result.content.replace(/^```json\s*|\s*```$/g, '').trim())

    if (typeof parsed.type !== 'string' || typeof parsed.durationMin !== 'number') {
      return { success: false, error: 'Could not parse activity data' }
    }

    const created = await createActivityLog({
      userId,
      type: parsed.type,
      durationMin: parsed.durationMin,
      caloriesBurned: typeof parsed.caloriesBurned === 'number' ? parsed.caloriesBurned : undefined,
      startedAt: new Date().toISOString(),
      notes: message,
    })

    return {
      success: true,
      data: { activityLogId: created.id, activity: parsed },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to log activity' }
  }
}
