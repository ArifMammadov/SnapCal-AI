import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import fs from 'node:fs'
import path from 'node:path'

import { pipeline as pump } from 'node:stream/promises'
import { prisma } from '@snapcal/database'
import { env } from '../lib/env.js'
import { requireAuth } from './users.js'
import { isS3Enabled, uploadFileToS3 } from '../lib/s3.js'

const foodLogSchema = z.object({
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']),
  name: z.string().min(1).max(200),
  calories: z.number().int().min(0),
  proteinG: z.number().int().min(0).optional(),
  carbsG: z.number().int().min(0).optional(),
  fatG: z.number().int().min(0).optional(),
  imageUrl: z.string().url().optional(),
  aiAnalyzed: z.boolean().default(false),
  loggedAt: z.string().datetime().optional(),
})

const activityLogSchema = z.object({
  type: z.string().min(1),
  durationMin: z.number().int().min(1),
  caloriesBurned: z.number().int().min(0).optional(),
  startedAt: z.string().datetime(),
  notes: z.string().max(500).optional(),
})

const metricLogSchema = z.object({
  metricType: z.enum(['WATER_ML', 'SLEEP_H', 'WEIGHT_KG', 'STEPS']),
  value: z.number().positive(),
  loggedAt: z.string().datetime().optional(),
})

const dateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const summariesQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

function getDateRange(dateStr?: string) {
  const date = dateStr ? new Date(dateStr) : new Date()
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0)
  return { start, end }
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const trackingRoutesPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAuth)

  app.post('/food', async (request: FastifyRequest) => {
    const data = foodLogSchema.parse(request.body)
    const userId = request.user!.userId
    const loggedAt = data.loggedAt ? new Date(data.loggedAt) : new Date()

    return prisma.foodLog.create({
      data: { ...data, userId, loggedAt },
    })
  })

  app.get('/food', async (request: FastifyRequest) => {
    const { date } = dateQuerySchema.parse(request.query)
    const { start, end } = getDateRange(date)
    return prisma.foodLog.findMany({
      where: {
        userId: request.user!.userId,
        loggedAt: { gte: start, lt: end },
      },
      orderBy: { loggedAt: 'asc' },
    })
  })

  app.delete('/food/:id', async (request: FastifyRequest, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user!.userId
    await prisma.foodLog.deleteMany({ where: { id, userId } })
    return reply.status(204).send()
  })

  app.post('/activity', async (request: FastifyRequest) => {
    const data = activityLogSchema.parse(request.body)
    const userId = request.user!.userId
    return prisma.activityLog.create({
      data: { ...data, userId, startedAt: new Date(data.startedAt) },
    })
  })

  app.get('/activity', async (request: FastifyRequest) => {
    const { date } = dateQuerySchema.parse(request.query)
    const { start, end } = getDateRange(date)
    return prisma.activityLog.findMany({
      where: {
        userId: request.user!.userId,
        startedAt: { gte: start, lt: end },
      },
      orderBy: { startedAt: 'asc' },
    })
  })

  app.delete('/activity/:id', async (request: FastifyRequest, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user!.userId
    await prisma.activityLog.deleteMany({ where: { id, userId } })
    return reply.status(204).send()
  })

  app.post('/metric', async (request: FastifyRequest) => {
    const data = metricLogSchema.parse(request.body)
    const userId = request.user!.userId
    return prisma.metricLog.create({
      data: { ...data, userId, loggedAt: data.loggedAt ? new Date(data.loggedAt) : new Date() },
    })
  })

  app.get('/metric', async (request: FastifyRequest) => {
    const { date } = dateQuerySchema.parse(request.query)
    const { start, end } = getDateRange(date)
    return prisma.metricLog.findMany({
      where: {
        userId: request.user!.userId,
        loggedAt: { gte: start, lt: end },
      },
      orderBy: { loggedAt: 'asc' },
    })
  })

  app.delete('/metric/:id', async (request: FastifyRequest, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user!.userId
    await prisma.metricLog.deleteMany({ where: { id, userId } })
    return reply.status(204).send()
  })


  app.post('/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await request.file()
    if (!data) return reply.status(400).send({ error: { code: 'NO_FILE', message: 'No file uploaded' } })

    const ext = (data.filename.split('.').pop() || 'jpg').toLowerCase()
    const allowed = ['jpg', 'jpeg', 'png', 'webp']
    if (!allowed.includes(ext)) return reply.status(400).send({ error: { code: 'INVALID_TYPE', message: 'Only images allowed' } })

    const filename = request.user!.userId + '_' + Date.now() + '.' + ext

    if (isS3Enabled()) {
      const chunks: Buffer[] = []
      for await (const chunk of data.file) {
        chunks.push(chunk)
      }
      const buffer = Buffer.concat(chunks)
      const key = `uploads/${filename}`
      const url = await uploadFileToS3(key, buffer, data.mimetype, buffer.length)
      return { url }
    }

    // fallback to local filesystem
    const uploadDir = '/opt/snapcal/uploads'
    fs.mkdirSync(uploadDir, { recursive: true })
    const filepath = path.join(uploadDir, filename)
    await pump(data.file, fs.createWriteStream(filepath))

    const url = env.MOBILE_APP_URL + '/uploads/' + filename
    return { url }
  })

  app.get('/summary', async (request: FastifyRequest) => {
    const { date } = dateQuerySchema.parse(request.query)
    return buildDailySummary(request.user!.userId, date)
  })

  app.get('/summaries', async (request: FastifyRequest) => {
    const { start, end } = summariesQuerySchema.parse(request.query)
    const startDate = new Date(start)
    const endDate = new Date(end)
    endDate.setDate(endDate.getDate() + 1)

    const userId = request.user!.userId
    const [profile, foodLogs, activities, metrics] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.foodLog.findMany({
        where: { userId, loggedAt: { gte: startDate, lt: endDate } },
        orderBy: { loggedAt: 'asc' },
      }),
      prisma.activityLog.findMany({
        where: { userId, startedAt: { gte: startDate, lt: endDate } },
        orderBy: { startedAt: 'asc' },
      }),
      prisma.metricLog.findMany({
        where: { userId, loggedAt: { gte: startDate, lt: endDate } },
        orderBy: { loggedAt: 'asc' },
      }),
    ])

    const byDay = new Map<string, { foodLogs: any[]; activities: any[]; metrics: any[] }>()
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      byDay.set(dateKey(d), { foodLogs: [], activities: [], metrics: [] })
    }

    for (const f of foodLogs) byDay.get(dateKey(f.loggedAt))?.foodLogs.push(f)
    for (const a of activities) byDay.get(dateKey(a.startedAt))?.activities.push(a)
    for (const m of metrics) byDay.get(dateKey(m.loggedAt))?.metrics.push(m)

    const results: any[] = []
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const key = dateKey(d)
      const day = byDay.get(key)!
      results.push(buildSummaryFromData(userId, key, day.foodLogs, day.activities, day.metrics, profile))
    }

    return results
  })
}

