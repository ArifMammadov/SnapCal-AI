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
    const lowerName = name.toLowerCase()
    const embedding = await generateEmbedding(
      name,
      env.OPENROUTER_API_KEY ?? '',
      env.OPENROUTER_BASE_URL,
    )
    if (!embedding) return null

    const chunks = await searchKnowledgeChunks(embedding, 5, 0.35)
    if (!chunks.length) return null

    // Try the best semantic match that also has a title or content keyword match
    for (const chunk of chunks) {
      const parsed = parseDishContent(chunk.content)
      if (parsed) {
        const titleScore = titleSimilarity(parsed.title, name)
        const contentScore = contentKeywordScore(chunk.content, lowerName)
        if (titleScore > 0.5 || contentScore > 0.5) {
          return { ...parsed, id: chunk.articleId, sourceUrl: chunk.sourceUrl ?? undefined }
        }
      }

      // Fallback: seed articles store plain text lines like "Дёнер кебаб — 450–650 ккал..."
      const seedDish = parseSeedTextDish(chunk.content, lowerName)
      if (seedDish) {
        return {
          ...seedDish,
          id: chunk.articleId,
          sourceUrl: chunk.sourceUrl ?? undefined,
        }
      }
    }
  } catch (err) {
    // ignore, fall through to null
  }
  return null
}

function contentKeywordScore(content: string, name: string): number {
  const contentLower = content.toLowerCase()
  const tokens = name.split(/\s+/).filter((t) => t.length >= 3)
  const matches = tokens.filter((t) => contentLower.includes(t)).length
  return tokens.length > 0 ? matches / tokens.length : 0
}

function parseSeedTextDish(content: string, query: string): KnowledgeDish | null {
  const lines = content.split(/\n/)
  const queryTokens = query.split(/\s+/).filter((t) => t.length >= 2)
  let bestLine = ''
  let bestScore = 0

  for (const line of lines) {
    const lower = line.toLowerCase()
    const score = queryTokens.reduce((s, token) => (lower.includes(token) ? s + 1 : s), 0)
    if (score > bestScore) {
      bestScore = score
      bestLine = line
    }
  }

  // Match Russian/English seed format: "Name — 450–650 ккал, 20–25 г белка, 50–70 г углеводов, 15–25 г жиров."
  const match = bestLine.match(/^(.*?)\s*[—-]\s*(\d+(?:[–-]\d+)?)\s*ккал.*?([\d.,]+(?:[–-][\d.,]+)?)\s*г?\s*белка.*?([\d.,]+(?:[–-][\d.,]+)?)\s*г?\s*углеводов.*?([\d.,]+(?:[–-][\d.,]+)?)\s*г?\s*жиров/i)
  if (!match || bestScore === 0) return null

  const title = match[1].trim()
  const calRange = match[2].toString().split(/[–-]/).map((n) => parseFloat(n.replace(',', '.')))
  const proteinRange = match[3].toString().split(/[–-]/).map((n) => parseFloat(n.replace(',', '.')))
  const carbsRange = match[4].toString().split(/[–-]/).map((n) => parseFloat(n.replace(',', '.')))
  const fatRange = match[5].toString().split(/[–-]/).map((n) => parseFloat(n.replace(',', '.')))

  const avg = (range: number[]) => range.reduce((a, b) => a + b, 0) / range.length
  const servingMatch = bestLine.match(/порция\s+(\d+(?:\.\d+)?)\s*г/i)
  return {
    title,
    content: bestLine,
    calories: Math.round(avg(calRange)),
    proteinG: avg(proteinRange),
    carbsG: avg(carbsRange),
    fatG: avg(fatRange),
    serving: servingMatch ? `1 portion ~${servingMatch[1]} g` : '1 standard portion',
    mealType: 'LUNCH',
    tags: [],
  }
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

    const slugBase = dish.name.toLowerCase().replace(/[^a-z0-9а-яё0-9]+/g, '-').replace(/^-|-$/g, '')
    const slug = `${slugBase}-${Date.now()}`

    const existing = await prisma.knowledgeArticle.findFirst({
      where: { title: dish.name, sourceUrl: imageUrl || null },
    })

    const article = existing
      ? await prisma.knowledgeArticle.update({
          where: { id: existing.id },
          data: {
            content,
            tags: ['food', 'ai-analyzed', dish.suggestedMealType.toLowerCase(), ...(dish.ingredients ?? [])],
            updatedAt: new Date(),
          },
        })
      : await prisma.knowledgeArticle.create({
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
