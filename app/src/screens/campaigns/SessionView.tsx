import { openDocumentExport } from "../../components/export/ExportDialog"
import { ResizablePanel } from "../../components/ResizablePanel"
import { useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, Download, FileDown, Globe, PanelRight, Plus, Users } from "lucide-react"
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
  const sessions = [...data.sessions].reverse()
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
      {sessions.length === 0 && (
        <Empty title="Nenhuma sessão ainda">Cada sessão é uma nota com o roteiro de preparação, as anotações e o que aconteceu. Criar pela campanha já marca o evento na Agenda.</Empty>
      )}
      <div className="campaign-session-list">
        {sessions.map((s) => {
          const done = s.prep.filter((p) => p.done).length
          return (
            <a key={s.path} className={`card link campaign-session-row ${s.status}`} href={href(sessionRoute(s))}>
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
              <span className={`chip ${s.status === "planejada" ? "red" : s.status === "cancelada" ? "" : "green"}`}>{SESSION_STATUS.find((x) => x.id === s.status)?.label}</span>
            </a>
          )
        })}
      </div>
      {creating && <NewSessionDialog data={data} onClose={() => setCreating(false)} onCreated={(path) => navigate(campaignRoute(data.campaign.name, "sessoes", path))} />}
    </div>
  )
}

function SessionPage({ data, path }: { data: CampaignData; path: string }) {
  const vault = useVault()
  const toast = useToast()
  const index = vault.index!
  const [panel, setPanel] = useState(false)
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
    <div className={`campaign-session-layout ${panel ? "show-panel" : ""}`}>
      <section className="campaign-session-main">
        <NoteView
          key={path}
          path={path}
          folders={folders}
          onShowPanel={() => setPanel(!panel)}
          onBack={() => navigate(campaignRoute(data.campaign.name, "sessoes"))}
          onCreate={(target) => toast(`“${target}” ainda não existe.`)}
          onTag={(tag) => toast(`Tag #${tag}`)}
        />
      </section>
      <ResizablePanel id="campaign-session" label="Detalhes da sessão" side="right" width={360} className="campaign-session-side" aria-label="Sessão">
        <button className="btn ghost sm campaign-panel-close" onClick={() => setPanel(false)}>
          <ChevronLeft size={14} /> Voltar à nota
        </button>
        <SessionDetails data={data} session={session} />
        <PrepCard data={data} session={session} />
        <SummaryCard data={data} session={session} />
      </ResizablePanel>
      <button className="icon-btn campaign-panel-toggle" onClick={() => setPanel(!panel)} aria-label="Painel da sessão">
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
    edit: (change: (text: string) => string) => run(() => vault.save(session.path, change(vault.index!.note(session.path)!.text))),
  }
}

function SessionDetails({ data, session }: { data: CampaignData; session: SessionInfo }) {
  const { set } = useSessionEdits(data, session)
  const ro = data.readOnly
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
          <input className="input" type="date" disabled={ro} defaultValue={session.date ?? ""} onBlur={(e) => e.target.value !== (session.date ?? "") && set("data", e.target.value || undefined)} aria-label="Data" />
        </label>
        <label className="field">
          <span>Hora</span>
          <input className="input" type="time" disabled={ro} defaultValue={session.time ?? ""} onBlur={(e) => e.target.value !== (session.time ?? "") && set("hora", e.target.value || undefined)} aria-label="Hora" />
        </label>
      </div>
      <label className="field">
        <span>Data no mundo</span>
        <input className="input mono" disabled={ro} defaultValue={session.worldDate ?? ""} placeholder="4031-07-16" onBlur={(e) => e.target.value.trim() !== (session.worldDate ?? "") && set("data_mundo", e.target.value.trim() || undefined)} aria-label="Data no mundo" />
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
        <input className="input" inputMode="decimal" disabled={ro} defaultValue={session.rating ?? ""} onBlur={(e) => { const v = e.target.value.replace(",", "."); if (v !== String(session.rating ?? "")) set("avaliacao", v ? Number(v) : undefined) }} aria-label="Nota da sessão" />
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
        <div className="campaign-previous">
          <span className="eyebrow">Anteriormente ({noteName(previous.path)})</span>
          <p className="small">{previous.summary}</p>
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
