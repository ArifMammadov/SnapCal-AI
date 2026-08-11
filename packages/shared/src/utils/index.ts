export function getRegionLanguage(telegramLang?: string, regionCode?: string): string {
  if (regionCode === 'UZ') return 'uz'
  if (regionCode === 'KZ') return 'kk'
  if (['AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'EG', 'MA', 'DZ', 'TN'].includes(regionCode ?? '')) return 'ar'
  if (['ru', 'uk', 'be'].includes(telegramLang ?? '')) return 'ru'
  return telegramLang && ['en', 'ru', 'uz', 'kk', 'ar'].includes(telegramLang) ? telegramLang : 'en'
}

export function calculateCalorieGoal(profile: {
  gender?: string
  weightKg?: number
  heightCm?: number
  birthDate?: Date
  activityLevel?: string
  primaryGoal?: string
}): number {
  const { gender, weightKg, heightCm, birthDate, activityLevel, primaryGoal } = profile
  if (!weightKg || !heightCm || !birthDate || !gender) return 2200

  const age = new Date().getFullYear() - birthDate.getFullYear()
  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age
  bmr += gender.toLowerCase() === 'female' ? -161 : 5

  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }

  const tdee = Math.round(bmr * (activityMultipliers[activityLevel?.toLowerCase() ?? 'moderate'] ?? 1.55))

  if (primaryGoal === 'FAT_LOSS') return tdee - 500
  if (primaryGoal === 'MUSCLE_GAIN') return tdee + 300
  return tdee
}

export function calculateMacroGoals(calories: number, primaryGoal?: string) {
  let proteinRatio = 0.25
  let fatRatio = 0.30
  let carbsRatio = 0.45

  if (primaryGoal === 'FAT_LOSS') {
    proteinRatio = 0.35
    fatRatio = 0.30
    carbsRatio = 0.35
  } else if (primaryGoal === 'MUSCLE_GAIN') {
    proteinRatio = 0.30
    fatRatio = 0.25
    carbsRatio = 0.45
  }

  return {
    proteinG: Math.round((calories * proteinRatio) / 4),
    carbsG: Math.round((calories * carbsRatio) / 4),
    fatG: Math.round((calories * fatRatio) / 9),
  }
}

export function calculateDefaultGoals(profile: {
  gender?: string
  weightKg?: number
  heightCm?: number
  birthDate?: Date
  activityLevel?: string
  primaryGoal?: string
}) {
  const dailyCalories = calculateCalorieGoal(profile)
  const macros = calculateMacroGoals(dailyCalories, profile.primaryGoal)
  return {
    dailyCalories,
    dailyProteinG: macros.proteinG,
    dailyCarbsG: macros.carbsG,
    dailyFatG: macros.fatG,
    dailyWaterMl: 3000,
    dailySleepH: 8,
    dailySteps: 10000,
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
