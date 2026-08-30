import { prisma } from '@snapcal/database'
import type { FoodAnalysisData } from '../../types/index.js'
import { findFoodByName } from './nutrition/foodDatabase.js'
import { logger } from '@snapcal/shared'

export async function logPhotoCorrection(
  userId: string,
  original: FoodAnalysisData,
  correction: string,
  final: FoodAnalysisData,
  imageUrl?: string,
): Promise<void> {
  try {
    const matched = await findFoodByName(final.name)
    await prisma.photoCorrection.create({
      data: {
        userId,
        foodId: matched?.id ?? null,
        imageUrl,
        aiPredictionName: original.name,
        aiConfidence: original.confidence ? Number(original.confidence.toFixed(2)) : null,
        userCorrection: correction,
        finalFoodName: final.name,
        finalPortionG: extractGrams(final.serving),
        finalCalories: final.calories,
        finalProteinG: final.proteinG ? Math.round(final.proteinG) : null,
        finalCarbsG: final.carbsG ? Math.round(final.carbsG) : null,
        finalFatG: final.fatG ? Math.round(final.fatG) : null,
      },
    })
  } catch (err) {
    logger.warn({ err, userId }, 'failed to log photo correction')
  }
}

function extractGrams(serving: string): number | null {
  const match = serving.match(/(\d+(?:\.\d+)?)\s*g/)
  return match ? Math.round(Number(match[1])) : null
}
