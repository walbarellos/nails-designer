'use client'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { NewAppointmentSchema, type NewAppointment, type Appointment } from '@/lib/schema'
import { parseDateTime, addMinutes, overlaps } from '@/lib/time' // ⬅ removido isWithinWorkingHours
import { maskBR } from '@/lib/phone'

const DEFAULT_DURATION = 60 // minutos
const BUFFER_MIN = 10

// ──────────────────────────────────────────────
// Regras novas: Seg–Sex = "18:00"; Sáb–Dom = 08:00..18:00 (HH:00)
// ──────────────────────────────────────────────
function isWeekend(dateStr: string): boolean {
    // dateStr: "YYYY-MM-DD"
    const [y, m, d] = dateStr.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    const wd = dt.getUTCDay() // 0=Dom, 6=Sáb
    return wd === 0 || wd === 6
}

function clampTimeByRule(dateStr: string, timeStr: string): string {
    // Devolve um HH:mm válido conforme a regra (sem validar “futuro” aqui)
    if (!dateStr) return timeStr

        const weekend = isWeekend(dateStr)
        const [hhS, mmS] = (timeStr || '').split(':')
        let hh = Number(hhS)
        let mm = Number(mmS)

        if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
            // set default conforme o dia
            return weekend ? '08:00' : '18:00'
        }

        // minutos sempre 00
        mm = 0

        if (!weekend) {
            // dia útil → força 18:00
            return '18:00'
        }

        // fim de semana → limita 08..18
        if (hh < 8) hh = 8
            if (hh > 18) hh = 18
                return `${String(hh).padStart(2, '0')}:00`
}

function isAllowedTime(dateStr: string, timeStr: string): boolean {
    if (!dateStr || !timeStr) return false
        const weekend = isWeekend(dateStr)
        const m = /^(\d{2}):(\d{2})$/.exec(timeStr)
        if (!m) return false
            const hh = Number(m[1])
            const mm = Number(m[2])
            if (mm !== 0) return false
                if (!weekend) {
                    return hh === 18
                }
                return hh >= 8 && hh <= 18
}

export default function BookingDialog({
    open, onClose, onCreate, existing
}: {
    open: boolean
    onClose: () => void
    onCreate: (a: Appointment) => void
    existing: Appointment[]
}) {
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<NewAppointment>({
        resolver: zodResolver(NewAppointmentSchema)
    })

    useEffect(() => { if (!open) reset() }, [open, reset])

    // máscara de telefone em tempo real
    const phoneVal = watch('phone')
    useEffect(() => { if (phoneVal !== undefined) setValue('phone', maskBR(phoneVal)) }, [phoneVal, setValue])

    // Observa data/hora para impor min/max/step e corrigir hora inválida
    const dateVal = watch('date') // "YYYY-MM-DD"
    const timeVal = watch('time') // "HH:mm" (livre)
    const weekend = dateVal ? isWeekend(dateVal) : false

    // Corrige automaticamente se o usuário escolher um horário fora da regra
    useEffect(() => {
        if (!dateVal) return
            const fixed = clampTimeByRule(dateVal, timeVal || (weekend ? '08:00' : '18:00'))
            if (fixed !== (timeVal || '')) {
                setValue('time', fixed, { shouldDirty: true })
            }
    }, [dateVal, timeVal, weekend, setValue])

    const onSubmit = (data: NewAppointment) => {
        // Valida “no futuro”
        const when = parseDateTime(data.date, data.time)
        const now = new Date()
        if (when.getTime() <= now.getTime()) {
            alert('Selecione uma data/hora futura.')
            return
        }

        // Aplica a nova janela de funcionamento
        if (!isAllowedTime(data.date, data.time)) {
            alert('Fora do horário: Seg–Sex somente 18:00; Sáb–Dom 08:00–18:00 (em hora cheia).')
            return
        }

        const start = when
        const end = addMinutes(start, DEFAULT_DURATION + BUFFER_MIN)

        // Conflitos (scheduled/confirmed)
        const conflict = existing.some(x => {
            const xs = new Date(x.startsAt)
            const xe = addMinutes(xs, DEFAULT_DURATION + BUFFER_MIN)
            return overlaps(start, end, xs, xe) && (x.status === 'scheduled' || x.status === 'confirmed')
        })
        if (conflict) {
            alert('Conflito de horário com outro agendamento.')
            return
        }

        const id = cryptoRandom()
        const a: Appointment = {
            id,
            name: data.name.trim(),
            phone: data.phone.trim(),
            startsAt: when.toISOString(),
            notes: data.notes?.trim(),
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            version: 1,
        }
        onCreate(a)
        onClose()
    }

    // Atributos dinâmicos do <input type="time">
    const timeMin = weekend ? '08:00' : '18:00'
    const timeMax = '18:00'
    const timeStep = 3600 // 1h

    return (
        <dialog open={open} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
        <div className="card w-full max-w-md p-4">
        <header className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Novo agendamento</h3>
        <button className="btn" onClick={onClose} aria-label="Fechar formulário">Fechar</button>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
        <label className="label" htmlFor="name">Nome</label>
        <input id="name" className="input" {...register('name')} placeholder="Nome da cliente" />
        {errors.name && <p className="text-xs text-rose-300 mt-1" role="alert">{errors.name.message}</p>}
        </div>

        <div>
        <label className="label" htmlFor="phone">Telefone</label>
        <input
        id="phone"
        className="input"
        inputMode="tel"
        autoComplete="tel"
        pattern="[0-9()+\-\s]+"
        {...register('phone')}
        placeholder="(DD) 9XXXX-XXXX"
        />
        {errors.phone && <p className="text-xs text-rose-300 mt-1" role="alert">{errors.phone.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
        <div>
        <label className="label" htmlFor="date">Data</label>
        <input id="date" type="date" className="input" {...register('date')} />
        {errors.date && <p className="text-xs text-rose-300 mt-1" role="alert">{errors.date.message}</p>}
        </div>

        <div>
        <label className="label" htmlFor="time">Hora</label>
        <input
        id="time"
        type="time"
        className="input"
        {...register('time')}
        // Enforcements de UI (além da validação no submit):
        min={timeMin}     // FDS: 08:00 | Útil: 18:00
        max={timeMax}     // Ambos: 18:00
        step={timeStep}   // 3600 → hora em hora
        />
        {errors.time && <p className="text-xs text-rose-300 mt-1" role="alert">{errors.time.message}</p>}
        </div>
        </div>

        <div>
        <label className="label" htmlFor="notes">Observações (opcional)</label>
        <textarea id="notes" className="input" rows={3} {...register('notes')} placeholder="Preferências, referências..." />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
        <button type="button" className="btn" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary">Salvar</button>
        </div>

        <p className="text-xs text-white/60 pt-1">
        Regra: <strong>Dias úteis</strong> apenas <strong>18:00</strong>. <strong>Fins de semana</strong> <strong>08:00–18:00</strong>, em hora cheia.
        </p>
        </form>
        </div>
        </dialog>
    )
}

function cryptoRandom() {
    try { return crypto.randomUUID() } catch { return Math.random().toString(36).slice(2) }
}
