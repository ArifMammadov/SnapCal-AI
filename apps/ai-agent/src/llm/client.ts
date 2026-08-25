import axios from 'axios'
import { env } from '../lib/env.js'
import { logger } from '@snapcal/shared'

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | unknown[]
}

interface LlmResponse {
  content: string
  model: string
  provider: string
  tokensInput?: number
  tokensOutput?: number
}

interface ProviderCall {
  name: string
  call: () => Promise<LlmResponse>
}

class CircuitBreaker {
  private failures = 0
  private lastFailureTime?: number
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private readonly failureThreshold = 5,
    private readonly recoveryTimeoutMs = 30000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - (this.lastFailureTime ?? 0) > this.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (err) {
      this.onFailure()
      throw err
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failures += 1
    this.lastFailureTime = Date.now()
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }
}

const openRouterBreaker = new CircuitBreaker(3, 30000)

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, baseDelayMs = 500): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt === retries) break
      await sleep(baseDelayMs * 2 ** attempt)
    }
  }
  throw lastError
}

function authHeader(): string {
  return `Bearer ${env.OPENROUTER_API_KEY}`
}

async function callOpenRouterProvider(model: string, messages: LlmMessage[], maxTokens = 1024, temperature = 0.7): Promise<LlmResponse> {
  const { data } = await axios.post(
    `${env.OPENROUTER_BASE_URL}/chat/completions`,
    {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    },
    {
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  )

  return {
    content: data.choices?.[0]?.message?.content ?? '',
    model: data.model ?? model,
    provider: 'openrouter',
  }
}

async function callOllamaProvider(model: string, messages: LlmMessage[]): Promise<LlmResponse> {
  if (!env.OLLAMA_BASE_URL) {
    throw new Error('Ollama not configured')
  }

  const { data } = await axios.post(
    `${env.OLLAMA_BASE_URL}/api/chat`,
    {
      model,
      messages,
      stream: false,
    },
    { timeout: 60000 }
  )

  return {
    content: data.message?.content ?? '',
    model,
    provider: 'ollama',
  }
}

export async function callLlm(model: string, messages: LlmMessage[], maxTokens = 1024, temperature = 0.7): Promise<LlmResponse> {
  const providers: ProviderCall[] = [
    {
      name: 'openrouter',
      call: () => openRouterBreaker.execute(() => retryWithBackoff(() => callOpenRouterProvider(model, messages, maxTokens, temperature))),
    },
  ]

  if (env.OLLAMA_BASE_URL) {
    providers.push({
      name: 'ollama',
      call: () => retryWithBackoff(() => callOllamaProvider(model.replace('openai/', '').replace('anthropic/', '').replace('mistralai/', ''), messages)),
    })
  }

  let lastError: unknown
  for (const provider of providers) {
    try {
      return await provider.call()
    } catch (err) {
      lastError = err
      // continue to next provider
    }
  }

  throw lastError
}

export function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token for English, ~2 for CJK
  return Math.ceil(text.length / (isCjk(text) ? 2 : 4))
}

function isCjk(text: string): boolean {
  return /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(text)
}

export async function callVisionLlm(imageUrl: string): Promise<LlmResponse> {
  const messages: LlmMessage[] = [
    {
      role: 'system',
      content:
        'You are a food recognition expert. Analyze the food photo and return ONLY a valid JSON object with no markdown formatting. Fields: name (string), calories (integer), proteinG (number), carbsG (number), fatG (number), serving (string, e.g. "1 plate"), suggestedMealType (one of: BREAKFAST, LUNCH, DINNER, SNACK).',
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What food is in this photo and what are its macros?' },
        { type: 'image_url', image_url: { url: imageUrl, detail: 'auto' } },
      ],
    },
  ]

  const visionModel = env.VISION_MODEL
  const fallbackModel = 'openai/gpt-4o-mini'

  for (const model of [visionModel, fallbackModel]) {
    try {
      const { data } = await axios.post(
        `${env.OPENROUTER_BASE_URL}/chat/completions`,
        {
          model,
          messages,
          max_tokens: 256,
          temperature: 0.2,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: authHeader(),
            'Content-Type': 'application/json',
          },
          timeout: 25000,
        }
      )

      const content = data.choices?.[0]?.message?.content ?? ''
      if (content) {
        return { content, model, provider: 'openrouter' }
      }
    } catch (err) {
      logger.warn({ err, model }, 'vision model failed, trying fallback')
    }
  }

  throw new Error('All vision models failed')
}
