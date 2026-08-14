import { handleChat } from '../agent/orchestrator.js'
import { evalCases, evaluateOutput } from './cases.js'
import type { ChatOutput } from '../types/index.js'

interface EvalResult {
  name: string
  passed: boolean
  details: Record<string, unknown>
  output: string
  latencyMs: number
}

export async function runEval(): Promise<{
  results: EvalResult[]
  summary: { total: number; passed: number; failed: number }
}> {
  const results: EvalResult[] = []

  for (const testCase of evalCases) {
    const start = Date.now()
    let output: ChatOutput
    try {
      output = await handleChat(testCase.input)
    } catch (err) {
      const latencyMs = Date.now() - start
      results.push({
        name: testCase.name,
        passed: false,
        details: { error: err instanceof Error ? err.message : 'unknown error' },
        output: '',
        latencyMs,
      })
      continue
    }

    const latencyMs = Date.now() - start
    const content = output.message?.content ?? ''
    const { passed, details } = evaluateOutput(content, testCase.expected, output.message?.skillName)

    results.push({
      name: testCase.name,
      passed,
      details,
      output: content,
      latencyMs,
    })
  }

  const summary = {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
  }

  return { results, summary }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runEval()
    .then(({ results, summary }) => {
      for (const r of results) {
        console.log(`${r.passed ? 'PASS' : 'FAIL'} ${r.name} (${r.latencyMs}ms)`)
        if (!r.passed) {
          console.log(JSON.stringify(r.details, null, 2))
          console.log('Output:', r.output.slice(0, 200))
        }
      }
      console.log(`\nSummary: ${summary.passed}/${summary.total} passed`)
      process.exit(summary.failed > 0 ? 1 : 0)
    })
    .catch((err) => {
      console.error('Eval failed:', err)
      process.exit(1)
    })
}
