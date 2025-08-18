import React, { useMemo } from "react";

/**
 * components/CalendarMonthly.tsx
 * Calendário mensal 7x6 com:
 *  - Contagem por status (opcional via appointments)
 *  - Dias "marcados" em vermelho (markedDays Set<yyyy-mm-dd>)
 *  - Bloqueio de dias passados via minDate (botão desabilitado)
 *
 * Props:
 * - year, month (0..11)
 * - appointments: Appointment[] (pode ser [])
 * - onSelectDay?: (date: Date | null) => void
 * - markedDays?: Set<string>  // yyyy-mm-dd
 * - minDate?: Date            // dias < minDate ficam bloqueados
 * - className?: string
 */

export type Appointment = {
    id: string;
    name: string;
    phone: string;
    serviceId?: string;
    startsAt: string; // ISO
    notes?: string;
    status: "scheduled" | "confirmed" | "done" | "canceled";
    createdAt: string;
    version: 1;
};

export type CalendarMonthlyProps = {
    year: number;
    month: number; // 0-11
    appointments: Appointment[];
    onSelectDay?: (date: Date | null) => void;
    markedDays?: Set<string>;
    minDate?: Date; // NOVO: bloqueia dias menores que este (ex.: start of today)
    className?: string;
};

export default function CalendarMonthly({
    year,
    month,
    appointments,
    onSelectDay,
    markedDays,
    minDate,
    className,
}: CalendarMonthlyProps) {
    const today = new Date();
    const first = new Date(year, month, 1);

    const { rows, daysMeta } = useMemo(
        () => buildMatrix(year, month, appointments),
                                       [year, month, appointments]
    );

    // normaliza minDate para 00:00 local
    const minDayStart = minDate ? startOfDay(minDate) : null;

    const monthLabel = first.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
    });

    return (
        <section className={"w-full " + (className || "")} aria-label={`Calendário de ${monthLabel}`}>
        <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
        <Legend />
        </header>

        <div className="grid grid-cols-7 select-none text-xs text-muted-foreground">
        {weekdaysPt.map((w) => (
            <div key={w} className="py-1.5 text-center font-medium">
            {w}
            </div>
        ))}
        </div>

        <div role="grid" aria-readonly className="grid grid-cols-7 gap-1">
        {rows.map((row, ri) => (
            <React.Fragment key={ri}>
            {row.map((cell, ci) => {
                if (!cell) {
                    return (
                        <div
                        key={`${ri}-${ci}`}
                        className="h-20 rounded-xl border border-transparent"
                        aria-hidden
                        />
                    );
                }
                const meta = daysMeta.get(cell.day)!;
                const isToday = sameDate(cell.date, today);

                const isoDay = `${year}-${String(month + 1).padStart(2, "0")}-${String(
                    cell.day
                ).padStart(2, "0")}`;
                const isMarked = markedDays?.has(isoDay) ?? false;

                // BLOQUEIO: se minDate informado e a célula < minDate ⇒ disabled
                const isDisabled =
                !!minDayStart && startOfDay(cell.date).getTime() < minDayStart.getTime();

                const aria = buildAria(meta, isToday, isDisabled);

                return (
                    <button
                    key={`${ri}-${ci}`}
                    role="gridcell"
                    aria-label={aria}
                    onClick={() => !isDisabled && onSelectDay?.(cell.date)}
                    disabled={isDisabled}
                    className={[
                        "group h-20 rounded-xl border p-2 text-left outline-none transition",
                        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500",
                        isToday ? "border-indigo-500" : "border-white/10",
                        meta.total > 0 ? "bg-white/5 hover:bg-white/10" : "bg-white/0 hover:bg-white/5",
                        isMarked ? "bg-rose-500/20 border-rose-400 hover:bg-rose-500/30" : "",
                        isDisabled ? "opacity-40 cursor-not-allowed hover:bg-transparent" : "",
                    ].join(" ")}
                    >
                    <div className="flex items-center justify-between">
                    <span
                    className={
                        "text-sm font-medium " + (isToday ? "text-indigo-300" : "text-white/80")
                    }
                    >
                    {cell.day}
                    </span>
                    {meta.total > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-white/70">
                        <Dot className="bg-emerald-400" />
                        {meta.done > 0 ? meta.done : null}
                        <Dot className="bg-sky-400" />
                        {meta.confirmed > 0 ? meta.confirmed : null}
                        <Dot className="bg-amber-300" />
                        {meta.scheduled > 0 ? meta.scheduled : null}
                        <Dot className="bg-rose-400" />
                        {meta.canceled > 0 ? meta.canceled : null}
                        </span>
                    )}
                    </div>
                    {meta.total > 0 && <div className="mt-2 flex flex-wrap gap-1">{renderBadges(meta)}</div>}
                    </button>
                );
            })}
            </React.Fragment>
        ))}
        </div>
        </section>
    );
}

