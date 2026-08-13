import { callLlm } from '../llm/client.js'
import type { ChatInput } from '../types/index.js'

interface RouteResult {
  skillName: string
  toolNames: string[]
  confidence: number
}

type SkillName = 'onboarding' | 'nutrition' | 'fitness' | 'food_vision' | 'coach' | 'marketplace'

export type { SkillName }

const ROUTER_MODEL = 'openai/gpt-4o-mini'
const ROUTER_PROMPT = `You are a routing classifier for a nutrition and fitness AI assistant.
Available skills and their purposes:
- onboarding: first-time profile collection (age, gender, height, weight, goals, diet, allergies)
- nutrition: food, meals, calories, macros, recipes, diet advice
- fitness: workouts, exercises, training plans, activity recommendations
- food_vision: only when the user attached a food photo
- coach: general motivation, habit building, greetings, small talk
- marketplace: program recommendations with pricing/duration

Rules:
1. If the user attached an image, skill MUST be food_vision.
2. If the message is in Russian or another language, respond in the same language in "reasoning" but keep skillName in English.
3. Choose the single best skill.

Return ONLY a valid JSON object (no markdown) with this exact shape:
{
  "skillName": "one of: onboarding, nutrition, fitness, food_vision, coach, marketplace",
  "confidence": 0.0 to 1.0,
  "reasoning": "short explanation"
}`

function isValidSkill(name: string): name is RouteResult['skillName'] {
  return ['onboarding', 'nutrition', 'fitness', 'food_vision', 'coach', 'marketplace'].includes(name)
}

export async function routeSkillLlm(input: ChatInput, fallback: () => Promise<RouteResult> | RouteResult): Promise<RouteResult> {
  const hasImage = input.attachments?.some((a) => a.type === 'image')
  if (hasImage) {
    return { skillName: 'food_vision', toolNames: ['analyzePhoto'], confidence: 1 }
  }

  try {
    const { content } = await callLlm(
      ROUTER_MODEL,
      [
        { role: 'system', content: ROUTER_PROMPT },
        { role: 'user', content: input.message || '[empty message]' },
      ],
      256,
      0.1,
    )

    const parsed = parseRouterJson(content)
    if (parsed && isValidSkill(parsed.skillName) && parsed.confidence >= 0.7) {
      return { skillName: parsed.skillName, toolNames: defaultToolsForSkill(parsed.skillName), confidence: parsed.confidence }
    }
  } catch (err) {
    // Fall back to regex router on any LLM failure
  }

  return await fallback()
}

function parseRouterJson(content: string): { skillName: string; confidence: number; reasoning?: string } | null {
  try {
    const cleaned = content.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    if (typeof parsed.skillName === 'string' && typeof parsed.confidence === 'number') {
      return parsed
    }
  } catch {
    // ignore
  }
  return null
}

function defaultToolsForSkill(skillName: string): string[] {
  switch (skillName) {
    case 'nutrition':
      return ['getUserSummary', 'searchKnowledge']
    case 'fitness':
      return ['getUserSummary', 'searchKnowledge', 'recommendProgram']
    case 'food_vision':
      return ['analyzePhoto']
    case 'marketplace':
      return ['getUserSummary', 'recommendProgram']
    case 'onboarding':
      return ['getUserSummary']
    default:
      return ['getUserSummary', 'searchKnowledge']
  }
}
