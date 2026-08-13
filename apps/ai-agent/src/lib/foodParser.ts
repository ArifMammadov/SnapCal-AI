import { z } from 'zod'

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
