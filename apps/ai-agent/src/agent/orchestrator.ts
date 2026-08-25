import crypto from 'node:crypto'
import { prisma } from '@snapcal/database'
import { getRedis, logger } from '@snapcal/shared'
import { resolveSkill } from './promptResolver.js'
import type { ChatInput, ChatOutput, ToolContext } from '../types/index.js'
import { callLlm, callVisionLlm } from '../llm/client.js'
import { applyGuardrails, containsPromptLeakage, isPromptInjection, sanitizeUserInput } from '../guardrails/index.js'
import { estimateCost, recordAiUsage } from '../lib/limits.js'
import { estimateTokens } from '../llm/client.js'
import { routeSkillLlm } from './router.js'
import { aiCostTotal, aiErrorsTotal, aiLatencyHistogram, aiRequestsTotal } from '../lib/metrics.js'
import { auditLog } from '../audit/index.js'
import { updateMemory } from '../memory/index.js'
import { getUserSummary, searchKnowledge, recommendProgram, analyzePhoto, logFood, logActivity, webSearch } from '../tools/index.js'
import { correctFoodMacrosWithUsda } from '../lib/foodNutrition.js'

const FALLBACK_MODEL = 'gpt-4o-mini'
const MAX_OUTPUT_TOKENS = 1024
const VISION_CACHE_TTL_SECONDS = 60 * 60 * 24 // 24h
const redis = getRedis()

function visionCacheKey(imageUrl: string): string {
  return `vision-cache:${crypto.createHash('sha256').update(imageUrl).digest('hex')}`
}

async function getCachedVisionResult(imageUrl: string): Promise<string | null> {
  try {
    return await redis.get(visionCacheKey(imageUrl))
  } catch (err) {
    logger.warn({ err }, 'vision cache read failed')
    return null
  }
}

async function setCachedVisionResult(imageUrl: string, content: string): Promise<void> {
  try {
    await redis.setex(visionCacheKey(imageUrl), VISION_CACHE_TTL_SECONDS, content)
  } catch (err) {
    logger.warn({ err }, 'vision cache write failed')
  }
}

async function findRecentFoodLog(userId: string, imageUrl: string): Promise<{ name: string; calories: number; proteinG: number; carbsG: number; fatG: number } | null> {
  try {
    const recent = await prisma.foodLog.findFirst({
      where: { userId, aiAnalyzed: true },
      orderBy: { loggedAt: 'desc' },
      take: 1,
    })
    if (recent) {
      return {
        name: recent.name,
        calories: recent.calories,
        proteinG: recent.proteinG ?? 0,
        carbsG: recent.carbsG ?? 0,
        fatG: recent.fatG ?? 0,
      }
    }
  } catch (err) {
    logger.warn({ err, userId }, 'failed to look up recent food log')
  }
  return null
}

function buildFallbackFoodAnalysis(): string {
  return JSON.stringify({
    name: 'Could not identify food',
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    serving: 'unknown',
    suggestedMealType: 'SNACK',
    note: 'AI vision service temporarily unavailable. Please try again or describe the food in text.',
  })
}

function safeParseFoodJson(content: string): { name: string; calories: number; proteinG: number; carbsG: number; fatG: number; serving: string; suggestedMealType: string } | null {
  try {
    const raw = JSON.parse(content)
    if (!raw || typeof raw.name !== 'string') return null
    return {
      name: raw.name,
      calories: Number(raw.calories) || 0,
      proteinG: Number(raw.proteinG) || 0,
      carbsG: Number(raw.carbsG) || 0,
      fatG: Number(raw.fatG) || 0,
      serving: String(raw.serving || '1 portion'),
      suggestedMealType: String(raw.suggestedMealType || 'SNACK'),
    }
  } catch {
    return null
  }
}

interface RouteResult {
  skillName: string
  toolNames: string[]
  confidence: number
}

