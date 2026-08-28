import { prisma } from './index.js'

export async function activateTelegramStarsSubscription({
  userId,
  planId,
  telegramChargeId,
  providerTransactionId,
  amountStars,
  payload,
}: {
  userId: string
  planId: string
  telegramChargeId: string
  providerTransactionId: string
  amountStars: number
  payload?: string
}) {
  const now = new Date()
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const subscription = await prisma.subscription.upsert({
    where: {
      telegramChargeId,
    },
    create: {
      userId,
      planId,
      status: 'ACTIVE',
      paymentMethod: 'TELEGRAM_STARS',
      telegramChargeId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    update: {
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      canceledAt: null,
    },
  })

  await prisma.payment.upsert({
    where: {
      telegramChargeId,
    },
    create: {
      userId,
      subscriptionId: subscription.id,
      provider: 'TELEGRAM_STARS',
      providerTransactionId,
      telegramChargeId,
      amountStars,
      currency: 'XTR',
      status: 'PAID',
      payload,
      paidAt: now,
    },
    update: {
      status: 'PAID',
      paidAt: now,
    },
  })

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'ACTIVE',
      subscriptionPlanId: planId,
      subscriptionExpiresAt: periodEnd,
    },
  })

  return { subscription, periodEnd }
}
