import { env } from './env.js'
import { generateEmbedding, searchKnowledgeChunks } from '@snapcal/database'
import type { FoodAnalysisData } from '../types/index.js'
import { lookupUsdaNutrition } from './foodNutrition.js'

export interface KnowledgeDish {
  id?: string
  title: string
  content: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  serving: string
  mealType: string
  tags: string[]
  sourceUrl?: string
}

export async function findDishInKnowledge(name: string): Promise<KnowledgeDish | null> {
  try {
    const embedding = await generateEmbedding(
      name,
      env.OPENROUTER_API_KEY ?? '',
      env.OPENROUTER_BASE_URL,
    )
    if (!embedding) return null

    const chunks = await searchKnowledgeChunks(embedding, 3, 0.3)
    if (!chunks.length) return null

    const best = chunks[0]
    const parsed = parseDishContent(best.content)
    if (parsed && titleSimilarity(parsed.title, name) > 0.6) {
    return { ...parsed, id: best.articleId, sourceUrl: best.sourceUrl ?? undefined }
    }
  } catch (err) {
    // ignore, fall through to null
  }
  return null
}

export async function saveDishToKnowledge(
  dish: FoodAnalysisData,
  userId: string,
  imageUrl?: string,
): Promise<void> {
  try {
    const { prisma } = await import('@snapcal/database')
    const content = JSON.stringify({
      title: dish.name,
      calories: dish.calories,
      proteinG: dish.proteinG,
      carbsG: dish.carbsG,
      fatG: dish.fatG,
      serving: dish.serving,
      mealType: dish.suggestedMealType,
      ingredients: dish.ingredients ?? [],
      imageUrl,
    })

    const slugBase = dish.name.toLowerCase().replace(/[^a-z0-9а-яё]+/g, '-').replace(/^-|-$/g, '')
    const slug = `${slugBase}-${Date.now()}`

    const article = await prisma.knowledgeArticle.create({
      data: {
        title: dish.name,
        slug,
        content,
        category: 'food',
        tags: ['food', 'ai-analyzed', dish.suggestedMealType.toLowerCase(), ...(dish.ingredients ?? [])],
        sourceUrl: imageUrl,
        createdBy: userId,
      },
    })

    const embedding = await generateEmbedding(
      `${dish.name}. ${dish.ingredients?.join(', ') ?? ''}. ${dish.serving}. ${dish.calories} kcal.`,
      env.OPENROUTER_API_KEY ?? '',
      env.OPENROUTER_BASE_URL,
    )

    if (embedding) {
      const embeddingLiteral = `[${embedding.join(',')}]`
      await prisma.$executeRawUnsafe(
        `INSERT INTO knowledge_chunks (id, "articleId", "chunkIndex", content, embedding)
         VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4::vector)`,
        article.id,
        0,
        content,
        embeddingLiteral,
      )
    }
  } catch (err) {
    // Saving to knowledge base should not break the response
    console.warn('Failed to save dish to knowledge base', err)
  }
}

function parseDishContent(content: string): KnowledgeDish | null {
  try {
    const raw = JSON.parse(content)
    if (typeof raw.title !== 'string') return null
    return {
      title: raw.title,
      content,
      calories: Number(raw.calories) || 0,
      proteinG: Number(raw.proteinG) || 0,
      carbsG: Number(raw.carbsG) || 0,
      fatG: Number(raw.fatG) || 0,
      serving: String(raw.serving || '1 portion'),
      mealType: String(raw.mealType || 'SNACK'),
      tags: Array.isArray(raw.tags) ? raw.tags : [],
    }
  } catch {
    return null
  }
}

function titleSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().split(/\s+/))
  const tokensB = new Set(b.toLowerCase().split(/\s+/))
  const intersection = new Set([...tokensA].filter((x) => tokensB.has(x)))
  return intersection.size / Math.max(tokensA.size, tokensB.size)
}
