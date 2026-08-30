import type { VisionAnalysis } from '../vision/schema.js'
import { findDishInKnowledge, type KnowledgeDish } from '../../../lib/knowledgeBase.js'
import { findFoodByName, findFoodByCuisineAndName, type FoodRecord } from './foodDatabase.js'
import { getFoodPreferences } from '../../../memory/index.js'
import { logger } from '@snapcal/shared'

export interface ResolvedFood {
  name: string
  foodRecord: FoodRecord | null
  knowledgeDish: KnowledgeDish | null
  recentGuess: string | undefined
  confidence: number
  source: 'food_database' | 'knowledge_base' | 'recent' | 'vision_only'
}

export async function resolveFood(
  analysis: VisionAnalysis,
  userId: string,
): Promise<ResolvedFood> {
  const candidates = [
    analysis.dishName,
    ...(analysis.dishCandidates?.map((c) => c.name) ?? []),
  ].filter(Boolean)

  // 1. Try user's recent foods first if top candidate is vague
  const prefs = await getFoodPreferences(userId)
  const recentGuess = prefs.recent[prefs.recent.length - 1]

  // 2. Try food database for each candidate
  for (const candidate of candidates) {
    const byDb = await findFoodByCuisineAndName(analysis.cuisine, candidate)
    if (byDb) {
      return {
        name: byDb.name,
        foodRecord: byDb,
        knowledgeDish: null,
        recentGuess,
        confidence: analysis.overallConfidence,
        source: 'food_database',
      }
    }
  }

  // 3. Try knowledge base (existing semantic search)
  for (const candidate of candidates) {
    try {
      const kb = await findDishInKnowledge(candidate)
      if (kb) {
        return {
          name: kb.title,
          foodRecord: null,
          knowledgeDish: kb,
          recentGuess,
          confidence: analysis.overallConfidence,
          source: 'knowledge_base',
        }
      }
    } catch {
      // ignore KB failures
    }
  }

  // 4. Fallback: vision-only name, with recent guess if available
  return {
    name: analysis.dishName,
    foodRecord: null,
    knowledgeDish: null,
    recentGuess,
    confidence: analysis.overallConfidence,
    source: 'vision_only',
  }
}