async function buildDailySummary(userId: string, dateStr?: string) {
  const { start, end } = getDateRange(dateStr)
  const [profile, foodLogs, activities, metrics] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.foodLog.findMany({ where: { userId, loggedAt: { gte: start, lt: end } } }),
    prisma.activityLog.findMany({ where: { userId, startedAt: { gte: start, lt: end } } }),
    prisma.metricLog.findMany({ where: { userId, loggedAt: { gte: start, lt: end } } }),
  ])
  return buildSummaryFromData(userId, start.toISOString().split('T')[0], foodLogs, activities, metrics, profile)
}

function buildSummaryFromData(
  _userId: string,
  date: string,
  foodLogs: any[],
  activities: any[],
  metrics: any[],
  profile: any,
) {
  const caloriesConsumed = foodLogs.reduce((s: number, f: { calories: number }) => s + f.calories, 0)
  const proteinG = foodLogs.reduce((s: number, f: { proteinG: number | null }) => s + (f.proteinG ?? 0), 0)
  const carbsG = foodLogs.reduce((s: number, f: { carbsG: number | null }) => s + (f.carbsG ?? 0), 0)
  const fatG = foodLogs.reduce((s: number, f: { fatG: number | null }) => s + (f.fatG ?? 0), 0)
  const waterMl = metrics
    .filter((m: { metricType: string; value: { toNumber: () => number } }) => m.metricType === 'WATER_ML')
    .reduce((s: number, m: { value: { toNumber: () => number } }) => s + m.value.toNumber(), 0)
  const sleepH = Number(metrics.find((m: { metricType: string }) => m.metricType === 'SLEEP_H')?.value?.toNumber() ?? 0)
  const steps = metrics
    .filter((m: { metricType: string; value: { toNumber: () => number } }) => m.metricType === 'STEPS')
    .reduce((s: number, m: { value: { toNumber: () => number } }) => s + m.value.toNumber(), 0)
  const weightKg = (Number(metrics.find((m: { metricType: string }) => m.metricType === 'WEIGHT_KG')?.value?.toNumber() ?? 0) || (profile?.currentWeightKg ?? 0))
  const activitiesCount = activities.length
  const caloriesBurned = activities.reduce((s: number, a: { caloriesBurned: number | null }) => s + (a.caloriesBurned ?? 0), 0)

  const calorieGoal = profile?.dailyCalories ?? 2200
  const proteinGoal = profile?.dailyProteinG ?? 150
  const waterGoalMl = profile?.dailyWaterMl ?? 3000
  const sleepGoalH = profile?.dailySleepH ?? 8
  const stepsGoal = profile?.dailySteps ?? 10000

  const scoreParts = [
    clamp(caloriesConsumed / calorieGoal, 0, 1),
    clamp(proteinG / proteinGoal, 0, 1),
    clamp(waterMl / waterGoalMl, 0, 1),
    clamp(Number(sleepH) / Number(sleepGoalH), 0, 1),
    clamp(steps / stepsGoal, 0, 1),
    activitiesCount > 0 ? 1 : 0,
  ]
  const healthScore = Math.round((scoreParts.reduce((s: number, v: number) => s + v, 0) / scoreParts.length) * 100)

  return {
    date,
    caloriesConsumed,
    calorieGoal,
    proteinG,
    proteinGoal,
    carbsG,
    fatG,
    waterMl,
    waterGoalMl,
    sleepH,
    sleepGoalH,
    steps,
    stepsGoal,
    weightKg,
    activitiesCount,
    caloriesBurned,
    healthScore,
    foodLogs,
    activities,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export const trackingRoutes = trackingRoutesPlugin
