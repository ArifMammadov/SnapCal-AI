import { prisma } from '@snapcal/database'

export async function updateMemory(userId: string, content: string) {
  try {
    const lower = content.toLowerCase()

    // Weight fact
    const weightMatch = lower.match(/(?:weight|вес)\s*:?\s*(\d+(?:\.\d+)?)\s*(kg|кг)/i)
    if (weightMatch) {
      const value = parseFloat(weightMatch[1])
      await prisma.userFact.upsert({
        where: { userId_key: { userId, key: 'weight_kg' } },
        update: { value: String(value), confidence: 0.8, updatedAt: new Date() },
        create: { userId, key: 'weight_kg', value: String(value), confidence: 0.8 },
      })
    }

    // Extract liked/disliked foods and ingredients
    await extractFoodPreferences(userId, content)
  } catch {
    // Memory update must not break AI responses
  }
}

export async function extractFoodPreferences(userId: string, content: string) {
  const likedPatterns = [
    /(?:люблю|обожаю|нравится|мой любимый|favorite|love|like|enjoy)\s+(.{2,40}?)(?:\.|,|;|!|\?|$)/iu,
  ]
  const dislikedPatterns = [
    /(?:не люблю|ненавижу|не переношу|dislike|hate|can't stand|don't like)\s+(.{2,40}?)(?:\.|,|;|!|\?|$)/iu,
  ]

  for (const pattern of likedPatterns) {
    const match = content.match(pattern)
    if (match) {
      const item = match[1].trim().toLowerCase()
      await upsertFact(userId, `likes:${item}`, item, 0.7)
    }
  }

  for (const pattern of dislikedPatterns) {
    const match = content.match(pattern)
    if (match) {
      const item = match[1].trim().toLowerCase()
      await upsertFact(userId, `dislikes:${item}`, item, 0.7)
    }
  }
}

export async function recordFoodPreference(userId: string, foodName: string, ingredients: string[], confidence = 0.5) {
  try {
    const lowerName = foodName.toLowerCase()
    const skipNames = ['unknown', 'could not identify food', 'could not identify', 'unidentified']
    if (skipNames.some((n) => lowerName.includes(n))) return
    if (confidence < 0.5) return

    await upsertFact(userId, 'recent_food', foodName, 0.9)
    for (const ingredient of ingredients.slice(0, 5)) {
      const ing = ingredient.toLowerCase().trim()
      if (!ing || skipNames.some((n) => ing.includes(n))) continue
      await upsertFact(userId, `ingredient:${ing}`, ing, 0.7)
    }
  } catch {
    // ignore
  }
}

export async function getFoodPreferences(userId: string): Promise<{ liked: string[]; recent: string[]; ingredients: string[] }> {
  try {
    const facts = await prisma.userFact.findMany({ where: { userId } })
    const liked = facts.filter((f) => f.key.startsWith('likes:')).map((f) => f.value)
    const recent = facts.filter((f) => f.key === 'recent_food').map((f) => f.value)
    const ingredients = facts.filter((f) => f.key.startsWith('ingredient:')).map((f) => f.value)
    return { liked, recent, ingredients }
  } catch {
    return { liked: [], recent: [], ingredients: [] }
  }
}

async function upsertFact(userId: string, key: string, value: string, confidence: number) {
  await prisma.userFact.upsert({
    where: { userId_key: { userId, key } },
    update: { value, confidence, updatedAt: new Date() },
    create: { userId, key, value, confidence },
  })
}

export async function getUserSummary(_userId: string) {
  return { success: true, data: {} }
}
