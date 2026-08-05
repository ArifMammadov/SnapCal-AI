import { prisma } from '@snapcal/database'

export async function updateMemory(userId: string, content: string) {
  try {
    const lower = content.toLowerCase()
    const weightMatch = lower.match(/(?:weight|вес)\s*:?\s*(\d+(?:\.\d+)?)\s*(kg|кг)/i)
    if (weightMatch) {
      const value = parseFloat(weightMatch[1])
      await prisma.userFact.upsert({
        where: { userId_key: { userId, key: 'weight_kg' } },
        update: { value: String(value), confidence: 0.8, updatedAt: new Date() },
        create: { userId, key: 'weight_kg', value: String(value), confidence: 0.8 },
      })
    }
  } catch {
    // Memory update must not break AI responses
  }
}

export async function getUserSummary(_userId: string) {
  return { success: true, data: {} }
}
