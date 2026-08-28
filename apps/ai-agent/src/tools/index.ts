import { prisma } from '@snapcal/database'
import type { ToolContext, ToolResult } from '../types/index.js'
import { createFoodLog, createActivityLog, createUserFact, updateGoalPlan } from '../lib/apiClient.js'
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

export async function saveUserFact(context: ToolContext): Promise<ToolResult> {
  const { userId, message } = context
  if (!message) return { success: false, error: 'No fact information provided' }

  // Parse a structured fact from the message. Expected formats:
  // - key: value
  // - allergies: nuts, shellfish
  const lines = message.split('\n').filter(Boolean)
  const facts: Array<{ key: string; value: string }> = []

  for (const line of lines) {
    const [rawKey, ...rest] = line.split(':')
    if (!rawKey || rest.length === 0) continue
    const key = rawKey.trim().toLowerCase().replace(/\s+/g, '_')
    const value = rest.join(':').trim()
    if (!value) continue
    await createUserFact(userId, key, value, 'ai_conversation')
    facts.push({ key, value })
  }

  return { success: true, data: { savedFacts: facts } }
}

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

export async function generateGoalPlan(context: ToolContext): Promise<ToolResult> {
  const { userId, metadata } = context
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } })
    const profile = user?.profile
    if (!profile) {
      return { success: false, error: 'Profile not found' }
    }

    const { callLlm } = await import('../llm/client.js')
    const lang = metadata?.language ?? user?.languageCode ?? 'ru'
    const prompt = [
      {
        role: 'system' as const,
        content:
          'You are a professional nutritionist and fitness coach. Create a detailed 6-month transformation plan in JSON format. The plan must be realistic, personalized, and progressive.',
      },
      {
        role: 'user' as const,
        content: `User profile:
${JSON.stringify({
          primaryGoal: profile.primaryGoal,
          gender: profile.gender,
          age: profile.birthDate ? new Date().getFullYear() - new Date(profile.birthDate).getFullYear() : null,
          heightCm: profile.heightCm,
          currentWeightKg: profile.currentWeightKg,
          targetWeightKg: profile.targetWeightKg,
          activityLevel: profile.activityLevel,
          dailyCalories: profile.dailyCalories,
          dailyProteinG: profile.dailyProteinG,
          dailyCarbsG: profile.dailyCarbsG,
          dailyFatG: profile.dailyFatG,
          dailyWaterMl: profile.dailyWaterMl,
          dailySleepH: profile.dailySleepH,
          dailySteps: profile.dailySteps,
        }, null, 2)}

Return ONLY valid JSON matching this shape:
{
  primaryGoal: string,
  startWeightKg: number,
  targetWeightKg: number,
  totalLossKg: number | null,
  currentMonth: number,
  percentComplete: number,
  timelineMonths: number,
  dailyTargets: { calories, proteinG, carbsG, fatG, waterL, sleepH, steps, workoutsPerWeek },
  milestones: [
    { month: number, label: string, targetWeightKg: number | null, targetCalories: number, workoutsPerWeek: number, focus: string, color: string, weeks: [ { week: number, focus: string, calorieTarget: number, workoutDays: number, stepsTarget: number, checkboxes: string[] } ] }
  ]
}
Use short labels in ${lang === 'ru' ? 'Russian' : 'English'} and color values like '#22c55e', '#3b82f6', etc.`,
      },
    ]

    const result = await callLlm('openai/gpt-4o-mini', prompt, 2048, 0.2)
    const cleaned = result.content.replace(/^```json\s*|\s*```$/g, '').trim()
    const plan = JSON.parse(cleaned)

    // Validate required shape
    if (!plan.milestones || !Array.isArray(plan.milestones) || plan.milestones.length !== 6) {
      return { success: false, error: 'Generated plan is missing 6 milestones' }
    }

    await updateGoalPlan(userId, plan)
    return { success: true, data: { plan } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to generate plan' }
  }
}
