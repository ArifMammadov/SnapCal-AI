import { env } from '../../../lib/env.js'
import { getVisionProvider, type VisionProviderResponse } from './providers.js'
import { visionAnalysisSchema, type VisionAnalysis } from './schema.js'
import { logger } from '@snapcal/shared'

const ADVANCED_SYSTEM_PROMPT = `You are a senior food-recognition expert. The primary model was uncertain about this photo. Re-analyze it carefully and return ONLY a single valid JSON object.

Primary model doubts:
- dish candidates and their confidences
- ingredient list and weights
- portion size

Your task:
1. Choose the single most likely specific dish name.
2. List visible ingredients with estimated weights in grams for the WHOLE portion.
3. Estimate total portion weight in grams.
4. Return confidence per category.

Never use generic names like "Mixed meal" or "Food". Prefer specific local name if the dish is clearly regional (e.g. "döner kebab", "uzbek plov", "qutab", "mansaf").

Return ONLY JSON with this shape:
{
  "mealType": "main_dish",
  "dishName": "specific dish name",
  "dishCandidates": [{"name": "...", "confidence": 0.0-1.0}],
  "components": [{"name": "...", "estimatedWeightG": 0-5000, "confidence": 0.0-1.0}],
  "overallConfidence": 0.0-1.0,
  "dishConfidence": 0.0-1.0,
  "ingredientConfidence": 0.0-1.0,
  "portionConfidence": 0.0-1.0,
  "needsClarification": true/false,
  "clarificationQuestions": ["optional question"],
  "estimatedPortionG": 0-5000,
  "cuisine": "regional cuisine",
  "notes": "optional short note"
}`

export async function analyzeAdvancedVision(imageUrl: string, primaryResult: VisionAnalysis): Promise<{ analysis: VisionAnalysis; response: VisionProviderResponse }> {
  const provider = getVisionProvider()
  const prompt = `${ADVANCED_SYSTEM_PROMPT}

Primary model output:
${JSON.stringify(primaryResult, null, 2)}`
  const response = await provider.analyze(imageUrl, prompt, 1024)

  const parsed = safeParseAdvancedJson(response.content)
  if (!parsed) {
    logger.warn({ content: response.content.slice(0, 200) }, 'advanced vision returned malformed JSON')
    throw new Error('Advanced vision response malformed')
  }

  return { analysis: parsed, response }
}

function safeParseAdvancedJson(content: string): VisionAnalysis | null {
  const cleaned = content.replace(/^```json\s*|\s*```$/g, '').trim()
  try {
    const json = JSON.parse(cleaned)
    const result = visionAnalysisSchema.safeParse(json)
    if (result.success) return result.data
    logger.warn({ issues: result.error.issues }, 'advanced vision schema validation failed')
    return null
  } catch {
    return null
  }
}
