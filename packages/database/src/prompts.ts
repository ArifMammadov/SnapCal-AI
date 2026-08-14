import { prisma } from './index.js'

export async function getActivePrompt(skillName: string) {
  return prisma.promptTemplate.findFirst({
    where: { skillName, isActive: true },
    orderBy: { version: 'desc' },
  })
}

export async function getActiveRouterPrompt() {
  return prisma.promptTemplate.findFirst({
    where: { skillName: null, name: 'router', isActive: true },
    orderBy: { version: 'desc' },
  })
}

export async function createPromptTemplate(data: {
  name: string
  skillName?: string | null
  systemPrompt: string
  routerPrompt?: string | null
  allowedModels?: string[]
  fallbackModel?: string | null
  createdBy?: string
}) {
  const existing = await prisma.promptTemplate.findFirst({
    where: { name: data.name },
    orderBy: { version: 'desc' },
  })
  return prisma.promptTemplate.create({
    data: {
      ...data,
      version: (existing?.version ?? 0) + 1,
      previousVersionId: existing?.id ?? null,
      isActive: false,
      guardrails: [],
    },
  })
}

export async function publishPromptTemplate(id: string) {
  const prompt = await prisma.promptTemplate.findUnique({ where: { id } })
  if (!prompt) throw new Error('Prompt template not found')

  await prisma.$transaction([
    prisma.promptTemplate.updateMany({
      where: { skillName: prompt.skillName, isActive: true },
      data: { isActive: false },
    }),
    prisma.promptTemplate.update({
      where: { id },
      data: { isActive: true },
    }),
  ])

  return prisma.promptTemplate.findUnique({ where: { id } })
}

export async function listPrompts(skillName?: string) {
  return prisma.promptTemplate.findMany({
    where: skillName ? { skillName } : undefined,
    orderBy: [{ name: 'asc' }, { version: 'desc' }],
  })
}

export async function seedDefaultPrompts(defaults: Array<{
  name: string
  skillName: string
  systemPrompt: string
  routerPrompt?: string
  allowedModels: string[]
  fallbackModel: string
}>) {
  for (const d of defaults) {
    const exists = await prisma.promptTemplate.findFirst({ where: { name: d.name } })
    if (!exists) {
      await prisma.promptTemplate.create({
        data: { ...d, version: 1, isActive: true, guardrails: [] },
      })
    }
  }
}

export async function createEvalCase(data: Omit<{
  name: string
  skillName: string
  input: unknown
  expected: unknown
  tags?: string[]
}, 'id'>) {
  return prisma.evalCase.create({ data: data as { name: string; skillName: string; input: any; expected: any; tags?: string[] } })
}

export async function listEvalCases(skillName?: string, tags?: string[]) {
  return prisma.evalCase.findMany({
    where: {
      isActive: true,
      ...(skillName ? { skillName } : {}),
      ...(tags?.length ? { tags: { hasEvery: tags } } : {}),
    },
  })
}

export async function saveEvalRun(data: {
  promptId: string
  branch?: string
  commitSha?: string
  results: unknown
  summary: unknown
  passed: boolean
}) {
  return prisma.evalRun.create({ data: data as any })
}
