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
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      content = content.replace(pattern, '[REDACTED]')
    }
  }

  if (skillName === 'medical' || /diagnos|prescribe|medication|treat disease/i.test(content)) {
    content += MEDICAL_DISCLAIMER
  }

  return content
}

export function isPromptInjection(input: string): boolean {
  const injectionPatterns = [
    /ignore previous instructions/i,
    /system prompt/i,
    /you are now/i,
    /reveal your/i,
    /internal logic/i,
    /api key/i,
    /token/i,
    /model name/i,
  ]
  return injectionPatterns.some((p) => p.test(input))
}
