import { getRedis } from '@snapcal/shared'
import { prisma } from '@snapcal/database'

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
  INACTIVE: { maxRequestsPerDay: 1, maxTokensPerDay: 2_000, maxCostUsdPerDay: 0.05, maxRequestsPerMinute: 5 },
  CANCELED: { maxRequestsPerDay: 1, maxTokensPerDay: 2_000, maxCostUsdPerDay: 0.05, maxRequestsPerMinute: 5 },
  PAST_DUE: { maxRequestsPerDay: 0, maxTokensPerDay: 0, maxCostUsdPerDay: 0, maxRequestsPerMinute: 0 },
}

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
  reason?: 'RATE_LIMIT' | 'DAILY_REQUEST_LIMIT' | 'DAILY_TOKEN_LIMIT' | 'DAILY_COST_LIMIT' | 'SUBSCRIPTION_SUSPENDED'
  current: AiUsageWindow
  config: LimitConfig
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
