import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import Stripe from 'stripe'
import { prisma } from '@snapcal/database'
import { requireAuth } from './users.js'
import { env } from '../lib/env.js'

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' }) : null

const subscriptionRoutesPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAuth)

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

    let stripeCustomerId: string | undefined
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: { telegramId: user.telegramId.toString(), userId: user.id },
      })
      stripeCustomerId = customer.id
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

      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'ACTIVE',
          subscriptionPlanId: planId,
        },
      })

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      await prisma.subscription.create({
        data: {
          userId,
          planId,
          stripeSubscriptionId: subscription.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      })
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      const userId = invoice.metadata?.userId
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionStatus: 'PAST_DUE' },
        })
      }
    }

    return { received: true }
  })
}

export const subscriptionRoutes = fp(subscriptionRoutesPlugin)
