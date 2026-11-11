import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Bell, Check, CircleX, ExternalLink, SkipForward } from "lucide-react"
import { markSeen, SEEN_NOTICES_KEY, unseenCount } from "../../core/notices"
import { canFail } from "../../core/tasks/agenda"
import type { Task } from "../../core/tasks/task"
import { noteName } from "../../core/text"
import { navigate } from "../../lib/router"
import { vaultRoute } from "../../lib/vault-notes"
import { useTaskActions, type TaskActions } from "../tasks/useTaskActions"
import { useNotices } from "./useNotices"
import "./notices.css"

function readSeen(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_NOTICES_KEY) ?? "[]") as unknown
    return new Set(Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [])
  } catch {
    return new Set()
  }
}

function writeSeen(ids: string[]): void {
  try {
    localStorage.setItem(SEEN_NOTICES_KEY, JSON.stringify(ids))
  } catch {
    /* sem armazenamento: o sino volta a contar ao recarregar */
  }
}

const shortDate = (iso: string) => new Date(`${iso}T12:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
const time = (date: Date) => date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

/**
 * Sino da central de avisos (U45), ao lado do botão de tema: Atrasadas, Vencem hoje e Lembretes, cada tarefa com
 * Concluir, Falhou, Adiar para amanhã e Abrir. O que foi visto fica no aparelho (`runas-codex:avisos-vistos`).
 */
export function NoticeBell() {
  const { notices } = useNotices()
  const actions = useTaskActions()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(readSeen)
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const count = unseenCount(notices, seen)
  const total = notices.atrasadas.length + notices.hoje.length + notices.lembretes.length
  // Dia local (não UTC: à noite no Brasil o UTC já é amanhã).
  const today = useMemo(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }, [notices])

  // Abrir o painel marca tudo o que está nele como visto.
  useEffect(() => {
    if (!open) return
    const ids = markSeen(notices)
    writeSeen(ids)
    setSeen(new Set(ids))
  }, [open, notices])

  useEffect(() => {
    if (!open) return
    panel.current?.focus()
    const onDown = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [open])

  const label = count > 0 ? `Avisos: ${count} ${count === 1 ? "novo" : "novos"}` : "Avisos"
  const go = (path: string) => (setOpen(false), navigate(vaultRoute(path)))
  return (
    <div className="notice-bell" ref={root} onKeyDown={(e) => { if (e.key === "Escape" && open) (e.stopPropagation(), setOpen(false), root.current?.querySelector<HTMLButtonElement>(".notice-trigger")?.focus()) }}>
      <button type="button" className="icon-btn notice-trigger" aria-label={label} title={label} aria-expanded={open} aria-controls={`${id}-painel`} onClick={() => setOpen((v) => !v)}>
        <Bell size={18} />
        {count > 0 && <span className="notice-count" aria-hidden="true">{count > 99 ? "99+" : count}</span>}
      </button>
      {open && (
        <div id={`${id}-painel`} ref={panel} className="notice-panel card" role="dialog" aria-label="Avisos" tabIndex={-1}>
          <header className="notice-head">
            <strong>Avisos</strong>
            <a className="small" href="#/agenda" onClick={() => setOpen(false)}>Abrir a Agenda</a>
          </header>
          {total === 0 && <p className="muted small notice-empty">Nada atrasado, nada vence hoje e nenhum lembrete nas próximas 24 horas.</p>}
          <TaskSection title="Atrasadas" tone="late" tasks={notices.atrasadas} actions={actions} today={today} onOpen={go} />
          <TaskSection title="Vencem hoje" tasks={notices.hoje} actions={actions} today={today} onOpen={go} />
          {notices.lembretes.length > 0 && (
            <section className="notice-section" aria-label="Lembretes">
              <h3>Lembretes</h3>
              <ul>
                {notices.lembretes.map((r) => (
                  <li key={r.id} className={`notice-item ${r.fired ? "" : "upcoming"}`}>
                    <span className="notice-text">
                      <strong>{r.title}</strong>
                      <small>{r.fired ? `Avisou às ${time(r.at)}` : `Avisa às ${time(r.at)}`} · {r.body}</small>
                    </span>
                    <span className="notice-actions">
                      <button type="button" className="icon-btn" aria-label={`Abrir ${r.title}`} title="Abrir" onClick={() => go(r.path)}><ExternalLink size={15} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function TaskSection({ title, tone, tasks, actions, today, onOpen }: { title: string; tone?: "late"; tasks: Task[]; actions: TaskActions; today: string; onOpen(path: string): void }) {
  if (tasks.length === 0) return null
  return (
    <section className={`notice-section ${tone ?? ""}`} aria-label={title}>
      <h3>{title} <span className="count">{tasks.length}</span></h3>
      <ul>
        {tasks.map((task) => (
          <li key={`${task.path}:${task.line}`} className="notice-item">
            <span className="notice-text">
              <strong>{task.description}</strong>
              <small>{task.dueDate ? `Prazo ${shortDate(task.dueDate)} · ` : ""}{noteName(task.path)}</small>
            </span>
            {!actions.readOnly && (
              <span className="notice-actions">
                <button type="button" className="icon-btn" aria-label={`Concluir: ${task.description}`} title="Concluir" onClick={() => void actions.toggle(task)}><Check size={15} /></button>
                {canFail(task, today) && <button type="button" className="icon-btn" aria-label={`Falhou: ${task.description}`} title="Falhou" onClick={() => void actions.fail(task)}><CircleX size={15} /></button>}
                <button type="button" className="icon-btn" aria-label={`Adiar para amanhã: ${task.description}`} title="Adiar para amanhã" onClick={() => void actions.setPostponeDate(task, 1)}><SkipForward size={15} /></button>
                <button type="button" className="icon-btn" aria-label={`Abrir a nota de ${task.description}`} title="Abrir" onClick={() => onOpen(task.path)}><ExternalLink size={15} /></button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
