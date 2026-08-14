import { getActivePrompt, getActiveRouterPrompt } from '@snapcal/database'
import type { SkillName } from './router.js'
import { skills } from '../skills/index.js'

export interface ResolvedSkill {
  name: SkillName
  systemPrompt: string
  tools: string[]
  allowedModels: string[]
  fallbackModel: string
  guardrails: string[]
}

export async function resolveSkill(skillName: SkillName): Promise<ResolvedSkill> {
  const builtIn = skills[skillName]
  const dbPrompt = await getActivePrompt(skillName).catch(() => null)

  return {
    name: skillName,
    systemPrompt: dbPrompt?.systemPrompt ?? builtIn.systemPrompt,
    tools: builtIn.tools,
    allowedModels: dbPrompt?.allowedModels?.length ? dbPrompt.allowedModels : builtIn.allowedModels,
    fallbackModel: dbPrompt?.fallbackModel ?? builtIn.fallbackModel ?? 'mistralai/mistral-7b-instruct',
    guardrails: (dbPrompt?.guardrails as string[] | undefined) ?? [],
  }
}

export async function resolveRouterPrompt(): Promise<string | null> {
  const dbPrompt = await getActiveRouterPrompt().catch(() => null)
  return dbPrompt?.routerPrompt ?? null
}

export const defaultPrompts = [
  {
    name: 'onboarding',
    skillName: 'onboarding',
    systemPrompt: skills.onboarding.systemPrompt,
    allowedModels: skills.onboarding.allowedModels,
    fallbackModel: skills.onboarding.fallbackModel,
  },
  {
    name: 'nutrition',
    skillName: 'nutrition',
    systemPrompt: skills.nutrition.systemPrompt,
    allowedModels: skills.nutrition.allowedModels,
    fallbackModel: skills.nutrition.fallbackModel,
  },
  {
    name: 'fitness',
    skillName: 'fitness',
    systemPrompt: skills.fitness.systemPrompt,
    allowedModels: skills.fitness.allowedModels,
    fallbackModel: skills.fitness.fallbackModel,
  },
  {
    name: 'food_vision',
    skillName: 'food_vision',
    systemPrompt: skills.food_vision.systemPrompt,
    allowedModels: skills.food_vision.allowedModels,
    fallbackModel: skills.food_vision.fallbackModel,
  },
  {
    name: 'coach',
    skillName: 'coach',
    systemPrompt: skills.coach.systemPrompt,
    allowedModels: skills.coach.allowedModels,
    fallbackModel: skills.coach.fallbackModel,
  },
  {
    name: 'marketplace',
    skillName: 'marketplace',
    systemPrompt: skills.marketplace.systemPrompt,
    allowedModels: skills.marketplace.allowedModels,
    fallbackModel: skills.marketplace.fallbackModel,
  },
]
