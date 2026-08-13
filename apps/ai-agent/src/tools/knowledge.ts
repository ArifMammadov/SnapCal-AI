import { prisma } from '@snapcal/database'
import type { ToolContext, ToolResult } from '../types/index.js'

interface EmbeddingResponse {
  data: Array<{ embedding: number[] }>
}

export async function searchKnowledgeWithVector(context: ToolContext): Promise<ToolResult> {
  const { message } = context
  if (!message.trim()) {
    return { success: true, data: { query: message, results: [] } }
  }

  const queryEmbedding = await generateEmbedding(message)
  if (!queryEmbedding) {
    return keywordSearch(context)
  }

  const embeddingLiteral = `[${queryEmbedding.join(',')}]`

  type KnowledgeChunkRow = {
    id: string
    articleId: string
    content: string
    chunkIndex: number
    title: string
    sourceUrl: string | null
    distance: number
  }

  const chunks = await prisma.$queryRawUnsafe<KnowledgeChunkRow[]>(
    `SELECT
      kc.id,
      kc.article_id AS "articleId",
      kc.content,
      kc.chunk_index AS "chunkIndex",
      ka.title,
      ka.source_url AS "sourceUrl",
      kc.embedding <=> $1::vector AS distance
    FROM knowledge_chunks kc
    JOIN knowledge_articles ka ON ka.id = kc.article_id
    WHERE ka.is_published = true
    ORDER BY distance ASC
    LIMIT 5`,
    embeddingLiteral,
  )

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
  const articles = await prisma.knowledgeArticle.findMany({
    where: { isPublished: true },
    take: 5,
  })

  return {
    success: true,
    data: {
      query: message,
      results: articles.map((a) => ({ title: a.title, content: a.content.slice(0, 500), source: a.sourceUrl })),
    },
  }
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const { env } = await import('../lib/env.js')
    if (!env.OPENROUTER_API_KEY) return null

    const { default: axios } = await import('axios')
    const { data } = await axios.post<EmbeddingResponse>(
      `${env.OPENROUTER_BASE_URL}/embeddings`,
      {
        model: 'openai/text-embedding-3-small',
        input: text.slice(0, 8000),
      },
      {
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    )

    return data.data?.[0]?.embedding ?? null
  } catch {
    return null
  }
}
