import { AppointmentSchema, type Appointment } from '@/lib/schema'

const KEY = 'nails.v1.appointments'
const TTL_DAYS = 30

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function cutoffDate(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

function withinTTL(a: Appointment, limit: Date): boolean {
  // startsAt ISO → Date válido
  const dt = new Date(a.startsAt)
  return !Number.isNaN(dt.getTime()) && dt >= limit
}

export function loadAppointments(): Appointment[] {
  if (!isBrowser()) return []
    try {
      const raw = localStorage.getItem(KEY)
      const parsed = raw ? JSON.parse(raw) : []

      // 1) valida cada item pelo schema; 2) aplica TTL preservando o TIPO
      const limit = cutoffDate(TTL_DAYS)
      const safe: Appointment[] = (Array.isArray(parsed) ? parsed : [])
      .map((x) => {
        try { return AppointmentSchema.parse(x) } catch { return null }
      })
      .filter((x): x is Appointment => !!x)
      .filter((x) => withinTTL(x, limit))

      // se descartou algo (inválido/antigo), regrava para manter consistência
      const originalLen = Array.isArray(parsed) ? parsed.length : 0
      if (safe.length !== originalLen) {
        localStorage.setItem(KEY, JSON.stringify(safe))
      }
      return safe
    } catch {
      return []
    }
}

export function saveAppointments(items: Appointment[]) {
  if (!isBrowser()) return
    try {
      // garante que só itens válidos entram
      const safe = items
      .map((x) => {
        try { return AppointmentSchema.parse(x) } catch { return null }
      })
      .filter((x): x is Appointment => !!x)
      localStorage.setItem(KEY, JSON.stringify(safe))
    } catch {
      // silencioso
    }
}

export function backupJSON(): string {
  // backup deve funcionar só no browser; em SSR retorna "[]"
  const data = loadAppointments()
  return JSON.stringify(data, null, 2)
}

export function restoreJSON(json: string): Appointment[] {
  if (!isBrowser()) return []
    try {
      const arr = JSON.parse(json)
      const safe: Appointment[] = (Array.isArray(arr) ? arr : [])
      .map((x) => {
        try { return AppointmentSchema.parse(x) } catch { return null }
      })
      .filter((x): x is Appointment => !!x)

      localStorage.setItem(KEY, JSON.stringify(safe))
      return safe
    } catch {
      return []
    }
}
