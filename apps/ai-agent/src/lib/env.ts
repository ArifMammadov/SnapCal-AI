import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

export const env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('4001'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  DATABASE_URL: z.string().url(),
  DATABASE_READ_URL: z.string().url().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OLLAMA_BASE_URL: z.string().url().optional(),
  API_SERVICE_URL: z.string().url().default('http://localhost:4000'),
  API_URL: z.string().url().optional(),
  AGENT_SECRET: z.string().min(16),
  WORKER_ONLY: z.enum(['true', 'false']).default('false'),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  BRAVE_API_KEY: z.string().optional(),
  SERPAPI_KEY: z.string().optional(),
  VISION_MODEL: z.string().default('deepseek/deepseek-v4-flash-vision-exp'),
  WEB_SEARCH_MODEL: z.string().default('openai/gpt-4o-mini'),
}).parse(process.env)

export type Env = typeof env
