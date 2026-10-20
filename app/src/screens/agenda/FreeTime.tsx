import { useEffect, useMemo, useState } from "react"
import { Hourglass, Plus, Settings2, Trash2 } from "lucide-react"
import type { AgendaEvent } from "../../core/agenda"
import { formatInterval, formatMinutes, freeDay, hasAvailability, taskTimeBlock, validRange, type FreeDay, type FreeTimePrefs, type TimedTask, type TimeRange } from "../../core/free-time"
import { isDone, type Task } from "../../core/tasks/task"
import { saveFreeTimePrefs } from "../../lib/free-time"
import { Modal, Switch } from "../../components/ui"
import { WEEKDAYS } from "./views"

/** Relógio que anda de minuto em minuto (o "livre restante" e a virada do dia). */
export function useNow(stepMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), stepMs)
    return () => clearInterval(timer)
  }, [stepMs])
  return now
}

/** Resumo curto para a célula do mês e da semana: `6h`, `2h30`, `45min`. */
export function shortMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return h ? `${h}h${m ? String(m).padStart(2, "0") : ""}` : `${m}min`
}

/** Tarefas com horário reservado (`09:00 - 10:30 …`) e uma data (agendada, prazo ou início), ainda por fazer. */
export function timedTasks(tasks: Task[]): TimedTask[] {
  return tasks.flatMap((t) => {
    if (isDone(t)) return []
    const block = taskTimeBlock(t.description)
    const date = t.scheduledDate ?? t.dueDate ?? t.startDate
    return block && date ? [{ date, ...block }] : []
  })
}

/** Calcula (com cache por dia) o tempo livre a partir dos eventos e das tarefas. */
export function useFreeTime(prefs: FreeTimePrefs, events: AgendaEvent[], tasks: Task[], now: number) {
  const blocks = useMemo(() => timedTasks(tasks), [tasks])
  return useMemo(() => {
    const cache = new Map<string, FreeDay>()
    // O minuto atual só muda o "restante" de hoje; o resto do cache vale até os dados mudarem.
    return (date: string): FreeDay | null => {
      if (!hasAvailability(prefs)) return null
      let day = cache.get(date)
      if (!day) {
        day = freeDay(date, prefs, events, blocks, now)
        cache.set(date, day)
      }
      return day
    }
  }, [prefs, events, blocks, now])
}

