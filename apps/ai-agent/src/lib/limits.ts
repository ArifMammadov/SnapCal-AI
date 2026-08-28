import { getRedis } from '@snapcal/shared'
import { prisma } from '@snapcal/database'
import { logger } from '@snapcal/shared'

export interface AiUsageWindow {
  requestsToday: number
  tokensToday: number
  estimatedCostUsd: number
  windowResetAt: Date
}

interface LimitConfig {
  maxRequestsPerDay: number
  maxTokensPerDay: number
  maxCostUsdPerDay: number
  maxRequestsPerMinute: number
}

const DEFAULT_LIMITS: Record<string, LimitConfig> = {
  TRIAL: { maxRequestsPerDay: 1000, maxTokensPerDay: 200_000, maxCostUsdPerDay: 10, maxRequestsPerMinute: 30 },
  ACTIVE: { maxRequestsPerDay: 1000, maxTokensPerDay: 200_000, maxCostUsdPerDay: 10, maxRequestsPerMinute: 30 },
  TRIALING: { maxRequestsPerDay: 1000, maxTokensPerDay: 200_000, maxCostUsdPerDay: 10, maxRequestsPerMinute: 30 },
  INACTIVE: { maxRequestsPerDay: 100, maxTokensPerDay: 20_000, maxCostUsdPerDay: 1, maxRequestsPerMinute: 10 },
  CANCELED: { maxRequestsPerDay: 100, maxTokensPerDay: 20_000, maxCostUsdPerDay: 1, maxRequestsPerMinute: 10 },
  PAST_DUE: { maxRequestsPerDay: 10, maxTokensPerDay: 2_000, maxCostUsdPerDay: 0.2, maxRequestsPerMinute: 2 },
}

const GLOBAL_DAILY_COST_CAP_USD = Number(process.env.AI_GLOBAL_DAILY_COST_CAP_USD || '200')
const GLOBAL_DAILY_TOKEN_CAP = Number(process.env.AI_GLOBAL_DAILY_TOKEN_CAP || '5_000_000'.replace(/_/g, ''))
const GLOBAL_KEY_PREFIX = 'ai:global:usage'

function getWindowKey(userId: string, suffix: string): string {
  return `ai:usage:${userId}:${suffix}`
}

