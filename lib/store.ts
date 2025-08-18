import type { Appointment } from '@/lib/schema'
import { purgeOlderThan } from '@/lib/time'

const KEY = 'nails.v1.appointments'

export function loadAppointments(): Appointment[] {
  if (typeof localStorage === 'undefined') return []
    try {
      const raw = localStorage.getItem(KEY)
      const data = raw ? (JSON.parse(raw) as Appointment[]) : []
      const fresh = purgeOlderThan(30, data)        // TTL 30 dias
      if (fresh.length !== data.length) {
        localStorage.setItem(KEY, JSON.stringify(fresh))
      }
      return fresh
    } catch {
      return []
    }
}

export function saveAppointments(items: Appointment[]) {
  if (typeof localStorage === 'undefined') return
    localStorage.setItem(KEY, JSON.stringify(items))
}

export function backupJSON(): string {
  return JSON.stringify(loadAppointments(), null, 2)
}

export function restoreJSON(json: string): Appointment[] {
  const arr = JSON.parse(json) as Appointment[]
  saveAppointments(arr)
  return arr
}
