import { ResizablePanel } from "../../components/ResizablePanel"
import { CampaignRoomTools } from "../campaigns/CampaignRoomTools"
import { useEffect, useMemo, useRef, useState } from "react"
import { Bell, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Clock, Columns3, Download, FileText, List, MapPin, Pencil, Plus, Repeat, ScrollText, SkipForward, Trash2, Upload } from "lucide-react"
import { AGENDA_ROOT, eventFileName, eventNote, eventNotes, expandEvents, exportIcs, importIcs, isoDate, updateEventNote, type AgendaEvent, type EventInput, type Occurrence } from "../../core/agenda"
import { isDone, parseContext, parseTaskLine, type Task } from "../../core/tasks/task"
import { checkboxLines } from "../../markdown/task-checkboxes"
import { TaskRow } from "../../components/tasks/TaskRow"
import { TaskEditDialog } from "../../components/tasks/TaskEditDialog"
import { useTaskActions, type TaskActions } from "../../components/tasks/useTaskActions"
import { vaultTasks } from "../../lib/tasks"
import { useNotesLock } from "../../lib/notes-lock"
import "../../components/tasks/tasks.css"
import { useFreeTimePrefs } from "../../lib/free-time"
import { FreeTimeDialog, FreeTimePanel, shortMinutes, useFreeTime, useNow } from "./FreeTime"
import { dirname, joinPath, noteName } from "../../core/text"
import type { VaultIndex } from "../../core/vault-index"
import { agendaEvents } from "../../lib/agenda-data"
import { navigate } from "../../lib/router"
import { vaultRoute } from "../../lib/vault-notes"
import { Empty, Modal, Segmented, useToast } from "../../components/ui"
import { ConfirmDialog } from "../../components/vault/dialogs"
import { useVault } from "../../platform/VaultProvider"
import { exactAlarmsAllowed, isAndroidApp, openExactAlarmSettings } from "../../platform/reminders"
import { EventDialog } from "./EventDialog"
import { addDays, eventColor, hhmm, ListView, MonthView, onDay, sameDay, startOfDay, TimeGrid } from "./views"
import "../agenda.css"
import { useCreateRequest } from "../../lib/create-request"

type View = "mes" | "semana" | "dia" | "lista"
const VIEW_KEY = "runas-codex:agenda-visao"
const LIST_DAYS = 60

function savedView(): View {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return v === "semana" || v === "dia" || v === "lista" ? v : "mes"
  } catch {
    return "mes"
  }
}

export function AgendaScreen() {
  const vault = useVault()
  if (vault.loading && !vault.index) return <div className="page"><p className="muted">Abrindo o cofre…</p></div>
  if (!vault.index) {
    return (
      <div className="page">
        <Empty title="Nenhum cofre aberto">A agenda guarda cada evento como uma nota em Agenda/ do cofre. Abra ou crie um cofre em Configurações.</Empty>
      </div>
    )
  }
  return <AgendaView index={vault.index} />
}

function describeRepeat(event: AgendaEvent): string | null {
  const { repeat } = event
  if (repeat.kind === "none") return null
  if (repeat.kind === "weekly") return `Toda semana: ${repeat.days.map((d) => ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][d]).join(", ")}${event.until ? ` até ${new Date(`${event.until}T12:00`).toLocaleDateString("pt-BR")}` : ""}`
  const rule = repeat.rule
  if (/^FREQ=WEEKLY;INTERVAL=2(;|$)/.test(rule)) return "A cada 2 semanas"
  if (/^FREQ=MONTHLY(;UNTIL|$)/.test(rule)) return "Todo mês"
  if (/^FREQ=YEARLY(;UNTIL|$)/.test(rule)) return "Todo ano"
  return `Regra: ${rule}`
}

const reminderText = (minutes: number) => (minutes === 0 ? "na hora" : minutes % 1440 === 0 ? `${minutes / 1440} dia(s) antes` : minutes % 60 === 0 ? `${minutes / 60} h antes` : `${minutes} min antes`)

