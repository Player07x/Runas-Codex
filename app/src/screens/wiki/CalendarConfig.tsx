import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { applyCalendarForm, calendarFormFromYaml, calendarFormProblem, yearDays, type CalendarForm } from "../../core/calendar-form"
import { findCodeBlocks, replaceCodeBlock } from "../../core/codeblocks"
import { noteName } from "../../core/text"
import { href } from "../../lib/router"
import { useVault } from "../../platform/VaultProvider"
import { articleRoute } from "./wiki-state"
import "./calendar-config.css"

const OPEN_KEY = "runas-codex:calendario-configurar"

/** Depois de criar um calendário, a tela dele abre já na aba Configurar (só uma vez). */
export function openConfigureNext(path: string): void {
  try { sessionStorage.setItem(OPEN_KEY, path) } catch { /* sem armazenamento: abre na aba Dia */ }
}

export function takeConfigureRequest(path: string): boolean {
  try {
    if (sessionStorage.getItem(OPEN_KEY) !== path) return false
    sessionStorage.removeItem(OPEN_KEY)
    return true
  } catch {
    return false
  }
}

type Status = { kind: "idle" | "saving" | "saved" } | { kind: "error"; message: string }

/**
 * Aba Configurar do calendário (U35): o mesmo bloco ```runas-calendario``` da nota, num formulário. Cada mudança válida
 * grava sozinha (meio segundo depois da última tecla), com a versão lida da nota; o que o formulário não conhece fica
 * como estava no bloco.
 */
