import { getRedis } from '@snapcal/shared'

async function main() {
  const redis = getRedis()
  let cursor = '0'
  let deleted = 0
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', 'vision-cache:*', 'COUNT', 100)
    cursor = next
    if (keys.length) {
      await redis.del(...keys)
      deleted += keys.length
    }
  } while (cursor !== '0')
  console.log(`Cleared ${deleted} vision-cache keys`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
