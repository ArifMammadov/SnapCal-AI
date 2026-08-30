import { describe, it, expect } from 'vitest'
import { calculateNutrition, sanityCheckMacros } from './nutritionEngine.js'
import type { VisionAnalysis } from '../vision/schema.js'
import type { ResolvedFood } from './foodResolver.js'

describe('Nutrition Engine', () => {
  const appleAnalysis: VisionAnalysis = {
    mealType: 'snack',
    dishName: 'Apple',
    dishCandidates: [{ name: 'Apple', confidence: 0.95 }],
    components: [{ name: 'apple', estimatedWeightG: 180, confidence: 0.92 }],
    overallConfidence: 0.95,
    dishConfidence: 0.95,
    ingredientConfidence: 0.92,
    portionConfidence: 0.9,
    needsClarification: false,
    clarificationQuestions: [],
    estimatedPortionG: 180,
  }

  const appleFood = {
    name: 'Apple',
    foodRecord: {
      id: '1', name: 'Apple', normalizedName: 'apple', aliases: [], category: 'fruit', cuisine: 'International',
      kcalPer100g: 52, proteinPer100g: 0.3, fatPer100g: 0.2, carbsPer100g: 14,
      servingSizeG: 100, fiberPer100g: 2.4, source: 'seed', verified: true,
      country: null,
    },
    knowledgeDish: null,
    recentGuess: undefined,
    confidence: 0.95,
    source: 'food_database' as const,
  } satisfies ResolvedFood

  it('calculates macros from food database per-100g values', () => {
    const result = calculateNutrition(appleAnalysis, appleFood)
    expect(result.name).toBe('Apple')
    expect(result.calories).toBe(Math.round(52 * 1.8))
    expect(result.source).toContain('food_database')
  })

  it('recalibrates inconsistent calories from macros', () => {
    const bad = { name: 'Apple', calories: 500, proteinG: 0.5, carbsG: 25, fatG: 0.4, serving: '180 g', estimatedPortionG: 180, source: 'food_database', confidence: 0.9 }
    const fixed = sanityCheckMacros(bad)
    expect(fixed.calories).toBe(Math.round(0.5 * 4 + 25 * 4 + 0.4 * 9))
  })

  it('clamps unrealistic portions', () => {
    const huge: VisionAnalysis = { ...appleAnalysis, estimatedPortionG: 999999 }
    const result = calculateNutrition(huge, appleFood)
    expect(result.estimatedPortionG).toBeLessThanOrEqual(1500)
  })
})
