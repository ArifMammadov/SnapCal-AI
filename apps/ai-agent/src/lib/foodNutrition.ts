import { env } from './env.js'

export interface NutritionPer100g {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  sourceName: string
  sourceUrl?: string
}

interface UsdaFoodNutrient {
  nutrientId: number
  nutrientName: string
  value: number
  unitName: string
}

interface UsdaFood {
  description: string
  foodNutrients: UsdaFoodNutrient[]
  fdcId: number
}

export async function lookupUsdaNutrition(name: string): Promise<NutritionPer100g | null> {
  const key = env.USDA_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(name)}&dataType=Foundation,SR%20Legacy&pageSize=1&api_key=${key}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { foods?: UsdaFood[] }
    const food = data.foods?.[0]
    if (!food) return null

    let calories = 0
    let proteinG = 0
    let carbsG = 0
    let fatG = 0
    for (const n of food.foodNutrients) {
      if (n.nutrientId === 1008 || n.nutrientName === 'Energy') {
        if (n.unitName?.toUpperCase() === 'KCAL') calories = n.value
      }
      if (n.nutrientId === 1003 || n.nutrientName === 'Protein') proteinG = n.value
      if (n.nutrientId === 1005 || n.nutrientName?.startsWith('Carbohydrate')) carbsG = n.value
      if (n.nutrientId === 1004 || n.nutrientName?.startsWith('Total lipid')) fatG = n.value
    }

    return {
      calories,
      proteinG,
      carbsG,
      fatG,
      sourceName: `USDA: ${food.description}`,
      sourceUrl: `https://fdc.nal.usda.gov/fdc_app.html#/food-details/${food.fdcId}/nutrients`,
    }
  } catch (err) {
    return null
  }
}

function scaleToServing(nutrition: NutritionPer100g, servingG: number): NutritionPer100g {
  const factor = servingG / 100
  return {
    calories: Math.round(nutrition.calories * factor),
    proteinG: Math.round(nutrition.proteinG * factor * 10) / 10,
    carbsG: Math.round(nutrition.carbsG * factor * 10) / 10,
    fatG: Math.round(nutrition.fatG * factor * 10) / 10,
    sourceName: nutrition.sourceName,
    sourceUrl: nutrition.sourceUrl,
  }
}

export function estimateServingG(servingText: string): number {
  const lower = servingText.toLowerCase()
  if (/plate|bowl|dish|portion|serving/.test(lower)) return 250
  if (/sandwich|wrap|burger|panini/.test(lower)) return 200
  if (/cup/.test(lower)) return 200
  if (/large/.test(lower)) return 300
  if (/medium/.test(lower)) return 200
  if (/small/.test(lower)) return 100
  if (/piece|slice/.test(lower)) return 80
  if (/100g/.test(lower)) return 100
  return 200
}

export async function correctFoodMacrosWithUsda(
  name: string,
  servingText: string,
  visionMacros: { calories: number; proteinG: number; carbsG: number; fatG: number }
): Promise<{ calories: number; proteinG: number; carbsG: number; fatG: number; sourceName?: string; sourceUrl?: string } | null> {
  const per100g = await lookupUsdaNutrition(name)
  if (!per100g) return null
  const servingG = estimateServingG(servingText)
  const scaled = scaleToServing(per100g, servingG)
  // If USDA correction differs wildly from vision, blend them so we don't override reasonable vision estimates entirely
  const blend = (vision: number, usda: number) => {
    if (vision <= 0) return usda
    const diff = Math.abs(vision - usda) / Math.max(vision, usda, 1)
    if (diff > 0.5) return Math.round((vision * 0.3 + usda * 0.7) * 10) / 10
    return vision
  }
  return {
    calories: Math.round(blend(visionMacros.calories, scaled.calories)),
    proteinG: blend(visionMacros.proteinG, scaled.proteinG),
    carbsG: blend(visionMacros.carbsG, scaled.carbsG),
    fatG: blend(visionMacros.fatG, scaled.fatG),
    sourceName: per100g.sourceName,
    sourceUrl: per100g.sourceUrl,
  }
}
