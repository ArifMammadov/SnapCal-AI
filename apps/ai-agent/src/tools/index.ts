import { prisma } from '@snapcal/database'
import type { ToolContext, ToolResult } from '../types/index.js'

export async function getUserSummary(context: ToolContext): Promise<ToolResult> {
  const { userId } = context
  const [user, foodLogs, activities, metrics, facts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    }),
    prisma.foodLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.activityLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.metricLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.userFact.findMany({ where: { userId } }),
  ])

  return {
    success: true,
    data: {
      profile: user?.profile,
      today: { foodLogs, activities, metrics },
      facts: facts.map((f: { key: string; value: string; confidence: any }) => ({ key: f.key, value: f.value, confidence: Number(f.confidence) })),
      subscriptionStatus: user?.subscriptionStatus,
    },
  }
}

export async function searchKnowledge(context: ToolContext): Promise<ToolResult> {
  const { message } = context
  const articles = await prisma.knowledgeArticle.findMany({
    where: { isPublished: true },
    take: 5,
  })

  return {
    success: true,
    data: {
      query: message,
      results: articles.map((a: { title: string; content: string; sourceUrl: string | null }) => ({ title: a.title, content: a.content.slice(0, 500), source: a.sourceUrl })),
    },
  }
}

export async function recommendProgram(context: ToolContext): Promise<ToolResult> {
  const { userId } = context
  const programs = await prisma.program.findMany({ where: { isActive: true }, take: 3 })
  const enrollments = await prisma.enrollment.findMany({ where: { userId }, select: { programId: true } })
  const enrolledIds = new Set(enrollments.map((e: { programId: string }) => e.programId))

  return {
    success: true,
    data: programs.map((p: { id: string }) => ({ ...p, isEnrolled: enrolledIds.has(p.id) })),
  }
}

export async function analyzePhoto(context: ToolContext): Promise<ToolResult> {
  const imageUrl = context.attachments?.find((a: { type: string }) => a.type === 'image')?.url
  if (!imageUrl) {
    return { success: false, error: 'No image URL provided' }
  }

  return {
    success: true,
    data: { imageUrl, requiresVision: true },
  }
}

export async function logFood(_context: ToolContext): Promise<ToolResult> {
  return { success: true, data: { note: 'Use API /api/tracking/food to persist food entries.' } }
}

export async function logActivity(_context: ToolContext): Promise<ToolResult> {
  return { success: true, data: { note: 'Use API /api/tracking/activity to persist activity.' } }
}
