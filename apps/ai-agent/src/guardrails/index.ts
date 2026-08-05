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

const MEDICAL_DISCLAIMER = '\n\n_I am not a medical professional. Please consult a doctor for medical advice._'

export function applyGuardrails(text: string): string {
  let result = text.trim()

  if (BLOCKED_PATTERNS.some((p) => p.test(result))) {
    result = "I can't provide that kind of advice. Please consult a qualified healthcare professional."
  }

  if (/\b(symptom|disease|treat|cure|diagnose|doctor|medical)\b/i.test(result)) {
    if (!result.includes(MEDICAL_DISCLAIMER.trim())) {
      result += MEDICAL_DISCLAIMER
    }
  }

  if (/ignore previous|system prompt|you are now|developer mode/i.test(result)) {
    result = "I can only help with nutrition and fitness topics. How can I assist you today?"
  }

  return result.slice(0, 4000)
}
