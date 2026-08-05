import { z } from 'zod'

export const env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TELEGRAM_BOT_TOKEN: z.string(),
  MOBILE_APP_URL: z.string().url().default('https://snapcal.health'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
}).parse(process.env)
