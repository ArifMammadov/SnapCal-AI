import type { VisionAnalysis } from './vision/schema.js'

export interface RoutingDecision {
  needsAdvanced: boolean
  reason: string
  confidenceBreakdown: {
    dish: number
    ingredients: number
    portion: number
    overall: number
  }
}

export function routeByConfidence(analysis: VisionAnalysis, threshold?: number): RoutingDecision {
  const effectiveThreshold = threshold ?? Number(process.env.AI_CONFIDENCE_THRESHOLD ?? '0.80')
  const dish = analysis.dishConfidence ?? analysis.overallConfidence
  const ingredients = analysis.ingredientConfidence ?? analysis.overallConfidence
  const portion = analysis.portionConfidence ?? analysis.overallConfidence
  const overall = analysis.overallConfidence

  const reasons: string[] = []
  if (dish < effectiveThreshold) reasons.push(`dish confidence ${dish.toFixed(2)} < threshold ${effectiveThreshold}`)
  if (ingredients < effectiveThreshold) reasons.push(`ingredient confidence ${ingredients.toFixed(2)} < threshold ${effectiveThreshold}`)
  if (portion < effectiveThreshold) reasons.push(`portion confidence ${portion.toFixed(2)} < threshold ${effectiveThreshold}`)

  return {
    needsAdvanced: reasons.length > 0,
    reason: reasons.join('; ') || 'all confidence scores above threshold',
    confidenceBreakdown: { dish, ingredients, portion, overall },
  }
}
