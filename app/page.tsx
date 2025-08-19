'use client'
import { getSlotsForDate } from "@/lib/timeSlots";
import { useEffect, useState } from 'react'
import CalendarMonthly from '@/components/CalendarMonthly'
import HeroLogo from '@/components/HeroLogo'
import Link from 'next/link'

/** Tipos compatíveis com legado (string) e novo formato (objeto com nome/serviço) */
type SlotItem = string | { time: string; name?: string; service?: string }
type SlotsMap = Record<string, SlotItem[]> // { '2025-08-17': ['18:00'] } ou [{ time:'18:00', name:'Ana' }]
type LastView = { year: number; month: number }

const MARK_KEY    = 'nails.v1.markedDays'
const LAST_KEY    = 'nails.v1.lastView'
const SLOTS_KEY   = 'nails.v1.slots'
const VANIA_PHONE = '+556884257558' // manter com +; convertemos para dígitos no link

function sortHHMM(arr: string[]) {
  return [...arr].sort((a, b) => a.localeCompare(b))
}

// ---------- utils ----------
function startOfToday(){ const d=new Date(); d.setHours(0,0,0,0); return d }
function startOfDay(d:Date){ const x=new Date(d); x.setHours(0,0,0,0); return x }
function yyyymmdd(d:Date){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}` }
function ptDate(d:Date){ return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}) }
function ptTime(hhmm:string){ const [h,m]=hhmm.split(':').map(Number); const dt=new Date(); dt.setHours(h,m,0,0); return dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) }
function digitsOnly(s:string){ return (s||'').replace(/\D+/g,'') }

function minutesToHHMM(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

// Gera slots de 60 em 60 min no intervalo [startMin, endMin]
function rangeSlots(startMin: number, endMin: number, step = 60) {
  const out: string[] = []
  for (let t = startMin; t <= endMin; t += step) out.push(minutesToHHMM(t))
    return out
}

function isWeekend(date: Date) {
  const w = date.getDay() // 0=Dom, 6=Sáb
  return w === 0 || w === 6
}
function isWeekday(date: Date) {
  const w = date.getDay()
  return w >= 1 && w <= 5
}

/**
 * Regras de funcionamento — ATUALIZADAS:
 * - Seg–Sex: apenas 18:00 (e no máximo 1 atendimento no dia)
 * - Sáb–Dom: 08:00–18:00 (passo 60min)
 */
function generateAllowedSlots(date: Date): string[] {
  // Delegamos ao util central (fonte única da verdade)
  return getSlotsForDate(date)
}

// ---------- persistência ----------
function loadMarked():Set<string>{
  try{ const raw=localStorage.getItem(MARK_KEY); return raw? new Set(JSON.parse(raw)): new Set() }catch{ return new Set() }
}
function saveMarked(set:Set<string>){
  try{ localStorage.setItem(MARK_KEY, JSON.stringify(Array.from(set))) }catch{}
}
function loadLastView():LastView|null{
  try{ return JSON.parse(localStorage.getItem(LAST_KEY)||'null') }catch{ return null }
}
function saveLastView(v:LastView){
  try{ localStorage.setItem(LAST_KEY, JSON.stringify(v)) }catch{}
}
function loadSlots():SlotsMap{
  try{ return JSON.parse(localStorage.getItem(SLOTS_KEY)||'{}') }catch{ return {} }
}
function saveSlots(m:SlotsMap){
  try{ localStorage.setItem(SLOTS_KEY, JSON.stringify(m)) }catch{}
}

// ---------- helpers p/ novo formato ----------
/** extrai o "time" de um SlotItem */
function slotTime(s: SlotItem){ return typeof s === 'string' ? s : s.time }
/** retorna uma cópia do dia com dedup por horário (preserva nome/serviço quando disponíveis) */
function dedupDay(items: SlotItem[]): { time: string; name?: string; service?: string }[] {
  const map = new Map<string, { time: string; name?: string; service?: string }>()
  for (const it of items) {
    const t = slotTime(it)
    const curr = map.get(t)
    if (typeof it === 'string') {
      if (!curr) map.set(t, { time: t })
    } else {
      if (!curr) map.set(t, { time: t, name: it.name, service: it.service })
        else map.set(t, { time: t, name: it.name ?? curr.name, service: it.service ?? curr.service })
    }
  }
  return [...map.values()].sort((a,b)=>a.time.localeCompare(b.time))
}

function LegendCompact(){
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-white/70">
    <span className="mr-1 opacity-80">Legenda:</span>

    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0e1114] sm:bg-white/[.06] px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
    <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-indigo-300"></span>
    Dia útil → único horário <strong className="font-semibold text-white">18:00</strong>
    </span>

    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0e1114] sm:bg-white/[.06] px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
    <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-300"></span>
    Fim de semana → 08:00–18:00 (em hora cheia)
    </span>

    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0e1114] sm:bg-white/[.06] px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
    <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-rose-400"></span>
    Círculo vermelho = nº de reservas do dia
    </span>
    </div>
  );
}

// ---------- página ----------
export default function Page(){
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [markedDays, setMarkedDays] = useState<Set<string>>(new Set())
  const [selectedDay,setSelectedDay]=useState<Date|null>(null)
  const [open,setOpen]=useState(false)
  const [slots, setSlots] = useState<SlotsMap>({})
  const allowedSlots = selectedDay ? generateAllowedSlots(selectedDay) : []

  // carrega last view / markedDays / slots depois do mount
  useEffect(() => {
    const last = loadLastView()
    if (last) { setYear(last.year); setMonth(last.month) }
    setMarkedDays(loadMarked())
    setSlots(loadSlots())
  }, [])

  // persiste last view sempre que mudar
  useEffect(() => { saveLastView({ year, month }) }, [year, month])

  function onNextMonth(){
    const d=new Date(year,month+1,1)
    setYear(d.getFullYear()); setMonth(d.getMonth()); setSelectedDay(null)
  }
  function onSelectDay(d:Date|null){
    if(!d) return
      if(startOfDay(d)<startOfToday()) return
        setSelectedDay(d)
        setOpen(true)
  }

  function markDay(date:Date){
    const key=yyyymmdd(date)
    setMarkedDays(prev=>{
      const next=new Set(prev); next.add(key); saveMarked(next); return next
    })
  }

  /** Salva o slot no formato novo (objeto) mantendo compatibilidade */
  function addSlot(date:Date, hhmm:string, name?:string, service?:string){
    const day=yyyymmdd(date)
    setSlots(prev=>{
      const next: SlotsMap = { ...prev }
      const arr = next[day] ? [...next[day]] : []
      // insere/atualiza
      const idx = arr.findIndex(s => slotTime(s) === hhmm)
      const obj = { time: hhmm, ...(name ? {name} : {}), ...(service ? {service} : {}) }
      if (idx >= 0) {
        const curr = arr[idx]
        if (typeof curr === 'string') arr[idx] = obj
          else arr[idx] = { time: hhmm, name: name ?? curr.name, service: service ?? curr.service }
      } else {
        arr.push(obj)
      }
      next[day] = dedupDay(arr)
      saveSlots(next)
      return next
    })
  }

  // contagem por dia para o calendário
  const slotsByDay = Object.fromEntries(
    Object.entries(slots).map(([d,arr])=>[d, dedupDay(arr).length])
  )
  const selectedKey = selectedDay ? yyyymmdd(selectedDay) : null
  const selectedSlots = selectedKey ? dedupDay(slots[selectedKey] || []).map(s => s.time) : []

  return (
    <main className="container-max py-6 space-y-6">
    <header className="border-b border-white/10 pb-4">
    <div className="flex items-center gap-4">
    <HeroLogo />
    <div className="min-w-0">
    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Agenda — Vânia Maria</h1>
    <p className="text-sm text-white/60">Selecione um dia futuro, escolha o horário e confirme pelo WhatsApp.</p>
    </div>
    <div className="ml-auto flex items-center gap-2">
    <Link href="/admin" className="btn">Painel Admin</Link>
    <button className="btn" onClick={onNextMonth}>Próximo mês</button>
    </div>
    </div>
    </header>

    <section className="card p-4 sm:p-5">
    <LegendCompact />
    <CalendarMonthly
    year={year}
    month={month}
    appointments={[]}
    onSelectDay={onSelectDay}
    markedDays={markedDays}
    minDate={startOfToday()}
    slotsByDay={slotsByDay}
    showLegend={false}   // evita duplicar
    />
    </section>

    {/* Painel de detalhes do dia selecionado (A11y) */}
    <section className="card p-4 sm:p-5" aria-live="polite" aria-atomic="true">
    {!selectedDay ? (
      <p className="text-sm text-white/60">Selecione um dia para ver os horários já reservados.</p>
    ) : (
      <>
      <h3 className="text-base font-semibold mb-2">
      {ptDate(selectedDay)} — {selectedSlots.length || 0} horário(s) reservado(s)
      </h3>
      {selectedDay && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-white/10 bg-[#0e1114] sm:bg-white/5 px-2 py-1">
        Regra do dia: {isWeekday(selectedDay) ? 'dia útil → único 18:00' : 'fim de semana → 08:00–18:00'}
        </span>

        {isWeekday(selectedDay) ? (
          selectedSlots.length >= 1 ? (
            <span className="rounded-full border border-white/10 bg-[#0e1114] sm:bg-white/5 px-2 py-1">
            Disponibilidade: <strong>indisponível</strong> (18:00 tomado)
            </span>
          ) : (
            <span className="rounded-full border border-white/10 bg-[#0e1114] sm:bg-white/5 px-2 py-1">
            Disponibilidade: <strong>livre às 18:00</strong>
            </span>
          )
        ) : (
          <span className="rounded-full border border-white/10 bg-[#0e1114] sm:bg-white/5 px-2 py-1">
          Disponibilidade: <strong>08:00–18:00</strong>
          </span>
        )}
        </div>
      )}
      {selectedSlots.length === 0 ? (
        <p className="text-sm text-white/60">Nenhum horário reservado ainda.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
        {selectedSlots.map(h => (
          <li
          key={h}
          className="rounded-lg border border-white/10 bg-[#0e1114] sm:bg-white/5 px-2 py-1 text-sm"
          aria-label={`Horário reservado ${ptTime(h)}`}
          >
          {h}
          </li>
        ))}
        </ul>
      )}
      </>
    )}
    </section>

    <QuickDialog
    open={open}
    date={selectedDay}
    taken={selectedSlots}
    allowed={allowedSlots}
    onClose={(sent, sel)=>{
      setOpen(false);
      if(sent && selectedDay && sel){
        markDay(selectedDay);
        addSlot(selectedDay, sel.time, sel.name, sel.service);
      }
    }}
    />
    </main>
  )
}

// ---------- diálogo ----------
function QuickDialog({
  open, onClose, date, taken, allowed
}:{
  open:boolean
  onClose:(sent:boolean, sel?: { time:string; name?:string; service?:string })=>void
  date:Date|null
  taken:string[]
  allowed:string[]
}){
  const [clientName,setClientName]=useState('')
  const [service,setService]=useState('Manicure')
  const [time,setTime]=useState('')

  useEffect(()=>{ if(open){ setClientName(''); setService('Manicure'); setTime('') } },[open])
  if(!open||!date) return null

    const dLabel=ptDate(date)

    const pickSlot = (hhmm:string)=>{
      if (taken.includes(hhmm)) return
        setTime(hhmm)
    }

    const send=async()=>{
      if(!clientName.trim()) return alert('Informe o seu nome.')
        if(!service.trim()) return alert('Selecione o serviço.')
          if(!time) return alert('Escolha o horário.')

            if (isWeekday(date)) {
              if (time !== '18:00') return alert('Em dias úteis, o único horário disponível é 18:00.')
                if (taken.length >= 1) return alert('Este dia útil já possui o único atendimento de 18:00 reservado.')
            }
            if (taken.includes(time)) return alert('Este horário já está reservado. Escolha outro.')

              const msg =
              `Olá, Vânia! Gostaria de agendar *${service}* em *${dLabel}* às *${ptTime(time)}*.\n` +
              `Meu nome é *${clientName}*.`

              const e164Digits = digitsOnly(VANIA_PHONE)
              const url = `https://wa.me/${e164Digits}?text=${encodeURIComponent(msg)}`
              window.open(url,'_blank','noopener,noreferrer')

              onClose(true, { time, name: clientName.trim(), service })
    }

    const weekdayFull = isWeekday(date) && taken.length >= 1

    return (
      <div
      className="fixed inset-0 z-50 grid place-items-center p-4 modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qd-title"
      onMouseDown={(e)=>{ if (e.currentTarget===e.target) onClose(false) }}
      onKeyDown={(e)=>{ if (e.key==='Escape') onClose(false) }}
      >
      {/* painel sólido (sem transparência) */}
      <div className="w-full max-w-md modal-panel p-5" role="document">
      <header className="mb-4 flex items-center justify-between">
      <h3 id="qd-title" className="text-lg font-semibold">Confirmar e enviar</h3>
      <button className="btn" onClick={()=>onClose(false)} aria-label="Fechar">Fechar</button>
      </header>

      <p className="text-sm text-white/80 mb-3">Dia selecionado: <strong>{dLabel}</strong></p>

      <label className="label" htmlFor="nome">Seu nome</label>
      <input
      id="nome"
      className="input mb-3 text-base"
      placeholder="Ex.: Ana"
      value={clientName}
      onChange={e=>setClientName(e.target.value)}
      autoFocus
      />

      <label className="label" htmlFor="serv">Serviço</label>
      <select
      id="serv"
      className="input mb-3 text-base"
      value={service}
      onChange={e=>setService(e.target.value)}
      >
      <option>Manicure</option>
      <option>Pedicure</option>
      <option>Esmaltação em Gel</option>
      <option>Alongamento</option>
      <option>Combo Mãos + Pés</option>
      </select>

      <div className="mb-2 flex items-center justify-between">
      <label className="label">Horário</label>
      <span className="text-xs text-white/60">toque para selecionar</span>
      </div>

      {weekdayFull && (
        <div className="mb-3 rounded-lg border border-white/10 bg-[#0e1114] sm:bg-white/5 p-2 text-sm text-rose-300" role="alert">
        Este dia útil já está indisponível (o único horário 18:00 foi reservado).
        </div>
      )}

      <div
      className="grid grid-cols-3 gap-2 sm:grid-cols-4 max-h-56 overflow-auto pr-1"
      role="listbox"
      aria-label="Horários disponíveis"
      >
      {allowed.map(hhmm=>{
        const isTaken = taken.includes(hhmm) || (weekdayFull && hhmm === '18:00')
        const isSelected = time === hhmm
        return (
          <button
          key={hhmm}
          type="button"
          role="option"
          aria-selected={isSelected}
          aria-disabled={isTaken}
          disabled={isTaken}
          onClick={()=>pickSlot(hhmm)}
          className={[
            "rounded-lg px-2 py-2 text-sm border transition",
            isTaken
            ? "border-white/10 bg-[#111316] sm:bg-white/5 text-white/40 cursor-not-allowed"
            : (isSelected
            ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
            : "border-white/10 bg-[#0e1114] sm:bg-white/5 hover:bg-white/10"),
          ].join(' ')}
          title={isTaken ? "Já reservado" : "Disponível"}
          >
          {hhmm}
          </button>
        )
      })}
      </div>

      <div className="modal-section-divider mt-3 pt-3">
      <p className="text-xs text-white/60 mb-3">
      Dias úteis: apenas <strong>18:00</strong> (1 atendimento/dia). Fins de semana: <strong>08:00–18:00</strong>.
      </p>
      <button className="btn btn-primary w-full py-3 text-base" onClick={send} disabled={weekdayFull}>
      Enviar para Vânia pelo WhatsApp
      </button>
      </div>
      </div>
      </div>
    )
}
