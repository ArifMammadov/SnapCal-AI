import { prisma } from './index.js'

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60)
}

async function main() {
  const plans = [
    {
      name: 'Free',
      slug: 'free',
      priceUsd: '0',
      interval: 'MONTHLY' as const,
      features: ['1 free scan per day', 'Basic tracking', 'Limited AI coach'],
      isActive: true,
    },
    {
      name: 'Pro Monthly',
      slug: 'pro-monthly',
      priceUsd: '5.00',
      interval: 'MONTHLY' as const,
      features: ['Unlimited AI', 'Photo analysis', 'Full analytics', 'Priority support'],
      isActive: true,
    },
    {
      name: 'Pro 6 Months',
      slug: 'pro-6months',
      priceUsd: '25.00',
      interval: 'SIX_MONTH' as const,
      features: ['Unlimited AI', 'Photo analysis', 'Full analytics', 'Priority support', 'Save 17%'],
      isActive: true,
    },
    {
      name: 'Pro Annual',
      slug: 'pro-annual',
      priceUsd: '45.00',
      interval: 'YEARLY' as const,
      features: ['Unlimited AI', 'Photo analysis', 'Full analytics', 'Priority support', 'Save 25%'],
      isActive: true,
    },
  ]

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: {},
      create: plan,
    })
  }

  const programs = [
    {
      name: 'Fat Loss 4 Weeks',
      description: 'Balanced meal plan with moderate calorie deficit and daily workouts.',
      category: 'weight_loss',
      durationWeeks: 4,
      priceUsd: '12.00',
      includes: ['Meal plan', 'Workouts', 'Shopping list'],
      level: 'beginner',
      emoji: '🔥',
      gradient: 'from-orange-500 to-red-500',
      tag: 'popular',
    },
    {
      name: 'Muscle Gain 8 Weeks',
      description: 'High-protein nutrition and progressive strength training.',
      category: 'muscle_gain',
      durationWeeks: 8,
      priceUsd: '24.00',
      includes: ['Training split', 'Protein guide', 'Progress tracker'],
      level: 'intermediate',
      emoji: '💪',
      gradient: 'from-blue-500 to-indigo-500',
      tag: 'pro',
    },
    {
      name: 'Keto Reset 30 Days',
      description: '30-day ketogenic meal plan with macros guidance.',
      category: 'diet',
      durationWeeks: 4,
      priceUsd: '15.00',
      includes: ['Keto meals', 'Macros calculator', 'Foods to avoid'],
      level: 'beginner',
      emoji: '🥑',
      gradient: 'from-green-500 to-teal-500',
      tag: null,
    },
    {
      name: 'Mediterranean 21 Days',
      description: 'Heart-healthy Mediterranean diet plan and recipes.',
      category: 'diet',
      durationWeeks: 3,
      priceUsd: '9.00',
      includes: ['Recipes', 'Weekly menu', 'Olive oil guide'],
      level: 'beginner',
      emoji: '🫒',
      gradient: 'from-yellow-500 to-orange-500',
      tag: null,
    },
    {
      name: 'Home HIIT 4 Weeks',
      description: 'No-equipment high-intensity interval training plan.',
      category: 'fitness',
      durationWeeks: 4,
      priceUsd: '8.00',
      includes: ['HIIT videos', 'Timer', 'Calendar'],
      level: 'intermediate',
      emoji: '⚡',
      gradient: 'from-purple-500 to-pink-500',
      tag: null,
    },
  ]

  for (const p of programs) {
    const slug = slugify(p.name)
    await prisma.program.upsert({
      where: { slug },
      update: {},
      create: { ...p, slug, isActive: true },
    })
  }

  console.log('Seed completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
