// components/AgendaWidget.tsx
import React, { useEffect, useMemo, useState } from "react";

/** ===== Tipos ===== */
type Booking = {
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  name: string;
  service: string;
};

type Props = {
  /** Número do WhatsApp no formato 55DDDNNNNNNNN (apenas dígitos) */
  whatsappNumber: string;
  /**
   * Slots para Sábado e Domingo (agenda aberta).
   * Mesmo que venham horários fora da regra, serão filtrados.
   */
  weekendSlots?: string[]; // ex.: ["08:00","09:00",...,"18:00"]
  /** Mensagem de saudação opcional */
  greeting?: string;
};

/** ===== Utilitários de data/horário ===== */
const STORAGE_KEY = "agenda_bookings_v1";

/** Retorna 0..6 (Domingo=0) a partir de "YYYY-MM-DD" */
function getWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Usamos UTC para evitar shift de fuso
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCDay();
}
function isWeekend(dateStr: string): boolean {
  const wd = getWeekday(dateStr);
  return wd === 0 || wd === 6; // Dom=0, Sáb=6
}
function formatDatePtBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** ===== Helpers de horário (HH:mm) ===== */
function pad2(n: number) { return String(n).padStart(2, "0"); }

function makeHourSlots(startHour: number, endHourInclusive: number): string[] {
  const out: string[] = [];
  for (let h = startHour; h <= endHourInclusive; h++) out.push(`${pad2(h)}:00`);
  return out;
}
function isValidWeekendSlot(hhmm: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return false;
  const hh = Number(m[1]), mm = Number(m[2]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false;
  if (mm !== 0) return false;
  return hh >= 8 && hh <= 18; // 08:00..18:00
}
function defaultWeekendSlots(): string[] { return makeHourSlots(8, 18); }
function sanitizeWeekendSlots(slots?: string[]): string[] {
  if (!slots || slots.length === 0) return defaultWeekendSlots();
  const keep = slots.filter(isValidWeekendSlot);
  const norm = Array.from(new Set(keep)).sort();
  return norm.length > 0 ? norm : defaultWeekendSlots();
}

/** Guarda final: impõe a regra antes de renderizar */
function filterAllowedSlots(slots: string[], weekend: boolean): string[] {
  if (!weekend) return ["18:00"];
  // fim de semana: força HH:00 entre 08 e 18, ordenado e único
  const filtered = slots.filter(isValidWeekendSlot);
  const safe = filtered.length ? filtered : defaultWeekendSlots();
  return Array.from(new Set(safe)).sort();
}

/** Mensagem do WhatsApp */
function buildWhatsAppText(params: {
  greeting?: string;
  name: string;
  service: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}) {
  const { greeting, name, service, date, time } = params;
  const dataPt = formatDatePtBR(date);
  const header = greeting ? `${greeting}\n\n` : "";
  return (
    header +
    `Olá! Gostaria de agendar ${service} em ${dataPt} às ${time}.\n` +
    `Meu nome é ${name}.`
  );
}

/** URL do WhatsApp */
function buildWhatsAppUrl(whatsappNumber: string, text: string) {
  const base = `https://wa.me/${whatsappNumber}`;
  const q = `?text=${encodeURIComponent(text)}`;
  return `${base}${q}`;
}

/** CRUD simples em localStorage */
function loadBookings(): Booking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Booking[]) : [];
  } catch {
    return [];
  }
}
function saveBookings(items: Booking[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Verifica se existe qualquer agendamento neste dia (para dias úteis bloqueia o único slot 18:00) */
function isAnyBookedOnDate(bookings: Booking[], dateStr: string): boolean {
  return bookings.some((b) => b.date === dateStr);
}
/** Verifica se o slot exato está tomado (FDS e também em dias úteis) */
function isSlotBooked(bookings: Booking[], dateStr: string, time: string): boolean {
  return bookings.some((b) => b.date === dateStr && b.time === time);
}

/** ===== Componente principal ===== */
export function AgendaWidget({
  whatsappNumber,
  weekendSlots,
  greeting = "✨ Olá! Vi sua agenda no site.",
}: Props) {
  const [name, setName] = useState("");
  const [service, setService] = useState("Manicure");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Carrega agendamentos salvos
  useEffect(() => {
    setBookings(loadBookings());
  }, []);

  // Slots “brutos” para o dia corrente
  const rawSlotsForDay = useMemo(() => {
    if (!date) return [];
    if (isWeekend(date)) {
      // Usa prop se houver, mas sanitizada; senão, default 08..18
      return sanitizeWeekendSlots(weekendSlots);
    }
    // Dias úteis → somente 18:00
    return ["18:00"];
  }, [date, weekendSlots]);

  // Guarda final: filtra qualquer resquício fora da regra
  const slotsForDay = useMemo(() => {
    if (!date) return [];
    return filterAllowedSlots(rawSlotsForDay, isWeekend(date));
  }, [date, rawSlotsForDay]);

  // Regras de bloqueio
  const weekdayBlockedByFullDay =
  date && !isWeekend(date) ? isAnyBookedOnDate(bookings, date) : false;

  function canConfirm(): boolean {
    if (!name.trim() || !service.trim() || !date || !time) return false;
    if (!isWeekend(date) && weekdayBlockedByFullDay) return false; // dia útil já ocupado
    if (isSlotBooked(bookings, date, time)) return false;          // slot já ocupado
    return true;
  }

  function handlePickDate(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value; // "YYYY-MM-DD"
    setDate(v);
    setTime(""); // reset horário ao trocar o dia
  }
  function handlePickSlot(slot: string) { setTime(slot); }

  function handleConfirm() {
    if (!canConfirm()) return;
    const text = buildWhatsAppText({ greeting, name, service, date, time });

    // Persiste local antes de abrir WhatsApp
    const newBooking: Booking = { date, time, name, service };
    const next = [...bookings, newBooking];
    setBookings(next);
    saveBookings(next);

    const url = buildWhatsAppUrl(whatsappNumber, text);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const isWeekday = date ? !isWeekend(date) : false;

  return (
    <div
    className="max-w-xl mx-auto p-6 rounded-2xl border border-white/10 shadow-xl bg-[rgba(12,14,18,0.75)] backdrop-blur"
    style={{ color: "#e8edf2" }}
    role="region"
    aria-label="Agendamento de serviços"
    >
    <h2 className="text-xl font-semibold mb-4">Agendamento</h2>

    {/* Nome e Serviço (sem celular) */}
    <div className="grid gap-3 mb-4">
    <label className="grid gap-1">
    <span className="text-sm opacity-80">Seu nome</span>
    <input
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="px-3 py-2 rounded-md bg-black/30 border border-white/10 outline-none focus:ring-2 focus:ring-white/20"
    placeholder="Ex.: Maria"
    aria-label="Seu nome"
    />
    </label>

    <label className="grid gap-1">
    <span className="text-sm opacity-80">Serviço</span>
    <select
    value={service}
    onChange={(e) => setService(e.target.value)}
    className="px-3 py-2 rounded-md bg-black/30 border border-white/10 outline-none focus:ring-2 focus:ring-white/20"
    aria-label="Tipo de serviço"
    >
    <option>Manicure</option>
    <option>Pedicure</option>
    <option>Esmaltação em Gel</option>
    <option>Alongamento</option>
    <option>Combo Mãos + Pés</option>
    </select>
    </label>
    </div>

    {/* Data */}
    <div className="grid gap-1 mb-4">
    <span className="text-sm opacity-80">Escolha a data</span>
    <input
    type="date"
    value={date}
    onChange={handlePickDate}
    className="px-3 py-2 rounded-md bg-black/30 border border-white/10 outline-none focus:ring-2 focus:ring-white/20"
    aria-label="Escolha a data"
    />
    {date && (
      <div className="text-xs opacity-70 mt-1">
      {formatDatePtBR(date)}
      {isWeekday ? " — dia útil" : " — fim de semana"}
      </div>
    )}
    </div>

    {/* Slots */}
    <div className="mb-5">
    <div className="text-sm opacity-80 mb-2">Horários disponíveis</div>
    {!date ? (
      <div className="text-sm opacity-70">Selecione uma data para ver os horários.</div>
    ) : (
      <div className="flex flex-wrap gap-2">
      {slotsForDay.map((slot) => {
        const takenExact = isSlotBooked(bookings, date, slot);
        const blockedByFullDay = isWeekday && weekdayBlockedByFullDay; // bloqueio total em dias úteis
        const disabled = takenExact || blockedByFullDay;

        return (
          <button
          key={slot}
          type="button"
          onClick={() => handlePickSlot(slot)}
          disabled={disabled}
          aria-pressed={time === slot}
          className={[
            "px-3 py-2 rounded-md border text-sm transition",
            time === slot && !disabled
            ? "bg-white/15 border-white/30"
            : "bg-black/30 border-white/10 hover:bg-white/10",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          ].join(" ")}
          title={
            disabled
            ? isWeekday
            ? "Este dia útil já tem o único horário 18:00 reservado."
            : "Este horário já foi reservado."
            : "Selecionar este horário"
          }
          >
          {slot}
          </button>
        );
      })}
      </div>
    )}

    {/* Alerta de bloqueio por dia útil já tomado */}
    {date && isWeekday && weekdayBlockedByFullDay && (
      <div className="mt-2 text-xs text-red-300">
      Este dia útil já está <strong>indisponível</strong> (o slot único de 18:00 foi reservado).
      </div>
    )}
    </div>

    {/* Botão Confirmar */}
    <div className="flex items-center gap-3">
    <button
    type="button"
    onClick={handleConfirm}
    disabled={!canConfirm()}
    className={[
      "px-4 py-2 rounded-lg border transition",
      canConfirm()
      ? "bg-emerald-500/20 border-emerald-400/30 hover:bg-emerald-500/30"
      : "bg-black/30 border-white/10 opacity-60 cursor-not-allowed",
    ].join(" ")}
    >
    Confirmar pelo WhatsApp
    </button>
    <span className="text-xs opacity-70">
    O contato abre no WhatsApp com mensagem pronta. Não coletamos seu número.
    </span>
    </div>

    {/* Nota de regra final */}
    <div className="pt-3 text-[11px] text-white/50">
    Dias úteis: apenas <strong>18:00</strong> (1 atendimento/dia). Fins de semana: <strong>08:00–18:00</strong>, de hora em hora.
    </div>
    </div>
  );
}

export default AgendaWidget;
