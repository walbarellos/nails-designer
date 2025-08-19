// lib/timeSlots.ts
export function pad2(n: number) {
    return String(n).padStart(2, "0");
}

export function isWeekendDate(d: Date) {
    const wd = d.getDay(); // Dom=0, Sáb=6
    return wd === 0 || wd === 6;
}

/** Horários permitidos por regra global */
export function getSlotsForDate(date: Date): string[] {
    if (!isWeekendDate(date)) {
        // Dias úteis: apenas 18:00
        return ["18:00"];
    }
    // Fins de semana: 08:00..18:00, passo 1h
    const out: string[] = [];
    for (let h = 8; h <= 18; h++) out.push(`${pad2(h)}:00`);
    return out;
}

/** Filtro de segurança: limpa qualquer slot fora das regras para a data */
export function filterSlotsForDate(slots: string[], date: Date): string[] {
    if (!isWeekendDate(date)) return ["18:00"];
    const ok = slots.filter((s) => /^(\d{2}):00$/.test(s) && +s.slice(0, 2) >= 8 && +s.slice(0, 2) <= 18);
    return ok.length ? Array.from(new Set(ok)).sort() : getSlotsForDate(date);
}

/** Valida se um HH:mm está dentro da regra global para a data */
export function isAllowedSlot(hhmm: string, date: Date): boolean {
    return filterSlotsForDate([hhmm], date).length === 1;
}
