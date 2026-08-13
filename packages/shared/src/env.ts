import { z } from 'zod'

export const env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined
      const headers: Record<string, string> = {}
      for (const part of v.split(',')) {
        const [key, ...valueParts] = part.split('=')
        if (key) headers[key.trim()] = valueParts.join('=').trim()
      }
      return headers
    }),
}).parse(process.env)
