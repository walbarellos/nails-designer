import React, { useMemo } from "react";

/**
 * components/CalendarMonthly.tsx
 * slotsByDay?: Record<"yyyy-mm-dd", number>  // qte de horários reservados no dia
 */

export type Appointment = {
    id: string;
    name: string;
    phone: string;
    startsAt: string;
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
    minDate?: Date;
    className?: string;
    slotsByDay?: Record<string, number>;
    showLegend?: boolean;
};

export default function CalendarMonthly({
    year,
    month,
    appointments,
    onSelectDay,
    markedDays,
    minDate,
    className,
    slotsByDay,
    showLegend = true,
}: CalendarMonthlyProps) {
    const today = new Date();
    const todayStart = startOfDay(today);
    const first = new Date(year, month, 1);

    const { rows, daysMeta } = useMemo(
        () => buildMatrix(year, month, appointments),
                                       [year, month, appointments]
    );

    const minDayStart = minDate ? startOfDay(minDate) : null;
    const monthLabel = first.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
    });

    return (
        <section
        className={"w-full " + (className || "")}
        aria-label={`Calendário de ${monthLabel}`}
        >
        <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
        {showLegend && <Legend />}
        </header>

        {/* cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 select-none text-xs text-white/60">
        {weekdaysPt.map((w) => (
            <div key={w} className="py-1.5 text-center font-medium">
            {w}
            </div>
        ))}
        </div>

        {/* grade de dias */}
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
                const takenCount = slotsByDay?.[isoDay] ?? 0;

                // tempo
                const dateStart = startOfDay(cell.date);
                const isPast = dateStart.getTime() < todayStart.getTime();

                // regras visuais
                const dow = cell.date.getDay(); // 0=Dom, 6=Sáb
                const isWeekday = dow >= 1 && dow <= 5;
                const isWeekend = !isWeekday;

                const weekdayFull = isWeekday && takenCount >= 1;   // 18:30 tomado
                const weekdayFree = isWeekday && takenCount === 0;  // 18:30 livre
                const weekendFree = isWeekend && takenCount === 0;  // FDS sem reservas

                // verde só em dias FUTUROS e livres
                const showGreen = !isPast && (weekdayFree || weekendFree);

                // desabilitar clique para antes do minDate (normalmente hoje)
                const isDisabled =
                !!minDayStart &&
                startOfDay(cell.date).getTime() < minDayStart.getTime();

                const aria = buildAria(meta, isToday, isDisabled, takenCount);

                return (
                    <button
                    key={`${ri}-${ci}`}
                    role="gridcell"
                    aria-label={aria}
                    onClick={() => !isDisabled && onSelectDay?.(cell.date)}
                    disabled={isDisabled}
                    className={[
                        "group relative h-20 rounded-xl border p-2 text-left outline-none transition",
                        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500",
                        isToday ? "border-indigo-500" : "border-white/10",
                        takenCount > 0
                        ? "bg-white/5 hover:bg-white/10"
                        : "bg-white/0 hover:bg-white/5",
                        isMarked
                        ? "bg-rose-500/20 border-rose-400 hover:bg-rose-500/30"
                        : "",
                        // NÃO usar opacity no passado (isso apagava o X)
                        isDisabled ? "cursor-not-allowed" : "",
                        // destaques
                        weekdayFull ? "day-full" : "",
                        showGreen ? "day-available" : "",
                    ].join(" ")}
                    >
                    {/* X vermelho quando dia útil está lotado (passado ou futuro) */}
                    {weekdayFull && (
                        <span
                        aria-hidden
                        className="absolute right-1.5 top-1.5 text-rose-400 font-bold leading-none"
                        >
                        ✕
                        </span>
                    )}

                    <div className="flex items-center justify-between">
                    <span
                    className={
                        "text-sm font-medium " +
                        (isToday
                        ? "text-indigo-300"
                        : isDisabled
                        ? "text-white/40"
                        : "text-white/80")
                    }
                    >
                    {cell.day}
                    </span>

                    {/* contador vermelho de reservas (principalmente útil no FDS) */}
                    {takenCount > 0 && (
                        <span
                        className="rounded-full bg-rose-500/80 px-2 py-0.5 text-[10px] font-semibold text-white"
                        aria-label={`${takenCount} reserva(s)`}
                        title={`${takenCount} reserva(s)`}
                        >
                        {takenCount}
                        </span>
                    )}
                    </div>
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
        <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
        Dia útil → único horário <strong>18:30</strong>
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
        Fim de semana → horários variados
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
        Borda verde = dia livre (futuro)
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
        Círculo vermelho = nº de reservas do dia
        </span>
        </div>
    );
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
    for (let d = 1; d <= totalDays; d++)
        cells.push({ day: d, date: new Date(year, month, d) });
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: Array<typeof cells> = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

    const daysMeta = new Map<number, DayMeta>();
    for (let d = 1; d <= totalDays; d++)
        daysMeta.set(d, emptyDayMeta(new Date(year, month, d)));

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

function buildAria(
    meta: DayMeta,
    isToday: boolean,
    isDisabled: boolean,
    takenCount: number
) {
    const dateLabel = meta.date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    const wd = meta.date.getDay(); // 0=Dom, 6=Sáb
    const isWeekday = wd >= 1 && wd <= 5;

    const pieces: string[] = [dateLabel];

    if (isToday) pieces.push("(hoje)");

    pieces.push(
        isWeekday ? "dia útil: único horário 18:30" : "fim de semana: horários variados"
    );

    if (isDisabled) {
        pieces.push("(indisponível)");
    } else {
        if (isWeekday && takenCount >= 1) {
            pieces.push("(indisponível — 18:30 já reservado)");
        } else {
            pieces.push(takenCount > 0 ? `${takenCount} reserva(s)` : "sem reservas");
        }
    }

    return pieces.join(", ");
}