function AgendaView({ index }: { index: VaultIndex }) {
  const vault = useVault()
  const toast = useToast()
  const readOnly = vault.info?.readOnly ?? true
  const [poll,setPoll]=useState(false)
  const [view, setViewState] = useState<View>(savedView)
  // Anda de minuto em minuto: o "livre restante" e a virada do dia (hoje muda à meia-noite).
  const now = useNow()
  const todayKey = isoDate(new Date(now))
  const today = useMemo(() => startOfDay(new Date(`${todayKey}T00:00`)), [todayKey])
  const [cursor, setCursor] = useState(today)
  const [selectedDay, setSelectedDay] = useState(today)
  const [selectedKey, setSelectedKey] = useState<string>()
  const [dialog, setDialog] = useState<{ kind: "new"; day: Date; time?: string } | { kind: "edit"; event: AgendaEvent } | { kind: "delete"; event: AgendaEvent } | { kind: "import"; events: EventInput[] } | null>(null)
  const [exactAlarms, setExactAlarms] = useState(true)
  const [permission, setPermission] = useState(() => (typeof Notification !== "undefined" ? Notification.permission : "granted"))
  const fileInput = useRef<HTMLInputElement>(null)
  const fail = (error: unknown) => toast(error instanceof Error ? error.message : String(error))

  const setView = (next: View) => {
    setViewState(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* só não é lembrado */
    }
  }

  useEffect(() => {
    void exactAlarmsAllowed().then(setExactAlarms)
  }, [])

  const events = useMemo(() => agendaEvents(index), [index, vault.version])
  // Tarefas do plugin Tasks (com o filtro global e as opções do cofre); as do espaço Notas somem com o PIN bloqueado.
  const actions = useTaskActions()
  const { locked } = useNotesLock()
  const allTasks = useMemo(() => vaultTasks(index, actions.settings, { notesLocked: locked }), [index, vault.version, actions.settings, locked])
  const tasks = useMemo(() => allTasks.filter((t) => !isDone(t) && t.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!) || a.description.localeCompare(b.description, "pt-BR")), [allTasks])
  const todayIso = isoDate(today)
  const freePrefs = useFreeTimePrefs(vault.info?.path)
  const [freeDialog, setFreeDialog] = useState(false)
  const freeOf = useFreeTime(freePrefs, events, allTasks, now)
  const freeLabel = (day: Date) => {
    const f = freeOf(isoDate(day))
    return f && !f.unavailable ? shortMinutes(f.freeMinutes) : null
  }
  const calendars = useMemo(() => [...new Set(events.map((e) => dirname(e.path)))].sort((a, b) => a.localeCompare(b, "pt-BR")), [events])

  // Intervalo visível de cada visão.
  const range = useMemo(() => {
    if (view === "mes") {
      const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
      const start = addDays(first, -first.getDay())
      return { start, end: addDays(start, 42) }
    }
    if (view === "semana") {
      const start = addDays(cursor, -cursor.getDay())
      return { start, end: addDays(start, 7) }
    }
    if (view === "dia") return { start: cursor, end: addDays(cursor, 1) }
    return { start: cursor, end: addDays(cursor, LIST_DAYS) }
  }, [view, cursor])
  const occurrences = useMemo(() => expandEvents(events, range.start, range.end), [events, range])
  const selected = useMemo(() => {
    if (!selectedKey) return undefined
    const found = occurrences.find((o) => o.key === selectedKey)
    if (found) return found
    // Ocorrência fora do intervalo visível (depois de navegar): procura de novo pelo dia.
    const [path, day] = selectedKey.split("@") as [string, string]
    const event = events.find((e) => e.path === path)
    return event ? expandEvents([event], new Date(`${day}T00:00`), addDays(new Date(`${day}T00:00`), 1)).find((o) => o.key === selectedKey) : undefined
  }, [selectedKey, occurrences, events])

  const move = (direction: -1 | 1) => {
    if (view === "mes") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1))
    else if (view === "semana") setCursor(addDays(cursor, 7 * direction))
    else if (view === "dia") setCursor(addDays(cursor, direction))
    else setCursor(addDays(cursor, LIST_DAYS * direction))
  }
  const title =
    view === "mes" ? cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : view === "semana" ? `${range.start.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} – ${addDays(range.end, -1).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}`
    : view === "dia" ? cursor.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    : `A partir de ${cursor.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`

  const pickDay = (day: Date) => {
    setSelectedDay(day)
    setSelectedKey(undefined)
  }
  const pick = (o: Occurrence) => {
    setSelectedKey(o.key)
    setSelectedDay(startOfDay(o.start))
  }
  const create = (day: Date, time?: string) => {
    if (readOnly) return toast("Cofre em somente leitura: libere a gravação em Configurações para criar eventos.")
    setDialog({ kind: "new", day, time })
  }

  // Pastas de sessões: Campanhas/<campanha>/Sessões (ou a pasta da campanha).
  const campaignFolders = useMemo(() => {
    const folders = new Set(index.allFiles().map((f) => dirname(f.path)).filter((f) => /^Campanhas\/[^/]+(\/Sess[õo]es)?$/.test(f)))
    return [...folders].sort((a, b) => a.localeCompare(b, "pt-BR")).map((folder) => ({ folder, label: folder.replace(/^Campanhas\//, "") }))
  }, [index, vault.version])
  const sessionNotes = useMemo(() => index.notesIn("Campanhas/").map((n) => n.path), [index, vault.version])

  const uniqueName = (folder: string, base: string) => {
    const taken = new Set(index.allFiles().filter((f) => dirname(f.path) === folder).map((f) => noteName(f.path).toLocaleLowerCase("pt-BR")))
    for (let n = 1; ; n++) {
      const name = n > 1 ? `${base} ${n}` : base
      if (!taken.has(name.toLocaleLowerCase("pt-BR"))) return name
    }
  }

  const saveEvent = async (input: EventInput, createSessionIn: string | null, editing?: AgendaEvent) => {
    let eventInput = input
    const folder = AGENDA_ROOT.replace(/\/$/, "")
    const name = editing ? noteName(editing.path) : uniqueName(folder, eventFileName(input))
    const eventPath = editing?.path ?? joinPath(folder, `${name}.md`)!
    if (createSessionIn) {
      // A nota da sessão aponta para o evento, e o evento para ela.
      const sessionName = uniqueName(createSessionIn, input.title.replace(/[[\]#^|\\/:*?"<>]/g, "-"))
      const sessionText = `---\ndata: "${input.date}"\nevento: "[[${eventPath.replace(/\.md$/, "")}]]"\n---\n# ${input.title}\n\n## Preparação\n\n## O que aconteceu\n`
      const sessionPath = await vault.createNote(createSessionIn, sessionName, sessionText)
      eventInput = { ...input, session: sessionPath.replace(/\.md$/, "") }
    }
    if (editing) {
      const note = index.note(editing.path)
      if (!note) throw new Error("A nota do evento não está mais no cofre.")
      await vault.save(editing.path, updateEventNote(note.text, eventInput))
      toast("Evento atualizado")
    } else {
      const created = await vault.createNote(folder, name, eventNote(eventInput))
      setSelectedKey(`${created}@${input.date}`)
      setSelectedDay(new Date(`${input.date}T00:00`))
      toast("Evento criado")
    }
  }

  const skipDate = async (occurrence: Occurrence) => {
    const { event } = occurrence
    const note = index.note(event.path)
    if (!note) return
    const day = isoDate(occurrence.start)
    // O Full Calendar só pula datas em regras RRULE: a semanal vira a regra equivalente.
    const repeat =
      event.repeat.kind === "weekly"
        ? { kind: "rrule" as const, rule: `FREQ=WEEKLY;BYDAY=${event.repeat.days.map((d) => ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][d]).join(",")}${event.until ? `;UNTIL=${event.until.replace(/-/g, "")}` : ""}` }
        : event.repeat
    const { path, ...rest } = event
    void path
    await vault.save(event.path, updateEventNote(note.text, { ...rest, repeat, skipDates: [...new Set([...event.skipDates, day])].sort() }))
    setSelectedKey(undefined)
    toast(`Pulado: ${new Date(`${day}T12:00`).toLocaleDateString("pt-BR")}`)
  }

  const exportAll = async () => {
    const ics = exportIcs(events.map((event) => ({ event, notes: eventNotes(index.note(event.path)?.text ?? "") })))
    const saved = await vault.platform.saveFile("agenda.ics", ics, "text/calendar")
    if (saved) toast(`${events.length} evento(s) exportado(s)`)
  }

  const importFile = async (file: File) => {
    const parsed = importIcs(await file.text())
    if (!parsed.length) return toast("Nenhum evento no arquivo.")
    setDialog({ kind: "import", events: parsed })
  }

  const runImport = async (list: EventInput[]) => {
    const folder = `${AGENDA_ROOT}Importados`
    for (const input of list) await vault.createNote(folder, uniqueName(folder, eventFileName(input)), eventNote(input))
    toast(`${list.length} evento(s) importado(s) em ${folder}/`)
  }

  const dayList = onDay(occurrences.length ? expandEvents(events, startOfDay(selectedDay), addDays(selectedDay, 1)) : [], selectedDay)

  // “+ Novo › Evento na Agenda”: o mesmo diálogo do botão Evento, no dia escolhido.
  useCreateRequest("evento", () => { if (!readOnly) create(selectedDay) })
  return (
    <div className="page agenda">
      {poll&&<Modal title="Enquete de data pela sala" onClose={()=>setPoll(false)} wide><CampaignRoomTools campaign="Agenda" root="Agenda/" readOnly={readOnly} onlyPoll/></Modal>}
      <div className="page-head">
        <div>
          <span className="eyebrow">Agenda · {events.length} evento(s) em Agenda/</span>
          <h1 className="page-title agenda-title">{title}</h1>
        </div>
        <div className="row-wrap">
          <button className="btn" onClick={()=>setPoll(true)}>Enquete de data</button>
          <div className="row" style={{ gap: 2 }}>
            <button className="icon-btn" aria-label="Anterior" onClick={() => move(-1)}>
              <ChevronLeft size={18} />
            </button>
            <button className="btn sm" onClick={() => (setCursor(today), pickDay(today))}>
              Hoje
            </button>
            <button className="icon-btn" aria-label="Próximo" onClick={() => move(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
          <Segmented<View>
            label="Visão"
            value={view}
            onChange={setView}
            options={[
              { value: "mes", label: "Mês", icon: <CalendarDays size={14} /> },
              { value: "semana", label: "Semana", icon: <Columns3 size={14} /> },
              { value: "dia", label: "Dia", icon: <CalendarRange size={14} /> },
              { value: "lista", label: "Lista", icon: <List size={14} /> },
            ]}
          />
          <button className="btn primary" onClick={() => create(selectedDay)} disabled={readOnly} title={readOnly ? "Cofre em somente leitura" : "Novo evento"} aria-label="Novo evento">
            <Plus size={16} /> Evento
          </button>
        </div>
      </div>

      <div className="agenda-layout">
        <div className="card flat agenda-main">
          {view === "mes" && <MonthView month={cursor} occurrences={occurrences} today={today} selectedDay={selectedDay} selectedKey={selectedKey} onPickDay={pickDay} onPick={pick} onCreate={create} freeLabel={freeLabel} />}
          {(view === "semana" || view === "dia") && (
            <TimeGrid
              days={view === "dia" ? [cursor] : Array.from({ length: 7 }, (_, i) => addDays(range.start, i))}
              occurrences={occurrences}
              today={today}
              selectedDay={selectedDay}
              selectedKey={selectedKey}
              onPickDay={(day) => (setCursor(day), setView("dia"), pickDay(day))}
              onPick={pick}
              onCreate={create}
              freeLabel={freeLabel}
            />
          )}
          {view === "lista" && <ListView from={cursor} occurrences={occurrences} selectedKey={selectedKey} onPick={pick} />}
        </div>

        <ResizablePanel id="agenda" label="Detalhes da agenda" side="right" width={320} className="stack-lg agenda-side">
          {selected ? (
            <EventDetail
              occurrence={selected}
              index={index}
              readOnly={readOnly}
              onEdit={() => setDialog({ kind: "edit", event: selected.event })}
              onDelete={() => setDialog({ kind: "delete", event: selected.event })}
              onSkip={() => void skipDate(selected).catch(fail)}
              actions={actions}
              today={todayIso}
              onClose={() => setSelectedKey(undefined)}
            />
          ) : (
            <section className="card">
              <span className="eyebrow">{selectedDay.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
              <div className="list" style={{ marginTop: 8 }}>
                {dayList.length === 0 && <span className="muted small">Nada marcado.</span>}
                {dayList.map((o) => (
                  <button key={o.key} className="list-item" onClick={() => pick(o)}>
                    <span className="dot" style={{ background: eventColor(o.event) }} />
                    <span className="grow truncate">{o.event.title}</span>
                    <span className="meta">{o.event.allDay ? "dia todo" : hhmm(o.start)}</span>
                  </button>
                ))}
              </div>
              {!readOnly && (
                <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => create(selectedDay)}>
                  <Plus size={14} /> Evento neste dia
                </button>
              )}
              <FreeTimePanel day={freeOf(isoDate(selectedDay))} timeZone={freePrefs.timeZone} onConfigure={() => setFreeDialog(true)} />
              <DayTasks tasks={allTasks} day={isoDate(selectedDay)} actions={actions} today={todayIso} />
            </section>
          )}

          <section className="card">
            <span className="section-title">Tarefas com prazo</span>
            <ul className="task-list" style={{ marginTop: 8 }}>
              {tasks.length === 0 && <li className="muted small">Nenhuma tarefa por fazer com 📅 nas notas.</li>}
              {tasks.slice(0, 12).map((t) => (
                <TaskRow key={`${t.path}:${t.line}`} task={t} actions={actions} options={{ today: todayIso, hidden: new Set(["urgency", "created date", "done date", "cancelled date", "id", "depends on"]) }} />
              ))}
            </ul>
            {tasks.length > 12 && <span className="tiny faint">E mais {tasks.length - 12}. Use um bloco ```tasks numa nota para ver todas.</span>}
            <span className="tiny faint">Tarefas das notas no formato do plugin Tasks: “- [ ] texto 📅 2026-10-17”. O clique segue o Tasks (data de conclusão, recorrência).</span>
          </section>

          <section className="card stack">
            <span className="section-title row">
              <Bell size={15} /> Lembretes
            </span>
            <span className="small muted">
              {isAndroidApp()
                ? "Disparam pelo Android, mesmo com o app fechado."
                : vault.platform.kind === "electron"
                  ? "Disparam como notificação do sistema enquanto o app está aberto (mesmo minimizado)."
                  : "No navegador, só disparam com esta aba aberta."}
            </span>
            {!isAndroidApp() && vault.platform.kind === "memory" && permission === "default" && (
              <button className="btn sm" onClick={() => void Notification.requestPermission().then(setPermission)}>
                Permitir notificações
              </button>
            )}
            {isAndroidApp() && !exactAlarms && (
              <button className="btn sm" onClick={() => void openExactAlarmSettings().then(() => exactAlarmsAllowed().then(setExactAlarms))}>
                Permitir alarmes na hora exata
              </button>
            )}
          </section>

          <div className="row-wrap">
            <button className="btn sm" onClick={() => fileInput.current?.click()} disabled={readOnly} title={readOnly ? "Cofre em somente leitura" : "Importar eventos de um arquivo .ics"}>
              <Upload size={14} /> Importar .ics
            </button>
            <button className="btn sm" onClick={() => void exportAll().catch(fail)} disabled={!events.length}>
              <Download size={14} /> Exportar .ics
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".ics,text/calendar"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ""
                if (file) void importFile(file).catch(fail)
              }}
            />
          </div>
        </ResizablePanel>
      </div>

      {freeDialog && <FreeTimeDialog vault={vault.info?.path} prefs={freePrefs} calendars={calendars} onClose={() => setFreeDialog(false)} />}
      {dialog?.kind === "new" && (
        <EventDialog
          initial={{ date: isoDate(dialog.day), ...(dialog.time ? { startTime: dialog.time } : {}) }}
          sessionNotes={sessionNotes}
          sessionFolders={campaignFolders}
          onSave={(input, folder) => saveEvent(input, folder)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "edit" && (
        <EventDialog
          initial={dialog.event}
          editing={dialog.event}
          sessionNotes={sessionNotes}
          sessionFolders={campaignFolders}
          onSave={(input, folder) => saveEvent(input, folder, dialog.event)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "delete" && (
        <ConfirmDialog
          title="Excluir evento"
          confirmLabel="Mandar para a lixeira"
          danger
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await vault.trash(dialog.event.path)
            setSelectedKey(undefined)
          }}
        >
          “{dialog.event.title}”{dialog.event.repeat.kind !== "none" ? " e todas as repetições" : ""} vai para a lixeira do cofre (<code>.trash</code>).
        </ConfirmDialog>
      )}
      {dialog?.kind === "import" && (
        <ConfirmDialog title="Importar .ics" confirmLabel="Importar" onClose={() => setDialog(null)} onConfirm={() => runImport(dialog.events)}>
          {dialog.events.length} evento(s) vão virar notas em <code>Agenda/Importados/</code>:
          <ul style={{ marginTop: 6, paddingLeft: 18 }}>
            {dialog.events.slice(0, 8).map((e, i) => (
              <li key={i}>
                {e.title} — {new Date(`${e.date}T12:00`).toLocaleDateString("pt-BR")}
              </li>
            ))}
            {dialog.events.length > 8 && <li>…</li>}
          </ul>
        </ConfirmDialog>
      )}
    </div>
  )
}

/** As caixas da nota do evento (todas, como antes, mesmo fora do filtro global), lidas pelo motor do Tasks. */
function eventChecklist(path: string, text: string, actions: TaskActions): Task[] {
  const ctx = parseContext({ ...actions.settings, globalFilter: "" })
  const lines = text.split("\n")
  return checkboxLines(text).flatMap((line) => parseTaskLine(lines[line]!, path, line, ctx) ?? [])
}

function EventDetail({ occurrence, index, readOnly, actions, today, onEdit, onDelete, onSkip, onClose }: { occurrence: Occurrence; index: VaultIndex; readOnly: boolean; actions: TaskActions; today: string; onEdit(): void; onDelete(): void; onSkip(): void; onClose(): void }) {
  const { event } = occurrence
  const vault = useVault()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const text = index.note(event.path)?.text ?? ""
  const items = useMemo(() => eventChecklist(event.path, text, actions), [event.path, text, actions])
  const repeat = describeRepeat(event)
  const sessionPath = event.session ? index.resolve({ kind: "wiki", embed: false, target: event.session, start: 0, end: 0, raw: "", inFrontmatter: true }, event.path).dest : null
  return (
    <section className="card event-detail" style={{ ["--ev" as string]: eventColor(event) }} aria-label="Evento escolhido">
      <div className="row between">
        {event.category ? <span className="chip" style={{ color: "var(--ev)" }}>{event.category}</span> : <span />}
        <button className="btn ghost sm" onClick={onClose}>
          Fechar
        </button>
      </div>
      <h2 style={{ fontSize: 18 }}>{event.title}</h2>
      <div className="stack small">
        <span className="row muted">
          <Clock size={15} />
          {occurrence.start.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
          {!event.allDay && ` · ${hhmm(occurrence.start)}${event.endTime ? `–${hhmm(occurrence.end)}` : ""}`}
          {event.allDay && !sameDay(occurrence.start, addDays(occurrence.end, -1)) && ` – ${addDays(occurrence.end, -1).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`}
        </span>
        {event.location && (
          <span className="row muted">
            <MapPin size={15} /> {event.location}
          </span>
        )}
        {repeat && (
          <span className="row muted">
            <Repeat size={15} /> {repeat}
          </span>
        )}
        <span className="row muted">
          <Bell size={15} /> Lembrete: {event.reminders.length ? event.reminders.map(reminderText).join(" e ") : "nenhum"}
        </span>
      </div>
      {(items.length > 0 || !readOnly) && (
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow">Preparação</span>
          <ul className="task-list">
            {items.map((item) => (
              <TaskRow key={item.line} task={item} actions={actions} options={{ today, hidden: new Set(["backlink", "urgency"]) }} />
            ))}
          </ul>
          {!readOnly && (
            <button className="btn sm ghost" onClick={() => setAdding(true)}>
              <Plus size={14} /> Tarefa de preparação
            </button>
          )}
        </div>
      )}
      {adding && (
        <TaskEditDialog
          settings={actions.settings}
          onLines={(lines) => {
            const note = index.note(event.path)
            if (!note) return
            const body = note.text.replace(/\s*$/, "")
            void vault.save(event.path, `${body}\n${lines.join("\n")}\n`).catch((e: unknown) => toast(e instanceof Error ? e.message : String(e)))
          }}
          onClose={() => setAdding(false)}
        />
      )}
      <div className="row-wrap">
        {event.session && (
          <button className="btn sm primary" onClick={() => (sessionPath ? navigate(vaultRoute(sessionPath)) : undefined)} disabled={!sessionPath} title={sessionPath ?? `“${event.session}” ainda não existe`}>
            <ScrollText size={14} /> Abrir sessão
          </button>
        )}
        <button className="btn sm" onClick={() => navigate(vaultRoute(event.path))}>
          <FileText size={14} /> Abrir nota
        </button>
        {!readOnly && (
          <>
            <button className="btn sm" onClick={onEdit} aria-label="Editar evento">
              <Pencil size={14} /> Editar
            </button>
            {event.repeat.kind !== "none" && (
              <button className="btn sm" onClick={onSkip} title="Pular só esta data">
                <SkipForward size={14} /> Pular esta data
              </button>
            )}
            <button className="btn sm danger" onClick={onDelete} aria-label="Excluir evento">
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
      <span className="tiny faint mono truncate">{event.path}</span>
    </section>
  )
}

/** Tarefas do dia escolhido: prazo, agendada ou início nesse dia. */
function DayTasks({ tasks, day, actions, today }: { tasks: Task[]; day: string; actions: TaskActions; today: string }) {
  const list = tasks.filter((t) => t.dueDate === day || t.scheduledDate === day || t.startDate === day)
  if (!list.length) return null
  return (
    <div className="stack" style={{ gap: 4, marginTop: 10 }}>
      <span className="eyebrow">Tarefas do dia</span>
      <ul className="task-list">
        {list.slice(0, 20).map((t) => (
          <TaskRow key={`${t.path}:${t.line}`} task={t} actions={actions} options={{ today, hidden: new Set(["urgency", "created date", "done date", "cancelled date", "id", "depends on"]) }} />
        ))}
      </ul>
    </div>
  )
}
