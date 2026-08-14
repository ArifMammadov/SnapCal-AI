import { prisma, prismaRead } from './index.js'
import { splitTextIntoChunks, deleteExistingChunks } from './chunking.js'

interface EmbeddingResponse {
  data: Array<{ embedding: number[] }>
}

export type EmbeddingGenerator = (text: string) => Promise<number[] | null>

export async function generateEmbedding(
  text: string,
  apiKey: string,
  baseUrl: string,
): Promise<number[] | null> {
  try {
    const { default: axios } = await import('axios')
    const { data } = await axios.post<EmbeddingResponse>(
      `${baseUrl}/embeddings`,
      {
        model: 'openai/text-embedding-3-small',
        input: text.slice(0, 8000),
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      },
    )

    return data.data?.[0]?.embedding ?? null
  } catch {
    return null
  }
}

export async function indexArticleVector(
  articleId: string,
  generateEmbedding: EmbeddingGenerator,
) {
  await deleteExistingChunks(articleId)

  const article = await prismaRead.knowledgeArticle.findUnique({
    where: { id: articleId },
  })
  if (!article || !article.isPublished) {
    throw new Error('Article not found or not published')
  }

  const texts = splitTextIntoChunks(article.content)
  const embeddings = await Promise.all(texts.map((content) => generateEmbedding(content)))

  const rows = texts.map((content, idx) => ({
    content,
    chunkIndex: idx,
    embedding: embeddings[idx],
  }))

  await prisma.$transaction(
    rows
      .filter((row) => row.embedding)
      .map((row) => {
        const embeddingLiteral = `[${row.embedding!.join(',')}]`
        return prisma.$executeRawUnsafe(
          `INSERT INTO knowledge_chunks (id, article_id, chunk_index, content, embedding)
           VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4::vector)`,
          articleId,
          row.chunkIndex,
          row.content,
          embeddingLiteral,
        )
      }),
  )

  return { articleId, chunksIndexed: rows.filter((r) => r.embedding).length }
}

export async function searchKnowledgeChunks(
  queryEmbedding: number[],
  limit = 5,
  maxDistance = 0.35,
) {
  const embeddingLiteral = `[${queryEmbedding.join(',')}]`

  type ChunkRow = {
    id: string
    articleId: string
    chunkIndex: number
    content: string
    title: string
    sourceUrl: string | null
    distance: number
  }

  const rows = await prismaRead.$queryRawUnsafe<ChunkRow[]>(
    `SELECT
       kc.id,
       kc.article_id AS "articleId",
       kc.chunk_index AS "chunkIndex",
       kc.content,
       ka.title,
       ka.source_url AS "sourceUrl",
       kc.embedding <=> $1::vector AS distance
     FROM knowledge_chunks kc
     JOIN knowledge_articles ka ON ka.id = kc.article_id
     WHERE ka.is_published = true
       AND kc.embedding <=> $1::vector < $2
     ORDER BY distance ASC
     LIMIT $3`,
    embeddingLiteral,
    maxDistance,
    limit,
  )

  return rows
}

export async function getUnindexedArticles() {
  return prismaRead.$queryRawUnsafe<{ id: string }[]>(
    `SELECT ka.id
     FROM knowledge_articles ka
     LEFT JOIN knowledge_chunks kc ON kc.article_id = ka.id
     WHERE ka.is_published = true
     GROUP BY ka.id
     HAVING COUNT(kc.id) = 0
     LIMIT 100`,
  )
}
