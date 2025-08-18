'use client'
import { useEffect, useState } from 'react'
import CalendarMonthly from '@/components/CalendarMonthly'

/**
 * app/page.tsx
 * Fluxo (mobile-first):
 *  1) Tocar num dia futuro (dias passados bloqueados)
 *  2) Digitar WhatsApp da cliente + ESCOLHER HORA (validada conforme regras de funcionamento)
 *  3) Ver/Copiar PROTOCOLO
 *  4) "Enviar para Vânia" → WhatsApp abre com data+hora+fone+protocolo
 *  5) Dia fica vermelho (persistência robusta)
 *
 * Persistimos:
 *  - Dias marcados (Set<yyyy-mm-dd>)  => localStorage
 *  - Último mês visto (ano/mês)       => localStorage (para reabrir no mesmo mês)
 *  - Protocolos por (day|telefone)    => localStorage
 */

const MARK_KEY   = 'nails.v1.markedDays'
const LAST_KEY   = 'nails.v1.lastView'
const PROTO_KEY  = 'nails.v1.protocols'
const VANIA_PHONE = '+556884257558' // <<< Número da Vânia em E.164 (Acre)

type LastView = { year: number; month: number }

// ---------- utils de data/telefone ----------
function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0,0,0,0)
  return x
}
function yyyymmdd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function ptDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function ptTime(hhmm: string) {
  // hh:mm -> HH:mm pt-BR
  const [h,m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function digitsOnly(s: string){ return (s||'').replace(/\D+/g,'') }
function toE164OrDigits(input: string): string {
  const raw = (input || '').trim()
  if (!raw) return ''
    if (/^\+?[1-9]\d{7,14}$/.test(raw)) return raw.startsWith('+') ? raw : ('+' + raw)
      const digits = digitsOnly(raw)
      if (digits.length >= 10 && digits.length <= 13) return '+55' + digits.replace(/^0+/, '')
        return digits
}

// ---------- regras de funcionamento por dia da semana ----------
function isHourAllowed(date: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const w = date.getDay() // 0=Dom..6=Sáb
  const hm = h*60 + m
  if (w >= 1 && w <= 5) return hm >= 18*60          // Seg–Sex ≥ 18:00
    if (w === 6)           return hm >= 13*60         // Sábado ≥ 13:00
      return hm >= 8*60 && hm <= 20*60                  // Domingo 08:00–20:00
}

// ---------- protocolo ----------
type ProtoMap = Record<string,string> // chave: `${day}|${digits}` -> protocolo
function loadProtoMap(): ProtoMap {
  try { return JSON.parse(localStorage.getItem(PROTO_KEY) || '{}') as ProtoMap } catch { return {} }
}
function saveProtoMap(m: ProtoMap){ try { localStorage.setItem(PROTO_KEY, JSON.stringify(m)) } catch {} }
function computeProtocol(day: string, clientPhone: string): string {
  // PROTO: yymmdd-últ4-LL
  const d = day.replaceAll('-','').slice(2) // yymmdd
  const last4 = digitsOnly(clientPhone).slice(-4) || '0000'
  const seed = (day + '|' + clientPhone).split('').reduce((a,c)=> (a*31 + c.charCodeAt(0)) >>> 0, 7)
  const A = String.fromCharCode(65 + (seed % 26))
  const B = String.fromCharCode(65 + ((seed>>5) % 26))
  return `${d}-${last4}-${A}${B}`
}
function getOrCreateProtocol(day: string, clientPhone: string): string {
  const key = `${day}|${digitsOnly(clientPhone)}`
  const map = loadProtoMap()
  if (map[key]) return map[key]
    const proto = computeProtocol(day, clientPhone)
    map[key] = proto
    saveProtoMap(map)
    return proto
}

// ---------- helpers de persistência de marcações ----------
function loadMarked(): Set<string> {
  try {
    const raw = localStorage.getItem(MARK_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}
function saveMarked(set: Set<string>) {
  try { localStorage.setItem(MARK_KEY, JSON.stringify(Array.from(set))) } catch {}
}
function loadLastView(): LastView | null {
  try { return JSON.parse(localStorage.getItem(LAST_KEY) || 'null') as LastView | null } catch { return null }
}
function saveLastView(v: LastView) {
  try { localStorage.setItem(LAST_KEY, JSON.stringify(v)) } catch {}
}

// ---------- página ----------
export default function Page() {
  const now = new Date()
  const remembered = loadLastView()
  const initialYear  = remembered?.year  ?? now.getFullYear()
  const initialMonth = remembered?.month ?? now.getMonth()

  const [year, setYear]   = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const [markedDays, setMarkedDays] = useState<Set<string>>(new Set())
  const [openWhats, setOpenWhats]   = useState(false)

  // carregar marcações na montagem
  useEffect(() => { setMarkedDays(loadMarked()) }, [])

  // persistir última visualização quando month/year mudarem
  useEffect(() => { saveLastView({ year, month }) }, [year, month])

  function onPrevMonth() {
    const d = new Date(year, month - 1, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth()); setSelectedDay(null)
  }
  function onNextMonth() {
    const d = new Date(year, month + 1, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth()); setSelectedDay(null)
  }
  function onSelectDay(d: Date | null) {
    if (!d) return
      if (startOfDay(d).getTime() < startOfToday().getTime()) return // segurança extra
        setSelectedDay(d)
        setOpenWhats(true)
  }
  function markDayImmediately(date: Date) {
    const key = yyyymmdd(date)
    setMarkedDays(prev => {
      const next = new Set(prev); next.add(key)
      saveMarked(next) // salva imediatamente para não perder ao recarregar
      return next
    })
  }

  return (
    <main className="container-max py-6">
    <header className="mb-4 flex items-center justify-between gap-3">
    <div>
    <h1 className="text-2xl font-semibold">Agenda Nails — Controle</h1>
    <p className="text-white/60 text-sm">
    Toque num dia futuro → escolha o horário → envie para Vânia → o dia fica vermelho.
    </p>
    </div>
    <div className="flex items-center gap-2">
    <button className="btn" onClick={onPrevMonth}>Mês anterior</button>
    <button className="btn" onClick={onNextMonth}>Próximo mês</button>
    </div>
    </header>

    <section className="card p-3 sm:p-4">
    <CalendarMonthly
    year={year}
    month={month}
    appointments={[]}
    onSelectDay={onSelectDay}
    markedDays={markedDays}
    minDate={startOfToday()}   // BLOQUEIA DIAS PASSADOS
    />
    </section>

    <QuickForVaniaDialog
    open={openWhats}
    onClose={(sent) => {
      setOpenWhats(false)
      if (sent && selectedDay) markDayImmediately(selectedDay)
    }}
    date={selectedDay}
    vaniaPhone={VANIA_PHONE}
    />
    </main>
  )
}

/**
 * Diálogo: telefone da cliente + HORA + PROTOCOLO + botão único "Enviar para Vânia".
 * Valida hora conforme regras:
 *   - Seg–Sex: >=18:00
 *   - Sábado:  >=13:00
 *   - Domingo: 08:00–20:00
 */
function QuickForVaniaDialog({
  open, onClose, date, vaniaPhone
}: {
  open: boolean
  onClose: (sent: boolean) => void
  date: Date | null
  vaniaPhone: string
}) {
  const [clientPhone, setClientPhone] = useState('')
  const [time, setTime]               = useState('') // 'HH:MM'
  const [proto, setProto]             = useState<string>('')

  useEffect(() => {
    if (open) { setClientPhone(''); setTime(''); setProto('') }
  }, [open])

  if (!open || !date) return null

    const dayStr = yyyymmdd(date)
    const dLabel = ptDate(date)

    const updatePhone = (v: string) => {
      setClientPhone(v)
      const digits = digitsOnly(v)
      if (digits.length >= 8) setProto(getOrCreateProtocol(dayStr, v))
        else setProto('')
    }

    const sendToVania = async () => {
      const e164 = toE164OrDigits(vaniaPhone)
      if (!e164) return alert('Configure o número da Vânia (formato +5568...)')
        if (!clientPhone.trim()) return alert('Informe o WhatsApp da cliente.')
          if (!time) return alert('Escolha o horário.')

            // valida janela de atendimento
            if (!isHourAllowed(date, time)) {
              return alert('Horário fora do atendimento: Seg–Sex ≥ 18:00 · Sáb ≥ 13:00 · Dom 08:00–20:00.')
            }

            const protocol = proto || getOrCreateProtocol(dayStr, clientPhone)
            const msg =
            `Agendamento confirmado para ${dLabel} às ${ptTime(time)}.%0A` +
            `Cliente: ${clientPhone}.%0A` +
            `PROTOCOLO: ${protocol}.%0A` +
            `Se precisar ajustar, combine com a cliente. 💅`

            window.open(
              `https://wa.me/${encodeURIComponent(e164.replace('+',''))}?text=${msg}`,
                        '_blank'
            )

            try { await navigator.clipboard.writeText(protocol) } catch {}

            onClose(true)
    }

    return (
      <dialog open className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="card w-full max-w-md p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between">
      <h3 className="text-lg font-semibold">Confirmar e enviar</h3>
      <button className="btn" onClick={() => onClose(false)} aria-label="Fechar">Fechar</button>
      </header>

      <p className="text-sm text-white/80 mb-3">
      Dia selecionado: <strong>{dLabel}</strong>
      </p>

      <label className="label" htmlFor="cli">WhatsApp da cliente</label>
      <input
      id="cli"
      className="input mb-3 text-base"
      inputMode="tel"
      pattern="[0-9()+\\-\\s]+"
      placeholder="(DD) 9XXXX-XXXX ou +55..."
      value={clientPhone}
      onChange={e => updatePhone(e.target.value)}
      autoFocus
      />

      <label className="label" htmlFor="hhmm">Horário</label>
      <input
      id="hhmm"
      type="time"
      className="input mb-2 text-base"
      value={time}
      onChange={e => setTime(e.target.value)}
      />
      <p className="text-xs text-white/60 mb-3">
      Atendimento: Seg–Sex Apartir das ≥ 18:00 · Sáb ≥ 13:00 · Dom 08:00–20:00.
      </p>

      {proto && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2">
        <div className="text-sm">
        <div className="text-white/60">Protocolo</div>
        <div className="font-semibold tracking-wider">{proto}</div>
        </div>
        <button
        className="btn"
        onClick={async ()=>{ try { await navigator.clipboard.writeText(proto) } catch {} }}
        >
        Copiar
        </button>
        </div>
      )}

      <button
      className="btn btn-primary w-full py-3 text-base"
      onClick={sendToVania}
      >
      Enviar para Vânia
      </button>

      <p className="text-xs text-white/60 mt-3">
      O protocolo é enviado à Vânia. Dia ficará marcado em vermelho.
      </p>
      </div>
      </dialog>
    )
}
