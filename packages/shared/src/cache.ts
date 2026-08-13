import { getRedis } from './redis.js'

const DEFAULT_TTL_SECONDS = 300

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  const cached = await redis.get(key)
  if (!cached) return null
  try {
    return JSON.parse(cached) as T
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
  const redis = getRedis()
  await redis.setex(key, ttlSeconds, JSON.stringify(value))
}

export async function cacheInvalidate(pattern: string): Promise<void> {
  const redis = getRedis()
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}