async function routeSkillRegex(input: ChatInput): Promise<RouteResult> {
  if (!input.message?.trim()) {
    return { skillName: 'coach', toolNames: [], confidence: 1 }
  }

  const lower = input.message.toLowerCase()
  const hasImage = input.attachments?.some((a) => a.type === 'image')
  const hasVoice = input.attachments?.some((a) => a.type === 'audio')

  if (hasImage) return { skillName: 'food_vision', toolNames: ['analyzePhoto'], confidence: 0.9 }
  if (hasVoice) return { skillName: 'nutrition', toolNames: [], confidence: 0.6 }
  if (/\b(weight|goal|plan|program|workout|exercise|training)\b/i.test(lower)) return { skillName: 'fitness', toolNames: ['recommendProgram'], confidence: 0.75 }
  if (/\b(calorie|kcal|meal|food|eat|ate|breakfast|lunch|dinner|snack)\b/i.test(lower)) return { skillName: 'nutrition', toolNames: ['logFood', 'searchKnowledge'], confidence: 0.8 }

  return { skillName: 'coach', toolNames: [], confidence: 0.55 }
}

interface OrchestratorRouteResult {
  skillName: import('./router.js').SkillName
  toolNames: string[]
  confidence: number
}

async function routeSkill(input: ChatInput): Promise<OrchestratorRouteResult> {
  const result = await routeSkillLlm(input, () => routeSkillRegex(input))
  return result as unknown as OrchestratorRouteResult
}

async function runTools(toolNames: string[], context: ToolContext): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {}
  for (const name of toolNames) {
    switch (name) {
      case 'getUserSummary':
        results[name] = await getUserSummary(context)
        break
      case 'searchKnowledge':
        results[name] = await searchKnowledge(context)
        break
      case 'recommendProgram':
        results[name] = await recommendProgram(context)
        break
      case 'analyzePhoto':
        results[name] = await analyzePhoto(context)
        break
      case 'logFood':
        results[name] = await logFood(context)
        break
      case 'logActivity':
        results[name] = await logActivity(context)
        break
      case 'webSearch':
        results[name] = await webSearch(context)
        break
      default:
        results[name] = { success: false, error: 'Unknown tool' }
    }
  }
  return results
}

function getUserLanguage(user: { languageCode?: string | null; regionCode?: string | null } | null): string {
  return user?.languageCode ?? 'en'
}

async function saveAiResponse(
  userId: string,
  content: string,
  skillName: string,
  modelUsed: string,
  startTime: number,
): Promise<ChatOutput> {
  const chat = await prisma.chatMessage.create({
    data: {
      userId,
      role: 'AI',
      content,
      modelUsed,
      latencyMs: Date.now() - startTime,
    },
  })

  void auditLog({
    userId,
    action: 'AI_CHAT',
    metadata: {
      skillName,
      modelUsed,
      latencyMs: Date.now() - startTime,
      confidence: 1,
      toolsUsed: [],
    },
  })

  const latencySeconds = (Date.now() - startTime) / 1000
  aiLatencyHistogram.observe({ skill: skillName, model: modelUsed }, latencySeconds)
  aiRequestsTotal.inc({ skill: skillName, model: modelUsed, status: 'success' })

  return {
    message: {
      id: chat.id,
      role: 'ai',
      content,
      type: 'text',
      modelUsed,
      usedFallback: false,
      skillName,
      confidence: 1,
    },
  }
}

