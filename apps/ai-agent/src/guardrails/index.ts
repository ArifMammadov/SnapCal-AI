const BLOCKED_PATTERNS = [
  /diagnos[ei]/i,
  /prescribe/i,
  /medication/i,
  /steroids/i,
  /extreme fast/i,
  /starvation/i,
  /detox/i,
  /miracle cure/i,
]

const MEDICAL_DISCLAIMER = '\n\n_I am not a medical professional. For health concerns, consult a doctor._'

export function applyGuardrails(content: string, skillName: string): string {
  let sanitized = content
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    }
  }

  if (skillName === 'medical' || /diagnos|prescribe|medication|treat disease/i.test(sanitized)) {
    sanitized += MEDICAL_DISCLAIMER
  }

  return sanitized
}

const INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /ignore (all )?prior instructions/i,
  /system prompt/i,
  /you are now/i,
  /reveal your/i,
  /internal logic/i,
  /api key/i,
  /token/i,
  /model name/i,
  /secret key/i,
  /developer mode/i,
  /DAN mode/i,
  /jailbreak/i,
  /do anything now/i,
  /"_comment"/i,
  /\{\{.*system.*\}\}/i,
  /\[system\]/i,
  /as an? (ai|llm|language model)/i,
]

export function isPromptInjection(input: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(input))
}

const LEAKAGE_PATTERNS = [
  /system prompt/i,
  /user profile and facts/i,
  /available tool data/i,
  /recent chat history/i,
  /respond in a helpful/i,
  /do not provide medical diagnoses/i,
  /openrouter/i,
  /ollama/i,
  /snapcal.*secret/i,
  /jwt.*secret/i,
  /database_url/i,
  /bearer /i,
]

export function containsPromptLeakage(output: string): boolean {
  return LEAKAGE_PATTERNS.some((p) => p.test(output))
}

export function sanitizeUserInput(input: string): string {
  // Remove common instruction-delimiter tricks and excessive whitespace
  return input
    .replace(/\{\{+|\}\}+/g, '')
    .replace(/\[system\]|\[instructions\]|\[prompt\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, 4000)
}
