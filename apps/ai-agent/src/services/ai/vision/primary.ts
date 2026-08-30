import { env } from '../../../lib/env.js'
import { getVisionProvider, type VisionProviderResponse } from './providers.js'
import { visionAnalysisSchema, type VisionAnalysis } from './schema.js'
import { logger } from '@snapcal/shared'

const PRIMARY_SYSTEM_PROMPT = `You are a strict food-recognition expert. Analyze the food photo and return ONLY a single valid JSON object. No markdown, no prose.

Your job is to identify the dish and its visible components. You do NOT compute final calories/macros.

Required JSON shape:
{
  "mealType": "main_dish",
  "dishName": "specific dish name in English or the dish's local name if it is clearly regional",
  "dishCandidates": [
    { "name": "most likely dish", "confidence": 0.92 },
    { "name": "second likely", "confidence": 0.45 }
  ],
  "components": [
    { "name": "rice", "estimatedWeightG": 250, "confidence": 0.88 },
    { "name": "beef", "estimatedWeightG": 70, "confidence": 0.75 }
  ],
  "overallConfidence": 0.0-1.0,
  "dishConfidence": 0.0-1.0,
  "ingredientConfidence": 0.0-1.0,
  "portionConfidence": 0.0-1.0,
  "needsClarification": false,
  "clarificationQuestions": [],
  "estimatedPortionG": 420,
  "cuisine": "regional cuisine if known (e.g. Turkish, Azerbaijani, Uzbek, Arabic, Russian)",
  "notes": "optional short note"
}

Rules:
- dishName must be specific. Never use generic names like "Mixed meal", "Meal", "Food", "Dish", "Plate".
- If unsure between similar dishes (doner/shawarma/gyros), pick the most likely and list alternatives in dishCandidates.
- estimatedWeightG is for the WHOLE portion of that component visible in the photo.
- overallConfidence should reflect dish + ingredients + portion certainty combined.
- If you cannot identify anything, set dishName to your best guess (e.g. "stewed meat and rice") and confidence below 0.5.
- Do not invent ingredients not visible.
- Respond in English for JSON values. Cuisine/local names may use original language if obvious.`

export async function analyzePrimaryVision(imageUrl: string): Promise<{ analysis: VisionAnalysis; response: VisionProviderResponse }> {
  const provider = getVisionProvider()
  const response = await provider.analyze(imageUrl, PRIMARY_SYSTEM_PROMPT, 768)

  const parsed = safeParseVisionJson(response.content)
  if (!parsed) {
    logger.warn({ content: response.content.slice(0, 200) }, 'primary vision returned malformed JSON')
    throw new Error('Primary vision response malformed')
  }

  return { analysis: parsed, response }
}

function safeParseVisionJson(content: string): VisionAnalysis | null {
  const cleaned = content.replace(/^```json\s*|\s*```$/g, '').trim()
  try {
    const json = JSON.parse(cleaned)
    const result = visionAnalysisSchema.safeParse(json)
    if (result.success) return result.data
    logger.warn({ issues: result.error.issues }, 'primary vision schema validation failed')
    return null
  } catch (err) {
    logger.warn({ err, content: cleaned.slice(0, 200) }, 'primary vision JSON parse failed')
    return null
  }
}