function getDayBucket(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

export function getUserLimitConfig(subscriptionStatus: string): LimitConfig {
  return DEFAULT_LIMITS[subscriptionStatus] ?? DEFAULT_LIMITS.INACTIVE
}

export interface LimitCheckResult {
  allowed: boolean
  reason?: 'RATE_LIMIT' | 'DAILY_REQUEST_LIMIT' | 'DAILY_TOKEN_LIMIT' | 'DAILY_COST_LIMIT' | 'SUBSCRIPTION_SUSPENDED' | 'GLOBAL_COST_CAP' | 'GLOBAL_TOKEN_CAP'
  current: AiUsageWindow
  config: LimitConfig
}

async function getGlobalUsage(): Promise<{ costUsd: number; tokens: number; requests: number }> {
  const redis = getRedis()
  const dayBucket = getDayBucket()
  const [costStr, tokensStr, requestsStr] = await redis.mget(
    `${GLOBAL_KEY_PREFIX}:cost:${dayBucket}`,
    `${GLOBAL_KEY_PREFIX}:tokens:${dayBucket}`,
    `${GLOBAL_KEY_PREFIX}:requests:${dayBucket}`,
  )
  return {
    costUsd: Number(costStr ?? 0),
    tokens: Number(tokensStr ?? 0),
    requests: Number(requestsStr ?? 0),
  }
}

export async function recordGlobalAiUsage(inputTokens: number, outputTokens: number, costUsd: number): Promise<void> {
  const redis = getRedis()
  const dayBucket = getDayBucket()
  const ttlSeconds = 25 * 60 * 60
  const pipeline = redis.pipeline()
  pipeline.incrbyfloat(`${GLOBAL_KEY_PREFIX}:cost:${dayBucket}`, costUsd)
  pipeline.incrby(`${GLOBAL_KEY_PREFIX}:tokens:${dayBucket}`, inputTokens + outputTokens)
  pipeline.incr(`${GLOBAL_KEY_PREFIX}:requests:${dayBucket}`)
  for (const suffix of ['cost', 'tokens', 'requests']) {
    pipeline.expire(`${GLOBAL_KEY_PREFIX}:${suffix}:${dayBucket}`, ttlSeconds)
  }
  await pipeline.exec()
}

export async function checkAiUsageLimits(
  userId: string,
  subscriptionStatus: string,
  estimatedInputTokens = 0,
  estimatedOutputTokens = 1024,
): Promise<LimitCheckResult> {
  const config = getUserLimitConfig(subscriptionStatus)
  const dayBucket = getDayBucket()
  const redis = getRedis()

  const [requestsStr, tokensStr, costStr] = await redis.mget(
    getWindowKey(userId, `requests:${dayBucket}`),
    getWindowKey(userId, `tokens:${dayBucket}`),
    getWindowKey(userId, `cost:${dayBucket}`),
  )

  const requestsToday = Number(requestsStr ?? 0)
  const tokensToday = Number(tokensStr ?? 0)
  const costToday = Number(costStr ?? 0)

  const estimatedCost = estimateCost('openai/gpt-4o', estimatedInputTokens, estimatedOutputTokens)
  const tomorrow = new Date()
  tomorrow.setUTCHours(24, 0, 0, 0)

  // Global platform-level caps to protect against runaway costs / abuse
  const global = await getGlobalUsage()
  if (global.costUsd + estimatedCost > GLOBAL_DAILY_COST_CAP_USD) {
    logger.warn({ globalCostUsd: global.costUsd, cap: GLOBAL_DAILY_COST_CAP_USD, userId }, 'global daily AI cost cap reached')
    return {
      allowed: false,
      reason: 'GLOBAL_COST_CAP',
      current: { requestsToday, tokensToday, estimatedCostUsd: costToday, windowResetAt: tomorrow },
      config,
    }
  }
  if (global.tokens + estimatedInputTokens + estimatedOutputTokens > GLOBAL_DAILY_TOKEN_CAP) {
    logger.warn({ globalTokens: global.tokens, cap: GLOBAL_DAILY_TOKEN_CAP, userId }, 'global daily AI token cap reached')
    return {
      allowed: false,
      reason: 'GLOBAL_TOKEN_CAP',
      current: { requestsToday, tokensToday, estimatedCostUsd: costToday, windowResetAt: tomorrow },
      config,
    }
  }

  if (config.maxRequestsPerDay === 0) {
    return {
      allowed: false,
      reason: 'SUBSCRIPTION_SUSPENDED',
      current: { requestsToday, tokensToday, estimatedCostUsd: costToday, windowResetAt: tomorrow },
      config,
    }
  }

  if (requestsToday >= config.maxRequestsPerDay) {
    return {
      allowed: false,
      reason: 'DAILY_REQUEST_LIMIT',
      current: { requestsToday, tokensToday, estimatedCostUsd: costToday, windowResetAt: tomorrow },
      config,
    }
  }

  if (tokensToday + estimatedInputTokens + estimatedOutputTokens > config.maxTokensPerDay) {
    return {
      allowed: false,
      reason: 'DAILY_TOKEN_LIMIT',
      current: { requestsToday, tokensToday, estimatedCostUsd: costToday, windowResetAt: tomorrow },
      config,
    }
  }

  if (costToday + estimatedCost > config.maxCostUsdPerDay) {
    return {
      allowed: false,
      reason: 'DAILY_COST_LIMIT',
      current: { requestsToday, tokensToday, estimatedCostUsd: costToday, windowResetAt: tomorrow },
      config,
    }
  }

  return {
    allowed: true,
    current: { requestsToday, tokensToday, estimatedCostUsd: costToday, windowResetAt: tomorrow },
    config,
  }
}

export async function recordAiUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number,
  model: string,
  provider: string,
): Promise<{ costUsd: number }> {
  const dayBucket = getDayBucket()
  const redis = getRedis()
  const costUsd = estimateCost(model, inputTokens, outputTokens)

  const pipeline = redis.pipeline()
  pipeline.incr(getWindowKey(userId, `requests:${dayBucket}`))
  pipeline.incrby(getWindowKey(userId, `tokens:${dayBucket}`), inputTokens + outputTokens)
  pipeline.incrbyfloat(getWindowKey(userId, `cost:${dayBucket}`), costUsd)
  const ttlSeconds = 25 * 60 * 60 // keep one extra day
  for (const suffix of [`requests:${dayBucket}`, `tokens:${dayBucket}`, `cost:${dayBucket}`]) {
    pipeline.expire(getWindowKey(userId, suffix), ttlSeconds)
  }
  await pipeline.exec()

  await recordGlobalAiUsage(inputTokens, outputTokens, costUsd)

  return { costUsd }
}

const PRICING: Record<string, { input: number; output: number }> = {
  'openai/gpt-4o': { input: 2.5, output: 10 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  'anthropic/claude-3.5-sonnet': { input: 3, output: 15 },
  'mistralai/mistral-7b-instruct': { input: 0.2, output: 0.2 },
  'ollama/llava': { input: 0, output: 0 },
  'llama3.2': { input: 0, output: 0 },
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = model && Object.prototype.hasOwnProperty.call(PRICING, model) ? PRICING[model] : PRICING['openai/gpt-4o']
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000
}

export async function getUserSubscriptionStatus(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionStatus: true } })
  return user?.subscriptionStatus ?? 'INACTIVE'
}
