import { openDocumentExport } from "../../components/export/ExportDialog"
import { Crest } from "../../components/kit/Emblem"
import { imageTarget } from "../../core/personalization"
import { ResizablePanel, usePanelToggle } from "../../components/ResizablePanel"
import { useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, Download, FileDown, Globe, PanelRight, Plus, Search, Users } from "lucide-react"
import { OverflowMenu } from "../../components/kit/OverflowMenu"
import { campaignJournal, previousSession, SESSION_STATUS, setPrepDetail, setSectionText, setTaskLine, SUMMARY_HEADING, type SessionInfo, type SessionStatus } from "../../core/campaigns"
import { dirname, noteName } from "../../core/text"
import { href, navigate } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import { NoteView } from "../../components/vault/NoteView"
import { Empty, Progress, useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import { NewSessionDialog } from "./campaign-dialogs"
import { campaignRoute, dayLabel, sessionRoute, worldDateLabel, type CampaignData } from "./campaign-state"

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
          <span className="eyebrow">{data.campaign.root}Sessões/</span>
          <h1 className="page-title">Sessões</h1>
        </div>
        <div className="kit-actions">
          <button className="btn primary" onClick={() => (data.readOnly ? toast("Libere a gravação em Configurações para criar sessões.") : setCreating(true))}>
            <Plus size={16} /> Nova sessão
          </button>
          <OverflowMenu label="Ações das sessões" items={[
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
      {creating && <NewSessionDialog data={data} onClose={() => setCreating(false)} onCreated={(path) => navigate(campaignRoute(data.campaign.name, "sessoes", path))} />}
    </div>
  )
}

function SessionPage({ data, path }: { data: CampaignData; path: string }) {
  const vault = useVault()
  const toast = useToast()
  const index = vault.index!
  const panel = usePanelToggle("campaign-session")
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
          onShowPanel={panel.toggle}
          panelOpen={panel.expanded}
          panelHint="Detalhes, preparação e resumo da sessão"
          onBack={() => navigate(campaignRoute(data.campaign.name, "sessoes"))}
          onCreate={(target) => toast(`“${target}” ainda não existe.`)}
          onTag={(tag) => toast(`Tag #${tag}`)}
        />
      </section>
      <ResizablePanel id="campaign-session" label="Detalhes da sessão" side="right" width={360} className="campaign-session-side" onCollapsedChange={panel.onCollapsedChange}>
        <button className="btn ghost sm campaign-panel-close" onClick={panel.close}>
          <ChevronLeft size={14} /> Voltar à nota
        </button>
        <SessionDetails data={data} session={session} />
        <PrepCard data={data} session={session} />
        <SummaryCard data={data} session={session} />
      </ResizablePanel>
      <button className="icon-btn campaign-panel-toggle" onClick={panel.toggle} aria-label="Painel da sessão" aria-expanded={panel.expanded}>
        <PanelRight size={18} />
      </button>
    </div>
  )
}

function useSessionEdits(data: CampaignData, session: SessionInfo) {
  const vault = useVault()
  const toast = useToast()
  const run = (action: () => Promise<void>) => {
    if (data.readOnly) return toast("Cofre em somente leitura: libere a gravação em Configurações.")
    action().catch((err: unknown) => toast(err instanceof Error ? err.message : String(err)))
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
  const [ratingError, setRatingError] = useState("")
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
        <select className="select" disabled={ro} value={session.status} onChange={(e) => set("status", e.target.value as SessionStatus)} aria-label="Situação da sessão">
          {SESSION_STATUS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>
      <div className="campaign-form-row">
        <label className="field grow">
          <span>Data</span>
          <input key={session.date ?? ""} className="input" type="date" disabled={ro} defaultValue={session.date ?? ""} onBlur={(e) => e.target.value !== (session.date ?? "") && reschedule("data", e.target.value || undefined)} aria-label="Data" />
        </label>
        <label className="field">
          <span>Hora</span>
          <input key={session.time ?? ""} className="input" type="time" disabled={ro} defaultValue={session.time ?? ""} onBlur={(e) => e.target.value !== (session.time ?? "") && reschedule("hora", e.target.value || undefined)} aria-label="Hora" />
        </label>
      </div>
      <label className="field">
        <span>Data no mundo</span>
        <input key={session.worldDate ?? ""} className="input mono" disabled={ro} defaultValue={session.worldDate ?? ""} placeholder="4031-07-16" onBlur={(e) => e.target.value.trim() !== (session.worldDate ?? "") && set("data_mundo", e.target.value.trim() || undefined)} aria-label="Data no mundo" />
        {session.worldDate && <span className="tiny" style={{ color: "var(--gold)" }}>{worldDateLabel(data.calendar, session.worldDate)}</span>}
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
        <input key={String(session.rating ?? "")} className="input" inputMode="decimal" disabled={ro} defaultValue={session.rating ?? ""} aria-invalid={Boolean(ratingError)} aria-describedby={ratingError ? "nota-sessao-erro" : undefined} onBlur={(e) => {
          const v = e.target.value.trim().replace(",", ".")
          const n = Number(v)
          // Só um número de 0 a 10 é gravado; texto ou valor fora da faixa fica no campo com o aviso.
          if (v && (!Number.isFinite(n) || n < 0 || n > 10)) return setRatingError("Use um número de 0 a 10, como 8 ou 7,5.")
          setRatingError("")
          if (v !== String(session.rating ?? "")) set("avaliacao", v ? n : undefined)
        }} aria-label="Nota da sessão" />
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
  const previous = previousSession(data.sessions, session)
  const recap = session.prep.find((p) => p.label === "Recapitulação")
  const done = session.prep.filter((p) => p.done).length
  return (
    <section className="card stack">
      <div className="row between">
        <span className="section-title">Preparação</span>
        {session.prep.length > 0 && <span className="chip gold">{done}/{session.prep.length}</span>}
      </div>
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
              onBlur={(e) => e.target.value.trim() !== item.detail && edit((t) => setPrepDetail(t, item, e.target.value))}
              aria-label={`Texto de ${item.label ?? "passo"}`}
            />
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
        onBlur={(e) => e.target.value.trim() !== session.summary && edit((t) => setSectionText(t, SUMMARY_HEADING, e.target.value))}
        aria-label="Resumo da sessão"
      />
      <span className="tiny faint">Grava ao sair do campo, na seção “{SUMMARY_HEADING}” da nota.</span>
    </section>
  )
}
