import { describe, it, expect } from 'vitest'
import { toE164OrDigits, maskBR } from '@/lib/phone'

describe('phone', () => {
  it('maskBR formata (DD) 9XXXX-XXXX', () => {
    expect(maskBR('51987654321')).toBe('(51) 98765-4321')
  })
  it('toE164OrDigits tenta E.164 BR quando possível', () => {
    expect(toE164OrDigits('(51) 98765-4321')).toMatch(/^\+55\d{10,11}$/)
  })
})
