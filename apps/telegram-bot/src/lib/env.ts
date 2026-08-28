import { z } from 'zod'

export const env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TELEGRAM_BOT_TOKEN: z.string().optional().default('placeholder'),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  TELEGRAM_BOT_WEBHOOK_SECRET: z.string().min(16).optional(),
  MOBILE_APP_URL: z.string().url().default('https://snapcal.health'),
  DATABASE_URL: z.string().url(),
  DATABASE_READ_URL: z.string().url().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
}).parse(process.env)
