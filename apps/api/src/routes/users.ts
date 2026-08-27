import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import axios from 'axios'
import { prisma } from '@snapcal/database'
import { calculateDefaultGoals } from '@snapcal/shared'
import { env } from '../lib/env.js'
import type { JwtPayload } from '../types/auth.js'

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  if (request.url === '/health' || request.url === '/api/health' || request.url.startsWith('/api/auth/')) return
  try {
    const payload = await request.server.jwt.verify<JwtPayload>(request.headers.authorization?.replace('Bearer ', '') ?? '')
    request.user = payload
  } catch {
    reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } })
  }
}

const aiAgent = axios.create({
  baseURL: env.AI_AGENT_URL,
  timeout: 60000,
  headers: env.AI_AGENT_SECRET ? { 'x-snapcal-secret': env.AI_AGENT_SECRET } : undefined,
})

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  languageCode: z.enum(['en','ru','az','uz']).optional(),
  birthDate: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  heightCm: z.number().int().min(50).max(300).optional(),
  currentWeightKg: z.number().positive().optional(),
  targetWeightKg: z.number().positive().optional(),
  primaryGoal: z.enum(['FAT_LOSS', 'MUSCLE_GAIN', 'MAINTENANCE', 'HEALTH']).optional(),
  activityLevel: z.enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']).optional(),
  dietaryPreferences: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dailyCalories: z.number().int().optional(),
  dailyProteinG: z.number().int().optional(),
  dailyCarbsG: z.number().int().optional(),
  dailyFatG: z.number().int().optional(),
  dailyWaterMl: z.number().int().optional(),
  dailySleepH: z.number().positive().optional(),
  dailySteps: z.number().int().optional(),
  units: z.enum(['metric', 'imperial']).optional(),
  goalPlan: z.record(z.any()).optional(),
})

