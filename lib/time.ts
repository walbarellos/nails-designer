export function iso(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset()*60000).toISOString().slice(0,16)
}
export function parseDateTime(date: string, time: string): Date {
  const [y,m,d] = date.split('-').map(Number)
  const [hh,mm] = time.split(':').map(Number)
  return new Date(y, (m-1), d, hh, mm, 0, 0)
}
export function addMinutes(dt: Date, minutes: number){ return new Date(dt.getTime() + minutes*60000) }
export function startOfDay(d: Date){ const x=new Date(d); x.setHours(0,0,0,0); return x }
export function isPast(dt: Date){ return dt.getTime() < Date.now() }
export function weekday(dt: Date){ return dt.getDay() } // 0=Dom..6=Sáb
export function isWithinWorkingHours(dt: Date) {
  const w = weekday(dt)
  const hm = dt.getHours()*60 + dt.getMinutes()
  if (w>=1 && w<=5) return hm >= 18*60          // Seg–Sex: >= 18:00
    if (w===6) return hm >= 13*60                 // Sáb: >= 13:00
      return hm >= 8*60 && hm <= 20*60              // Dom: 08:00–20:00
}
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd
}
export function purgeOlderThan(days: number, list: { startsAt: string }[]) {
  const limit = addMinutes(new Date(), -days*24*60)
  return list.filter(i => new Date(i.startsAt) >= limit)
}
export function formatPt(dt: Date){
  const d = dt.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' })
  const t = dt.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
  return { d, t }
}
