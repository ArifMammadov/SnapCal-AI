import { prisma } from '@snapcal/database'
import { DEFAULT_FREE_AI_DAILY_LIMIT } from '@snapcal/shared'

export interface LimitStatus {
  allowed: boolean
  reason?: 'TRIAL' | 'SUBSCRIPTION' | 'FREE_DAILY' | 'DAILY_LIMIT_REACHED'
  dailyLimit: number
  usedToday: number
  remainingToday: number
  trialEndsAt?: Date | null
  subscriptionStatus: string
  paywallMessage?: string
}

export async function checkAiLimit(userId: string): Promise<LimitStatus> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return {
      allowed: false,
      reason: 'DAILY_LIMIT_REACHED',
      dailyLimit: 0,
      usedToday: 0,
      remainingToday: 0,
      subscriptionStatus: 'INACTIVE',
      paywallMessage: 'Пользователь не найден. Войдите снова.',
    }
  }

  const now = new Date()

  // 1. Active trial — unlimited
  if (user.trialEndsAt && user.trialEndsAt > now) {
    return {
      allowed: true,
      reason: 'TRIAL',
      dailyLimit: Number.POSITIVE_INFINITY,
      usedToday: 0,
      remainingToday: Number.POSITIVE_INFINITY,
      trialEndsAt: user.trialEndsAt,
      subscriptionStatus: user.subscriptionStatus,
    }
  }

  // 2. Active subscription — unlimited
  if (['active', 'trialing'].includes(user.subscriptionStatus.toLowerCase())) {
    return {
      allowed: true,
      reason: 'SUBSCRIPTION',
      dailyLimit: Number.POSITIVE_INFINITY,
      usedToday: 0,
      remainingToday: Number.POSITIVE_INFINITY,
      subscriptionStatus: user.subscriptionStatus,
    }
  }

  // 3. Free tier — 1 scan per day
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
  const usedToday = await prisma.chatMessage.count({
    where: { userId, role: 'USER', createdAt: { gte: start, lt: end } },
  })

  if (usedToday >= DEFAULT_FREE_AI_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: 'DAILY_LIMIT_REACHED',
      dailyLimit: DEFAULT_FREE_AI_DAILY_LIMIT,
      usedToday,
      remainingToday: 0,
      subscriptionStatus: user.subscriptionStatus,
      paywallMessage: 'Бесплатный лимит на сегодня исчерпан. Оформите подписку SnapCal Pro, чтобы анализировать еду без ограничений.',
    }
  }

  return {
    allowed: true,
    reason: 'FREE_DAILY',
    dailyLimit: DEFAULT_FREE_AI_DAILY_LIMIT,
    usedToday,
    remainingToday: DEFAULT_FREE_AI_DAILY_LIMIT - usedToday,
    subscriptionStatus: user.subscriptionStatus,
  }
}
