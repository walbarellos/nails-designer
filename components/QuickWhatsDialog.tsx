'use client'
import { useEffect, useState } from 'react';
import { ptDate } from '@/lib/datefmt';
import { toE164OrDigits } from '@/lib/phone';

export default function QuickWhatsDialog({
  open, onClose, date, professionalPhone
}: {
  open: boolean;
  onClose: (sent: boolean) => void;
  date: Date | null;
  professionalPhone: string; // número da profissional (ex: +555199999999)
}) {
  const [clientPhone, setClientPhone] = useState('');

  useEffect(()=>{ if (!open) setClientPhone('') }, [open]);

  if (!open || !date) return null;

  const dLabel = ptDate(date);
  const msg = `Olá! 💅%0AHorário combinado para o dia ${dLabel}.%0ASe precisar ajustar, me avise por aqui. ✨`;

  const waClient = () => {
    const ph = toE164OrDigits(clientPhone);
    if (!ph) return alert('Informe o telefone da cliente.');
    window.open(`https://wa.me/${encodeURIComponent(ph.replace('+',''))}?text=${msg}`, '_blank');
  };

  const waPro = () => {
    const ph = toE164OrDigits(professionalPhone);
    if (!ph) return alert('Configure o telefone da profissional.');
    window.open(`https://wa.me/${encodeURIComponent(ph.replace('+',''))}?text=${msg}`, '_blank');
  };

  const waBoth = () => { waClient(); waPro(); onClose(true); };

  return (
    <dialog open className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="card w-full max-w-md p-4">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Enviar WhatsApp</h3>
          <button className="btn" onClick={()=>onClose(false)} aria-label="Fechar">Fechar</button>
        </header>

        <p className="text-sm text-white/80 mb-3">Dia selecionado: <strong>{dLabel}</strong></p>

        <label className="label" htmlFor="cli">Telefone da cliente</label>
        <input
          id="cli"
          className="input mb-3"
          inputMode="tel"
          placeholder="(DD) 9XXXX-XXXX ou +55..."
          value={clientPhone}
          onChange={e=>setClientPhone(e.target.value)}
        />

        <div className="flex flex-wrap gap-2 justify-end">
          <button className="btn" onClick={waClient}>WhatsApp (cliente)</button>
          <button className="btn" onClick={waPro}>WhatsApp (profissional)</button>
          <button className="btn btn-primary" onClick={waBoth}>Abrir ambos</button>
        </div>

        <p className="text-xs text-white/60 mt-3">
          Dica: salve o telefone da profissional em código para não precisar digitar de novo.
        </p>
      </div>
    </dialog>
  );
}

