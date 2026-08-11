import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import Stripe from 'stripe'
import { prisma } from '@snapcal/database'
import { requireAuth } from './users.js'
import { env } from '../lib/env.js'

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' }) : null

const subscriptionRoutesPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAuth)

  app.get('/status', async (request: FastifyRequest) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })
    if (!user) return { error: { code: 'USER_NOT_FOUND', message: 'Пользователь не найден' } }

    const now = new Date()
    const trialActive = user.trialEndsAt && user.trialEndsAt > now
    const hasActiveSub = ['active', 'trialing'].includes(user.subscriptionStatus.toLowerCase())

    let message = ''
    if (trialActive) {
      const daysLeft = Math.ceil((user.trialEndsAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      message = `Пробный период SnapCal Pro активен. Осталось ${daysLeft} ${daysLeft === 1 ? 'день' : 'дней'}.`
    } else if (hasActiveSub) {
      message = 'Подписка SnapCal Pro активна. Анализируйте еду без ограничений.'
    } else {
      message = 'Бесплатный лимит: 1 анализ фото в день. Оформите SnapCal Pro для безлимитного доступа к AI Coach.'
    }

    const sub = user.subscriptions[0]
    return {
      status: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
      trialActive,
      hasActiveSub,
      message,
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
        metadata: { telegramId: user.telegramId.toString(), userId: user.id },
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

export const subscriptionRoutes = fp(subscriptionRoutesPlugin)
