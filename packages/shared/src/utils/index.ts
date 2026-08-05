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

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
