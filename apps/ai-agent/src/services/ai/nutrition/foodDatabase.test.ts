import { describe, it, expect } from 'vitest'
import { normalizeName } from './foodDatabase.js'

describe('Food Database normalization', () => {
  it('normalizes cyrillic and latin names consistently', () => {
    expect(normalizeName('Дöner Кебаб')).toBe('doner kebab')
    expect(normalizeName('Qutab (кутáб)')).toBe('qutab kutab')
  })
})
