import { z } from 'zod'
import { prisma } from '@snapcal/database'

const foodDataSchema = z.object({
  name: z.string(),
  calories: z.number().int().min(0),
  proteinG: z.number().min(0),
  carbsG: z.number().min(0),
  fatG: z.number().min(0),
  serving: z.string().optional(),
  suggestedMealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']).optional(),
})

export type ParsedFoodData = z.infer<typeof foodDataSchema>

export function parseFoodJson(raw: string): ParsedFoodData | null {
  const cleaned = raw.replace(/^```json\s*|\s*```$/g, '').trim()
  try {
    const json = JSON.parse(cleaned)
    const parsed = foodDataSchema.safeParse(json)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export async function saveFoodLogFromAnalysis(
  userId: string,
  imageUrl: string,
  data: ParsedFoodData,
): Promise<{ id: string }> {
  const mealType = data.suggestedMealType ?? 'SNACK'
  const log = await prisma.foodLog.create({
    data: {
      userId,
      mealType,
      name: data.name,
      calories: data.calories,
      proteinG: Math.round(data.proteinG),
      carbsG: Math.round(data.carbsG),
      fatG: Math.round(data.fatG),
      imageUrl,
      aiAnalyzed: true,
      loggedAt: new Date(),
    },
  })
  return { id: log.id }
}
