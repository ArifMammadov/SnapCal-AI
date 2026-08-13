import { processRemindersForTime } from '../index'
import { env } from '../lib/env'

async function tick() {
  const now = new Date()
  const hour = now.getUTCHours().toString().padStart(2, '0')
  const minute = now.getUTCMinutes().toString().padStart(2, '0')
  const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayOfWeek = dayMap[now.getUTCDay()]
  const time = `${hour}:${minute}`

  if (env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[reminder-cron] tick ${time} ${dayOfWeek}`)
  }
  try {
    await processRemindersForTime(time, dayOfWeek)
  } catch (err) {
    if (env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('[reminder-cron] error', err)
    }
  }
}

async function main() {
  if (env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[reminder-cron] started', env.NODE_ENV)
  }
  // Run every minute
  setInterval(tick, 60_000)
  await tick()
}

main().catch((err) => {
  if (env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(err)
  }
  process.exit(1)
})
