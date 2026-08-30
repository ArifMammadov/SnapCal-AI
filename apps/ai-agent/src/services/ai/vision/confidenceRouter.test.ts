import { describe, it, expect } from 'vitest'
import { routeByConfidence } from '../confidenceRouter.js'
import type { VisionAnalysis } from './schema.js'

function build(conf: number): VisionAnalysis {
  return {
    mealType: 'main_dish',
    dishName: 'Doner kebab',
    dishCandidates: [],
    components: [],
    overallConfidence: conf,
    dishConfidence: conf,
    ingredientConfidence: conf,
    portionConfidence: conf,
    needsClarification: false,
    clarificationQuestions: [],
  }
}

describe('Confidence Router', () => {
  it('routes high confidence to primary path', () => {
    const decision = routeByConfidence(build(0.85), 0.80)
    expect(decision.needsAdvanced).toBe(false)
  })

  it('routes low confidence to advanced path', () => {
    const decision = routeByConfidence(build(0.45), 0.80)
    expect(decision.needsAdvanced).toBe(true)
  })

  it('flags when portion confidence is low even if dish confidence is high', () => {
    const analysis = build(0.95)
    analysis.portionConfidence = 0.4
    const decision = routeByConfidence(analysis, 0.80)
    expect(decision.needsAdvanced).toBe(true)
    expect(decision.reason).toContain('portion')
  })
})
