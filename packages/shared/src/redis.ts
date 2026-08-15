import Redis from 'ioredis'

let redis: Redis | null = null
let blockingRedis: Redis | null = null

export interface RedisOptions {
  maxRetriesPerRequest?: number | null
}

export function getRedis(opts?: RedisOptions): Redis {
  if (opts?.maxRetriesPerRequest === null) {
    if (!blockingRedis) {
      const url = process.env.REDIS_URL || 'redis://localhost:6379'
      blockingRedis = new Redis(url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
      })
    }
    return blockingRedis
  }

  if (!redis) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379'
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    })
  }
  return redis
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
  if (blockingRedis) {
    await blockingRedis.quit()
    blockingRedis = null
  }
}
