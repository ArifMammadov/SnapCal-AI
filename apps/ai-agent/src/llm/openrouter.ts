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
