import axios from 'axios'
import { env } from '../lib/env.js'

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  model?: string
}

export async function callOpenRouter(model: string, messages: OpenRouterMessage[], _maxTokens?: number) {
  const { data } = await axios.post<OpenRouterResponse>(
    `${env.OPENROUTER_BASE_URL}/chat/completions`,
    {
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  )

  return {
    content: data.choices[0]?.message?.content ?? '',
    model: data.model ?? model,
  }
}

export async function callOpenRouterVision(imageUrl: string): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content:
        'You are a food recognition expert. Analyze the food photo and return ONLY a valid JSON object with no markdown formatting. Fields: name (string), calories (integer), proteinG (number), carbsG (number), fatG (number), serving (string, e.g. "1 plate"), suggestedMealType (one of: BREAKFAST, LUNCH, DINNER, SNACK).',
    },
    {
      role: 'user' as const,
      content: [
        { type: 'text', text: 'What food is in this photo and what are its macros?' },
        { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
      ],
    },
  ]

  const { data } = await axios.post<OpenRouterResponse>(
    `${env.OPENROUTER_BASE_URL}/chat/completions`,
    {
      model: 'openai/gpt-4o',
      messages,
      max_tokens: 512,
      temperature: 0.2,
    },
    {
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  )

  return data.choices[0]?.message?.content ?? ''
}

export async function callOllama(model: string, messages: OpenRouterMessage[]) {
  if (!env.OLLAMA_BASE_URL) {
    return { content: '', model }
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
  }
}
