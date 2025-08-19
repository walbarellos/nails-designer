'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type SlotItemObj = { time: string; name?: string };
type SlotsMapV2 = Record<string, SlotItemObj[]>; // { '2025-08-17': [{time:'18:30', name:'Fulana'}] }

type Appt = { date: string; time: string; name?: string };
type DoneAppt = Appt & { doneAt: string }; // histórico de concluídos

const SLOTS_KEY        = 'nails.v1.slots';            // abertos
const SLOTS_DONE_KEY   = 'nails.v1.slots.done';       // concluídos
const SLOT_NAMES_KEY   = 'nails.v1.slots.names';      // mapa opcional de nomes (fallback)
const ADMIN_AUTH_KEY   = 'nails.v1.admin.authed';
const PASSWORD         = '1234';

/** Normaliza estrutura do localStorage: aceita tanto string[] (antigo) quanto {time,name}[] (novo) */
function normalizeSlots(raw: unknown): SlotsMapV2 {
  const result: SlotsMapV2 = {};
  if (!raw || typeof raw !== 'object') return result;
  const obj = raw as Record<string, unknown>;
  for (const [date, arr] of Object.entries(obj)) {
    if (!Array.isArray(arr)) continue;
    const items: SlotItemObj[] = [];
    for (const it of arr) {
      if (typeof it === 'string') {
        items.push({ time: it });
      } else if (it && typeof it === 'object' && 'time' in (it as any)) {
        const t = String((it as any).time);
        const name = (it as any).name ? String((it as any).name) : undefined;
        items.push({ time: t, name });
      }
    }
    // dedup por horário
    const seen = new Set<string>();
    const dedup = items.filter(s => {
      if (seen.has(s.time)) return false;
      seen.add(s.time);
      return true;
    }).sort((a, b) => a.time.localeCompare(b.time));
    if (dedup.length) result[date] = dedup;
  }
  return result;
}

/** Mescla nomes de uma fonte auxiliar (ex.: nails.v1.slots.names) ao mapa de slots aberto. */
function mergeNamesIntoSlots(slots: SlotsMapV2, namesRaw: unknown): SlotsMapV2 {
  if (!namesRaw || typeof namesRaw !== 'object') return slots;
  const out: SlotsMapV2 = JSON.parse(JSON.stringify(slots));

  // Suporta dois formatos comuns:
  // A) { "2025-08-18": { "10:00": "Vânia", "11:00": "Maria" } }
  // B) { "2025-08-18T10:00": "Vânia", "2025-08-18T11:00": "Maria" }
  const obj = namesRaw as Record<string, any>;

  // A) por dia → horários
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const date = k;
      const perTime = v as Record<string, any>;
      if (!out[date]) continue;
      const list = out[date].map(s => {
        const nm = perTime[s.time];
        return nm && !s.name ? { ...s, name: String(nm) } : s;
      });
      out[date] = list;
    }
  }

  // B) chave ISO "YYYY-MM-DDTHH:MM"
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== 'string') continue;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(k)) continue;
    const [date, time] = k.split('T');
    if (!out[date]) continue;
    const list = out[date].map(s => (s.time === time && !s.name ? { ...s, name: v } : s));
    out[date] = list;
  }

  return out;
}

/** Remove um slot por horário e retorna o item removido (para capturar o nome). */
function removeSlotByTime(slots: SlotsMapV2, date: string, time: string): SlotItemObj | undefined {
  const list = slots[date] || [];
  const idx = list.findIndex(s => s.time === time);
  if (idx >= 0) {
    const [removed] = list.splice(idx, 1);
    if (list.length === 0) delete slots[date];
    else slots[date] = [...list].sort((a, b) => a.time.localeCompare(b.time));
    return removed;
  }
  return undefined;
}

/** Insere/atualiza um slot garantindo unicidade por horário (preferindo manter o nome disponível). */
function upsertSlot(slots: SlotsMapV2, date: string, item: SlotItemObj) {
  const list = slots[date] || [];
  const idx = list.findIndex(s => s.time === item.time);
  if (idx >= 0) {
    const prev = list[idx];
    const merged: SlotItemObj = { time: item.time, name: item.name ?? prev.name };
    list[idx] = merged;
  } else {
    list.push(item);
  }
  slots[date] = [...list].sort((a, b) => a.time.localeCompare(b.time));
}

function toBRDateLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}
function isTodayISO(iso: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return iso === today;
}
function isTomorrowISO(iso: string) {
  const now = new Date(); now.setDate(now.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  const tomorrow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return iso === tomorrow;
}
function isWeekendISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  const wd = dt.getDay(); // 0=Dom,6=Sáb
  return wd === 0 || wd === 6;
}

