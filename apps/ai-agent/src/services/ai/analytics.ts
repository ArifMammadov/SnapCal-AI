import { prisma } from '@snapcal/database'
import { aiCostTotal, aiLatencyHistogram, aiRequestsTotal, aiErrorsTotal } from '../../lib/metrics.js'
import { estimateCost } from '../../lib/limits.js'
import { logger } from '@snapcal/shared'

export async function recordAiRequestAnalytics(params: {
  userId: string
  skillName: string
  model: string
  provider: string
  inputTokens?: number
  outputTokens?: number
  latencyMs: number
  success: boolean
  errorType?: string
  confidence?: number
  fallbackUsed?: boolean
  route?: 'primary' | 'advanced'
}): Promise<void> {
  const cost = estimateCost(params.model, params.inputTokens ?? 0, params.outputTokens ?? 0)
  const status = params.success ? (params.fallbackUsed ? 'fallback' : 'success') : 'error'

  aiRequestsTotal.inc({ skill: params.skillName, model: params.model, status })
  aiLatencyHistogram.observe({ skill: params.skillName, model: params.model }, params.latencyMs / 1000)
  aiCostTotal.inc({ model: params.model, provider: params.provider }, cost)
  if (!params.success && params.errorType) {
    aiErrorsTotal.inc({ skill: params.skillName, error_type: params.errorType })
  }

  try {
    await prisma.aiAuditLog.create({
      data: {
        userId: params.userId,
        skillName: params.skillName,
        model: params.model,
        provider: params.provider,
        tokensInput: params.inputTokens,
        tokensOutput: params.outputTokens,
        costUsd: cost,
        latencyMs: params.latencyMs,
        flagged: !params.success || params.fallbackUsed || (params.confidence !== undefined && params.confidence < 0.5),
        flagReason: params.success ? (params.fallbackUsed ? 'fallback_used' : undefined) : params.errorType,
      },
    })
  } catch (err) {
    logger.warn({ err, userId: params.userId }, 'failed to write ai audit log')
  }
}
