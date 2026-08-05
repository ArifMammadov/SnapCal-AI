import { prisma } from '@snapcal/database'
import type { ToolContext, ToolResult } from '../types/index.js'

export async function getUserSummary(context: ToolContext): Promise<ToolResult> {
  const { userId } = context

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  })

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)

  const [foodLogs, activities, metrics, facts] = await Promise.all([
    prisma.foodLog.findMany({ where: { userId, loggedAt: { gte: start, lt: end } } }),
    prisma.activityLog.findMany({ where: { userId, startedAt: { gte: start, lt: end } } }),
    prisma.metricLog.findMany({ where: { userId, loggedAt: { gte: start, lt: end } } }),
    prisma.userFact.findMany({ where: { userId } }),
  ])

  return {
    success: true,
    data: {
      profile: user?.profile,
      today: { foodLogs, activities, metrics },
      facts: facts.map((f) => ({ key: f.key, value: f.value, confidence: f.confidence })),
      subscriptionStatus: user?.subscriptionStatus,
    },
  }
}

export async function searchKnowledge(context: ToolContext): Promise<ToolResult> {
  // Placeholder: full RAG implementation will use pgvector similarity search
  const { message } = context
  const articles = await prisma.knowledgeArticle.findMany({
    where: { isPublished: true },
    take: 5,
  })

  return {
    success: true,
    data: {
      query: message,
      results: articles.map((a) => ({ title: a.title, content: a.content.slice(0, 500), source: a.sourceUrl })),
    },
  }
}

export async function recommendProgram(context: ToolContext): Promise<ToolResult> {
  const { userId } = context
  const programs = await prisma.program.findMany({ where: { isActive: true }, take: 3 })
  const enrollments = await prisma.enrollment.findMany({ where: { userId }, select: { programId: true } })
  const enrolledIds = new Set(enrollments.map((e) => e.programId))

  return {
    success: true,
    data: programs.map((p) => ({ ...p, isEnrolled: enrolledIds.has(p.id) })),
  }
}

export async function analyzePhoto(context: ToolContext): Promise<ToolResult> {
  const imageUrl = context.attachments?.find((a) => a.type === 'image')?.url
  if (!imageUrl) {
    return { success: false, error: 'No image URL provided' }
  }

  return {
    success: true,
    data: { imageUrl, requiresVision: true },
  }
}

export async function logFood(context: ToolContext): Promise<ToolResult> {
  // Food logging is handled by API after AI returns foodData; tool returns success placeholder
  return { success: true, data: { note: 'Use API /api/tracking/food to persist food entries.' } }
}

export async function logActivity(context: ToolContext): Promise<ToolResult> {
  return { success: true, data: { note: 'Use API /api/tracking/activity to persist activity.' } }
}
