import type { FoodAnalysisData, StructuredAiResponse } from '../types/index.js'

const MEAL_EMOJIS: Record<string, string> = {
  BREAKFAST: '🍳',
  LUNCH: '🍽️',
  DINNER: '🥗',
  SNACK: '🍎',
}

const MEAL_LABELS_RU: Record<string, string> = {
  BREAKFAST: 'Ваш завтрак',
  LUNCH: 'Ваш обед',
  DINNER: 'Ваш ужин',
  SNACK: 'Ваш перекус',
}

const MEAL_LABELS_EN: Record<string, string> = {
  BREAKFAST: 'Your breakfast',
  LUNCH: 'Your lunch',
  DINNER: 'Your dinner',
  SNACK: 'Your snack',
}

function getMealLabel(mealType: string, lang: string): string {
  const labels = lang === 'ru' ? MEAL_LABELS_RU : MEAL_LABELS_EN
  return labels[mealType] ?? labels.SNACK
}

export function formatFoodAnalysisCard(
  food: FoodAnalysisData,
  context: {
    lang: string
    consumedKcal: number
    targetKcal: number
    remainingKcal: number
    mealHistory?: { name: string; calories: number }[]
  },
): StructuredAiResponse {
  const label = getMealLabel(food.suggestedMealType, context.lang)
  const emoji = MEAL_EMOJIS[food.suggestedMealType] ?? '🍽️'

  const evaluation = buildEvaluation(food, context, context.lang)
  const recommendations = buildRecommendations(food, context, context.lang)

  return {
    emoji,
    mealLabel: label,
    foodName: food.name,
    calories: food.calories,
    proteinG: food.proteinG,
    carbsG: food.carbsG,
    fatG: food.fatG,
    serving: food.serving,
    evaluation,
    recommendations,
    dailyProgress: {
      consumed: context.consumedKcal,
      target: context.targetKcal,
      unit: 'kcal',
    },
  }
}

function buildEvaluation(
  food: FoodAnalysisData,
  context: { remainingKcal: number; targetKcal: number },
  lang: string,
): string {
  const ratio = context.targetKcal > 0 ? food.calories / context.targetKcal : 0
  const proteinRatio = context.targetKcal > 0 ? (food.proteinG * 4) / context.targetKcal : 0

  if (lang === 'ru') {
    if (proteinRatio >= 0.25 && ratio <= 0.4) {
      return 'Отличный приём пищи: высокое содержание белка и умеренная калорийность. Такие блюда помогают насыщению и поддержанию мышц.'
    }
    if (food.fatG > food.proteinG * 1.5) {
      return 'Блюдо довольно жирное. Попробуйте уменьшить добавки (масло, соусы) или съесть меньшую порцию.'
    }
    if (food.carbsG > food.proteinG * 3) {
      return 'Много углеводов. Если цель — похудение, сократите порцию гарнира и добавьте больше белка/овощей.'
    }
    if (ratio > 0.45) {
      return 'Калорийность этого приёма выше половины дневной нормы. Следующий приём сделайте более лёгким.'
    }
    return 'Хороший баланс макронутриентов. Старайтесь сохранять такой состав и разнообразие продуктов.'
  }

  if (proteinRatio >= 0.25 && ratio <= 0.4) {
    return 'Great meal: high protein and moderate calories. This supports satiety and muscle maintenance.'
  }
  if (food.fatG > food.proteinG * 1.5) {
    return 'This dish is fairly high in fat. Try reducing add-ons (oil, sauces) or eat a smaller portion.'
  }
  if (food.carbsG > food.proteinG * 3) {
    return 'High in carbs. If your goal is weight loss, reduce the side portion and add more protein/vegetables.'
  }
  if (ratio > 0.45) {
    return 'This meal is more than half your daily target. Make your next meal lighter.'
  }
  return 'Good macro balance. Keep this composition and variety of foods.'
}

