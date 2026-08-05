import axios from 'axios'
import { env } from '../lib/env.js'

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[]
}

interface OpenRouterResponse {
  id: string
  model: string
  choices: { message: { role: string; content: string } }[]
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export async function callOpenRouter({
  model,
  messages,
  maxTokens = 1500,
  temperature = 0.7,
}: {
  model: string
  messages: OpenRouterMessage[]
  maxTokens?: number
  temperature?: number
}): Promise<{ content: string; model: string; tokensInput: number; tokensOutput: number }> {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured')
  }

  const { data } = await axios.post<OpenRouterResponse>(
    `${env.OPENROUTER_BASE_URL}/chat/completions`,
    {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    },
    {
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://snapcal.health',
        'X-Title': 'SnapCal AI',
      },
      timeout: 60000,
    }
  )

  return {
    content: data.choices[0]?.message?.content ?? '',
    model: data.model,
    tokensInput: data.usage?.prompt_tokens ?? 0,
    tokensOutput: data.usage?.completion_tokens ?? 0,
  }
}

export async function callOllama({
  model,
  messages,
  maxTokens = 1500,
}: {
  model: string
  messages: OpenRouterMessage[]
  maxTokens?: number
}): Promise<{ content: string; model: string; tokensInput: number; tokensOutput: number }> {
  const { data } = await axios.post(
    `${env.OLLAMA_BASE_URL}/api/chat`,
    {
      model,
      messages,
      stream: false,
      options: { num_predict: maxTokens },
    },
    { timeout: 120000 }
  )

  return {
    content: data.message?.content ?? '',
    model,
    tokensInput: data.prompt_eval_count ?? 0,
    tokensOutput: data.eval_count ?? 0,
  }
}
