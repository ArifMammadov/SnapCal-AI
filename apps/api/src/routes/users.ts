import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod'
import { prisma } from '@snapcal/database'
import { calculateCalorieGoal } from '@snapcal/shared'

declare module 'fastify' {
  interface FastifyRequest {
    user?: { userId: string; telegramId: string; role: string }
  }
}

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const payload = await request.jwt.verify<{ userId: string; telegramId: string; role: string }>(request.headers.authorization?.replace('Bearer ', '') ?? '')
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
  dailyWaterMl: z.number().int().optional(),
  dailySleepH: z.number().positive().optional(),
  dailySteps: z.number().int().optional(),
  units: z.enum(['metric', 'imperial']).optional(),
})

const userRoutesPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAuth)

  app.get('/me', async (request: FastifyRequest) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      include: { profile: true },
    })
    return user
  })

  app.patch('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = updateProfileSchema.parse(request.body)

    const profile = await prisma.profile.findUnique({
      where: { userId: request.user!.userId },
    })

    if (!profile) {
      return reply.status(404).send({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } })
    }

    const merged = {
      ...profile,
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : profile.birthDate,
    }

    const dailyCalories = data.dailyCalories ?? calculateCalorieGoal({
      gender: merged.gender ?? undefined,
      weightKg: merged.currentWeightKg ? Number(merged.currentWeightKg) : undefined,
      heightCm: merged.heightCm ?? undefined,
      birthDate: merged.birthDate ?? undefined,
      activityLevel: merged.activityLevel ?? undefined,
      primaryGoal: merged.primaryGoal ?? undefined,
    })

    const updated = await prisma.profile.update({
      where: { userId: request.user!.userId },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        dailyCalories: data.dailyCalories ?? dailyCalories,
      },
    })

    return updated
  })

  app.get('/me/goals', async (request: FastifyRequest) => {
    const profile = await prisma.profile.findUnique({
      where: { userId: request.user!.userId },
    })
    return profile
  })

  app.patch('/me/goals', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = updateProfileSchema.parse(request.body)
    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.userId } })
    if (!profile) {
      return reply.status(404).send({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } })
    }

    const updated = await prisma.profile.update({
      where: { userId: request.user!.userId },
      data,
    })
    return updated
  })
}

export const userRoutes = fp(userRoutesPlugin)