/** Painel do dia escolhido: total, faixas livres e o que ocupa. */
export function FreeTimePanel({ day, timeZone, onConfigure }: { day: FreeDay | null; timeZone: string; onConfigure(): void }) {
  if (!day)
    return (
      <div className="free-time stack" style={{ gap: 6, marginTop: 10 }}>
        <span className="eyebrow row">
          <Hourglass size={13} /> Tempo livre
        </span>
        <span className="small muted">Defina os horários em que você está disponível para ver o tempo livre de cada dia.</span>
        <button className="btn sm" onClick={onConfigure}>
          <Settings2 size={14} /> Definir horários
        </button>
      </div>
    )
  return (
    <div className="free-time stack" style={{ gap: 6, marginTop: 10 }}>
      <span className="row between">
        <span className="eyebrow row">
          <Hourglass size={13} /> Tempo livre
        </span>
        <button className="icon-btn" title="Horários disponíveis" aria-label="Configurar o tempo livre" onClick={onConfigure}>
          <Settings2 size={15} />
        </button>
      </span>
      {day.unavailable ? (
        <span className="small muted">Nenhum horário disponível neste dia.</span>
      ) : day.freeMinutes === 0 ? (
        <span className="small">Dia todo ocupado.</span>
      ) : (
        <>
          <span className="free-total">
            <strong>{formatMinutes(day.freeMinutes)}</strong> <span className="small muted">livres no dia</span>
          </span>
          {day.remainingMinutes !== null && (
            <span className="small">
              <strong>{formatMinutes(day.remainingMinutes)}</strong> <span className="muted">livres daqui em diante</span>
            </span>
          )}
          <span className="row-wrap free-ranges">
            {day.free.map((i) => (
              <span key={i.start} className="chip green">
                {formatInterval(i, day.date, timeZone)}
              </span>
            ))}
          </span>
        </>
      )}
      {day.busy.length > 0 && (
        <details className="tiny">
          <summary className="faint">O que ocupa ({day.busy.length})</summary>
          <ul className="free-busy">
            {day.busy.map((b, i) => (
              <li key={i}>
                {b.kind === "dia-inteiro" ? "dia inteiro" : formatInterval(b, day.date, timeZone)} · {b.label}
                {b.kind === "tarefa" ? " (tarefa)" : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function RangesEditor({ ranges, onChange, label }: { ranges: TimeRange[]; onChange(next: TimeRange[]): void; label: string }) {
  return (
    <span className="free-ranges-editor">
      {ranges.map((r, i) => (
        <span key={i} className="row free-range">
          <input className="input sm" type="time" value={r.start} aria-label={`${label}: começo da faixa ${i + 1}`} onChange={(e) => onChange(ranges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
          <span className="faint">–</span>
          <input className="input sm" type="time" value={r.end === "24:00" ? "23:59" : r.end} aria-label={`${label}: fim da faixa ${i + 1}`} onChange={(e) => onChange(ranges.map((x, j) => (j === i ? { ...x, end: e.target.value === "23:59" ? "24:00" : e.target.value } : x)))} />
          {!validRange(r) && <span className="tiny danger-text">inválida</span>}
          <button type="button" className="icon-btn" aria-label={`Remover a faixa ${i + 1} de ${label}`} onClick={() => onChange(ranges.filter((_, j) => j !== i))}>
            <Trash2 size={14} />
          </button>
        </span>
      ))}
      <button type="button" className="btn sm ghost" onClick={() => onChange([...ranges, ranges.length ? { start: "14:00", end: "18:00" } : { start: "08:00", end: "12:00" }])}>
        <Plus size={14} /> Faixa
      </button>
    </span>
  )
}

const ZONES: string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf?(key: string): string[] }).supportedValuesOf?.("timeZone") ?? []
  } catch {
    return []
  }
})()

/** Horários disponíveis por dia da semana, exceções, calendários que ocupam, dia inteiro e fuso. */
export function FreeTimeDialog({ vault, prefs, calendars, onClose }: { vault: string | undefined; prefs: FreeTimePrefs; calendars: string[]; onClose(): void }) {
  const [draft, setDraft] = useState(prefs)
  const [newException, setNewException] = useState("")
  const valid = draft.weekly.every((d) => d.every(validRange)) && Object.values(draft.exceptions).every((d) => d.every(validRange))
  const system = Intl.DateTimeFormat().resolvedOptions().timeZone
  return (
    <Modal
      title="Tempo livre"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={!valid} onClick={() => (saveFreeTimePrefs(vault, draft), onClose())}>
            Salvar
          </button>
        </>
      }
    >
      <div className="stack free-time-dialog">
        <p className="small muted">Tempo livre = as faixas em que você está disponível menos o que está marcado. Só informa: nada é movido nem agendado sozinho. Fica guardado neste aparelho.</p>
        <span className="section-title">Disponível em cada dia da semana</span>
        {WEEKDAYS.map((name, i) => (
          <div key={name} className="setting-row free-day-row">
            <span className="small" style={{ fontWeight: 650, minWidth: 40 }}>
              {name}
            </span>
            <RangesEditor label={name} ranges={draft.weekly[i]!} onChange={(next) => setDraft({ ...draft, weekly: draft.weekly.map((d, j) => (j === i ? next : d)) })} />
          </div>
        ))}
        <span className="section-title">Exceções (datas com outros horários)</span>
        {Object.entries(draft.exceptions)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, ranges]) => (
            <div key={date} className="setting-row free-day-row">
              <span className="small" style={{ fontWeight: 650 }}>
                {new Date(`${date}T12:00`).toLocaleDateString("pt-BR")}
              </span>
              <span className="stack" style={{ gap: 4 }}>
                {!ranges.length && <span className="tiny faint">Indisponível o dia todo.</span>}
                <RangesEditor label={date} ranges={ranges} onChange={(next) => setDraft({ ...draft, exceptions: { ...draft.exceptions, [date]: next } })} />
                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => {
                    const next = { ...draft.exceptions }
                    delete next[date]
                    setDraft({ ...draft, exceptions: next })
                  }}
                >
                  Tirar a exceção
                </button>
              </span>
            </div>
          ))}
        <span className="row-wrap">
          <input className="input sm" type="date" value={newException} onChange={(e) => setNewException(e.target.value)} aria-label="Data da exceção" />
          <button type="button" className="btn sm" disabled={!newException || newException in draft.exceptions} onClick={() => (setDraft({ ...draft, exceptions: { ...draft.exceptions, [newException]: [] } }), setNewException(""))}>
            <Plus size={14} /> Exceção
          </button>
        </span>
        <span className="section-title">O que ocupa o tempo</span>
        <div className="stack" style={{ gap: 4 }}>
          <span className="small muted">Calendários (pastas de Agenda/) cujos eventos ocupam o tempo. Nenhum marcado: todos. Um evento marcado “não ocupa o tempo” nunca conta.</span>
          {calendars.map((c) => (
            <label key={c} className="check small">
              <input type="checkbox" checked={draft.calendars.includes(c)} onChange={(e) => setDraft({ ...draft, calendars: e.target.checked ? [...draft.calendars, c] : draft.calendars.filter((x) => x !== c) })} /> {c}
            </label>
          ))}
        </div>
        <div className="setting-row">
          <div>
            <span className="small" style={{ fontWeight: 650 }}>Eventos de dia inteiro</span>
            <span className="tiny faint">Ocupam as faixas do dia, ou são só anotação (feriado, aniversário).</span>
          </div>
          <select className="select sm" value={draft.allDay} onChange={(e) => setDraft({ ...draft, allDay: e.target.value as FreeTimePrefs["allDay"] })} aria-label="Eventos de dia inteiro">
            <option value="block">ocupam o dia</option>
            <option value="ignore">só anotação</option>
          </select>
        </div>
        <div className="setting-row">
          <div>
            <span className="small" style={{ fontWeight: 650 }}>Tarefas com horário ocupam</span>
            <span className="tiny faint">Tarefa com a hora no começo (“- [ ] 09:00 - 10:30 Revisar ⏳ 2026-10-20”, formato do plugin Day Planner). Tarefa só com data não ocupa.</span>
          </div>
          <Switch on={draft.taskBlocks} onChange={(on) => setDraft({ ...draft, taskBlocks: on })} label="Tarefas com horário ocupam" />
        </div>
        <div className="setting-row">
          <div>
            <span className="small" style={{ fontWeight: 650 }}>Fuso horário</span>
            <span className="tiny faint">As horas dos eventos e das faixas valem neste fuso.</span>
          </div>
          <select className="select sm" value={draft.timeZone} onChange={(e) => setDraft({ ...draft, timeZone: e.target.value })} aria-label="Fuso horário" style={{ maxWidth: 220 }}>
            <option value="">O do aparelho ({system})</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  )
}
