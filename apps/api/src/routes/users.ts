import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod'
import { prisma } from '@snapcal/database'
import { calculateCalorieGoal } from '@snapcal/shared'
import type { JwtPayload } from '../types/auth.js'

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
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

  app.patch('/me/profile', async (request: FastifyRequest) => {
    const data = updateProfileSchema.parse(request.body)
    const userId = request.user!.userId

    let dailyCalories = data.dailyCalories
    if (data.currentWeightKg && data.heightCm && !dailyCalories) {
      dailyCalories = calculateCalorieGoal({
        weightKg: data.currentWeightKg,
        heightCm: data.heightCm,
        gender: data.gender ?? 'OTHER',
        birthDate: data.birthDate ? new Date(data.birthDate) : new Date('1995-01-01'),
        activityLevel: data.activityLevel ?? 'MODERATE',
        primaryGoal: data.primaryGoal ?? 'MAINTENANCE',
      })
    }

    return prisma.profile.upsert({
      where: { userId },
      update: { ...data, dailyCalories },
      create: { userId, ...data, dailyCalories },
    })
  })

  app.get('/summary', async (request: FastifyRequest) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      include: { profile: true, activeSubscription: true },
    })
    return user
  })
}

export const userRoutes = fp(userRoutesPlugin)