function buildRecommendations(
  food: FoodAnalysisData,
  context: { remainingKcal: number; lang: string },
  lang: string,
): { emoji: string; text: string }[] {
  const recs: { emoji: string; text: string }[] = []

  if (context.remainingKcal < 300) {
    recs.push(lang === 'ru'
      ? { emoji: '⚠️', text: 'Осталось мало калорий на сегодня. Следующий приём — лёгкий (овощи + нежирный белок).' }
      : { emoji: '⚠️', text: 'Few calories left today. Keep your next meal light (vegetables + lean protein).' })
  } else if (context.remainingKcal > 800) {
    recs.push(lang === 'ru'
      ? { emoji: '🥗', text: `На сегодня осталось ~${context.remainingKcal} ккал. Добавьте полезный перекус: орехи, йогурт или фрукты.` }
      : { emoji: '🥗', text: `You have ~${context.remainingKcal} kcal left. Add a healthy snack: nuts, yogurt, or fruit.` })
  }

  if (food.proteinG < 15) {
    recs.push(lang === 'ru'
      ? { emoji: '🍗', text: 'В этом приёме мало белка. Добавьте курицу, рыбу, яйца, творог или тофу.' }
      : { emoji: '🍗', text: 'This meal is low in protein. Add chicken, fish, eggs, cottage cheese, or tofu.' })
  }

  if (food.fatG > 25) {
    recs.push(lang === 'ru'
      ? { emoji: '🛢️', text: 'Повышенное содержание жиров. Следующий приём выбирайте с минимумом масла и жарки.' }
      : { emoji: '🛢️', text: 'High fat content. Choose a lower-fat cooking method for your next meal.' })
  }

  recs.push(lang === 'ru'
    ? { emoji: '💧', text: 'Выпейте стакан воды после еды — это поможет насыщению и пищеварению.' }
    : { emoji: '💧', text: 'Drink a glass of water after your meal to support satiety and digestion.' })

  return recs.slice(0, 3)
}

export function structuredResponseToText(structured: StructuredAiResponse, lang: string): string {
  const lines: string[] = [
    `${structured.emoji} ${structured.mealLabel}: ${structured.foodName}`,
    '',
    `${lang === 'ru' ? 'Калории' : 'Calories'}: ${structured.calories} kcal`,
    `${lang === 'ru' ? 'Белок' : 'Protein'}: ${structured.proteinG} ${lang === 'ru' ? 'г' : 'g'}`,
    `${lang === 'ru' ? 'Жиры' : 'Fats'}: ${structured.fatG} ${lang === 'ru' ? 'г' : 'g'}`,
    `${lang === 'ru' ? 'Углеводы' : 'Carbs'}: ${structured.carbsG} ${lang === 'ru' ? 'г' : 'g'}`,
    `${lang === 'ru' ? 'Порция' : 'Serving'}: ${structured.serving}`,
    '',
    `💡 ${lang === 'ru' ? 'Оценка' : 'Evaluation'}`,
    structured.evaluation,
    '',
    `🎯 ${lang === 'ru' ? 'Что сделать дальше' : 'Next steps'}`,
    ...structured.recommendations.map((r) => `${r.emoji} ${r.text}`),
    '',
    `🔥 ${lang === 'ru' ? 'Прогресс за день' : 'Daily progress'}`,
    `${structured.dailyProgress.consumed} / ${structured.dailyProgress.target} ${structured.dailyProgress.unit}`,
  ]
  return lines.join('\n')
}

export function formatCompactFoodResult(food: FoodAnalysisData, lang: string): string {
  if (lang === 'ru') {
    return 'Вы это сейчас употребляете? Ответьте «да», и я запишу приём пищи в ваш дневник.'
  }
  return 'Are you eating this now? Reply "yes" and I will log it to your diary.'
}

export function formatLowConfidenceQuestion(foodName: string, lang: string): string {
  if (lang === 'ru') {
    return `🔍 Это похоже на **${foodName}**?\n\nЕсли да — я рассчитаю калории и макросы. Если нет — напишите правильное название блюда, и я найду точную информацию.`
  }
  return `🔍 This looks like **${foodName}**?\n\nIf yes, I'll calculate calories and macros. If not, please tell me the correct dish name and I'll find accurate data.`
}
