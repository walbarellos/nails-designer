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
              if (time !== '18:30') return alert('Em dias úteis, o único horário disponível é 18:30.')
                if (taken.length >= 1) return alert('Este dia útil já possui o único atendimento de 18:30 reservado.')
            }
            if (taken.includes(time)) return alert('Este horário já está reservado. Escolha outro.')

              const msg =
              `Olá, Vânia! Gostaria de agendar *${service}* em *${dLabel}* às *${ptTime(time)}*.\n` +
              `Meu nome é *${clientName}*.`

              const e164Digits = digitsOnly(VANIA_PHONE)
              const url = `https://wa.me/${e164Digits}?text=${encodeURIComponent(msg)}`
              window.open(url,'_blank','noopener,noreferrer')

              onClose(true, time)
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
      {/* painel sólido, sem transparência */}
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
        <div className="mb-3 rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-rose-300" role="alert">
        Este dia útil já está indisponível (o único horário 18:30 foi reservado).
        </div>
      )}

      <div
      className="grid grid-cols-3 gap-2 sm:grid-cols-4 max-h-56 overflow-auto pr-1"
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

      <div className="modal-section-divider mt-3 pt-3">
      <p className="text-xs text-white/60 mb-3">
      Dias úteis: apenas 18:30 (1 atendimento/dia). Fins de semana: 08:00–20:00.
      </p>
      <button className="btn btn-primary w-full py-3 text-base" onClick={send} disabled={weekdayFull}>
      Enviar para Vânia pelo WhatsApp
      </button>
      </div>
      </div>
      </div>
    )
}
