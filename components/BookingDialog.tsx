'use client'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { NewAppointmentSchema, type NewAppointment, type Appointment } from '@/lib/schema'
import { parseDateTime, addMinutes, isWithinWorkingHours, overlaps } from '@/lib/time'
import { maskBR } from '@/lib/phone'

const DEFAULT_DURATION = 60 // minutos
const BUFFER_MIN = 10

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

    useEffect(()=>{ if (!open) reset() }, [open, reset])

    // máscara de telefone em tempo real
    const phoneVal = watch('phone')
    useEffect(()=>{ if (phoneVal !== undefined) setValue('phone', maskBR(phoneVal)) }, [phoneVal, setValue])

    const onSubmit = (data: NewAppointment) => {
        const when = parseDateTime(data.date, data.time)
        const now = new Date()
        if (when.getTime() <= now.getTime()) {
            alert('Selecione uma data/hora futura.')
            return
        }
        // Janela de funcionamento
        if (!isWithinWorkingHours(when)) {
            alert('Fora do horário de atendimento: Seg–Sex ≥ 18:00; Sáb ≥ 13:00; Dom 08:00–20:00.')
            return
        }
        const start = when
        const end = addMinutes(start, DEFAULT_DURATION + BUFFER_MIN)
        // Conflitos
        const conflict = existing.some(x => {
            const xs = new Date(x.startsAt)
            const xe = addMinutes(xs, DEFAULT_DURATION + BUFFER_MIN)
            return overlaps(start, end, xs, xe) && (x.status==='scheduled' || x.status==='confirmed')
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
        <input id="name" className="input" {...register('name')} placeholder="Nome da cliente"/>
        {errors.name && <p className="text-xs text-rose-300 mt-1" role="alert">{errors.name.message}</p>}
        </div>
        <div>
        <label className="label" htmlFor="phone">Telefone</label>
        <input id="phone" className="input" inputMode="tel" autoComplete="tel" pattern="[0-9()+\-\s]+" {...register('phone')} placeholder="(DD) 9XXXX-XXXX"/>
        {errors.phone && <p className="text-xs text-rose-300 mt-1" role="alert">{errors.phone.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
        <div>
        <label className="label" htmlFor="date">Data</label>
        <input id="date" type="date" className="input" {...register('date')}/>
        {errors.date && <p className="text-xs text-rose-300 mt-1" role="alert">{errors.date.message}</p>}
        </div>
        <div>
        <label className="label" htmlFor="time">Hora</label>
        <input id="time" type="time" className="input" {...register('time')}/>
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
        </form>
        </div>
        </dialog>
    )
}

function cryptoRandom(){
    try { return crypto.randomUUID() } catch { return Math.random().toString(36).slice(2) }
}
