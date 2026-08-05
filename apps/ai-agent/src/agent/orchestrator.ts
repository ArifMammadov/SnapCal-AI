import { prisma } from '@snapcal/database'
import { skills } from '../skills/index.js'
import type { ChatInput, ChatOutput, ToolContext } from '../types/index.js'
import { callOpenRouter, callOllama } from '../llm/openrouter.js'
import * as tools from '../tools/index.js'
import { applyGuardrails } from '../guardrails/index.js'

const FALLBACK_MODEL = 'mistralai/mistral-7b-instruct'

export async function classifyIntent(message: string, hasPhoto: boolean): Promise<string> {
  if (hasPhoto) return 'food_vision'

  const prompt = `Classify the user message intent into one of: onboarding, nutrition, fitness, coach, marketplace, food_vision. Only respond with the intent label.

Message: ${message.slice(0, 500)}`

  try {
    const { content } = await callOpenRouter({
      model: 'mistralai/mistral-7b-instruct',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 20,
      temperature: 0.1,
    })
    const intent = content.trim().toLowerCase()
    if (skills[intent]) return intent
  } catch {
    // fallback to local if available
  }

  if (message.toLowerCase().includes('program') || message.toLowerCase().includes('plan')) return 'marketplace'
  if (message.toLowerCase().includes('workout') || message.toLowerCase().includes('run') || message.toLowerCase().includes('gym')) return 'fitness'
  if (message.toLowerCase().includes('eat') || message.toLowerCase().includes('food') || message.toLowerCase().includes('calories')) return 'nutrition'
  return 'coach'
}

export async function handleChat(input: ChatInput): Promise<ChatOutput> {
  const { userId, message, attachments } = input
  const hasPhoto = attachments?.some((a) => a.type === 'image') ?? false
  const skillName = await classifyIntent(message, hasPhoto)
  const skill = skills[skillName] ?? skills.coach

  const toolContext: ToolContext = { userId, message, skillName, attachments }

  const toolResults: Record<string, unknown> = {}
  for (const toolName of skill.tools) {
    const tool = tools[toolName as keyof typeof tools]
    if (tool) {
      const result = await tool(toolContext)
      toolResults[toolName] = result.success ? result.data : { error: result.error }
    }
  }

  const history = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const facts = await prisma.userFact.findMany({ where: { userId } })

  const systemPrompt = `${skill.systemPrompt}

User profile and facts:
${facts.map((f) => `- ${f.key}: ${f.value}`).join('\n')}

Available tool data:
${JSON.stringify(toolResults, null, 2)}

Recent chat history (newest first):
${history.map((h) => `${h.role}: ${h.content.slice(0, 200)}`).join('\n')}

Respond in a helpful, concise way in the user's language. Do not provide medical diagnoses. Keep your answer under 3 paragraphs.`

  const model = skill.allowedModels[0] ?? FALLBACK_MODEL
  let content = ''
  let usedFallback = false
  let tokensInput = 0
  let tokensOutput = 0

  try {
    const result = await callOpenRouter({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      maxTokens: 1500,
      temperature: 0.7,
    })
    content = result.content
    tokensInput = result.tokensInput
    tokensOutput = result.tokensOutput
  } catch (err) {
    usedFallback = true
    const result = await callOllama({
      model: skill.fallbackModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      maxTokens: 1500,
    })
    content = result.content
    tokensInput = result.tokensInput
    tokensOutput = result.tokensOutput
  }

  const safeContent = applyGuardrails(content)

  await prisma.aiAuditLog.create({
    data: {
      userId,
      skillName,
      model,
      provider: usedFallback ? 'ollama' : 'openrouter',
      tokensInput,
      tokensOutput,
      userMessage: message,
      aiResponse: safeContent,
      flagged: false,
    },
  })

  return {
    message: safeContent,
    type: 'text',
    usedFallback,
  }
}

export async function analyzeFoodPhoto(userId: string, imageUrl: string): Promise<ChatOutput> {
  const skill = skills.food_vision
  const systemPrompt = `${skill.systemPrompt}

Return ONLY a JSON object with keys: name, calories, proteinG, carbsG, fatG, serving, suggestedMealType. No other text.`

  const model = 'openai/gpt-4o-vision-preview'
  let content = ''
  let usedFallback = false

  try {
    const result = await callOpenRouter({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: 'Analyze this food photo.' },
          ],
        },
      ],
      maxTokens: 500,
      temperature: 0.2,
    })
    content = result.content
  } catch {
    usedFallback = true
    const result = await callOllama({
      model: 'ollama/llava',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: 'Analyze this food photo.' },
          ],
        },
      ],
      maxTokens: 500,
    })
    content = result.content
  }

  let foodData: ChatOutput['foodData'] | undefined
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      foodData = {
        name: parsed.name ?? 'Unknown food',
        calories: Number(parsed.calories ?? 0),
        proteinG: Number(parsed.proteinG ?? 0),
        carbsG: Number(parsed.carbsG ?? 0),
        fatG: Number(parsed.fatG ?? 0),
        serving: parsed.serving ?? '1 serving',
        suggestedMealType: parsed.suggestedMealType ?? 'snack',
      }
    }
  } catch {
    // keep undefined
  }

  const safeContent = applyGuardrails(content)

  await prisma.aiAuditLog.create({
    data: {
      userId,
      skillName: 'food_vision',
      model,
      provider: usedFallback ? 'ollama' : 'openrouter',
      userMessage: '[food photo]',
      aiResponse: safeContent,
      flagged: false,
    },
  })

  return {
    message: safeContent,
    type: 'food-analysis',
    foodData,
    usedFallback,
  }
}
