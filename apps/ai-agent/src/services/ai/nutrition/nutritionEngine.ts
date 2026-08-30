import type { VisionAnalysis } from '../vision/schema.js'
import type { ResolvedFood } from './foodResolver.js'
import type { FoodRecord } from './foodDatabase.js'
import type { KnowledgeDish } from '../../../lib/knowledgeBase.js'

export interface NutritionResult {
  name: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  serving: string
  estimatedPortionG: number
  source: string
  confidence: number
}

const REASONABLE_PORTION_MIN = 50
const REASONABLE_PORTION_MAX = 1500

export function calculateNutrition(
  analysis: VisionAnalysis,
  resolved: ResolvedFood,
): NutritionResult {
  const portionG = clampPortion(analysis.estimatedPortionG ?? estimatePortionFromComponents(analysis))

  // 1. If we have food database record, use per-100g values
  if (resolved.foodRecord) {
    const macros = scaleMacros(resolved.foodRecord, portionG)
    return {
      name: resolved.foodRecord.name,
      ...macros,
      serving: formatServing(portionG),
      estimatedPortionG: portionG,
      source: `food_database${resolved.foodRecord.verified ? '' : '_unverified'}`,
      confidence: analysis.overallConfidence,
    }
  }

  // 2. If we have knowledge base dish, use its macros
  if (resolved.knowledgeDish) {
    const macros = scaleMacrosFromKnowledge(resolved.knowledgeDish, portionG)
    return {
      name: resolved.knowledgeDish.title,
      ...macros,
      serving: formatServing(portionG),
      estimatedPortionG: portionG,
      source: 'knowledge_base',
      confidence: analysis.overallConfidence,
    }
  }

  // 3. Fallback: deterministic estimate from components if provided, else rough heuristic
  const macros = estimateFromComponents(analysis, portionG)
  return {
    name: resolved.name,
    ...macros,
    serving: formatServing(portionG),
    estimatedPortionG: portionG,
    source: 'vision_components',
    confidence: analysis.overallConfidence,
  }
}

function clampPortion(g: number): number {
  if (!Number.isFinite(g)) return 250
  return Math.max(REASONABLE_PORTION_MIN, Math.min(REASONABLE_PORTION_MAX, Math.round(g)))
}

function estimatePortionFromComponents(analysis: VisionAnalysis): number {
  const total = analysis.components?.reduce((sum, c) => sum + (c.estimatedWeightG || 0), 0) ?? 0
  if (total > 0) return total
  return 250
}

function formatServing(g: number): string {
  return `1 portion ~${g} g`
}

function scaleMacros(food: FoodRecord, portionG: number): { calories: number; proteinG: number; carbsG: number; fatG: number } {
  const factor = portionG / 100
  return {
    calories: Math.round(food.kcalPer100g * factor),
    proteinG: Math.round(food.proteinPer100g * factor * 10) / 10,
    carbsG: Math.round(food.carbsPer100g * factor * 10) / 10,
    fatG: Math.round(food.fatPer100g * factor * 10) / 10,
  }
}

function scaleMacrosFromKnowledge(dish: KnowledgeDish, portionG: number): { calories: number; proteinG: number; carbsG: number; fatG: number } {
  // KB dish macros are usually for a standard portion; scale if we know its serving
  const standardG = extractGrams(dish.serving) || 300
  const factor = portionG / standardG
  return {
    calories: Math.round(dish.calories * factor),
    proteinG: Math.round(dish.proteinG * factor * 10) / 10,
    carbsG: Math.round(dish.carbsG * factor * 10) / 10,
    fatG: Math.round(dish.fatG * factor * 10) / 10,
  }
}

function estimateFromComponents(analysis: VisionAnalysis, portionG: number): { calories: number; proteinG: number; carbsG: number; fatG: number } {
  if (analysis.components?.length) {
    const total = analysis.components.reduce(
      (acc, c) => {
        // Rough per-100g heuristic by ingredient name
        const per100 = heuristicMacros(c.name)
        const factor = clampPortion(c.estimatedWeightG) / 100
        return {
          calories: acc.calories + per100.calories * factor,
          proteinG: acc.proteinG + per100.proteinG * factor,
          carbsG: acc.carbsG + per100.carbsG * factor,
          fatG: acc.fatG + per100.fatG * factor,
        }
      },
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    )
    return {
      calories: Math.round(total.calories),
      proteinG: Math.round(total.proteinG * 10) / 10,
      carbsG: Math.round(total.carbsG * 10) / 10,
      fatG: Math.round(total.fatG * 10) / 10,
    }
  }

  // No components at all: fallback to a generic per-100g meal estimate scaled to portion
  const factor = portionG / 100
  return {
    calories: Math.round(180 * factor),
    proteinG: Math.round(10 * factor * 10) / 10,
    carbsG: Math.round(20 * factor * 10) / 10,
    fatG: Math.round(7 * factor * 10) / 10,
  }
}

function heuristicMacros(ingredient: string): { calories: number; proteinG: number; carbsG: number; fatG: number } {
  const name = ingredient.toLowerCase()
  if (/rice|bread|pasta|potato|grain|couscous|bulgur/.test(name)) return { calories: 130, proteinG: 3, carbsG: 28, fatG: 0.5 }
  if (/chicken|turkey/.test(name)) return { calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6 }
  if (/beef|lamb|steak/.test(name)) return { calories: 250, proteinG: 26, carbsG: 0, fatG: 17 }
  if (/fish|salmon|tuna/.test(name)) return { calories: 200, proteinG: 25, carbsG: 0, fatG: 10 }
  if (/oil|butter|mayo/.test(name)) return { calories: 900, proteinG: 0, carbsG: 0, fatG: 100 }
  if (/nut|almond|walnut/.test(name)) return { calories: 600, proteinG: 20, carbsG: 20, fatG: 50 }
  if (/vegetable|salad|tomato|cucumber|lettuce|carrot|pepper/.test(name)) return { calories: 35, proteinG: 1.5, carbsG: 6, fatG: 0.3 }
  if (/fruit|apple|banana|berry/.test(name)) return { calories: 60, proteinG: 0.5, carbsG: 15, fatG: 0.2 }
  if (/sauce|ketchup|dressing/.test(name)) return { calories: 150, proteinG: 1, carbsG: 20, fatG: 7 }
  return { calories: 120, proteinG: 5, carbsG: 15, fatG: 4 }
}

function extractGrams(serving: string): number | null {
  const match = serving.match(/(\d+(?:\.\d+)?)\s*g/)
  if (match) return Number(match[1])
  return null
}

export function sanityCheckMacros(result: NutritionResult): NutritionResult {
  const expected = result.proteinG * 4 + result.carbsG * 4 + result.fatG * 9
  if (expected <= 0 || result.calories <= 0) return result
  const diff = Math.abs(result.calories - expected) / result.calories
  if (diff > 0.25) {
    // Recalibrate calories from macros to keep formula consistent
    return { ...result, calories: Math.round(expected) }
  }
  return result
}
