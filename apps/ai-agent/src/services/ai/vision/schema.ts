import { z } from 'zod'

export const foodComponentSchema = z.object({
  name: z.string().min(1),
  estimatedWeightG: z.number().min(0).max(5000),
  confidence: z.number().min(0).max(1),
})

export const dishCandidateSchema = z.object({
  name: z.string().min(1),
  confidence: z.number().min(0).max(1),
})

export const visionAnalysisSchema = z.object({
  mealType: z.enum(['main_dish', 'breakfast', 'lunch', 'dinner', 'snack']).default('main_dish'),
  dishName: z.string().min(1),
  dishCandidates: z.array(dishCandidateSchema).max(5).default([]),
  components: z.array(foodComponentSchema).max(15).default([]),
  overallConfidence: z.number().min(0).max(1),
  dishConfidence: z.number().min(0).max(1).optional(),
  ingredientConfidence: z.number().min(0).max(1).optional(),
  portionConfidence: z.number().min(0).max(1).optional(),
  needsClarification: z.boolean().default(false),
  clarificationQuestions: z.array(z.string()).max(3).default([]),
  estimatedPortionG: z.number().min(0).max(5000).optional(),
  cuisine: z.string().optional(),
  notes: z.string().max(500).optional(),
})

export type VisionAnalysis = z.infer<typeof visionAnalysisSchema>
