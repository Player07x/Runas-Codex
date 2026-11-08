import { openDocumentExport } from "../../components/export/ExportDialog"
import { Crest } from "../../components/kit/Emblem"
import { imageTarget } from "../../core/personalization"
import { ResizablePanel, usePanelToggle } from "../../components/ResizablePanel"
import { useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, Download, FileDown, FileText, Globe, LockKeyhole, PanelRight, Pin, PinOff, Plus, Search, Trash2, Users } from "lucide-react"
import { OverflowMenu } from "../../components/kit/OverflowMenu"
import { campaignJournal, GM_NOTES_FOLDER, listGmNotes, newGmNote, withPinnedNote, previousSession, SESSION_STATUS, setPrepDetail, setSectionText, setTaskLine, SUMMARY_HEADING, uniqueNoteName, type SessionInfo, type SessionStatus } from "../../core/campaigns"
import { dirname, noteName } from "../../core/text"
import { href, navigate } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import { NoteView } from "../../components/vault/NoteView"
import { Markdown } from "../../components/Markdown"
import { noteBody } from "../../core/sections"
import { Empty, Modal, Progress, useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import { NewNpcDialog, NewSessionDialog } from "./campaign-dialogs"
import { campaignRoute, dayLabel, sessionRoute, worldDateLabel, type CampaignData } from "./campaign-state"
import { DraftsContext, useBlurSave, useCampaignEdits, useDrafts } from "./campaign-edits"
import { ListRow } from "../../components/kit/Layout"
import { FormField, FormGrid } from "../../components/kit/FormField"
import { ConfirmDialog } from "../../components/vault/dialogs"
import { nameProblem } from "../../core/names"
import { SavedMark, useSavedMark } from "./SavedMark"
import { ChangesSinceCard } from "./CampaignInsights"
import { worldDateText, type WorldDate } from "../../core/calendar"
import { worldDateAhead } from "../../core/world-today"
import { useSetWorldToday } from "../wiki/world-today"
import { useCreateRequest } from "../../lib/create-request"
import { Link2 } from "lucide-react"

export function SessionsView({ data, path }: { data: CampaignData; path?: string }) {
  if (path) return <SessionPage key={path} data={data} path={path} />
  return <SessionList data={data} />
}

function SessionList({ data }: { data: CampaignData }) {
  const toast = useToast()
  const vault = useVault()
  const exportJournal = async () => {
    try {
      const text = campaignJournal(data.campaign, data.sessions, (date) => worldDateLabel(data.calendar, date) ?? date)
      const saved = await vault.platform.saveFile(`Diário — ${data.campaign.name}.md`, text, "text/markdown")
      if (saved) toast(`Diário exportado: ${saved}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error))
    }
  }
  const [creating, setCreating] = useState(false)
  const [gmCreating, setGmCreating] = useState(false)
  useCreateRequest("nota-mestre", () => (data.readOnly ? toast("Libere a gravação em Configurações para criar notas do mestre.") : setGmCreating(true)))
  const [query, setQuery] = useState("")
  const q = query.trim().toLocaleLowerCase("pt-BR")
  const matches = (s: SessionInfo) => !q || `${s.title} ${s.number ?? ""} ${s.summary}`.toLocaleLowerCase("pt-BR").includes(q)
  // Próximas (planejadas) em ordem de data; as jogadas e canceladas da mais recente para a mais antiga.
  const upcoming = data.sessions.filter((s) => s.status === "planejada" && matches(s))
  const played = [...data.sessions].reverse().filter((s) => s.status !== "planejada" && matches(s))
  const sessions = [...upcoming, ...played]
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">{data.campaign.name} · Sessões</span>
          <h1 className="page-title">Sessões</h1>
        </div>
        <div className="kit-actions">
          <button className="btn primary" onClick={() => (data.readOnly ? toast("Libere a gravação em Configurações para criar sessões.") : setCreating(true))}>
            <Plus size={16} /> Nova sessão
          </button>
          <OverflowMenu label="Ações das sessões" items={[
            { label: "Nova nota do mestre…", icon: <Plus size={15} />, onSelect: () => setGmCreating(true), disabled: data.readOnly },
            { label: "Exportar diário (Markdown)", icon: <Download size={15} />, onSelect: () => void exportJournal() },
            { label: "Exportar diário (PDF, HTML…)…", icon: <FileDown size={15} />, onSelect: () => openDocumentExport({ paths: data.sessions.filter(session => session.status === "realizada").map(session => session.path), title: `Diário — ${data.campaign.name}`, journal: data.campaign.name }) },
          ]} />
        </div>
      </div>
      {data.sessions.length === 0 && (
        <Empty title="Nenhuma sessão ainda">Cada sessão é uma nota com o roteiro de preparação, as anotações e o que aconteceu. Criar pela campanha já marca o evento na Agenda.</Empty>
      )}
      {data.sessions.length > 5 && (
        <label className="search campaign-session-search">
          <Search size={15} />
          <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar sessão pelo título, número ou resumo" aria-label="Buscar sessão" />
        </label>
      )}
      {data.sessions.length > 0 && sessions.length === 0 && <p className="muted small">Nenhuma sessão com “{query}”.</p>}
      {[{ label: "Próximas", list: upcoming }, { label: "Jogadas", list: played }].filter((g) => g.list.length).map((group) => (
      <section key={group.label} className="stack" style={{ gap: 8 }} aria-label={`Sessões ${group.label.toLocaleLowerCase("pt-BR")}`}>
      <h2 className="section-title">{group.label} · {group.list.length}</h2>
      <div className="campaign-session-list">
        {group.list.map((s) => {
          const done = s.prep.filter((p) => p.done).length
          // Capa da sessão (`capa`, ADR 0027), quando houver.
          const cover = imageTarget(vault.index?.note(s.path)?.meta.frontmatter?.data?.capa)
          return (
            <a key={s.path} className={`card link campaign-session-row ${s.status}`} href={href(sessionRoute(s))}>
              {cover && <Crest image={cover} from={s.path} name={s.title} size={44} />}
              <span className="campaign-session-number mono">{s.number ?? "—"}</span>
              <span className="grow" style={{ minWidth: 0 }}>
                <strong className="truncate" style={{ display: "block" }}>{s.title}</strong>
                <span className="small muted row-wrap">
                  <span className="row"><CalendarDays size={13} /> {dayLabel(s.date, s.time)}</span>
                  {s.worldDate && <span className="row" style={{ color: "var(--gold)" }}><Globe size={13} /> {worldDateLabel(data.calendar, s.worldDate)}</span>}
                </span>
              </span>
              {s.status === "planejada" && s.prep.length > 0 && <span className="chip gold">Preparação {done}/{s.prep.length}</span>}
              {s.present.length > 0 && <span className="chip"><Users size={12} /> {s.present.length}</span>}
              <span className={`chip ${s.status === "planejada" ? "gold" : s.status === "cancelada" ? "" : "green"}`}>{SESSION_STATUS.find((x) => x.id === s.status)?.label}</span>
            </a>
          )
        })}
      </div>
      </section>
      ))}
      <PlayerDiaries data={data} />
      <GmNotes data={data} onCreate={() => setGmCreating(true)} />
      {creating && <NewSessionDialog data={data} onClose={() => setCreating(false)} onCreated={(path) => navigate(campaignRoute(data.campaign.name, "sessoes", path))} />}
      {gmCreating && <GmNoteDialog data={data} onClose={() => setGmCreating(false)} />}
    </div>
  )
}

/**
 * Notas do mestre (U31): notas soltas e secretas em `Notas do mestre/`, cada uma ligada ou não a uma sessão. O ⋯ de
 * cada nota fixa na Tela do Mestre (a mesma propriedade `fixadas` da campanha) e manda para a lixeira.
 */
// Os títulos de sessão costumam já começar por "Sessão N —"; não repete o número.
function sessionName(session: { number?: number | null; title?: string | null }): string {
  const prefix = `Sessão ${session.number ?? "—"}`
  if (!session.title) return prefix
  return session.title.startsWith(prefix) ? session.title : `${prefix}: ${session.title}`
}

function GmNotes({ data, onCreate }: { data: CampaignData; onCreate(): void }) {
  const vault = useVault()
  const { setHome } = useCampaignEdits(data)
  const [trashing, setTrashing] = useState<{ path: string; name: string } | null>(null)
  const [linking, setLinking] = useState<{ path: string; name: string; session?: string } | null>(null)
  const notes = listGmNotes(vault.index!, data.campaign, data.data.fixadas)
  const canEdit = !data.readOnly && Boolean(data.campaign.home)
  if (!notes.length && !canEdit) return null
  const sessionLabel = (target?: string) => {
    if (!target) return "sem sessão"
    const session = data.sessions.find((item) => noteName(item.path) === noteName(target))
    return session ? sessionName(session) : noteName(target)
  }
  const pin = (path: string, on: boolean) => void setHome("fixadas", withPinnedNote(vault.index!, data.data.fixadas, data.campaign.home!, path, on))
  return <section className="card stack campaign-gm-notes" aria-labelledby="notas-do-mestre">
    <div className="row between">
      <h2 id="notas-do-mestre" className="section-title">Notas do mestre · {notes.length}</h2>
      {canEdit && <button type="button" className="btn sm" onClick={onCreate}><Plus size={14} /> Nota do mestre</button>}
    </div>
    {notes.length === 0
      ? <p className="small muted">Pistas, planos e o que os jogadores não podem ver. Ficam em {GM_NOTES_FOLDER}, fora do diário exportado e da sala.</p>
      : <div className="stack campaign-gm-list">{notes.map((note) => <div key={note.path} className="campaign-gm-row">
        <ListRow href={href(noteRoute(note.path))} media={<LockKeyhole size={16} aria-hidden="true" />} title={note.name}
          meta={<><span className="campaign-gm-secret">Segredo</span> · {sessionLabel(note.session)}{note.pinned ? " · Fixada na Tela do Mestre" : ""}</>} />
        <OverflowMenu label={`Ações de ${note.name}`} items={[
          { label: "Abrir", icon: <FileText size={15} />, onSelect: () => navigate(noteRoute(note.path)) },
          ...(canEdit ? [
            note.pinned
              ? { label: "Desafixar da Tela do Mestre", icon: <PinOff size={15} />, onSelect: () => pin(note.path, false) }
              : { label: "Fixar na Tela do Mestre", icon: <Pin size={15} />, onSelect: () => pin(note.path, true) },
            { label: "Ligar a uma sessão…", icon: <Link2 size={15} />, onSelect: () => setLinking({ path: note.path, name: note.name, session: note.session }) },
            { label: "Mandar para a lixeira…", icon: <Trash2 size={15} />, danger: true, onSelect: () => setTrashing({ path: note.path, name: note.name }) },
          ] : []),
        ]} />
      </div>)}</div>}
    {trashing && <ConfirmDialog title={`Mandar “${trashing.name}” para a lixeira?`} confirmLabel="Mandar para a lixeira" danger onClose={() => setTrashing(null)} onConfirm={async () => {
      if (notes.find((note) => note.path === trashing.path)?.pinned) await setHome("fixadas", withPinnedNote(vault.index!, data.data.fixadas, data.campaign.home!, trashing.path, false))
      await vault.trash(trashing.path)
    }}>A nota vai para a lixeira do cofre (.trash) e dá para recuperar de lá.</ConfirmDialog>}
    {linking && <LinkSessionDialog data={data} note={linking} onClose={() => setLinking(null)} />}
  </section>
}

/** “Ligar a uma sessão…”: troca (ou tira) a `sessao` da nota do mestre numa gravação só. */
function LinkSessionDialog({ data, note, onClose }: { data: CampaignData; note: { path: string; name: string; session?: string }; onClose(): void }) {
  const vault = useVault()
  const current = note.session ? data.sessions.find((item) => noteName(item.path) === noteName(note.session!))?.path ?? "" : ""
  const [session, setSession] = useState(current)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const save = async () => {
    setBusy(true); setError(undefined)
    try {
      await vault.setProperty(note.path, "sessao", session ? `[[${vault.index!.linkTarget(session, note.path)}]]` : undefined)
      onClose()
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); setBusy(false) }
  }
  return <Modal title={`Ligar “${note.name}” a uma sessão`} onClose={() => !busy && onClose()} footer={<><button className="btn ghost" onClick={onClose} disabled={busy}>Cancelar</button><button className="btn primary" onClick={() => void save()} disabled={busy || session === current}>{busy ? "Gravando…" : "Ligar"}</button></>}>
    <FormGrid columns={1}>
      <FormField label="Sessão">
        {(c) => <select id={c.id} aria-describedby={c.describedBy} className="select" autoFocus value={session} onChange={(event) => setSession(event.target.value)}>
          <option value="">Nenhuma</option>
          {data.sessions.map((item) => <option key={item.path} value={item.path}>{sessionName(item)}</option>)}
        </select>}
      </FormField>
    </FormGrid>
    {error && <p className="small" role="alert" style={{ color: "var(--red)" }}>{error}</p>}
  </Modal>
}

function GmNoteDialog({ data, onClose }: { data: CampaignData; onClose(): void }) {
  const vault = useVault()
  const [title, setTitle] = useState("")
  const [session, setSession] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const problem = title.trim() ? nameProblem(title.trim()) : null
  const create = async () => {
    if (!title.trim() || problem) return
    setBusy(true); setError(undefined)
    try {
      const folder = `${data.campaign.root}${GM_NOTES_FOLDER}`
      const target = session ? vault.index!.linkTarget(session, `${folder}/${title.trim()}.md`) : undefined
      const path = await vault.createNote(folder, uniqueNoteName(vault.index!, folder, title.trim()), newGmNote(title.trim(), target))
      onClose(); navigate(noteRoute(path))
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); setBusy(false) }
  }
  return <Modal title="Nova nota do mestre" onClose={() => !busy && onClose()} footer={<><button className="btn ghost" onClick={onClose} disabled={busy}>Cancelar</button><button className="btn primary" onClick={() => void create()} disabled={busy || !title.trim() || Boolean(problem)}>{busy ? "Criando…" : "Criar nota"}</button></>}>
    <FormGrid columns={1}>
      <FormField label="Título" error={problem ?? undefined}>
        {(c) => <input id={c.id} aria-describedby={c.describedBy} aria-invalid={c.invalid} className="input" autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void create() }} />}
      </FormField>
      <FormField label="Sessão" hint="Opcional: a sessão em que a nota vai ser usada.">
        {(c) => <select id={c.id} aria-describedby={c.describedBy} className="select" value={session} onChange={(event) => setSession(event.target.value)}>
          <option value="">Nenhuma</option>
          {data.sessions.map((item) => <option key={item.path} value={item.path}>{sessionName(item)}</option>)}
        </select>}
      </FormField>
    </FormGrid>
    <p className="small muted">A nota nasce com <code>segredo: true</code>: fica fora do diário exportado e do que a sala mostra.</p>
    {error && <p role="alert" className="small" style={{ color: "var(--red)" }}>{error}</p>}
  </Modal>
}

/** Entradas do diário que os jogadores mandaram pela sala (antes ficavam escondidas no gerador de aventuras). */
function PlayerDiaries({ data }: { data: CampaignData }) {
  const vault = useVault()
  const diaries = vault.index!.notesIn(data.campaign.root).filter((n) => n.meta.frontmatter?.data?.tipo === "diario-jogador").sort((a, b) => b.mtime - a.mtime)
  if (!diaries.length) return null
  return (
    <details className="card campaign-diaries">
      <summary className="section-title">Diário dos jogadores · {diaries.length}</summary>
      <div className="stack">
        {diaries.map((n) => (
          <article key={n.path} className="card tight stack">
            <a className="small" href={href(noteRoute(n.path))}><strong>{n.name}</strong></a>
            {typeof n.meta.frontmatter?.data?.jogador === "string" && <span className="tiny muted">{String(n.meta.frontmatter.data.jogador)}</span>}
            <Markdown source={noteBody(n.text)} />
          </article>
        ))}
      </div>
    </details>
  )
}

function SessionPage({ data, path }: { data: CampaignData; path: string }) {
  const vault = useVault()
  const toast = useToast()
  const index = vault.index!
  const panel = usePanelToggle("campaign-session")
  // No celular, fechar o painel sem tocar fora do campo também grava o que estava sendo digitado.
  const drafts = useDrafts()
  const togglePanel = () => { drafts.flush(); panel.toggle() }
  // Link para algo que ainda não existe, na nota da sessão: criar o NPC, o lugar ou a facção na hora.
  const [creatingLink, setCreatingLink] = useState<string | null>(null)
  const session = data.sessions.find((s) => s.path === path)
  const folders = useMemo(() => [...new Set(index.allFiles().map((f) => dirname(f.path)))].filter(Boolean), [index, vault.version])
  if (!session) {
    return (
      <div className="page">
        <p className="muted">
          Sessão não encontrada (foi renomeada ou apagada?). <a href={href(campaignRoute(data.campaign.name, "sessoes"))}>Ver as sessões</a>
        </p>
      </div>
    )
  }
  return (
    <div className={`campaign-session-layout ${panel.overlay ? "show-panel" : ""}`}>
      <section className="campaign-session-main">
        <NoteView
          key={path}
          path={path}
          folders={folders}
          onShowPanel={togglePanel}
          panelOpen={panel.expanded}
          panelHint="Detalhes, preparação e resumo da sessão"
          onBack={() => navigate(campaignRoute(data.campaign.name, "sessoes"))}
          onCreate={(target) => (data.readOnly ? toast(`“${target}” ainda não existe.`) : setCreatingLink(target))}
          onTag={(tag) => toast(`Tag #${tag}`)}
        />
      </section>
      <ResizablePanel id="campaign-session" label="Detalhes da sessão" side="right" width={360} className="campaign-session-side" onCollapsedChange={panel.onCollapsedChange}>
        <button className="btn ghost sm campaign-panel-close" onClick={() => { drafts.flush(); panel.close() }}>
          <ChevronLeft size={14} /> Voltar à nota
        </button>
        <DraftsContext.Provider value={drafts}>
          <SessionDetails data={data} session={session} />
          <PrepCard data={data} session={session} />
          <SummaryCard data={data} session={session} />
        </DraftsContext.Provider>
      </ResizablePanel>
      <button className="icon-btn campaign-panel-toggle" onClick={togglePanel} aria-label="Painel da sessão" aria-expanded={panel.expanded}>
        <PanelRight size={18} />
      </button>
      {creatingLink && <NewNpcDialog data={data} initialName={creatingLink} onClose={() => setCreatingLink(null)} onCreated={(created) => toast(`“${noteName(created)}” criado na wiki.`)} />}
    </div>
  )
}

function useSessionEdits(data: CampaignData, session: SessionInfo) {
  const vault = useVault()
  const toast = useToast()
  // Devolve se gravou, para o campo mostrar “Gravado”.
  const run = async (action: () => Promise<void>) => {
    if (data.readOnly) {
      toast("Cofre em somente leitura: libere a gravação em Configurações.")
      return false
    }
    try {
      await action()
      return true
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err))
      return false
    }
  }
  return {
    set: (key: string, value: string | number | string[] | undefined) => run(() => vault.setProperty(session.path, key, value)),
    /** Data e hora da sessão também mudam o evento ligado na Agenda, para os dois não discordarem (remarcar). */
    reschedule: (key: "data" | "hora", value: string | undefined) => run(async () => {
      await vault.setProperty(session.path, key, value)
      const event = session.event ? vault.index!.note(session.event.endsWith(".md") ? session.event : `${session.event}.md`) : undefined
      const data = event?.meta.frontmatter?.data
      // Só o evento simples (sem repetição) acompanha; um evento repetido continua como está.
      if (!event || !value || data?.type === "recurring" || data?.type === "rrule") return
      await vault.setProperty(event.path, key === "data" ? "date" : "startTime", value)
    }),
    edit: (change: (text: string) => string) => run(() => vault.save(session.path, change(vault.index!.note(session.path)!.text))),
  }
}

function SessionDetails({ data, session }: { data: CampaignData; session: SessionInfo }) {
  const { set, reschedule } = useSessionEdits(data, session)
  const ro = data.readOnly
  const toast = useToast()
  const { mark, shown } = useSavedMark()
  const saved = (key: string) => (ok: boolean) => { if (ok) mark(key) }
  const field = useBlurSave()
  const [ratingError, setRatingError] = useState("")
  const commitRating = (value: string) => {
    const v = value.trim().replace(",", ".")
    const n = Number(v)
    // Só um número de 0 a 10 é gravado; texto ou valor fora da faixa fica no campo com o aviso.
    if (v && (!Number.isFinite(n) || n < 0 || n > 10)) return setRatingError("Use um número de 0 a 10, como 8 ou 7,5.")
    setRatingError("")
    if (v !== String(session.rating ?? "")) void set("avaliacao", v ? n : undefined).then(saved("avaliacao"))
  }
  // Marcar como realizada uma sessão que termina depois de “hoje no mundo” oferece avançar o calendário.
  const [advance, setAdvance] = useState<WorldDate | null>(null)
  const setWorldToday = useSetWorldToday()
  const changeStatus = (status: SessionStatus) => void set("status", status).then((ok) => {
    if (!ok) return
    mark("status")
    setAdvance(status === "realizada" && data.calendarRef ? worldDateAhead(data.calendar, session.worldDate) : null)
  })
  const advanceWorld = (date: WorldDate) => {
    if (!data.calendarRef) return
    setWorldToday(data.calendarRef, date).then(() => {
      setAdvance(null)
      toast(`Hoje no mundo: ${worldDateLabel(data.calendar, worldDateText(date))}`)
    }, (err: unknown) => toast(err instanceof Error ? err.message : String(err)))
  }
  const pcLink = (path: string) => `[[${path.replace(/\.md$/, "")}]]`
  const togglePresent = (path: string) => {
    const next = session.present.includes(path) ? session.present.filter((p) => p !== path) : [...session.present, path]
    set("presentes", next.map((p) => (p.endsWith(".md") ? pcLink(p) : `[[${p}]]`)))
  }
  return (
    <section className="card stack">
      <span className="section-title">Sessão {session.number ?? ""}</span>
      <label className="field">
        <span>Situação</span>
        <select className="select" disabled={ro} value={session.status} onChange={(e) => changeStatus(e.target.value as SessionStatus)} aria-label="Situação da sessão">
          {SESSION_STATUS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <SavedMark shown={shown("status")} />
      </label>
      <div role="status" className="campaign-advance-slot">
        {advance && (
          <div className="campaign-advance stack">
            <span className="small">
              A sessão acontece em <strong>{worldDateLabel(data.calendar, worldDateText(advance))}</strong> no mundo. Avançar “hoje no mundo”{data.calendar?.today ? ` (${worldDateLabel(data.calendar, worldDateText(data.calendar.today))})` : ""} para essa data?
            </span>
            <div className="row-wrap">
              <button type="button" className="btn sm primary" onClick={() => advanceWorld(advance)}>Avançar o mundo</button>
              <button type="button" className="btn sm ghost" onClick={() => setAdvance(null)}>Agora não</button>
            </div>
          </div>
        )}
      </div>
      <div className="campaign-form-row">
        <label className="field grow">
          <span>Data</span>
          <input key={session.date ?? ""} className="input" type="date" disabled={ro} defaultValue={session.date ?? ""} {...field("data", (v) => v !== (session.date ?? "") && void reschedule("data", v || undefined).then(saved("data")))} aria-label="Data" />
          <SavedMark shown={shown("data")} />
        </label>
        <label className="field">
          <span>Hora</span>
          <input key={session.time ?? ""} className="input" type="time" disabled={ro} defaultValue={session.time ?? ""} {...field("hora", (v) => v !== (session.time ?? "") && void reschedule("hora", v || undefined).then(saved("hora")))} aria-label="Hora" />
          <SavedMark shown={shown("hora")} />
        </label>
      </div>
      <label className="field">
        <span>Data no mundo</span>
        <input key={session.worldDate ?? ""} className="input mono" disabled={ro} defaultValue={session.worldDate ?? ""} placeholder="4031-07-16" {...field("data_mundo", (v) => v.trim() !== (session.worldDate ?? "") && void set("data_mundo", v.trim() || undefined).then(saved("data_mundo")))} aria-label="Data no mundo" />
        {session.worldDate && <span className="tiny" style={{ color: "var(--gold)" }}>{worldDateLabel(data.calendar, session.worldDate)}</span>}
        <SavedMark shown={shown("data_mundo")} />
      </label>
      {data.players.length > 0 && (
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow">Presença</span>
          <div className="row-wrap">
            {data.players.map((p) => {
              const here = session.present.includes(p.path)
              return (
                <button key={p.path} className={`chip ${here ? "green" : ""}`} disabled={ro} onClick={() => togglePresent(p.path)} aria-pressed={here}>
                  {here ? "✓" : "○"} {p.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <label className="field">
        <span>Nota da sessão (0 a 10)</span>
        <input key={String(session.rating ?? "")} className="input" inputMode="decimal" disabled={ro} defaultValue={session.rating ?? ""} aria-invalid={Boolean(ratingError)} aria-describedby={ratingError ? "nota-sessao-erro" : undefined} {...field("avaliacao", commitRating)} aria-label="Nota da sessão" />
        <SavedMark shown={shown("avaliacao")} />
        {ratingError && <span id="nota-sessao-erro" className="tiny" role="alert" style={{ color: "var(--red)" }}>{ratingError}</span>}
      </label>
      {session.event ? (
        <a className="btn ghost sm" href={href(noteRoute(session.event))}>
          <CalendarDays size={14} /> Evento na Agenda
        </a>
      ) : (
        <span className="tiny faint">Sem evento na Agenda.</span>
      )}
    </section>
  )
}

/** Roteiro de preparação (checklist `## Preparação`): cada passo com a marca e uma linha de texto. */
function PrepCard({ data, session }: { data: CampaignData; session: SessionInfo }) {
  const { edit } = useSessionEdits(data, session)
  const { mark, shown } = useSavedMark()
  const field = useBlurSave()
  const previous = previousSession(data.sessions, session)
  const recap = session.prep.find((p) => p.label === "Recapitulação")
  const done = session.prep.filter((p) => p.done).length
  return (
    <section className="card stack">
      <div className="row between">
        <span className="section-title">Preparação</span>
        {session.prep.length > 0 && <span className="chip gold">{done}/{session.prep.length}</span>}
      </div>
      {session.status === "planejada" && previous && <ChangesSinceCard data={data} last={previous} />}
      {session.prep.length > 0 && <Progress value={done} max={session.prep.length} color="var(--gold)" />}
      {session.prep.length === 0 && <span className="muted small">A nota não tem a lista “## Preparação”. Sessões criadas pela campanha já vêm com o roteiro.</span>}
      {session.prep.map((item) => (
        <div key={`${item.line}-${item.label ?? ""}`} className={`campaign-prep ${item.done ? "done" : ""}`}>
          <input type="checkbox" checked={item.done} disabled={data.readOnly} onChange={(e) => edit((t) => setTaskLine(t, item.line, { done: e.target.checked }))} aria-label={item.label ?? item.detail} />
          <label className="grow stack" style={{ gap: 2 }}>
            {item.label && <strong className="small">{item.label}</strong>}
            <input
              key={item.detail}
              className="input"
              disabled={data.readOnly}
              defaultValue={item.detail}
              placeholder={item.label === "Recapitulação" && previous?.summary ? "Use o resumo da sessão anterior" : "…"}
              {...field(`passo-${item.line}`, (v) => v.trim() !== item.detail && void edit((t) => setPrepDetail(t, item, v)).then((ok) => ok && mark(`passo-${item.line}`)))}
              aria-label={`Texto de ${item.label ?? "passo"}`}
            />
            <SavedMark shown={shown(`passo-${item.line}`)} />
          </label>
        </div>
      ))}
      {previous?.summary && (
        <div className="campaign-previous stack" style={{ gap: 6 }}>
          <span className="eyebrow">Anteriormente ({noteName(previous.path)})</span>
          <p className="small">{previous.summary}</p>
          {recap && !recap.detail && !data.readOnly && (
            <button type="button" className="btn sm" style={{ justifySelf: "start" }} onClick={() => edit((t) => setPrepDetail(t, recap, previous.summary!.replace(/\s+/g, " ").trim()))}>
              Usar na Recapitulação
            </button>
          )}
        </div>
      )}
    </section>
  )
}

/** Resumo (`## O que aconteceu`): vira o "Anteriormente…" da próxima sessão. */
function SummaryCard({ data, session }: { data: CampaignData; session: SessionInfo }) {
  const { edit } = useSessionEdits(data, session)
  const { mark, shown } = useSavedMark()
  const field = useBlurSave()
  return (
    <section className="card stack">
      <span className="section-title">O que aconteceu</span>
      <textarea
        key={session.summary}
        className="textarea"
        rows={5}
        disabled={data.readOnly}
        defaultValue={session.summary}
        placeholder="Resumo para o “Anteriormente…” da próxima sessão."
        {...field("resumo", (v) => v.trim() !== session.summary && void edit((t) => setSectionText(t, SUMMARY_HEADING, v)).then((ok) => ok && mark("resumo")))}
        aria-label="Resumo da sessão"
      />
      <span className="row between">
        <span className="tiny faint">Grava ao sair do campo, na seção “{SUMMARY_HEADING}” da nota.</span>
        <SavedMark shown={shown("resumo")} />
      </span>
    </section>
  )
}