function Legend() {
    return (
        <div className="flex items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1">
        <Dot className="bg-amber-300" />
        Agendado
        </span>
        <span className="inline-flex items-center gap-1">
        <Dot className="bg-sky-400" />
        Confirmado
        </span>
        <span className="inline-flex items-center gap-1">
        <Dot className="bg-emerald-400" />
        Concluído
        </span>
        <span className="inline-flex items-center gap-1">
        <Dot className="bg-rose-400" />
        Cancelado
        </span>
        <span className="inline-flex items-center gap-1">
        <Dot className="bg-white/50" />
        Somente histórico (passado)
        </span>
        </div>
    );
}

function Dot({ className = "" }: { className?: string }) {
    return <span className={"inline-block size-2 rounded-full " + className} />;
}

const weekdaysPt = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function sameDate(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function buildMatrix(year: number, month: number, appts: Appointment[]) {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startWeekday = (first.getDay() + 6) % 7; // segunda=0
    const totalDays = last.getDate();

    const cells: Array<null | { day: number; date: Date }> = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push({ day: d, date: new Date(year, month, d) });
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: Array<typeof cells> = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

    // Metadados por dia (para contagens/legenda)
    const daysMeta = new Map<number, DayMeta>();
    for (let d = 1; d <= totalDays; d++) daysMeta.set(d, emptyDayMeta(new Date(year, month, d)));

    const now = new Date();
    appts.forEach((a) => {
        const d = new Date(a.startsAt);
        if (d.getFullYear() === year && d.getMonth() === month) {
            const key = d.getDate();
            const m = daysMeta.get(key);
            if (!m) return;
            m.total++;
            m.byStatus[a.status] = (m.byStatus[a.status] || 0) + 1;
            if (d < startOfDay(now)) m.isPast = true;
            else m.isFutureOrToday = true;
        }
    });

    return { rows, daysMeta };
}

function startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function emptyDayMeta(date: Date): DayMeta {
    return {
        date,
        total: 0,
        scheduled: 0,
        confirmed: 0,
        done: 0,
        canceled: 0,
        isPast: false,
        isFutureOrToday: false,
        byStatus: { scheduled: 0, confirmed: 0, done: 0, canceled: 0 },
    };
}

type DayMeta = {
    date: Date;
    total: number;
    scheduled: number;
    confirmed: number;
    done: number;
    canceled: number;
    isPast: boolean;
    isFutureOrToday: boolean;
    byStatus: Record<"scheduled" | "confirmed" | "done" | "canceled", number>;
};

function renderBadges(meta: DayMeta): React.ReactElement[] {
    const parts: React.ReactElement[] = [];
    const fmt = (n: number, label: string, color: string, subtle = false) => (
        <span
        key={label}
        className={[
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]",
            subtle ? "bg-white/10 text-white/60" : "text-slate-900",
            subtle ? "" : color,
        ].join(" ")}
        aria-label={`${n} ${label}`}
        >
        <span className="font-semibold">{n}</span>
        <span className="uppercase tracking-wide">{label}</span>
        </span>
    );

    const anyPastOnly = meta.isPast && !meta.isFutureOrToday;
    if (meta.scheduled) parts.push(fmt(meta.scheduled, "Agend.", "bg-amber-300"));
    if (meta.confirmed) parts.push(fmt(meta.confirmed, "Conf.", "bg-sky-400"));
    if (meta.done) parts.push(fmt(meta.done, "Concl.", "bg-emerald-400"));
    if (meta.canceled) parts.push(fmt(meta.canceled, "Canc.", "bg-rose-400"));
    if (meta.total && anyPastOnly) parts.push(fmt(meta.total, "Hist.", "", true));
    return parts;
}

function buildAria(meta: DayMeta, isToday: boolean, isDisabled: boolean) {
    const dateLabel = meta.date.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
    const pieces: string[] = [dateLabel];
    if (isToday) pieces.push("(hoje)");
    if (isDisabled) pieces.push("(indisponível)");
    if (meta.total === 0) pieces.push("sem agendamentos");
    else {
        pieces.push(`${meta.total} agendamento(s)`);
        if (meta.scheduled) pieces.push(`${meta.scheduled} agendado(s)`);
        if (meta.confirmed) pieces.push(`${meta.confirmed} confirmado(s)`);
        if (meta.done) pieces.push(`${meta.done} concluído(s)`);
        if (meta.canceled) pieces.push(`${meta.canceled} cancelado(s)`);
        if (meta.isPast && !meta.isFutureOrToday) pieces.push("(histórico)");
    }
    return pieces.join(", ");
}
