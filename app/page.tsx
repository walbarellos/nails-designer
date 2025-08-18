'use client'
import { useEffect, useState } from 'react'
import CalendarMonthly from '@/components/CalendarMonthly'
import HeroLogo from '@/components/HeroLogo'

function sortHHMM(arr: string[]) {
  return [...arr].sort((a,b)=> a.localeCompare(b))
}

const MARK_KEY   = 'nails.v1.markedDays'
const LAST_KEY   = 'nails.v1.lastView'
const SLOTS_KEY  = 'nails.v1.slots'
const VANIA_PHONE = '+556884257558' // manter com +; convertemos para dígitos no link

type LastView = { year: number; month: number }
type SlotsMap = Record<string, string[]> // { '2025-08-17': ['18:30','19:30'] }

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
 * Regras de funcionamento:
 * - Seg–Sex: apenas 18:30 (e no máximo 1 atendimento no dia)
 * - Sáb–Dom: agenda aberta (aqui configurada para 08:00–20:00, passo 60min)
 */
function generateAllowedSlots(date: Date): string[] {
  if (isWeekday(date)) return ['18:30']
    // fds (ajuste facilmente este range se desejar outro)
    return rangeSlots(8*60, 20*60)
}

// ---------- persistência ----------
function loadMarked():Set<string>{ try{ const raw=localStorage.getItem(MARK_KEY); return raw? new Set(JSON.parse(raw)): new Set() }catch{ return new Set() } }
function saveMarked(set:Set<string>){ try{ localStorage.setItem(MARK_KEY, JSON.stringify(Array.from(set))) }catch{} }
function loadLastView():LastView|null{ try{ return JSON.parse(localStorage.getItem(LAST_KEY)||'null') }catch{ return null } }
function saveLastView(v:LastView){ try{ localStorage.setItem(LAST_KEY, JSON.stringify(v)) }catch{} }
function loadSlots():SlotsMap{ try{ return JSON.parse(localStorage.getItem(SLOTS_KEY)||'{}') }catch{ return {} } }
function saveSlots(m:SlotsMap){ try{ localStorage.setItem(SLOTS_KEY, JSON.stringify(m)) }catch{} }

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

  function onNextMonth(){ const d=new Date(year,month+1,1); setYear(d.getFullYear()); setMonth(d.getMonth()); setSelectedDay(null) }
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
  function addSlot(date:Date, hhmm:string){
    const day=yyyymmdd(date)
    setSlots(prev=>{
      const next:{[k:string]:string[]} = { ...prev }
      const arr = new Set([...(next[day]||[]), hhmm])
      next[day] = sortHHMM(Array.from(arr))
      saveSlots(next)
      return next
    })
  }

  // contagem por dia para o calendário
  const slotsByDay = Object.fromEntries(Object.entries(slots).map(([d,arr])=>[d, arr.length]))
  const selectedKey = selectedDay ? yyyymmdd(selectedDay) : null
  const selectedSlots = selectedKey ? sortHHMM(slots[selectedKey] || []) : []

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
    <button className="btn" onClick={onNextMonth}>Próximo mês</button>
    </div>
    </div>
    </header>

    <section className="card p-4 sm:p-5">
    <CalendarMonthly
    year={year}
    month={month}
    appointments={[]}
    onSelectDay={onSelectDay}
    markedDays={markedDays}
    minDate={startOfToday()}
    slotsByDay={slotsByDay}
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
      {selectedSlots.length === 0 ? (
        <p className="text-sm text-white/60">Nenhum horário reservado ainda.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
        {selectedSlots.map(h => (
          <li
          key={h}
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm"
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
    onClose={(sent, hhmm)=>{
      setOpen(false);
      if(sent && selectedDay && hhmm){
        markDay(selectedDay);
        addSlot(selectedDay, hhmm);
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
  onClose:(sent:boolean, hhmm?:string)=>void
  date:Date|null
  taken:string[]
  allowed:string[]
}){
  const [clientName,setClientName]=useState('')
  const [service,setService]=useState('Manicure')
  const [time,setTime]=useState('')          // mantém estado do slot escolhido

  useEffect(()=>{ if(open){ setClientName(''); setService('Manicure'); setTime('') } },[open])
  if(!open||!date) return null

    const dLabel=ptDate(date)

    const pickSlot = (hhmm:string)=>{
      if (taken.includes(hhmm)) return
        setTime(hhmm)
    }

    const send=async()=>{
      // Regras: nome, serviço e horário obrigatórios
      if(!clientName.trim()) return alert('Informe o seu nome.')
        if(!service.trim()) return alert('Selecione o serviço.')
          if(!time) return alert('Escolha o horário.')

            // Dias úteis: apenas 18:30 e no máximo 1 atendimento no dia
            if (isWeekday(date)) {
              if (time !== '18:30') return alert('Em dias úteis, o único horário disponível é 18:30.')
                if (taken.length >= 1) return alert('Este dia útil já possui o único atendimento de 18:30 reservado.')
            }

            // Qualquer slot específico não pode estar ocupado
            if (taken.includes(time)) return alert('Este horário já está reservado. Escolha outro.')

              // Mensagem para WhatsApp
              const msg =
              `Olá, Vânia! Gostaria de agendar *${service}* em *${dLabel}* às *${ptTime(time)}*.\n` +
              `Meu nome é *${clientName}*.`

              const e164Digits = digitsOnly(VANIA_PHONE) // remove o '+'
              const url = `https://wa.me/${e164Digits}?text=${encodeURIComponent(msg)}`
              window.open(url,'_blank','noopener,noreferrer')

              onClose(true, time)
    }

    const weekdayFull = isWeekday(date) && taken.length >= 1

    // <div role="dialog"> no lugar de <dialog>
    return (
      <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qd-title"
      >
      <div className="card w-full max-w-md p-4 sm:p-5" role="document">
      <header className="mb-3 flex items-center justify-between">
      <h3 id="qd-title" className="text-lg font-semibold">Confirmar e enviar</h3>
      <button className="btn" onClick={()=>onClose(false)} aria-label="Fechar">Fechar</button>
      </header>

      <p className="text-sm text-white/80 mb-3">Dia selecionado: <strong>{dLabel}</strong></p>

      {/* Nome e Serviço (sem celular) */}
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

      {/* Grade de horários (1h em 1h) */}
      <div className="mb-2 flex items-center justify-between">
      <label className="label">Horário</label>
      <span className="text-xs text-white/60">toque para selecionar</span>
      </div>

      {weekdayFull && (
        <div className="mb-3 rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-rose-300" role="alert">
        Este dia útil já está indisponível (o único horário 18:30 foi reservado).
        </div>
      )}

      <div
      className="
      grid grid-cols-3 gap-2
      sm:grid-cols-4
      max-h-56 overflow-auto pr-1
      "
      role="listbox"
      aria-label="Horários disponíveis"
      >
      {allowed.map(hhmm=>{
        const isTaken = taken.includes(hhmm) || (weekdayFull && hhmm === '18:30')
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
            ? "border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
            : (isSelected
            ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
            : "border-white/10 bg-white/5 hover:bg-white/10"),
          ].join(' ')}
          title={isTaken ? "Já reservado" : "Disponível"}
          >
          {hhmm}
          </button>
        )
      })}
      </div>

      <p className="text-xs text-white/60 mt-2 mb-4">
      Dias úteis: apenas 18:30 (1 atendimento/dia). Fins de semana: 08:00–20:00.
      </p>

      <button className="btn btn-primary w-full py-3 text-base" onClick={send} disabled={weekdayFull}>
      Enviar para Vânia pelo WhatsApp
      </button>
      </div>
      </div>
    )
}
