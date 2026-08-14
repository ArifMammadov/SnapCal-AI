import { env } from '../lib/env.js'
import { generateEmbedding, searchKnowledgeChunks } from '@snapcal/database'
import type { ToolContext, ToolResult } from '../types/index.js'

export async function searchKnowledgeWithVector(context: ToolContext): Promise<ToolResult> {
  const { message } = context
  if (!message.trim()) {
    return { success: true, data: { query: message, results: [] } }
  }

  const queryEmbedding = await generateEmbedding(
    message,
    env.OPENROUTER_API_KEY ?? '',
    env.OPENROUTER_BASE_URL,
  )
  if (!queryEmbedding) {
    return keywordSearch(context)
  }

  const chunks = await searchKnowledgeChunks(queryEmbedding, 5, 0.35)

  return {
    success: true,
    data: {
      query: message,
      results: chunks.map((c) => ({
        title: c.title,
        content: c.content.slice(0, 700),
        source: c.sourceUrl,
        distance: Number(c.distance),
      })),
    },
  }
}

async function keywordSearch(context: ToolContext): Promise<ToolResult> {
  const { message } = context
  // Fallback keyword search: in production this should use full-text (tsvector)
  return {
    success: true,
    data: {
      query: message,
      results: [],
      note: 'embedding service unavailable; no keyword index configured',
    },
  }
}
