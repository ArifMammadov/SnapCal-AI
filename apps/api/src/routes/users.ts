import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '@snapcal/database'
import { calculateDefaultGoals } from '@snapcal/shared'
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

const updateProfileSchema = z.object({
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
