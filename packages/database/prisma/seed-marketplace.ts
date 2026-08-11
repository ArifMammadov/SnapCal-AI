import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const programs = [
  {
    name: 'SnapCal 30-Day Reset',
    slug: 'snapcal-30-day-reset',
    description: '30-дневная программа сброса: питание, тренировки, сон и гидратация. Идеально для новичков.',
    category: 'Weight Loss',
    level: 'Beginner',
    durationWeeks: 4,
    priceUsd: 0,
    rating: 4.8,
    reviewsCount: 124,
    enrolledCount: 3402,
    emoji: '🌱',
    gradient: 'linear-gradient(135deg, #00d48a 0%, #3dbbf7 100%)',
    includes: ['Meal plan', 'Workout videos', 'Daily checklist', 'Community support'],
    isActive: true,
    instructor: 'SnapCal Team',
    tag: 'Free',
  },
  {
    name: 'Home HIIT Burn',
    slug: 'home-hiit-burn',
    description: 'Интервальные тренировки дома без оборудования. 20 минут в день для максимального сжигания калорий.',
    category: 'Home Fitness',
    level: 'Intermediate',
    durationWeeks: 6,
    priceUsd: 19.99,
    rating: 4.7,
    reviewsCount: 89,
    enrolledCount: 1250,
    emoji: '🔥',
    gradient: 'linear-gradient(135deg, #ff4d6d 0%, #ff7a45 100%)',
    includes: ['20-min HIIT sessions', 'Warm-up & cool-down', 'Progress tracker', 'Nutrition tips'],
    isActive: true,
    instructor: 'Coach Dima',
    tag: null,
  },
  {
    name: 'Yoga Flow for Recovery',
    slug: 'yoga-flow-recovery',
    description: 'Восстановительная йога для гибкости, сна и снятия стресса. Подходит всем уровням.',
    category: 'Yoga',
    level: 'All Levels',
    durationWeeks: 8,
    priceUsd: 14.99,
    rating: 4.9,
    reviewsCount: 215,
    enrolledCount: 2890,
    emoji: '🧘',
    gradient: 'linear-gradient(135deg, #7b6ef6 0%, #3dbbf7 100%)',
    includes: ['Daily flows', 'Breathing exercises', 'Sleep meditation', 'Mobility drills'],
    isActive: true,
    instructor: 'Anna Yoga',
    tag: null,
  },
  {
    name: 'Gym Strength Foundation',
    slug: 'gym-strength-foundation',
    description: 'Базовый курс силовых тренировок в зале. Техника, прогрессия, программа на 12 недель.',
    category: 'Gym',
    level: 'Beginner',
    durationWeeks: 12,
    priceUsd: 39.99,
    rating: 4.6,
    reviewsCount: 56,
    enrolledCount: 743,
    emoji: '🏋️',
    gradient: 'linear-gradient(135deg, #ffbe0b 0%, #ff4d6d 100%)',
    includes: ['Split routine', 'Technique videos', '1RM calculator', 'Recovery guide'],
    isActive: true,
    instructor: 'Coach Sergey',
    tag: null,
  },
  {
    name: 'Running 5K to 10K',
    slug: 'running-5k-to-10k',
    description: 'Подготовка к дистанции 10 км за 8 недель. Беговые планы, техника, предотвращение травм.',
    category: 'Running',
    level: 'Intermediate',
    durationWeeks: 8,
    priceUsd: 12.99,
    rating: 4.8,
    reviewsCount: 178,
    enrolledCount: 1567,
    emoji: '🏃',
    gradient: 'linear-gradient(135deg, #3dbbf7 0%, #7b6ef6 100%)',
    includes: ['Weekly running plan', 'Pace calculator', 'Injury prevention', 'Race day guide'],
    isActive: true,
    instructor: 'Coach Elena',
    tag: null,
  },
  {
    name: 'Muscle Gain Accelerator',
    slug: 'muscle-gain-accelerator',
    description: 'Программа набора мышечной массы: тренировки, питание с избытком калорий, отслеживание прогресса.',
    category: 'Muscle Gain',
    level: 'Advanced',
    durationWeeks: 10,
    priceUsd: 29.99,
    rating: 4.5,
    reviewsCount: 67,
    enrolledCount: 920,
    emoji: '💪',
    gradient: 'linear-gradient(135deg, #00d48a 0%, #0da8ed 100%)',
    includes: ['Hypertrophy split', 'Bulking meal plan', 'Supplement guide', 'Progress photos'],
    isActive: true,
    instructor: 'Coach Artem',
    tag: null,
  },
]

async function main() {
  for (const p of programs) {
    await prisma.program.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    })
  }
  console.log(`Seeded ${programs.length} marketplace programs`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
