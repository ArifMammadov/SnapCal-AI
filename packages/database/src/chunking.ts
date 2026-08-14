import { prisma } from './index.js'

const CHUNK_SIZE = 1200
const CHUNK_OVERLAP = 200

export function splitTextIntoChunks(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    const chunk = text.slice(start, end).trim()
    if (chunk) chunks.push(chunk)
    if (end === text.length) break
    start = end - overlap
  }

  return chunks
}

export async function deleteExistingChunks(articleId: string) {
  return prisma.knowledgeChunk.deleteMany({ where: { articleId } })
}

export async function storeChunks(articleId: string, chunks: { content: string; chunkIndex: number }[]) {
  if (chunks.length === 0) return []
  const created = []
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]
    created.push(
      await prisma.knowledgeChunk.create({
        data: {
          articleId,
          chunkIndex: c.chunkIndex,
          content: c.content,
        },
      }),
    )
  }
  return created
}

export async function indexArticleChunks(articleId: string, generateEmbedding: (text: string) => Promise<number[] | null>) {
  await deleteExistingChunks(articleId)

  const article = await prisma.knowledgeArticle.findUnique({
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
