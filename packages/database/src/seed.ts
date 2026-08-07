import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Subscription plans
  await prisma.subscriptionPlan.upsert({
    where: { id: 'free' },
    update: {},
    create: {
      id: 'free',
      name: 'Free',
      description: '1 free scan per day, basic tracking, AI coach limited',
      priceCents: 0,
      interval: 'month',
      isActive: true,
    },
  })

  await prisma.subscriptionPlan.upsert({
    where: { id: 'pro_monthly' },
    update: {},
    create: {
      id: 'pro_monthly',
      name: 'Pro Monthly',
      description: 'Unlimited AI, photo analysis, full analytics, priority support',
      priceCents: 500,
      interval: 'month',
      isActive: true,
    },
  })

  await prisma.subscriptionPlan.upsert({
    where: { id: 'pro_6months' },
    update: {},
    create: {
      id: 'pro_6months',
      name: 'Pro 6 Months',
      description: 'All Pro features, billed every 6 months',
      priceCents: 2500,
      interval: 'six_months',
      isActive: true,
    },
  })

  await prisma.subscriptionPlan.upsert({
    where: { id: 'pro_annual' },
    update: {},
    create: {
      id: 'pro_annual',
      name: 'Pro Annual',
      description: 'All Pro features, best value, 25% savings',
      priceCents: 4500,
      interval: 'year',
      isActive: true,
    },
  })

  // Marketplace programs
  const programs = [
    {
      id: 'fat_loss_4w',
      title: 'Fat Loss 4 Weeks',
      description: 'Balanced meal plan with moderate calorie deficit and daily workouts.',
      category: 'weight_loss',
      priceCents: 1200,
      discountPercent: 0,
      durationDays: 28,
      isActive: true,
    },
    {
      id: 'muscle_gain_8w',
      title: 'Muscle Gain 8 Weeks',
      description: 'High-protein nutrition and progressive strength training.',
      category: 'muscle_gain',
      priceCents: 2400,
      discountPercent: 10,
      durationDays: 56,
      isActive: true,
    },
    {
      id: 'keto_30d',
      title: 'Keto Reset 30 Days',
      description: '30-day ketogenic meal plan with macros guidance.',
      category: 'diet',
      priceCents: 1500,
      discountPercent: 0,
      durationDays: 30,
      isActive: true,
    },
    {
      id: 'mediterranean_21d',
      title: 'Mediterranean 21 Days',
      description: 'Heart-healthy Mediterranean diet plan and recipes.',
      category: 'diet',
      priceCents: 900,
      discountPercent: 0,
      durationDays: 21,
      isActive: true,
    },
    {
      id: 'hiit_home_4w',
      title: 'Home HIIT 4 Weeks',
      description: 'No-equipment high-intensity interval training plan.',
      category: 'fitness',
      priceCents: 800,
      discountPercent: 0,
      durationDays: 28,
      isActive: true,
    },
  ]

  for (const p of programs) {
    await prisma.program.upsert({
      where: { id: p.id },
      update: {},
      create: p,
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
