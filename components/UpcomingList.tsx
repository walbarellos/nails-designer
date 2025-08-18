'use client'
import { buildWhatsAppLink } from '@/lib/wa'
import type { Appointment } from '@/lib/schema'
import { addMinutes, formatPt } from '@/lib/time'

const DEFAULT_DURATION = 60
const BUFFER_MIN = 10

export default function UpcomingList({ items, onUpdate }:{ items: Appointment[], onUpdate:(items: Appointment[])=>void }){
  const sorted = [...items].sort((a,b)=> (a.startsAt.localeCompare(b.startsAt)))

  function setStatus(id: string, status: Appointment['status']){
    onUpdate(sorted.map(x => x.id===id ? { ...x, status } : x))
  }

  return (
    <section className="card p-4">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Próximos 30 dias</h3>
      </header>
      {sorted.length===0 && (
        <p className="text-white/60 text-sm">Sem agendamentos nos próximos 30 dias.</p>
      )}
      <ul className="space-y-2">
        {sorted.map(a => {
          const when = new Date(a.startsAt)
          const { d, t } = formatPt(when)
          const wa = buildWhatsAppLink(a.name, a.phone, when, a.notes)
          const end = addMinutes(when, DEFAULT_DURATION)
          return (
            <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div>
                <div className="text-sm font-medium">{a.name} <span className="text-white/50">({a.phone})</span></div>
                <div className="text-xs text-white/70">{d} · {t} – {formatPt(end).t}</div>
                {a.notes && <div className="mt-1 text-xs text-white/60">{a.notes}</div>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge status={a.status} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <a href={wa} target="_blank" className="btn" rel="noreferrer">WhatsApp</a>
                <button className="btn" onClick={()=>setStatus(a.id,'confirmed')}>Confirmar</button>
                <button className="btn" onClick={()=>setStatus(a.id,'done')}>Concluir</button>
                <button className="btn" onClick={()=>setStatus(a.id,'canceled')}>Cancelar</button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function StatusBadge({ status }:{ status: Appointment['status'] }){
  const map: Record<Appointment['status'], { label: string; cls: string }> = {
    scheduled: { label:'Agendado', cls:'bg-amber-300 text-slate-900' },
    confirmed: { label:'Confirmado', cls:'bg-sky-400 text-slate-900' },
    done:      { label:'Concluído', cls:'bg-emerald-400 text-slate-900' },
    canceled:  { label:'Cancelado', cls:'bg-rose-400 text-slate-900' },
  }
  const it = map[status]
  return <span className={`badge ${it.cls}`}>{it.label}</span>
}
