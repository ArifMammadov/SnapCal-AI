import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('4000'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  TELEGRAM_BOT_TOKEN: z.string(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  MOBILE_APP_URL: z.string().url().default('http://localhost:5173'),
  ADMIN_APP_URL: z.string().url().default('http://localhost:5176'),
  AI_AGENT_URL: z.string().url().default('http://localhost:4001'),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  ADMIN_SECRET: z.string().min(16),
  S3_SECRET_KEY: z.string().optional(),
  AI_AGENT_SECRET: z.string().min(16).optional(),
})

export const env = envSchema.parse(process.env)
