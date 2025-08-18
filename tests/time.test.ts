import { describe, it, expect } from 'vitest'
import { isWithinWorkingHours } from '@/lib/time'

function D(y:number,m:number,d:number,h:number,mm:number){ return new Date(y, m-1, d, h, mm) }

describe('isWithinWorkingHours', () => {
  it('Seg–Sex: somente ≥ 18:00', () => {
    expect(isWithinWorkingHours(D(2025,8,18,17,59))).toBe(false)
    expect(isWithinWorkingHours(D(2025,8,18,18,0))).toBe(true)
  })
  it('Sábado: somente ≥ 13:00', () => {
    expect(isWithinWorkingHours(D(2025,8,23,12,59))).toBe(false)
    expect(isWithinWorkingHours(D(2025,8,23,13,0))).toBe(true)
  })
  it('Domingo: entre 08:00 e 20:00', () => {
    expect(isWithinWorkingHours(D(2025,8,24,7,59))).toBe(false)
    expect(isWithinWorkingHours(D(2025,8,24,8,0))).toBe(true)
    expect(isWithinWorkingHours(D(2025,8,24,20,0))).toBe(true)
    expect(isWithinWorkingHours(D(2025,8,24,20,1))).toBe(false)
  })
})
