import { prisma } from '@snapcal/database'
import { logger } from '@snapcal/shared'

export interface FoodRecord {
  id: string
  name: string
  normalizedName: string
  aliases: string[]
  category: string | null
  cuisine: string | null
  country: string | null
  servingSizeG: number | null
  kcalPer100g: number
  proteinPer100g: number
  fatPer100g: number
  carbsPer100g: number
  fiberPer100g: number | null
  source: string | null
  verified: boolean
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

function transliterateCyrillic(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join('')
}

export function normalizeName(name: string): string {
  return transliterateCyrillic(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function findFoodByName(name: string): Promise<FoodRecord | null> {
  const normalized = normalizeName(name)
  if (!normalized) return null

  const direct = await prisma.food.findUnique({
    where: { normalizedName: normalized },
  })
  if (direct) return mapFood(direct)

  // Try aliases using PostgreSQL array overlap
  const byAlias = await prisma.food.findFirst({
    where: { aliases: { has: normalized } },
  })
  if (byAlias) return mapFood(byAlias)

  // Fuzzy ilike on name
  const fuzzy = await prisma.food.findFirst({
    where: { name: { contains: name, mode: 'insensitive' } },
  })
  if (fuzzy) return mapFood(fuzzy)

  return null
}

export async function findFoodByCuisineAndName(cuisine: string | undefined, name: string): Promise<FoodRecord | null> {
  if (!cuisine) return findFoodByName(name)
  const normalized = normalizeName(name)
  const results = await prisma.food.findMany({
    where: {
      cuisine: { contains: cuisine, mode: 'insensitive' },
      OR: [
        { normalizedName: normalized },
        { aliases: { has: normalized } },
        { name: { contains: name, mode: 'insensitive' } },
      ],
    },
    take: 5,
  })
  if (results.length === 0) return null
  // Return best exact match
  const exact = results.find((r) => normalizeName(r.name) === normalized || r.aliases.includes(normalized))
  return mapFood(exact ?? results[0])
}

export async function upsertFood(data: Omit<FoodRecord, 'id'>): Promise<FoodRecord> {
  const normalized = normalizeName(data.name)
  const existing = await prisma.food.findUnique({ where: { normalizedName: normalized } })
  const record = existing
    ? await prisma.food.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          aliases: Array.from(new Set([...existing.aliases, ...data.aliases])),
          kcalPer100g: data.kcalPer100g,
          proteinPer100g: data.proteinPer100g,
          fatPer100g: data.fatPer100g,
          carbsPer100g: data.carbsPer100g,
          fiberPer100g: data.fiberPer100g,
          servingSizeG: data.servingSizeG ?? existing.servingSizeG,
          cuisine: data.cuisine ?? existing.cuisine,
          category: data.category ?? existing.category,
          verified: existing.verified || data.verified,
          updatedAt: new Date(),
        },
      })
    : await prisma.food.create({
        data: {
          name: data.name,
          normalizedName: normalized,
          aliases: data.aliases,
          category: data.category,
          cuisine: data.cuisine,
          country: data.country,
          servingSizeG: data.servingSizeG,
          kcalPer100g: data.kcalPer100g,
          proteinPer100g: data.proteinPer100g,
          fatPer100g: data.fatPer100g,
          carbsPer100g: data.carbsPer100g,
          fiberPer100g: data.fiberPer100g,
          source: data.source,
          verified: data.verified,
        },
      })
  return mapFood(record)
}

function mapFood(row: any): FoodRecord {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalizedName,
    aliases: row.aliases ?? [],
    category: row.category,
    cuisine: row.cuisine,
    country: row.country,
    servingSizeG: row.servingSizeG ? Number(row.servingSizeG) : null,
    kcalPer100g: Number(row.kcalPer100g),
    proteinPer100g: Number(row.proteinPer100g),
    fatPer100g: Number(row.fatPer100g),
    carbsPer100g: Number(row.carbsPer100g),
    fiberPer100g: row.fiberPer100g ? Number(row.fiberPer100g) : null,
    source: row.source,
    verified: row.verified,
  }
}