/** CSV completo: abertos + concluídos */
function toCSVAll(open: Appt[], done: DoneAppt[]) {
  const header = 'status,data,horario,nome,concluido_em\n';
  const norm = (s?: string) => (s ? `"${s.replace(/"/g, '""')}"` : '');
  const rowsOpen  = open.map(a => `aberto,${a.date},${a.time},${norm(a.name)},`);
  const rowsDone  = done.map(a => `concluido,${a.date},${a.time},${norm(a.name)},${a.doneAt}`);
  const lines = [...rowsOpen, ...rowsDone]
  .sort((A, B) => {
    // ordenar por data/hora, depois status (aberto primeiro)
    const [ , dA, hA, , ] = A.split(',');
    const [ , dB, hB, , ] = B.split(',');
    const dt = dA.localeCompare(dB);
    if (dt !== 0) return dt;
    const ht = hA.localeCompare(hB);
    if (ht !== 0) return ht;
    return A.startsWith('aberto') ? -1 : 1;
  })
  .join('\n');
  return header + lines + '\n';
}

export default function AdminPage() {
  const router = useRouter();

  // auth + dados
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const [slotsMap, setSlotsMap] = useState<SlotsMapV2>({});  // abertos normalizados (c/ nomes mesclados)
  const [doneList, setDoneList] = useState<DoneAppt[]>([]);  // concluídos
  const [showDone, setShowDone] = useState(true);

  const [activeFilter, setActiveFilter] =
  useState<'all' | 'today' | 'tomorrow' | 'weekend' | { date: string }>('all');

  // carregar do localStorage
  useEffect(() => {
    try { if (localStorage.getItem(ADMIN_AUTH_KEY) === '1') setAuthed(true); } catch {}

    try {
      const raw = localStorage.getItem(SLOTS_KEY);
      let normalized = raw ? normalizeSlots(JSON.parse(raw)) : {};
      // tenta mesclar nomes de um mapa auxiliar, se existir
      try {
        const rawNames = localStorage.getItem(SLOT_NAMES_KEY);
        if (rawNames) normalized = mergeNamesIntoSlots(normalized, JSON.parse(rawNames));
      } catch {}
      setSlotsMap(normalized);
    } catch {}

    try {
      const rawDone = localStorage.getItem(SLOTS_DONE_KEY);
      if (rawDone) {
        const parsed: any[] = JSON.parse(rawDone);
        const safe: DoneAppt[] = Array.isArray(parsed) ? parsed.map((d) => ({
          date: String(d.date),
                                                                            time: String(d.time),
                                                                            name: d.name ? String(d.name) : undefined,
                                                                            doneAt: d.doneAt ? String(d.doneAt) : new Date().toISOString(),
        })) : [];
        setDoneList(
          safe.sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)))
        );
      }
    } catch {}
  }, []);

  // flatten — abertos
  const apptsOpen: Appt[] = useMemo(() => {
    const list: Appt[] = [];
    for (const [date, items] of Object.entries(slotsMap)) {
      for (const it of items) list.push({ date, time: it.time, name: it.name });
    }
    return list.sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
  }, [slotsMap]);

  // concluídos
  const apptsDone: DoneAppt[] = useMemo(
    () => [...doneList]
    .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date))),
                                        [doneList]
  );

  // datas existentes (dos abertos)
  const existingDates = useMemo(() => {
    const uniq = Array.from(new Set(apptsOpen.map(a => a.date)));
    return uniq.sort();
  }, [apptsOpen]);

  // filtros
  const filteredOpen: Appt[] = useMemo(() => {
    const base = apptsOpen;
    if (activeFilter === 'all') return base;
    if (activeFilter === 'today') return base.filter(a => isTodayISO(a.date));
    if (activeFilter === 'tomorrow') return base.filter(a => isTomorrowISO(a.date));
    if (activeFilter === 'weekend') return base.filter(a => isWeekendISO(a.date));
    return base.filter(a => a.date === (typeof activeFilter === 'object' ? activeFilter.date : ''));
  }, [apptsOpen, activeFilter]);

  const filteredDone: DoneAppt[] = useMemo(() => {
    if (!showDone) return [];
    const base = apptsDone;
    if (activeFilter === 'all') return base;
    if (activeFilter === 'today') return base.filter(a => isTodayISO(a.date));
    if (activeFilter === 'tomorrow') return base.filter(a => isTomorrowISO(a.date));
    if (activeFilter === 'weekend') return base.filter(a => isWeekendISO(a.date));
    return base.filter(a => a.date === (typeof activeFilter === 'object' ? activeFilter.date : ''));
  }, [apptsDone, activeFilter, showDone]);

  // agrupamento por dia
  const grouped = useMemo(() => {
    const map: Record<string, { open: Appt[]; done: DoneAppt[] }> = {};
    const push = (k: 'open' | 'done', item: Appt | DoneAppt) => {
      const day = item.date;
      if (!map[day]) map[day] = { open: [], done: [] };
      (map[day] as any)[k].push(item);
    };
    filteredOpen.forEach(a => push('open', a));
    filteredDone.forEach(a => push('done', a));
    return Object.entries(map)
    .sort(([d1], [d2]) => d1.localeCompare(d2));
  }, [filteredOpen, filteredDone]);

  // ===== actions =====
  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (passwordInput === PASSWORD) {
      setAuthed(true);
      try { localStorage.setItem(ADMIN_AUTH_KEY, '1'); } catch {}
    } else {
      alert('Senha inválida.');
    }
  }
  function handleLogout() {
    setAuthed(false);
    try { localStorage.removeItem(ADMIN_AUTH_KEY); } catch {}
  }

  // concluir => move do "aberto" para "concluído", preservando o nome
  function handleComplete(appt: Appt) {
    const next: SlotsMapV2 = JSON.parse(JSON.stringify(slotsMap));
    const removed = removeSlotByTime(next, appt.date, appt.time);
    setSlotsMap(next);
    try { localStorage.setItem(SLOTS_KEY, JSON.stringify(next)); } catch {}

    const add: DoneAppt = {
      date: appt.date,
      time: appt.time,
      name: appt.name ?? removed?.name,
      doneAt: new Date().toISOString(),
    };
    const nextDone = [...doneList, add]
    .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
    setDoneList(nextDone);
    try { localStorage.setItem(SLOTS_DONE_KEY, JSON.stringify(nextDone)); } catch {}
  }

  // reabrir => volta para "abertos" (mantém nome) e remove da lista de concluídos
  function handleReopen(appt: Appt) {
    const next: SlotsMapV2 = JSON.parse(JSON.stringify(slotsMap));
    upsertSlot(next, appt.date, { time: appt.time, name: appt.name });
    setSlotsMap(next);
    try { localStorage.setItem(SLOTS_KEY, JSON.stringify(next)); } catch {}

    const nextDone = doneList.filter(d => !(d.date === appt.date && d.time === appt.time));
    setDoneList(nextDone);
    try { localStorage.setItem(SLOTS_DONE_KEY, JSON.stringify(nextDone)); } catch {}
  }

  // Exporta TUDO (abertos + concluídos) com status e doneAt
  function handleExportCSV() {
    const csv = toCSVAll(filteredOpen, filteredDone);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agendamentos_todos.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ===== UI =====
  return (
    <main className="min-h-[100dvh] grid place-items-center bg-gradient-to-b from-[#0f1215] to-[#060708] text-[#e6e8ea] p-4">
    <section className="w-[min(980px,96vw)] rounded-2xl border border-[#202428] bg-[#0c0e10] sm:bg-[#0c0e10]/90 shadow-[0_40px_160px_rgba(0,0,0,.55),inset_0_0_0_1px_rgba(255,255,255,.03)] p-4">

    {/* NAV */}
    <nav className="mb-3 flex flex-wrap items-center justify-between gap-2">
    <button
    type="button"
    className="rounded-lg border border-[#2a3036] bg-[#12161a] px-3 py-2 text-sm"
    onClick={() => router.push('/')}
    >
    ← Calendário
    </button>

    {authed && (
      <button
      type="button"
      onClick={handleLogout}
      className="rounded-lg border border-[#2a3036] px-3 py-2 text-sm"
      >
      Sair
      </button>
    )}
    </nav>

    <header className="mb-2 flex items-center justify-between">
    <h1 className="m-0 text-lg font-semibold">Painel de Agendamentos</h1>
    </header>

    {!authed ? (
      <form onSubmit={handleLogin} className="grid gap-3 mt-2">
      <label className="grid gap-1 text-sm">
      Senha do painel
      <input
      type="password"
      value={passwordInput}
      onChange={(e) => setPasswordInput(e.target.value)}
      placeholder="••••"
      className="rounded-lg border border-[#242a30] bg-[#0b0d10] px-3 py-3 outline-none text-base"
      autoFocus
      />
      </label>
      <button type="submit" className="rounded-lg bg-[#1f6feb] px-3 py-3 text-white text-base">Entrar</button>
      <p className="opacity-70 text-sm">Dica (dev): senha padrão é <code>1234</code>. Troque antes de publicar.</p>
      </form>
    ) : (
      <>
      {/* Filtros rápidos */}
      <div className="grid gap-3 my-3">
      <div className="flex gap-2 overflow-x-auto pb-0.5" role="tablist" aria-label="Filtros rápidos">
      <Chip label="Todos"    active={activeFilter === 'all'}      onClick={() => setActiveFilter('all')} />
      <Chip label="Hoje"     active={activeFilter === 'today'}    onClick={() => setActiveFilter('today')} />
      <Chip label="Amanhã"   active={activeFilter === 'tomorrow'} onClick={() => setActiveFilter('tomorrow')} />
      <Chip label="FDS"      active={activeFilter === 'weekend'}  onClick={() => setActiveFilter('weekend')} />
      </div>

      {existingDates.length > 0 && (
        <>
        <div className="text-xs opacity-70">Datas com horários abertos</div>
        <div className="flex gap-2 overflow-x-auto py-1" aria-label="Escolha uma data">
        {existingDates.map(d => (
          <Chip
          key={d}
          label={toBRDateLabel(d)}
          active={typeof activeFilter === 'object' && activeFilter.date === d}
          onClick={() => setActiveFilter({ date: d })}
          />
        ))}
        </div>
        </>
      )}

      <div className="flex items-center justify-between gap-3">
      <small className="opacity-70">
      A concluir: {filteredOpen.length} {filteredOpen.length === 1 ? 'agendamento' : 'agendamentos'}
      {showDone && ` · Concluídos: ${filteredDone.length}`}
      </small>

      <div className="flex items-center gap-3">
      <label className="flex items-center gap-2 text-sm">
      <input
      type="checkbox"
      className="accent-[#1f6feb]"
      checked={showDone}
      onChange={(e) => setShowDone(e.target.checked)}
      />
      Mostrar concluídos
      </label>
      <button type="button" onClick={handleExportCSV} className="rounded-lg border border-[#2a3036] bg-[#12161a] px-3 py-2 text-sm">
      Exportar CSV
      </button>
      </div>
      </div>
      </div>

      {/* Lista agrupada por dia */}
      {grouped.length === 0 ? (
        <p className="opacity-75 p-3">Nada por aqui.</p>
      ) : (
        <div className="grid gap-4">
        {grouped.map(([date, buckets]) => (
          <section key={date} className="grid gap-2">
          <h2 className="flex items-center gap-2 text-base font-medium mx-1">
          {toBRDateLabel(date)}
          <span className="text-xs rounded-full border border-[#2a3036] bg-[#0b0d10] px-2 py-0.5 text-[#cfd6dc]">
          {buckets.open.length + buckets.done.length}
          </span>
          </h2>

          {/* A CONCLUIR */}
          {buckets.open.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {buckets.open.map((a, i) => (
              <article key={`o-${a.date}-${a.time}-${i}`} className="rounded-xl border border-white/10 bg-gradient-to-b from-[#0e1114] to-[#0a0c0f] p-3">
              <div className="flex items-baseline justify-between mb-1">
              <div className="text-2xl font-extrabold tracking-tight">{a.time}</div>
              <div className="text-xs text-white/50">{a.date}</div>
              </div>
              <div className="text-sm text-white/80 mb-2">{a.name ? a.name : <span className="opacity-60">—</span>}</div>
              <button
              onClick={() => handleComplete(a)}
              className="w-full rounded-lg border border-rose-700/50 bg-rose-600/15 hover:bg-rose-600/25 px-3 py-2 text-sm text-rose-200"
              >
              Concluir
              </button>
              </article>
            ))}
            </div>
          )}

          {/* CONCLUÍDOS */}
          {showDone && buckets.done.length > 0 && (
            <>
            <div className="text-xs opacity-70 mx-1 mt-1">Concluídos</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {buckets.done.map((a, i) => (
              <article key={`d-${a.date}-${a.time}-${i}`} className="rounded-xl border border-white/10 bg-[#0b0d10] p-3 opacity-85">
              <div className="flex items-baseline justify-between mb-1">
              <div className="text-2xl font-extrabold tracking-tight line-through text-white/60">{a.time}</div>
              <div className="text-xs text-white/40">{a.date}</div>
              </div>
              <div className="text-sm text-white/75 mb-2">{a.name ? a.name : <span className="opacity-50">—</span>}</div>
              <button
              onClick={() => handleReopen(a)}
              className="w-full rounded-lg border border-emerald-700/50 bg-emerald-600/10 hover:bg-emerald-600/20 px-3 py-2 text-sm text-emerald-200"
              >
              Reabrir
              </button>
              </article>
            ))}
            </div>
            </>
          )}
          </section>
        ))}
        </div>
      )}
      </>
    )}
    </section>
    </main>
  );
}

/** Chip tátil / filtro */
function Chip(props: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
    type="button"
    aria-pressed={props.active ? 'true' : 'false'}
    onClick={props.onClick}
    className={[
      'px-3 py-2 rounded-full text-sm whitespace-nowrap',
      props.active ? 'bg-[#183153] border border-[#2f6feb]' : 'bg-[#0b0d10] border border-[#242a30]',
    ].join(' ')}
    >
    {props.label}
    </button>
  );
}