export async function handleChat(input: ChatInput): Promise<ChatOutput> {
  const { userId, message, attachments } = input
  const start = Date.now()

  if ((message?.length ?? 0) > 12000) {
    return { message: { id: 'rejected', role: 'ai', content: 'Your message is too long. Please keep it under 4000 characters.' } }
  }

  const safeMessage = message ? sanitizeUserInput(message) : ''
  if (safeMessage && isPromptInjection(safeMessage)) {
    void auditLog({ userId, action: 'PROMPT_INJECTION_BLOCKED', metadata: { preview: safeMessage.slice(0, 200) } })
    return { message: { id: 'blocked', role: 'ai', content: 'I cannot process this request. Please ask a nutrition or fitness question.' } }
  }

  // Fast-path greetings: avoid LLM latency for small talk
  const greetingMatch = safeMessage.match(/^(привет|здравствуй|здравствуйте|приветствую|hi|hello|hey|hola)\s*[!.?]*$/i)
  if (greetingMatch && !attachments?.length) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, languageCode: true } })
    const name = user?.firstName ? `, ${user.firstName}` : ''
    const lang = user?.languageCode ?? 'en'
    const greeting = lang === 'ru'
      ? `Привет${name}! Я SnapCal AI — ваш персональный нутрициолог и фитнес-коуч. Спрашивайте про питание, тренировки или пришлите фото еды, и я рассчитаю калории.`
      : `Hi${name}! I'm SnapCal AI — your personal nutritionist and fitness coach. Ask about nutrition, workouts, or send a food photo and I'll estimate the calories.`
    return saveAiResponse(userId, greeting, 'coach', 'greeting', start)
  }

  const route = await routeSkill(input)
  const hasImage = input.attachments?.some((a) => a.type === 'image')
  // Never treat a text-only message as a photo-analysis request.
  if (route.skillName === 'food_vision' && !hasImage) {
    route.skillName = 'nutrition'
    route.toolNames = route.toolNames.filter((n) => n !== 'analyzePhoto')
    if (route.toolNames.length === 0) {
      route.toolNames = ['getUserSummary', 'searchKnowledge', 'webSearch']
    }
  }
  const skill = await resolveSkill(route.skillName as any)
  if (!skill) {
    return { message: { id: 'unavailable', role: 'ai', content: 'This feature is temporarily unavailable.' } }
  }

  const userFromInput = input.user
  const user = userFromInput
    ? (userFromInput as any)
    : await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      })
  if (!user) {
    return { message: { id: 'unauthorized', role: 'ai', content: 'User not found. Please log in again.' } }
  }

  const context: ToolContext = {
    userId,
    message: message ?? '',
    attachments,
    metadata: {
      language: getUserLanguage(user),
      subscriptionStatus: user.subscriptionStatus,
      region: user.regionCode ?? undefined,
    },
  }

  // Skip knowledge search for pure coaching/small-talk to reduce latency
  const shouldSearchKnowledge = route.skillName === 'nutrition' || route.skillName === 'fitness' || route.skillName === 'marketplace'
  const shouldWebSearch = shouldSearchKnowledge
  const toolNames = shouldSearchKnowledge
    ? route.toolNames
    : route.toolNames.filter((n) => n !== 'searchKnowledge' && n !== 'webSearch')
  const toolResults = await runTools(toolNames, context)

  const history = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const facts = await prisma.userFact.findMany({ where: { userId } })

  const systemPrompt = `${skill.systemPrompt}

User profile and facts:
${facts.map((f: { key: string; value: string }) => `- ${f.key}: ${f.value}`).join('\n')}

Available tool data:
${JSON.stringify(toolResults, null, 2)}

Recent chat history (newest first):
${history.map((h: { role: string; content: string }) => `${h.role}: ${h.content.slice(0, 200)}`).join('\n')}

Respond in a helpful, concise way in the user's language. Do not provide medical diagnoses. Keep your answer under 3 paragraphs.

When answering nutrition or fitness questions, prefer web search results for fresh facts and numbers.`

  const model = skill.allowedModels[0] ?? FALLBACK_MODEL
  let content = ''
  let modelUsed = model
  let errorMessage = ''

  if (route.skillName === 'food_vision') {
    try {
      const imageUrl = context.attachments?.find((a) => a.type === 'image')?.url
      if (imageUrl) {
        const cached = await getCachedVisionResult(imageUrl)
        if (cached) {
          content = cached
          modelUsed = 'cached'
        } else {
          // Fallback: try user's recent analyzed food logs first for speed
          const recent = await findRecentFoodLog(userId, imageUrl)
          if (recent) {
            content = JSON.stringify({ ...recent, serving: '1 portion', suggestedMealType: 'SNACK' })
            modelUsed = 'recent-log'
          } else {
            const visionResult = await callVisionLlm(imageUrl)
            let parsed = safeParseFoodJson(visionResult.content)
            if (parsed) {
              const corrected = await correctFoodMacrosWithUsda(parsed.name, parsed.serving, {
                calories: parsed.calories,
                proteinG: parsed.proteinG,
                carbsG: parsed.carbsG,
                fatG: parsed.fatG,
              })
              if (corrected) {
                parsed = { ...parsed, ...corrected }
                modelUsed = `${visionResult.model}+USDA`
              } else {
                modelUsed = visionResult.model
              }
            }
            content = JSON.stringify(parsed ?? visionResult.content)
            modelUsed = modelUsed || visionResult.model
            await setCachedVisionResult(imageUrl, content)
          }
        }
      } else {
        content = JSON.stringify({ error: 'No image provided' })
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Vision error'
      logger.error({ err, userId }, `Vision analysis failed: ${errorMessage}`)
      content = buildFallbackFoodAnalysis()
      modelUsed = 'fallback'
    }
  } else {
    try {
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...(safeMessage ? [{ role: 'user' as const, content: safeMessage }] : []),
      ]
      const result = await callLlm(model, messages, MAX_OUTPUT_TOKENS)
      content = result.content
      modelUsed = result.model
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'OpenRouter error'
    }
  }

  // Summarize tool execution results to the user so they know something was logged
  const loggedResults = Object.entries(toolResults)
    .filter(([name]) => name === 'logFood' || name === 'logActivity')
    .map(([_, result]) => result)

  if (loggedResults.length > 0) {
    const confirmations = loggedResults
      .filter((r: any) => r?.success)
      .map((r: any) => {
        if (r.data?.foodData) return `✅ Logged ${r.data.foodData.name} (${r.data.foodData.calories} kcal)`
        if (r.data?.activity) return `✅ Logged ${r.data.activity.type} for ${r.data.activity.durationMin} min`
        return ''
      })
      .filter(Boolean)
      .join('\n')

    if (confirmations) {
      content = `${content}\n\n${confirmations}`
    }
  }

  if (!content && errorMessage) {
    return { message: { id: 'error', role: 'ai', content: 'AI service is temporarily unavailable. Please try again in a moment.' } }
  }

  if (containsPromptLeakage(content)) {
    void auditLog({ userId, action: 'PROMPT_LEAKAGE_BLOCKED', metadata: { preview: content.slice(0, 200) } })
    content = 'I can only help with nutrition and fitness questions. How can I assist you today?'
  }

  content = applyGuardrails(content, route.skillName)

  const chat = await prisma.chatMessage.create({
    data: {
      userId,
      role: 'AI',
      content,
      modelUsed,
      latencyMs: Date.now() - start,
    },
  })

  void auditLog({
    userId,
    action: 'AI_CHAT',
    metadata: {
      skillName: route.skillName,
      modelUsed,
      latencyMs: Date.now() - start,
      confidence: route.confidence,
      toolsUsed: route.toolNames,
      inputTokens: estimateTokens(systemPrompt + (message ?? '')),
      outputTokens: estimateTokens(content),
      estimatedCostUsd: estimateCost(modelUsed, estimateTokens(systemPrompt + (message ?? '')), estimateTokens(content)),
    },
  })

  const latencySeconds = (Date.now() - start) / 1000
  aiLatencyHistogram.observe({ skill: route.skillName, model: modelUsed }, latencySeconds)
  aiRequestsTotal.inc({ skill: route.skillName, model: modelUsed, status: errorMessage ? 'error' : 'success' })
  if (errorMessage) {
    aiErrorsTotal.inc({ skill: route.skillName, error_type: errorMessage.includes('timeout') ? 'timeout' : 'provider' })
  }

  const estimatedCostUsd = estimateCost(modelUsed, estimateTokens(systemPrompt + (message ?? '')), estimateTokens(content))
  aiCostTotal.inc({ model: modelUsed, provider: 'openrouter' }, estimatedCostUsd)

  if (route.skillName === 'food_vision' || route.skillName === 'nutrition') {
    const inputTokens = estimateTokens(systemPrompt + (message ?? ''))
    const outputTokens = estimateTokens(content)
    void recordAiUsage(userId, inputTokens, outputTokens, modelUsed, 'openrouter').catch(() => undefined)
  }

  void updateMemory(userId, content)

  return {
    message: {
      id: chat.id,
      role: 'ai',
      content,
      type: 'text',
      modelUsed,
      usedFallback: !!errorMessage,
      skillName: route.skillName,
      confidence: route.confidence,
    },
  }
}

export async function analyzeFoodPhoto(userId: string, imageUrl: string): Promise<ChatOutput> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  })
  if (!user) {
    return { message: { id: 'unauthorized', role: 'ai', content: 'User not found. Please log in again.' } }
  }
  return handleChat({ userId, messageId: crypto.randomUUID(), message: 'Analyze this food photo', attachments: [{ type: 'image', url: imageUrl }], user })
}
