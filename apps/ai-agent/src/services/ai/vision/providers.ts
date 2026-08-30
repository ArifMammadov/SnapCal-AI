import axios from 'axios'
import { env } from '../../../lib/env.js'
import { logger } from '@snapcal/shared'

export interface VisionProviderResponse {
  content: string
  model: string
  provider: string
  inputTokens?: number
  outputTokens?: number
}

export interface VisionProvider {
  name: string
  analyze(imageUrl: string, systemPrompt: string, maxTokens: number): Promise<VisionProviderResponse>
  analyzeBuffer(buffer: Buffer, systemPrompt: string, maxTokens: number): Promise<VisionProviderResponse>
}

function authHeader(): string {
  return `Bearer ${env.OPENROUTER_API_KEY ?? ''}`
}

class OpenRouterVisionProvider implements VisionProvider {
  name = 'openrouter'

  async analyze(imageUrl: string, systemPrompt: string, maxTokens: number): Promise<VisionProviderResponse> {
    const { data } = await axios.post(
      `${env.OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: env.AI_PRIMARY_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this food photo and return structured JSON only.' },
              { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
            ],
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: authHeader(),
          'Content-Type': 'application/json',
        },
        timeout: env.AI_TIMEOUT_MS,
      },
    )

    return extractOpenRouterResponse(data)
  }

  async analyzeBuffer(buffer: Buffer, systemPrompt: string, maxTokens: number): Promise<VisionProviderResponse> {
    const base64 = buffer.toString('base64')
    const { data } = await axios.post(
      `${env.OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: env.AI_PRIMARY_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this food photo and return structured JSON only.' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                  detail: 'low',
                },
              },
            ],
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: authHeader(),
          'Content-Type': 'application/json',
        },
        timeout: env.AI_TIMEOUT_MS,
      },
    )

    return extractOpenRouterResponse(data)
  }
}

function extractOpenRouterResponse(data: any): VisionProviderResponse {
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    model: data.model ?? 'unknown',
    provider: 'openrouter',
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
  }
}

class GeminiVisionProvider implements VisionProvider {
  name = 'gemini'

  async analyze(imageUrl: string, systemPrompt: string, maxTokens: number): Promise<VisionProviderResponse> {
    // If native Gemini key not set, route through OpenRouter with Gemini model name
    if (!env.GEMINI_API_KEY) {
      return new OpenRouterVisionProvider().analyze(imageUrl, systemPrompt, maxTokens)
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({
        model: env.AI_PRIMARY_MODEL.replace(/^google\//, ''),
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
      })

      // Download image and convert to base64 parts
      const { data } = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 })
      const base64 = Buffer.from(data as ArrayBuffer).toString('base64')
      const mimeType = 'image/jpeg'

      const result = await model.generateContent([
        systemPrompt,
        { inlineData: { data: base64, mimeType } },
      ])

      return {
        content: result.response.text() ?? '',
        model: env.AI_PRIMARY_MODEL,
        provider: 'gemini',
      }
    } catch (err) {
      logger.warn({ err }, 'Gemini native failed, falling back to OpenRouter')
      return new OpenRouterVisionProvider().analyze(imageUrl, systemPrompt, maxTokens)
    }
  }

  async analyzeBuffer(buffer: Buffer, systemPrompt: string, maxTokens: number): Promise<VisionProviderResponse> {
    if (!env.GEMINI_API_KEY) {
      return new OpenRouterVisionProvider().analyzeBuffer(buffer, systemPrompt, maxTokens)
    }
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: env.AI_PRIMARY_MODEL.replace(/^google\//, ''),
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
    })
    const result = await model.generateContent([
      systemPrompt,
      { inlineData: { data: buffer.toString('base64'), mimeType: 'image/jpeg' } },
    ])
    return {
      content: result.response.text() ?? '',
      model: env.AI_PRIMARY_MODEL,
      provider: 'gemini',
    }
  }
}

export function getVisionProvider(): VisionProvider {
  if (env.AI_PROVIDER === 'gemini') return new GeminiVisionProvider()
  return new OpenRouterVisionProvider()
}

export async function callVisionProvider(
  imageUrl: string,
  systemPrompt: string,
  model: string,
  maxTokens = 512,
): Promise<VisionProviderResponse> {
  const provider = getVisionProvider()
  const originalPrimary = env.AI_PRIMARY_MODEL
  try {
    ;(env as any).AI_PRIMARY_MODEL = model
    return await provider.analyze(imageUrl, systemPrompt, maxTokens)
  } finally {
    ;(env as any).AI_PRIMARY_MODEL = originalPrimary
  }
}
