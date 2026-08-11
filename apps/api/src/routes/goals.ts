import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
import { prisma } from '@snapcal/database'
import { requireAuth } from './users.js'

interface Milestone {
  month: number
  label: string
  targetWeightKg: number | null
  targetCalories: number
  workoutsPerWeek: number
  focus: string
  color: string
}

function toNumber(value: any): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  if (typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber()
  return null
}

function generatePlan(profile: {
  currentWeightKg: number | null
  targetWeightKg: number | null
  dailyCalories: number | null
  gender: string | null
  birthDate: Date | null
  activityLevel: string | null
}): Milestone[] {
  const startWeight = profile.currentWeightKg ?? 80
  const targetWeight = profile.targetWeightKg ?? Math.max(startWeight - 10, 65)
  const totalLoss = startWeight - targetWeight
  const baseCalories = profile.dailyCalories ?? 2200
  const isFemale = profile.gender?.toUpperCase() === 'FEMALE'

  const phases = [
    { label: 'Foundation', focus: 'Привычки, сон, гидратация, отказ от обработанной еды', workouts: 4, color: 'var(--blue)' },
    { label: 'Momentum', focus: 'Больше шагов, белок, 2 кардио/неделю', workouts: 5, color: 'var(--purple)' },
    { label: 'Acceleration', focus: 'Силовые тренировки, дефицит калорий, прогрессивная нагрузка', workouts: 5, color: 'var(--green)' },
    { label: 'Peak', focus: 'Рекомпозиция тела, дефиниция, тайминг питания', workouts: 6, color: 'var(--amber)' },
    { label: 'Refinement', focus: 'Точная настройка макро, восстановление, мобильность', workouts: 6, color: 'var(--orange)' },
    { label: 'Goal Achieved', focus: 'Поддержание, новые цели, закрепление привычек', workouts: 5, color: 'var(--rose)' },
  ]

  return phases.map((phase, idx) => {
    const month = idx + 1
    const ratio = month / 6
    const targetCalories = Math.max(1400, Math.round(baseCalories - ratio * (isFemale ? 400 : 600)))
    const targetWeightKg = Math.round((startWeight - totalLoss * ratio) * 10) / 10
    return {
      month,
      label: phase.label,
      targetWeightKg,
      targetCalories,
      workoutsPerWeek: phase.workouts,
      focus: phase.focus,
      color: phase.color,
    }
  })
}

const goalRoutesPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAuth)

  app.get('/plan', async (request: FastifyRequest) => {
    const userId = request.user!.userId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    })
    if (!user || !user.profile) {
      return {
        error: { code: 'PROFILE_REQUIRED', message: 'Заполните профиль, чтобы получить персональный план.' },
      }
    }

    const profile = user.profile
    const plan = generatePlan({
      currentWeightKg: toNumber(profile.currentWeightKg),
      targetWeightKg: toNumber(profile.targetWeightKg),
      dailyCalories: profile.dailyCalories ?? null,
      gender: profile.gender,
      birthDate: profile.birthDate,
      activityLevel: profile.activityLevel,
    })
    const startWeight = toNumber(profile.currentWeightKg) ?? plan[0].targetWeightKg ?? 80
    const targetWeight = toNumber(profile.targetWeightKg) ?? plan[plan.length - 1].targetWeightKg ?? startWeight
    const currentWeight = toNumber(profile.currentWeightKg) ?? startWeight
    const currentMonth = Math.min(6, Math.max(1, Math.ceil((1 - currentWeight / startWeight) * 6) || 1))

    return {
      startWeightKg: startWeight,
      targetWeightKg: targetWeight,
      totalLossKg: startWeight && targetWeight ? Math.round((startWeight - targetWeight) * 10) / 10 : null,
      currentMonth,
      percentComplete: Math.round((currentMonth / 6) * 100),
      milestones: plan,
    }
  })
}

export const goalRoutes = goalRoutesPlugin
