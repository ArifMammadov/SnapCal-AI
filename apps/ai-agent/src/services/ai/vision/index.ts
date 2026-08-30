import type { FoodAnalysisData } from '../../../types/index.js'
import { preprocessImageFromUrl } from '../imagePreprocessing.js'
import { analyzePrimaryVision } from './primary.js'
import { analyzeAdvancedVision } from './advanced.js'
import { routeByConfidence } from '../confidenceRouter.js'
import { resolveFood } from '../nutrition/foodResolver.js'
import { calculateNutrition, sanityCheckMacros } from '../nutrition/nutritionEngine.js'
import { recordAiRequestAnalytics } from '../analytics.js'
import { env } from '../../../lib/env.js'
import { logger } from '@snapcal/shared'

export interface FoodVisionResult {
  foodData: FoodAnalysisData
  source: 'food_database' | 'knowledge_base' | 'vision_only' | 'recent' | 'fallback'
  route: 'primary' | 'advanced' | 'fallback'
  confidence: number
  modelUsed: string
}

const FALLBACK: FoodAnalysisData = {
  name: 'Unidentified meal',
  calories: 420,
  proteinG: 20,
  carbsG: 45,
  fatG: 18,
  serving: '1 portion ~300 g',
  suggestedMealType: 'LUNCH',
  confidence: 0.4,
  ingredients: ['mixed ingredients'],
  alternativeNames: ['meal'],
}

export async function recognizeFoodFromPhoto(userId: string, imageUrl: string): Promise<FoodVisionResult> {
  const start = Date.now()
  let route: FoodVisionResult['route'] = 'primary'
  let modelUsed = env.AI_PRIMARY_MODEL

  try {
    // Optional backend preprocessing (does not break on failure)
    await preprocessImageFromUrl(imageUrl)

    // Primary vision
    const primary = await analyzePrimaryVision(imageUrl)
    modelUsed = primary.response.model
    let analysis = primary.analysis
    route = 'primary'

    // Confidence routing
    const routing = routeByConfidence(analysis)
    if (routing.needsAdvanced) {
      route = 'advanced'
      const advanced = await analyzeAdvancedVision(imageUrl, analysis)
      analysis = advanced.analysis
      modelUsed = advanced.response.model
    }

    // Food resolution + nutrition calculation (deterministic)
    const resolved = await resolveFood(analysis, userId)
    let nutrition = calculateNutrition(analysis, resolved)
    nutrition = sanityCheckMacros(nutrition)

    const foodData: FoodAnalysisData = {
      name: nutrition.name,
      calories: nutrition.calories,
      proteinG: nutrition.proteinG,
      carbsG: nutrition.carbsG,
      fatG: nutrition.fatG,
      serving: nutrition.serving,
      suggestedMealType: mealTypeFromAnalysis(analysis.mealType),
      confidence: nutrition.confidence,
      ingredients: analysis.components?.map((c: { name: string; estimatedWeightG: number }) => `${c.name} ~${Math.round(c.estimatedWeightG)}g`) ?? [],
      alternativeNames: analysis.dishCandidates?.slice(1).map((c: { name: string }) => c.name) ?? [],
    }

    await recordAiRequestAnalytics({
      userId,
      skillName: 'food_vision',
      model: modelUsed,
      provider: primary.response.provider,
      inputTokens: primary.response.inputTokens,
      outputTokens: primary.response.outputTokens,
      latencyMs: Date.now() - start,
      success: true,
      confidence: nutrition.confidence,
      route,
    })

    return {
      foodData,
      source: resolved.source,
      route,
      confidence: nutrition.confidence,
      modelUsed,
    }
  } catch (err) {
    const errorType = err instanceof Error ? err.constructor.name : 'unknown'
    logger.error({ err, userId, imageUrl }, 'new food recognition pipeline failed, using fallback')
    await recordAiRequestAnalytics({
      userId,
      skillName: 'food_vision',
      model: modelUsed,
      provider: env.AI_PROVIDER,
      latencyMs: Date.now() - start,
      success: false,
      errorType,
      route,
    })
    return {
      foodData: { ...FALLBACK, confidence: 0.3 },
      source: 'fallback',
      route: 'fallback',
      confidence: 0.3,
      modelUsed: 'fallback',
    }
  }
}

function mealTypeFromAnalysis(mealType: string): FoodAnalysisData['suggestedMealType'] {
  switch (mealType?.toLowerCase()) {
    case 'breakfast': return 'BREAKFAST'
    case 'lunch': return 'LUNCH'
    case 'dinner': return 'DINNER'
    case 'snack': return 'SNACK'
    default: return 'LUNCH'
  }
}