export function CalendarConfig({ path, readOnly }: { path: string; readOnly: boolean }) {
  const vault = useVault()
  const note = vault.index?.note(path)
  const block = note ? findCodeBlocks(note.text, "runas-calendario")[0] : undefined
  const source = block?.content ?? ""
  const [form, setForm] = useState<CalendarForm>(() => calendarFormFromYaml(source))
  const [status, setStatus] = useState<Status>({ kind: "idle" })
  const saved = useRef(source)

  // Mudou fora (no editor ou no Obsidian): o formulário volta a ler o bloco.
  useEffect(() => {
    if (source !== saved.current) {
      saved.current = source
      setForm(calendarFormFromYaml(source))
    }
  }, [source])

  const problem = calendarFormProblem(source, form)
  const next = useMemo(() => (problem ? null : applyCalendarForm(source, form)), [source, form, problem])

  useEffect(() => {
    if (readOnly || !next || !note || !block || next.trimEnd() === source.trimEnd()) return
    const timer = setTimeout(() => {
      setStatus({ kind: "saving" })
      saved.current = next.replace(/\n$/, "")
      vault.save(path, replaceCodeBlock(note.text, block, next))
        .then(() => setStatus({ kind: "saved" }))
        .catch((error: unknown) => setStatus({ kind: "error", message: error instanceof Error ? error.message : String(error) }))
    }, 500)
    return () => clearTimeout(timer)
  }, [next, readOnly])

  if (!note || !block) return <p className="small muted">A nota do calendário não tem o bloco <code>runas-calendario</code>.</p>
  const set = (patch: Partial<CalendarForm>) => setForm((f) => ({ ...f, ...patch }))
  const numbersOnly = form.semana.length > 0 && form.semana.every((d) => /^\d+$/.test(d.trim()))
  const monthNames = form.meses.map((m) => m.nome)

  return (
    <form className="cal-config" onSubmit={(e) => e.preventDefault()} aria-describedby="cal-config-status">
      <fieldset disabled={readOnly}>
        <Field label="Nome"><input className="input" value={form.nome} onChange={(e) => set({ nome: e.target.value })} /></Field>
        <div className="cal-config-pair">
          <Field label="Sigla nas datas" hint="3999-02-12 OC"><input className="input" value={form.sigla} onChange={(e) => set({ sigla: e.target.value })} /></Field>
          <Field label="Depois do ano" hint="4031 C.E."><input className="input" value={form.sufixo} onChange={(e) => set({ sufixo: e.target.value })} /></Field>
        </div>

        <section className="cal-config-section" aria-label="Semana">
          <div className="cal-config-head">
            <strong>Semana</strong>
            <span className="cal-config-seg" role="group" aria-label="Dias da semana">
              <button type="button" aria-pressed={numbersOnly} onClick={() => set({ semana: Array.from({ length: form.semana.length || 7 }, (_, i) => String(i + 1)) })}>Números</button>
              <button type="button" aria-pressed={!numbersOnly} onClick={() => numbersOnly && set({ semana: form.semana.map((_, i) => `Dia ${i + 1}`) })}>Nomes</button>
            </span>
            <label className="cal-config-inline">
              <input className="input" type="number" min={1} max={14} value={form.semana.length} aria-label="Dias na semana"
                onChange={(e) => { const n = Math.max(1, Math.min(14, Number(e.target.value) || 1)); set({ semana: Array.from({ length: n }, (_, i) => form.semana[i] ?? (numbersOnly ? String(i + 1) : `Dia ${i + 1}`)) }) }} /> dias
            </label>
          </div>
          {!numbersOnly && (
            <div className="cal-config-chips">
              {form.semana.map((day, i) => <input key={i} className="input" value={day} aria-label={`Dia ${i + 1} da semana`} onChange={(e) => set({ semana: form.semana.map((d, j) => (j === i ? e.target.value : d)) })} />)}
            </div>
          )}
          <Field label="1/1 do ano 0 cai em">
            <select className="select" value={form.primeiro_dia} onChange={(e) => set({ primeiro_dia: Number(e.target.value) })}>
              {form.semana.map((d, i) => <option key={i} value={i}>{d || `Dia ${i + 1}`}</option>)}
            </select>
          </Field>
        </section>

        <section className="cal-config-section" aria-label="Meses">
          <div className="cal-config-head"><strong>Meses · {form.meses.length}</strong><span className="small muted">{yearDays(form)} dias no ano</span></div>
          <ol className="cal-config-list">
            {form.meses.map((m, i) => (
              <li key={i} className="cal-config-month">
                <input className="input" value={m.nome} aria-label={`Nome do mês ${i + 1}`} onChange={(e) => set({ meses: edit(form.meses, i, { nome: e.target.value }) })} />
                <input className="input cal-config-num" type="number" min={1} value={m.dias} aria-label={`Dias de ${m.nome}`} onChange={(e) => set({ meses: edit(form.meses, i, { dias: Math.max(1, Math.round(Number(e.target.value) || 1)) }) })} />
                <input className="input" value={m.estacao} placeholder="Estação" aria-label={`Estação de ${m.nome}`} onChange={(e) => set({ meses: edit(form.meses, i, { estacao: e.target.value }) })} />
                <label className="cal-config-inline small" title="Dias fora da semana (festivais)"><input type="checkbox" checked={m.intercalar} onChange={(e) => set({ meses: edit(form.meses, i, { intercalar: e.target.checked }) })} /> fora da semana</label>
                <span className="cal-config-actions">
                  <button type="button" className="icon-btn" aria-label={`Subir ${m.nome}`} disabled={i === 0} onClick={() => set({ meses: move(form.meses, i, -1) })}><ArrowUp size={14} /></button>
                  <button type="button" className="icon-btn" aria-label={`Descer ${m.nome}`} disabled={i === form.meses.length - 1} onClick={() => set({ meses: move(form.meses, i, 1) })}><ArrowDown size={14} /></button>
                  <button type="button" className="icon-btn" aria-label={`Tirar ${m.nome}`} disabled={form.meses.length === 1} onClick={() => set({ meses: form.meses.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
                </span>
              </li>
            ))}
          </ol>
          <button type="button" className="btn sm ghost" onClick={() => set({ meses: [...form.meses, { nome: `Mês ${form.meses.length + 1}`, dias: form.meses.at(-1)?.dias ?? 30, estacao: "", intercalar: false }] })}><Plus size={14} /> Mês</button>
        </section>

        <Fold title="Ano bissexto" summary={form.bissexto ? `a cada ${form.bissexto.a_cada} anos` : "nenhum"}>
          <label className="cal-config-inline small"><input type="checkbox" checked={!!form.bissexto} onChange={(e) => set({ bissexto: e.target.checked ? { a_cada: 4, exceto_a_cada: null, salvo_a_cada: null, mes: monthNames[0] ?? "", dias: 1 } : null })} /> Tem ano bissexto</label>
          {form.bissexto && (() => {
            const b = form.bissexto
            const leap = (patch: Partial<typeof b>) => set({ bissexto: { ...b, ...patch } })
            return <div className="cal-config-pair">
              <Field label="A cada (anos)"><input className="input" type="number" min={1} value={b.a_cada} onChange={(e) => leap({ a_cada: Math.max(1, Number(e.target.value) || 1) })} /></Field>
              <Field label="Dias a mais"><input className="input" type="number" min={1} value={b.dias} onChange={(e) => leap({ dias: Math.max(1, Number(e.target.value) || 1) })} /></Field>
              <Field label="No mês"><select className="select" value={b.mes} onChange={(e) => leap({ mes: e.target.value })}>{monthNames.map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
              <Field label="Exceto a cada" hint="vazio: sem exceção"><input className="input" type="number" min={1} value={b.exceto_a_cada ?? ""} onChange={(e) => leap({ exceto_a_cada: e.target.value ? Number(e.target.value) : null })} /></Field>
              <Field label="Salvo a cada"><input className="input" type="number" min={1} value={b.salvo_a_cada ?? ""} onChange={(e) => leap({ salvo_a_cada: e.target.value ? Number(e.target.value) : null })} /></Field>
            </div>
          })()}
        </Fold>

        <Rows title="Luas" items={form.luas} onChange={(luas) => set({ luas })} blank={{ nome: `Lua ${form.luas.length + 1}`, ciclo: 28, cheia_em: "0000-01-01", cor: "" }}
          render={(m, edit) => <>
            <input className="input" value={m.nome} aria-label="Nome da lua" onChange={(e) => edit({ nome: e.target.value })} />
            <input className="input cal-config-num" type="number" min={1} value={m.ciclo} aria-label={`Ciclo de ${m.nome} em dias`} title="Ciclo em dias" onChange={(e) => edit({ ciclo: Math.max(1, Number(e.target.value) || 1) })} />
            <input className="input" value={m.cheia_em} aria-label={`Uma lua cheia de ${m.nome} (ANO-MM-DD)`} placeholder="Cheia em ANO-MM-DD" onChange={(e) => edit({ cheia_em: e.target.value })} />
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(m.cor) ? m.cor : "#bec6ff"} aria-label={`Cor de ${m.nome}`} onChange={(e) => edit({ cor: e.target.value })} />
          </>} />
        <Rows title="Eras" items={form.eras} onChange={(eras) => set({ eras })} blank={{ nome: "Nova era", sigla: "", inicio: 0 }}
          render={(era, edit) => <>
            <input className="input" value={era.nome} aria-label="Nome da era" onChange={(e) => edit({ nome: e.target.value })} />
            <input className="input" value={era.sigla} aria-label={`Sigla de ${era.nome}`} placeholder="Sigla" onChange={(e) => edit({ sigla: e.target.value })} />
            <input className="input cal-config-num" type="number" value={era.inicio} aria-label={`Ano em que ${era.nome} começa`} title="Começa no ano" onChange={(e) => edit({ inicio: Math.round(Number(e.target.value) || 0) })} />
          </>} />
        <Rows title="Feriados" items={form.feriados} onChange={(feriados) => set({ feriados })} blank={{ nome: "Feriado", data: "01-01", cor: "" }}
          render={(h, edit) => <>
            <input className="input" value={h.nome} aria-label="Nome do feriado" onChange={(e) => edit({ nome: e.target.value })} />
            <input className="input" value={h.data} aria-label={`Data de ${h.nome}: MM-DD todo ano, ou ANO-MM-DD uma vez`} title="MM-DD (todo ano) ou ANO-MM-DD (uma vez)" onChange={(e) => edit({ data: e.target.value })} />
          </>} />

        <Fold title="Relógio" summary={form.relogio ? `${form.relogio.horas} h · ${form.relogio.periodos.join(" e ")}` : "sem relógio"}>
          <label className="cal-config-inline small"><input type="checkbox" checked={!!form.relogio} onChange={(e) => set({ relogio: e.target.checked ? { horas: 12, minutos: 60, periodos: ["Dia", "Noite"] } : null })} /> Mostrar a hora do mundo</label>
          {form.relogio && (() => {
            const c = form.relogio
            return <div className="cal-config-pair">
              <Field label="Horas por período"><input className="input" type="number" min={1} max={99} value={c.horas} onChange={(e) => set({ relogio: { ...c, horas: Math.max(1, Math.min(99, Number(e.target.value) || 1)) } })} /></Field>
              <Field label="Minutos por hora"><input className="input" type="number" min={1} max={99} value={c.minutos} onChange={(e) => set({ relogio: { ...c, minutos: Math.max(1, Math.min(99, Number(e.target.value) || 1)) } })} /></Field>
              <Field label="Períodos" hint="separados por vírgula"><input className="input" value={c.periodos.join(", ")} onChange={(e) => set({ relogio: { ...c, periodos: e.target.value.split(",").map((p) => p.trimStart()) } })} /></Field>
            </div>
          })()}
        </Fold>
      </fieldset>

      <p id="cal-config-status" className={`small ${problem || status.kind === "error" ? "cal-config-error" : "muted"}`} role="status">
        {readOnly ? "Cofre em somente leitura." : problem ? `Não salvo: ${problem}` : status.kind === "error" ? `Não salvo: ${status.message}` : status.kind === "saving" ? "Salvando…" : `Salvo no bloco da nota “${noteName(path)}”.`}{" "}
        <a href={href(articleRoute(path))}>Ver o código</a>
      </p>
    </form>
  )
}

function edit<T>(items: T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, i) => (i === index ? { ...item, ...patch } : item))
}

function move<T>(items: T[], index: number, by: number): T[] {
  const next = [...items]
  const [item] = next.splice(index, 1)
  next.splice(index + by, 0, item!)
  return next
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field cal-config-field"><span>{label}</span>{children}{hint && <small className="faint">{hint}</small>}</label>
}

function Fold({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  return <details className="cal-config-fold"><summary><strong>{title}</strong><span className="small muted">{summary}</span></summary><div className="cal-config-fold-body">{children}</div></details>
}

function Rows<T>({ title, items, onChange, blank, render }: { title: string; items: T[]; onChange(items: T[]): void; blank: T; render(item: T, edit: (patch: Partial<T>) => void): ReactNode }) {
  return (
    <Fold title={title} summary={String(items.length)}>
      <ul className="cal-config-list">
        {items.map((item, i) => (
          <li key={i} className="cal-config-row">
            {render(item, (patch) => onChange(edit(items, i, patch)))}
            <button type="button" className="icon-btn" aria-label={`Tirar item ${i + 1} de ${title}`} onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn sm ghost" onClick={() => onChange([...items, blank])}><Plus size={14} /> {title.replace(/s$/, "")}</button>
    </Fold>
  )
}
