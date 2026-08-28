import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import Stripe from 'stripe'
import { prisma } from '@snapcal/database'
import { requireAuth } from './users.js'
import { env } from '../lib/env.js'
import { normalizeLanguage, t } from '../lib/i18n.js'
import { checkPhotoScanLimit, checkTextMessageLimit } from '../lib/subscriptionLimits.js'
import axios from 'axios'

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' }) : null

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`
const TELEGRAM_BOT_USERNAME = env.TELEGRAM_BOT_USERNAME || 'snapcal_ai_bot'

function createStarsInvoicePayload(userId: string, planId: string): string {
  const raw = JSON.stringify({ userId, planId, ts: Date.now() })
  return `stars_${TELEGRAM_BOT_USERNAME}_${Buffer.from(raw).toString('base64url').slice(0, 80)}`
}

const PRO_MONTHLY_PLAN = {
  slug: 'pro_monthly',
  name: 'SnapCal Pro Monthly',
  priceUsd: 4.99,
  priceStars: 250,
  interval: 'MONTHLY',
  features: ['Unlimited photo scans', 'Unlimited AI chat', 'Personalized meal plans'],
}

async function ensureProPlan(): Promise<{ id: string; slug: string; priceStars: number; name: string }> {
  let plan = await prisma.subscriptionPlan.findUnique({ where: { slug: PRO_MONTHLY_PLAN.slug } })
  if (!plan) {
    plan = await prisma.subscriptionPlan.create({ data: PRO_MONTHLY_PLAN as any })
  }
  if (plan.priceStars == null) {
    throw new Error('Pro plan is missing priceStars')
  }
  return { id: plan.id, slug: plan.slug, priceStars: plan.priceStars as number, name: plan.name }
}

export async function registerSubscriptionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/status', async (request: FastifyRequest) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })
    if (!user) return { error: { code: 'USER_NOT_FOUND', message: t('user_not_found', 'en') } }

    const lang = normalizeLanguage(user.languageCode)
    const now = new Date()
    const trialActive = user.trialEndsAt && user.trialEndsAt > now
    const hasActiveSub =
      ['active', 'trialing'].includes(user.subscriptionStatus.toLowerCase()) &&
      (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > now)

    let message = ''
    if (trialActive) {
      const daysLeft = Math.max(0, Math.ceil((user.trialEndsAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      message = t('subscription_trial', lang).replace('{{days}}', String(daysLeft))
    } else if (hasActiveSub) {
      message = t('subscription_active', lang)
    } else {
      message = t('subscription_free', lang)
    }

    const [photoLimit, textLimit] = await Promise.all([
      checkPhotoScanLimit(user.id),
      checkTextMessageLimit(user.id),
    ])

    const sub = user.subscriptions[0]
    return {
      status: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
      trialActive,
      hasActiveSub,
      message,
      photoScans: {
        dailyLimit: photoLimit.dailyLimit === Number.POSITIVE_INFINITY ? null : photoLimit.dailyLimit,
        usedToday: photoLimit.usedToday,
        remainingToday: photoLimit.remainingToday === Number.POSITIVE_INFINITY ? null : photoLimit.remainingToday,
      },
      textMessages: {
        dailyLimit: textLimit.dailyLimit === Number.POSITIVE_INFINITY ? null : textLimit.dailyLimit,
        usedToday: textLimit.usedToday,
        remainingToday: textLimit.remainingToday === Number.POSITIVE_INFINITY ? null : textLimit.remainingToday,
      },
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: sub?.status === 'CANCELED',
    }
  })

  app.get('/plans', async () => {
    return prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { interval: 'asc' },
    })
  })

  app.post('/stars/invoice', async (request: FastifyRequest, reply) => {
    if (!env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN === 'placeholder') {
      return reply.status(503).send({ error: { code: 'TELEGRAM_NOT_CONFIGURED', message: 'Telegram bot not configured' } })
    }

    const user = await prisma.user.findUnique({ where: { id: request.user!.userId } })
    if (!user) {
      return reply.status(404).send({ error: { code: 'USER_NOT_FOUND', message: t('user_not_found', 'en') } })
    }
    const lang = normalizeLanguage(user.languageCode)
    const plan = await ensureProPlan()

    const payload = createStarsInvoicePayload(user.id, plan.id).slice(0, 128)
    try {
      const { data } = await axios.post(`${TELEGRAM_API_BASE}/createInvoiceLink`, {
        title: plan.name,
        description: t('subscription_active', lang).slice(0, 200),
        payload: payload.slice(0, 128),
        provider_token: '',
        currency: 'XTR',
        prices: [{ label: plan.name, amount: plan.priceStars }],
      })

      if (!data.ok || !data.result) {
        throw new Error(data.description || 'Telegram API error')
      }

      return { invoiceUrl: data.result, planId: plan.id, priceStars: plan.priceStars }
    } catch (err: any) {
      request.log.warn({ err: err.message }, 'failed to create Telegram Stars invoice')
      return reply.status(502).send({ error: { code: 'INVOICE_FAILED', message: t('invoice_failed', lang) } })
    }
  })

  app.post('/stars/verify', async (request: FastifyRequest, reply) => {
    const { telegramChargeId, providerChargeId } = request.body as { telegramChargeId?: string; providerChargeId?: string }
    const user = await prisma.user.findUnique({ where: { id: request.user!.userId } })
    if (!user) {
      return reply.status(404).send({ error: { code: 'USER_NOT_FOUND', message: t('user_not_found', 'en') } })
    }
    const lang = normalizeLanguage(user.languageCode)

    const payment = await prisma.payment.findFirst({
      where: {
        userId: user.id,
        status: 'PAID',
        OR: [
          { telegramChargeId: telegramChargeId ?? '' },
          { providerTransactionId: providerChargeId ?? '' },
        ],
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!payment) {
      return reply.status(404).send({ error: { code: 'PAYMENT_NOT_FOUND', message: t('payment_not_found', lang) } })
    }

    return { success: true, message: t('payment_verified', lang), subscriptionStatus: user.subscriptionStatus }
  })

  app.post('/checkout', async (request: FastifyRequest, reply) => {
    if (!stripe) {
      return reply.status(503).send({ error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Stripe not configured' } })
    }

    const { planId } = request.body as { planId: string }
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
    if (!plan || !plan.stripePriceId) {
      return reply.status(400).send({ error: { code: 'INVALID_PLAN', message: 'Invalid subscription plan' } })
    }

    const user = await prisma.user.findUnique({ where: { id: request.user!.userId } })
    if (!user) {
      return reply.status(404).send({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } })
    }

    let stripeCustomerId = user.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: { telegramId: user.telegramId?.toString() ?? '', userId: user.id },
      })
      stripeCustomerId = customer.id
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${env.MOBILE_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.MOBILE_APP_URL}/subscription/cancel`,
      metadata: { userId: user.id, planId: plan.id },
      subscription_data: { trial_period_days: 7 },
    })

    return { checkoutUrl: session.url }
  })

  app.post('/cancel', async (request: FastifyRequest, reply) => {
    if (!stripe) {
      return reply.status(503).send({ error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Stripe not configured' } })
    }

    const sub = await prisma.subscription.findFirst({
      where: { userId: request.user!.userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })
    if (!sub || !sub.stripeSubscriptionId) {
      return reply.status(404).send({ error: { code: 'NO_ACTIVE_SUB', message: 'No active subscription' } })
    }

    await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true })
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELED', canceledAt: new Date() },
    })

    return { success: true }
  })

  app.post('/webhooks/stripe', async (request: FastifyRequest, reply) => {
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
      return reply.status(503).send({ error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Stripe not configured' } })
    }

    const sig = request.headers['stripe-signature'] as string
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(request.body as string, sig, env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      return reply.status(400).send({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' } })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      const planId = session.metadata?.planId
      if (!userId || !planId) {
        return reply.status(400).send({ error: { code: 'MISSING_METADATA', message: 'Missing metadata' } })
      }

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      const status = subscription.status === 'trialing' ? 'TRIALING' : 'ACTIVE'

      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: status,
          subscriptionPlanId: planId,
          stripeCustomerId: session.customer as string,
          subscriptionExpiresAt: new Date(subscription.current_period_end * 1000),
        },
      })

      await prisma.subscription.upsert({
        where: { stripeSubscriptionId: subscription.id },
        create: {
          userId,
          planId,
          stripeSubscriptionId: subscription.id,
          status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
        update: {
          status,
          planId,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          canceledAt: null,
        },
      })
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string | null
      if (!customerId) return { received: true }
      const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: 'PAST_DUE' },
        })
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const user = await prisma.user.findFirst({ where: { stripeCustomerId: subscription.customer as string } })
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: 'INACTIVE' },
        })
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: 'CANCELED', canceledAt: new Date() },
        })
      }
    }

    return { received: true }
  })
}

export const subscriptionRoutes = fp(registerSubscriptionRoutes)