export const userRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAuth)

  app.get('/me', async (request: FastifyRequest) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      include: { profile: true, subscriptions: { where: { status: 'ACTIVE' }, take: 1 } },
    })
    if (!user) return null
    return {
      ...user,
      languageCode: user.languageCode,
      telegramId: user.telegramId?.toString() ?? null,
      subscriptions: user.subscriptions.map((s: { stripeSubscriptionId: string | null }) => ({
        ...s,
        stripeSubscriptionId: s.stripeSubscriptionId ?? undefined,
      })),
    }
  })

  app.get('/me/onboarding-status', async (request: FastifyRequest) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      include: { profile: true },
    })

    const requiredFields = ['gender', 'heightCm', 'currentWeightKg', 'birthDate', 'primaryGoal'] as const
    const missing: string[] = []
    for (const field of requiredFields) {
      if (!user?.profile?.[field]) missing.push(field)
    }

    return {
      onboardingCompleted: missing.length === 0,
      missingFields: missing,
      profile: user?.profile
        ? {
            ...user.profile,
            currentWeightKg: user.profile.currentWeightKg ? Number(user.profile.currentWeightKg) : null,
            targetWeightKg: user.profile.targetWeightKg ? Number(user.profile.targetWeightKg) : null,
          }
        : null,
    }
  })

  app.patch('/me/profile', async (request: FastifyRequest) => {
    const data = updateProfileSchema.parse(request.body)
    const userId = request.user!.userId

    const userUpdate: any = {}
    if (data.firstName) userUpdate.firstName = data.firstName
    if (data.lastName) userUpdate.lastName = data.lastName
    if (data.email !== undefined) userUpdate.email = data.email || null
    if (data.phone !== undefined) userUpdate.phone = data.phone || null
    if (data.languageCode) userUpdate.languageCode = data.languageCode
    if (Object.keys(userUpdate).length) {
      await prisma.user.update({ where: { id: userId }, data: userUpdate })
    }

    const existing = await prisma.profile.findUnique({ where: { userId } })

    const mergedProfile = {
      gender: data.gender ?? existing?.gender ?? 'OTHER',
      heightCm: data.heightCm ?? existing?.heightCm ?? 0,
      currentWeightKg: data.currentWeightKg ?? (existing?.currentWeightKg ? Number(existing.currentWeightKg) : 0),
      birthDate: data.birthDate ? new Date(data.birthDate) : (existing?.birthDate ?? new Date('1995-01-01')),
      activityLevel: data.activityLevel ?? existing?.activityLevel ?? 'MODERATE',
      primaryGoal: data.primaryGoal ?? existing?.primaryGoal ?? 'MAINTENANCE',
    }

    const shouldAutoCalculateGoals =
      !data.dailyCalories &&
      mergedProfile.gender &&
      mergedProfile.currentWeightKg > 0 &&
      mergedProfile.heightCm > 0

    const goals = shouldAutoCalculateGoals
      ? calculateDefaultGoals({
          gender: mergedProfile.gender,
          weightKg: mergedProfile.currentWeightKg,
          heightCm: mergedProfile.heightCm,
          birthDate: mergedProfile.birthDate,
          activityLevel: mergedProfile.activityLevel,
          primaryGoal: mergedProfile.primaryGoal,
        })
      : null

    const updatePayload = {
      ...data,
      ...(data.goalPlan ? { goalPlan: data.goalPlan } : {}),
      ...(goals && {
        dailyCalories: goals.dailyCalories,
        dailyProteinG: data.dailyProteinG ?? goals.dailyProteinG,
        dailyCarbsG: data.dailyCarbsG ?? goals.dailyCarbsG,
        dailyFatG: data.dailyFatG ?? goals.dailyFatG,
        dailyWaterMl: data.dailyWaterMl ?? goals.dailyWaterMl,
        dailySleepH: data.dailySleepH ?? goals.dailySleepH,
        dailySteps: data.dailySteps ?? goals.dailySteps,
      }),
    }

    const updated = await prisma.profile.upsert({
      where: { userId },
      update: updatePayload,
      create: { userId, ...updatePayload, ...mergedProfile },
    })

    return {
      ...updated,
      currentWeightKg: updated.currentWeightKg ? Number(updated.currentWeightKg) : null,
      targetWeightKg: updated.targetWeightKg ? Number(updated.targetWeightKg) : null,
    }
  })

  app.get('/me/goal-plan', async (request: FastifyRequest) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      include: { profile: true },
    })
    const stored = user?.profile?.goalPlan as any
    if (stored && Array.isArray(stored.milestones)) return stored
    const profile = user?.profile
    if (!profile?.primaryGoal) {
      return { primaryGoal: 'MAINTENANCE', timelineMonths: 6, milestones: [], dailyTargets: {} }
    }
    const months = 6
    const startWeight = Number(profile.currentWeightKg) || 70
    const targetWeight = Number(profile.targetWeightKg) || startWeight
    const lossKg = Math.max(0, startWeight - targetWeight)
    const now = new Date()
    const milestones = Array.from({ length: months }, (_, i) => {
      const month = i + 1
      const pct = month / months
      const weight = targetWeight + lossKg * (1 - pct)
      const calorieGoal = profile.dailyCalories || 2200
      return {
        month,
        label: `Month ${month}`,
        targetWeightKg: lossKg > 0 ? +weight.toFixed(1) : null,
        targetCalories: calorieGoal,
        workoutsPerWeek: profile.activityLevel === 'VERY_ACTIVE' ? 5 : profile.activityLevel === 'ACTIVE' ? 4 : 3,
        focus: month <= 2 ? 'Habits & consistency' : month <= 4 ? 'Strength & nutrition quality' : 'Sustain & maintain',
        color: month <= 2 ? 'var(--green)' : month <= 4 ? 'var(--blue)' : 'var(--purple)',
      }
    })
    return {
      primaryGoal: profile.primaryGoal,
      startWeightKg: startWeight,
      targetWeightKg: targetWeight,
      totalLossKg: lossKg > 0 ? +lossKg.toFixed(1) : null,
      currentMonth: 1,
      percentComplete: 0,
      timelineMonths: months,
      dailyTargets: {
        calories: profile.dailyCalories || 2200,
        proteinG: profile.dailyProteinG || 120,
        carbsG: profile.dailyCarbsG || 200,
        fatG: profile.dailyFatG || 70,
        waterL: ((profile.dailyWaterMl || 3000) / 1000).toFixed(1),
        sleepH: Number(profile.dailySleepH) || 8,
        steps: profile.dailySteps || 10000,
        workoutsPerWeek: profile.activityLevel === 'VERY_ACTIVE' ? 5 : profile.activityLevel === 'ACTIVE' ? 4 : 3,
      },
      milestones,
    }
  })

  app.put('/me/goal-plan', async (request: FastifyRequest) => {
    const userId = request.user!.userId
    const plan = (request.body as any) ?? {}
    const updated = await prisma.profile.upsert({
      where: { userId },
      update: { goalPlan: plan },
      create: { userId, goalPlan: plan, gender: 'OTHER', heightCm: 0, currentWeightKg: 0, birthDate: new Date('1995-01-01'), activityLevel: 'MODERATE', primaryGoal: 'MAINTENANCE' },
    })
    return updated.goalPlan
  })

  app.post('/me/goal-plan/generate', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.userId
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } })
    if (!user?.profile) {
      return reply.status(400).send({ error: { code: 'NO_PROFILE', message: 'Complete your profile first' } })
    }
    try {
      const userMessage = await prisma.chatMessage.create({
        data: { userId, role: 'USER', type: 'TEXT', content: 'Generate my detailed 6-month transformation plan based on my profile.' },
      })
      await aiAgent.post('/chat', {
        userId,
        message: 'Generate my detailed 6-month transformation plan based on my profile.',
        messageId: userMessage.id,
      })
      const updated = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } })
      return updated?.profile?.goalPlan ?? { generated: true }
    } catch (err: any) {
      return reply.status(502).send({ error: { code: 'AI_AGENT_ERROR', message: err.message || 'Failed to generate plan' } })
    }
  })

  app.get('/me/subscription', async (request: FastifyRequest) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      include: { subscriptions: { where: { status: 'ACTIVE' }, take: 1 } },
    })

    const now = new Date()
    const inTrial = user?.trialEndsAt && user.trialEndsAt > now
    const activeSub = user?.subscriptions[0]

    return {
      subscriptionStatus: user?.subscriptionStatus ?? 'FREE',
      trialEndsAt: user?.trialEndsAt,
      inTrial: !!inTrial,
      isPro: !!activeSub || !!inTrial,
      subscription: activeSub
        ? {
            ...activeSub,
            stripeSubscriptionId: activeSub.stripeSubscriptionId ?? undefined,
          }
        : null,
    }
  })
}
