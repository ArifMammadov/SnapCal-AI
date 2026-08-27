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
  weeks?: { week: number; focus: string; calorieTarget: number; workoutDays: number; stepsTarget: number; checkboxes: string[] }[]
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
  const stepsTarget = 8000

  const phases = [
    { label: 'Foundation', focus: 'Привычки, сон, гидратация, отказ от обработанной еды', workouts: 4, color: 'var(--blue)', calorieMod: 0 },
    { label: 'Momentum', focus: 'Больше шагов, белок, 2 кардио/неделю', workouts: 5, color: 'var(--purple)', calorieMod: -100 },
    { label: 'Acceleration', focus: 'Силовые тренировки, дефицит калорий, прогрессивная нагрузка', workouts: 5, color: 'var(--green)', calorieMod: -200 },
    { label: 'Peak', focus: 'Рекомпозиция тела, дефиниция, тайминг питания', workouts: 6, color: 'var(--amber)', calorieMod: -300 },
    { label: 'Refinement', focus: 'Точная настройка макро, восстановление, мобильность', workouts: 6, color: 'var(--orange)', calorieMod: -350 },
    { label: 'Goal Achieved', focus: 'Поддержание, новые цели, закрепление привычек', workouts: 5, color: 'var(--rose)', calorieMod: -300 },
  ]

  return phases.map((phase, idx) => {
    const month = idx + 1
    const ratio = month / 6
    const targetCalories = Math.max(1400, Math.round(baseCalories - ratio * (isFemale ? 400 : 600) + phase.calorieMod))
    const targetWeightKg = Math.round((startWeight - totalLoss * ratio) * 10) / 10
    const weeklySteps = stepsTarget + idx * 400
    const weeks = Array.from({ length: 4 }, (_, w) => ({
      week: w + 1,
      focus: w === 0 ? 'Адаптация' : w === 1 ? 'Прогресс' : w === 2 ? 'Интенсив' : 'Закрепление',
      calorieTarget: targetCalories,
      workoutDays: phase.workouts,
      stepsTarget: weeklySteps,
      checkboxes: [
        'Выполнить план тренировок',
        'Выпить норму воды',
        'Соблюсти калорийную цель',
        'Сделать 7-8 часов сна',
      ],
    }))
    return {
      month,
      label: phase.label,
      targetWeightKg,
      targetCalories,
      workoutsPerWeek: phase.workouts,
      focus: phase.focus,
      color: phase.color,
      weeks,
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
    const stored = profile.goalPlan as any
    const storedMilestones = stored?.milestones
    const fallback = generatePlan({
      currentWeightKg: toNumber(profile.currentWeightKg),
      targetWeightKg: toNumber(profile.targetWeightKg),
      dailyCalories: profile.dailyCalories ?? null,
      gender: profile.gender,
      birthDate: profile.birthDate,
      activityLevel: profile.activityLevel,
    })

    const plan = (Array.isArray(storedMilestones) && storedMilestones.length === 6) ? storedMilestones : fallback
    const startWeight = (toNumber(stored?.startWeightKg) ?? toNumber(profile.currentWeightKg) ?? plan[0].targetWeightKg ?? 80)
    const targetWeight = (toNumber(stored?.targetWeightKg) ?? toNumber(profile.targetWeightKg) ?? plan[plan.length - 1].targetWeightKg ?? startWeight)
    const currentWeight = toNumber(profile.currentWeightKg) ?? startWeight
    const currentMonth = Math.min(6, Math.max(1, (stored?.currentMonth ?? (Math.ceil((1 - (currentWeight - targetWeight) / (startWeight - targetWeight || 1)) * 6) || 1))))
    const timelineMonths = stored?.timelineMonths ?? 6

    const dailyTargets = stored?.dailyTargets ?? {
      calories: (profile.dailyCalories ?? 2200),
      proteinG: (profile.dailyProteinG ?? 120),
      carbsG: (profile.dailyCarbsG ?? 200),
      fatG: (profile.dailyFatG ?? 70),
      waterL: Number(((profile.dailyWaterMl ?? 3000) / 1000).toFixed(1)),
      sleepH: (Number(profile.dailySleepH) || 8),
      steps: (profile.dailySteps ?? 10000),
      workoutsPerWeek: profile.activityLevel === 'VERY_ACTIVE' ? 5 : profile.activityLevel === 'ACTIVE' ? 4 : 3,
    }

    return {
      primaryGoal: stored?.primaryGoal ?? profile.primaryGoal ?? 'MAINTENANCE',
      startWeightKg: startWeight,
      targetWeightKg: targetWeight,
      totalLossKg: startWeight && targetWeight ? Math.round((startWeight - targetWeight) * 10) / 10 : null,
      currentMonth,
      percentComplete: Math.round((currentMonth / timelineMonths) * 100),
      timelineMonths,
      dailyTargets,
      milestones: plan,
    }
  })
}

export const goalRoutes = goalRoutesPlugin
