import { prisma } from '@snapcal/database'
import {
  DEFAULT_FREE_AI_DAILY_LIMIT,
  DEFAULT_FREE_PHOTO_SCANS_DAILY_LIMIT,
} from '@snapcal/shared'

export interface PremiumStatus {
  isPremium: boolean
  trialEndsAt: Date | null
  subscriptionStatus: string
  subscriptionExpiresAt: Date | null
}

export async function getPremiumStatus(userId: string): Promise<PremiumStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      trialEndsAt: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
    },
  })

  if (!user) {
    return {
      isPremium: false,
      trialEndsAt: null,
      subscriptionStatus: 'INACTIVE',
      subscriptionExpiresAt: null,
    }
  }

  const now = new Date()
  const isPremium =
    (user.trialEndsAt && user.trialEndsAt > now) ||
    (['active', 'trialing'].includes(user.subscriptionStatus.toLowerCase()) &&
      (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > now))

  return {
    isPremium,
    trialEndsAt: user.trialEndsAt,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
  }
}

export interface LimitStatus {
  allowed: boolean
  reason?: 'TRIAL' | 'SUBSCRIPTION' | 'FREE_DAILY' | 'DAILY_LIMIT_REACHED'
  dailyLimit: number
  usedToday: number
  remainingToday: number
  trialEndsAt?: Date | null
  subscriptionStatus: string
  paywallCode?: string
}

function dayBounds(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
  return { start, end }
}

export async function checkTextMessageLimit(userId: string): Promise<LimitStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trialEndsAt: true, subscriptionStatus: true, subscriptionExpiresAt: true },
  })

  if (!user) {
    return {
      allowed: false,
      reason: 'DAILY_LIMIT_REACHED',
      dailyLimit: 0,
      usedToday: 0,
      remainingToday: 0,
      subscriptionStatus: 'INACTIVE',
      paywallCode: 'DAILY_TEXT_LIMIT_REACHED',
    }
  }

  const now = new Date()
  const isPremium =
    (user.trialEndsAt && user.trialEndsAt > now) ||
    (['active', 'trialing'].includes(user.subscriptionStatus.toLowerCase()) &&
      (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > now))

  if (isPremium) {
    return {
      allowed: true,
      reason: user.trialEndsAt && user.trialEndsAt > now ? 'TRIAL' : 'SUBSCRIPTION',
      dailyLimit: Number.POSITIVE_INFINITY,
      usedToday: 0,
      remainingToday: Number.POSITIVE_INFINITY,
      trialEndsAt: user.trialEndsAt,
      subscriptionStatus: user.subscriptionStatus,
    }
  }

  const { start, end } = dayBounds(now)
  const usedToday = await prisma.chatMessage.count({
    where: { userId, role: 'USER', type: 'TEXT', createdAt: { gte: start, lt: end } },
  })

  if (usedToday >= DEFAULT_FREE_AI_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: 'DAILY_LIMIT_REACHED',
      dailyLimit: DEFAULT_FREE_AI_DAILY_LIMIT,
      usedToday,
      remainingToday: 0,
      subscriptionStatus: user.subscriptionStatus,
      paywallCode: 'DAILY_TEXT_LIMIT_REACHED',
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

export async function checkPhotoScanLimit(userId: string): Promise<LimitStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trialEndsAt: true, subscriptionStatus: true, subscriptionExpiresAt: true },
  })

  if (!user) {
    return {
      allowed: false,
      reason: 'DAILY_LIMIT_REACHED',
      dailyLimit: 0,
      usedToday: 0,
      remainingToday: 0,
      subscriptionStatus: 'INACTIVE',
      paywallCode: 'DAILY_SCAN_LIMIT_REACHED',
    }
  }

  const now = new Date()
  const isPremium =
    (user.trialEndsAt && user.trialEndsAt > now) ||
    (['active', 'trialing'].includes(user.subscriptionStatus.toLowerCase()) &&
      (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > now))

  if (isPremium) {
    return {
      allowed: true,
      reason: user.trialEndsAt && user.trialEndsAt > now ? 'TRIAL' : 'SUBSCRIPTION',
      dailyLimit: Number.POSITIVE_INFINITY,
      usedToday: 0,
      remainingToday: Number.POSITIVE_INFINITY,
      trialEndsAt: user.trialEndsAt,
      subscriptionStatus: user.subscriptionStatus,
    }
  }

  const { start, end } = dayBounds(now)
  const usedToday = await prisma.aiUsageLog.count({
    where: { userId, usageType: 'PHOTO_SCAN', createdAt: { gte: start, lt: end } },
  })

  if (usedToday >= DEFAULT_FREE_PHOTO_SCANS_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: 'DAILY_LIMIT_REACHED',
      dailyLimit: DEFAULT_FREE_PHOTO_SCANS_DAILY_LIMIT,
      usedToday,
      remainingToday: 0,
      subscriptionStatus: user.subscriptionStatus,
      paywallCode: 'DAILY_SCAN_LIMIT_REACHED',
    }
  }

  return {
    allowed: true,
    reason: 'FREE_DAILY',
    dailyLimit: DEFAULT_FREE_PHOTO_SCANS_DAILY_LIMIT,
    usedToday,
    remainingToday: DEFAULT_FREE_PHOTO_SCANS_DAILY_LIMIT - usedToday,
    subscriptionStatus: user.subscriptionStatus,
  }
}

export async function checkAiLimit(userId: string): Promise<LimitStatus> {
  return checkPhotoScanLimit(userId)
}

export async function logAiUsage(userId: string, usageType: 'PHOTO_SCAN' | 'TEXT_MESSAGE'): Promise<void> {
  await prisma.aiUsageLog.create({
    data: { userId, usageType },
  })
}
