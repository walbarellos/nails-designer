'use client'
import { useEffect, useState } from 'react'
import CalendarMonthly from '@/components/CalendarMonthly'
import HeroLogo from '@/components/HeroLogo'

const MARK_KEY   = 'nails.v1.markedDays'
const LAST_KEY   = 'nails.v1.lastView'
const PROTO_KEY  = 'nails.v1.protocols'
const SLOTS_KEY  = 'nails.v1.slots'          // <<< NOVO: mapa dia -> array de horários 'HH:MM'
const VANIA_PHONE = '+556884257558'

type LastView = { year: number; month: number }
type SlotsMap = Record<string, string[]> // { '2025-08-17': ['18:00','19:30'] }

// ---------- utils ----------
function startOfToday(){ const d=new Date(); d.setHours(0,0,0,0); return d }
function startOfDay(d:Date){ const x=new Date(d); x.setHours(0,0,0,0); return x }
function yyyymmdd(d:Date){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}` }
function ptDate(d:Date){ return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}) }
function ptTime(hhmm:string){ const [h,m]=hhmm.split(':').map(Number); const d=new Date(); d.setHours(h,m,0,0); return d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) }
function digitsOnly(s:string){ return (s||'').replace(/\D+/g,'') }
function toE164OrDigits(input:string){ const raw=(input||'').trim(); if(!raw) return ''; if(/^\+?[1-9]\d{7,14}$/.test(raw)) return raw.startsWith('+')?raw:('+'+raw); const d=digitsOnly(raw); if(d.length>=10&&d.length<=13) return '+55'+d.replace(/^0+/,''); return d }
function isHourAllowed(date:Date, hhmm:string){ const [h,m]=hhmm.split(':').map(Number); const w=date.getDay(); const hm=h*60+m; if(w>=1&&w<=5) return hm>=18*60; if(w===6) return hm>=13*60; return hm>=8*60&&hm<=20*60 }

// ---------- protocolo ----------
type ProtoMap = Record<string,string>
function loadProtoMap():ProtoMap{ try{ return JSON.parse(localStorage.getItem(PROTO_KEY)||'{}') }catch{ return {} } }
function saveProtoMap(m:ProtoMap){ try{ localStorage.setItem(PROTO_KEY, JSON.stringify(m)) }catch{} }
function computeProtocol(day:string, phone:string){ const d=day.replaceAll('-','').slice(2); const last4=digitsOnly(phone).slice(-4)||'0000'; const seed=(day+'|'+phone).split('').reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7); const A=String.fromCharCode(65+(seed%26)); const B=String.fromCharCode(65+((seed>>5)%26)); return `${d}-${last4}-${A}${B}` }
function getOrCreateProtocol(day:string, phone:string){ const key=`${day}|${digitsOnly(phone)}`; const map=loadProtoMap(); if(map[key]) return map[key]; const p=computeProtocol(day,phone); map[key]=p; saveProtoMap(map); return p }

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
  function onSelectDay(d:Date|null){ if(!d) return; if(startOfDay(d)<startOfToday()) return; setSelectedDay(d); setOpen(true) }

  function markDay(date:Date){ const key=yyyymmdd(date); setMarkedDays(prev=>{ const next=new Set(prev); next.add(key); saveMarked(next); return next }) }
  function addSlot(date:Date, hhmm:string){
    const day=yyyymmdd(date)
    setSlots(prev=>{
      const next:{[k:string]:string[]} = { ...prev }
      const arr = new Set([...(next[day]||[]), hhmm])
      next[day] = Array.from(arr).sort()
      saveSlots(next)
      return next
    })
  }

  // mapa dia -> contagem (para o calendário)
  const slotsByDay = Object.fromEntries(Object.entries(slots).map(([d,arr])=>[d, arr.length]))

  return (
    <main className="container-max py-6 space-y-6">
    <header className="border-b border-white/10 pb-4">
    <div className="flex items-center gap-4">
    <HeroLogo />
    <div className="min-w-0">
    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Agenda — Vânia Maria</h1>
    <p className="text-sm text-white/60">Selecionar dia futuro, escolher horário e enviar confirmação.</p>
    </div>
    <div className="ml-auto flex items-center gap-2">
    {/* Removido: Mês anterior */}
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
    slotsByDay={slotsByDay}    // <<< NOVO
    />
    </section>

    <QuickDialog
    open={open}
    date={selectedDay}
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
  open, onClose, date
}:{
  open:boolean; onClose:(sent:boolean, hhmm?:string)=>void; date:Date|null
}){
  const [clientPhone,setClientPhone]=useState('')
  const [time,setTime]=useState('')
  const [proto,setProto]=useState<string>('')

  useEffect(()=>{ if(open){ setClientPhone(''); setTime(''); setProto('') } },[open])
  if(!open||!date) return null

    const dayStr=yyyymmdd(date); const dLabel=ptDate(date)
    const updatePhone=(v:string)=>{ setClientPhone(v); const d=digitsOnly(v); setProto(d.length>=8?getOrCreateProtocol(dayStr,v):'') }

    const send=async()=>{
      if(!clientPhone.trim()) return alert('Informe o WhatsApp da cliente.')
        if(!time) return alert('Escolha o horário.')
          if(!isHourAllowed(date,time)) return alert('Horário fora do atendimento: Seg–Sex ≥18:00 · Sáb ≥13:00 · Dom 08:00–20:00.')

            const protocol = proto || getOrCreateProtocol(dayStr, clientPhone)
            const msg =
            `Agendamento confirmado para ${dLabel} às ${ptTime(time)}.%0A` +
            `Cliente: ${clientPhone}.%0A` +
            `PROTOCOLO: ${protocol}.%0A` +
            `Se precisar ajustar, combine com a cliente. 💅`
            const e164 = toE164OrDigits(VANIA_PHONE)
            window.open(`https://wa.me/${encodeURIComponent(e164.replace('+',''))}?text=${msg}`,'_blank')
            try{ await navigator.clipboard.writeText(protocol) }catch{}
            onClose(true, time)                 // <<< devolve o horário escolhido
    }

    return (
      <dialog open className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="card w-full max-w-md p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between">
      <h3 className="text-lg font-semibold">Confirmar e enviar</h3>
      <button className="btn" onClick={()=>onClose(false)} aria-label="Fechar">Fechar</button>
      </header>

      <p className="text-sm text-white/80 mb-3">Dia selecionado: <strong>{dLabel}</strong></p>

      <label className="label" htmlFor="cli">WhatsApp da cliente</label>
      <input id="cli" className="input mb-3 text-base" inputMode="tel"
      placeholder="(DD) 9XXXX-XXXX ou +55..." value={clientPhone}
      onChange={e=>updatePhone(e.target.value)} autoFocus />

      <label className="label" htmlFor="hhmm">Horário</label>
      <input id="hhmm" type="time" className="input mb-2 text-base"
      value={time} onChange={e=>setTime(e.target.value)} />
      <p className="text-xs text-white/60 mb-3">Seg–Sex ≥18:00 · Sáb ≥13:00 · Dom 08:00–20:00.</p>

      {proto && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2">
        <div className="text-sm">
        <div className="text-white/60">Protocolo</div>
        <div className="font-semibold tracking-wider">{proto}</div>
        </div>
        <button className="btn" onClick={async()=>{ try{ await navigator.clipboard.writeText(proto) }catch{} }}>
        Copiar
        </button>
        </div>
      )}

      <button className="btn btn-primary w-full py-3 text-base" onClick={send}>
      Enviar para Vânia
      </button>
      </div>
      </dialog>
    )
}
