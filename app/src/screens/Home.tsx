import { useVaultCounts } from "../lib/vault-counts"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Dices, Feather, FileText, Library, NotebookPen, Plus, ScrollText, Undo2, Users, X } from "lucide-react"
import { href, navigate } from "../lib/router"
import { formatDate } from "../lib/navigation"
import { expandEvents, type AgendaEvent } from "../core/agenda"
import { agendaEvents } from "../lib/agenda-data"
import { vaultRoute } from "../lib/vault-notes"
import { useVault } from "../platform/VaultProvider"
import { campaignInfo, listPlayers } from "../core/campaigns"
import { nextSession } from "../core/next-session"
import { campaignHomePath, campaignLook } from "../core/personalization"
import { toneStyle } from "../core/tones"
import { displayTitle, editedAgo, spaceOf } from "../core/relative-time"
import { addSpark, parseSparks, removeSpark, removeUsedSparks, SPARKS_FOLDER, SPARKS_NAME, SPARKS_PATH, toggleSpark } from "../core/sparks"
import { CoverBand, Crest } from "../components/kit/Emblem"
import { useToast } from "../components/ui"
import { campaignRoute, sessionRoute } from "./campaigns/campaign-state"
import "./home.css"

const spaces = [
  { title: "Notas", unit: ["nota", "notas"], icon: Feather, path: "/notas", count: "notas" },
  { title: "Agenda", unit: ["evento", "eventos"], icon: CalendarDays, path: "/agenda", count: "agenda" },
  { title: "Wiki", unit: ["artigo", "artigos"], icon: Library, path: "/wiki", count: "wiki" },
  { title: "Campanhas", unit: ["campanha", "campanhas"], icon: ScrollText, path: "/campanhas", count: "campanhas" },
  { title: "Livros", unit: ["livro", "livros"], icon: BookOpen, path: "/livros", count: "livros" },
  { title: "VTT", unit: ["mesa", "mesas"], icon: Dices, path: "/vtt", count: "mesas" },
] as const

/** Início (rework F5): a próxima sessão compacta, os espaços, o que retomar, o que vem aí e as Centelhas na primeira tela. */
export function Home() {
  const vault = useVault()
  const today = new Date()
  const weekday = formatDate(today.toISOString(), { weekday: "long" })
  return (
    <div className="home">
      <header className="home-heading">
        <div>
          <span className="home-kicker">{vault.info?.name ?? "Seu universo"}</span>
          <h1>Início</h1>
        </div>
        <span className="home-date">
          {weekday.charAt(0).toUpperCase() + weekday.slice(1)}, <strong>{formatDate(today.toISOString(), { day: "numeric", month: "long" })} de {today.getFullYear()}</strong>
        </span>
      </header>
      <NextSessionBanner />
      <Spaces />
      <div className="home-columns">
        <Recent />
        <Horizon />
        <Sparks />
      </div>
    </div>
  )
}

/** Eventos da Agenda do cofre aberto (vazio sem cofre). */
function useAgendaEvents(): AgendaEvent[] {
  const vault = useVault()
  return useMemo(() => (vault.index ? agendaEvents(vault.index) : []), [vault.index, vault.version])
}

/** "faltam 2 dias e 9 h", atualizado a cada minuto. */
function useCountdown(to: Date | null): string | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  if (!to) return null
  const minutes = Math.max(0, Math.round((to.getTime() - now) / 60_000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  return minutes < 60 ? (minutes ? `começa em ${minutes} min` : "começando agora") : days ? `faltam ${days} ${days === 1 ? "dia" : "dias"}${hours ? ` e ${hours} h` : ""}` : `faltam ${hours} h`
}

/** INI-1: a mesma resposta do painel da campanha e da Tela do Mestre (core/next-session.ts), um estado por vez. */
function NextSessionBanner() {
  const vault = useVault()
  const next = useMemo(() => (vault.index ? nextSession(vault.index, new Date()) : null), [vault.index, vault.version])
  const countdown = useCountdown(next?.when ?? null)
  const players = useMemo(() => (vault.index && next?.campaign ? listPlayers(vault.index, campaignInfo(vault.index, next.campaign)) : []), [vault.index, vault.version, next?.campaign])
  const look = useMemo(() => (vault.index && next?.campaign ? campaignLook(vault.index, next.campaign) : null), [vault.index, vault.version, next?.campaign])
  const mesa = vault.index && next?.campaign ? campaignInfo(vault.index, next.campaign).mesa : undefined

  if (!next) {
    return (
      <section className="home-session empty" aria-labelledby="home-session-title">
        <div className="session-copy">
          <span className="home-kicker">Próxima sessão</span>
          <h2 id="home-session-title">Nenhuma sessão marcada</h2>
          <p className="muted">Marque a próxima sessão numa campanha ou como evento de sessão na Agenda.</p>
        </div>
        <div className="session-buttons">
          <a className="btn primary" href={href("/campanhas")}>Marcar sessão <ArrowRight size={16} /></a>
          <a className="btn" href={href("/agenda")}><CalendarDays size={16} /> Agenda</a>
        </div>
      </section>
    )
  }

  const session = next.session
  const prepDone = session?.prep.filter((p) => p.done).length ?? 0
  const present = session ? players.filter((p) => session.present.includes(p.path)).length : 0
  const whenText = next.when ? `${next.when.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}${next.allDay ? "" : ` · ${String(next.when.getHours()).padStart(2, "0")}:${String(next.when.getMinutes()).padStart(2, "0")}`}` : "sem data marcada"
  return (
    <section className={`home-session${look?.tone ? " toned" : ""}`} style={toneStyle(look?.tone)} aria-labelledby="home-session-title">
      {look?.cover && next.campaign && <CoverBand tone={look.tone} cover={look.cover} from={campaignHomePath(next.campaign)} height={96} className="home-session-cover" />}
      <div className="session-copy">
        <span className="home-kicker"><span className="status-dot" /> Próxima sessão{next.campaign ? ` · ${next.campaign}` : ""}</span>
        <h2 id="home-session-title" className="row" style={{ gap: 12 }}>
          {next.campaign && <Crest tone={look?.tone} emblem={look?.emblem} name={next.campaign} size={40} />}
          {next.title}
        </h2>
        <dl className="session-stats">
          <div><dt>Quando</dt><dd>{whenText}{countdown && <span className="session-countdown">{countdown}</span>}</dd></div>
          {session && session.prep.length > 0 && <div><dt>Preparação</dt><dd>{prepDone} de {session.prep.length}</dd></div>}
          {players.length > 0 && <div><dt>Presença</dt><dd><Users size={14} aria-hidden="true" /> {session?.present.length ? `${present} de ${players.length}` : `${players.length} jogadores, ainda não marcada`}</dd></div>}
        </dl>
      </div>
      <div className="session-buttons">
        {session ? (
          <a className="btn primary" href={href(sessionRoute(session))}>Preparar sessão <ArrowRight size={16} /></a>
        ) : next.event ? (
          <a className="btn primary" href={href(vaultRoute(next.event.event.path))}>Abrir o evento <ArrowRight size={16} /></a>
        ) : null}
        {next.campaign && <a className="btn" href={href(campaignRoute(next.campaign))}><ScrollText size={16} /> Abrir campanha</a>}
        {mesa && <a className="btn" href={href(`/vtt/mesa/${encodeURIComponent(mesa)}`)}><Dices size={16} /> Abrir mesa</a>}
      </div>
    </section>
  )
}

/** INI-3: sem números; o nome, a contagem e o atalho. */
function Spaces() {
  const counts = useVaultCounts()
  return (
    <nav className="home-spaces" aria-label="Espaços">
      {spaces.map((s) => {
        const n = counts[s.count as keyof typeof counts] ?? 0
        return (
          <a href={href(s.path)} key={s.path}>
            <s.icon size={20} aria-hidden="true" />
            <span className="space-name">{s.title}</span>
            <span className="space-count">{n} {n === 1 ? s.unit[0] : s.unit[1]}</span>
          </a>
        )
      })}
    </nav>
  )
}

/** INI-4: o título da nota, o espaço e quando foi editada. */
function Recent() {
  const vault = useVault()
  const now = Date.now()
  const recent = useMemo(() => vault.index?.allNotes().sort((a, b) => b.mtime - a.mtime).slice(0, 4) ?? [], [vault.index, vault.version])
  return (
    <section className="home-block" aria-labelledby="home-recent">
      <div className="home-section-head"><h2 id="home-recent">Retome o fio</h2></div>
      {recent.length === 0 && <p className="muted">Nenhuma nota escrita neste cofre.</p>}
      {recent.map((note) => (
        <a className="home-note" key={note.path} href={href(vaultRoute(note.path))} title={note.path}>
          <FileText size={18} aria-hidden="true" />
          <div><h3>{displayTitle(note)}</h3><small>{spaceOf(note.path)} · {editedAgo(note.mtime, now)}</small></div>
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      ))}
    </section>
  )
}

function Horizon() {
  const events = useAgendaEvents()
  const upcoming = useMemo(() => {
    const now = new Date()
    return expandEvents(events, now, new Date(now.getTime() + 90 * 86_400_000)).slice(0, 3)
  }, [events])
  return (
    <section className="home-block" aria-labelledby="home-horizon">
      <div className="home-section-head">
        <h2 id="home-horizon">No horizonte</h2>
        <a href={href("/agenda")}>Agenda <ArrowUpRight size={15} aria-hidden="true" /></a>
      </div>
      {upcoming.length === 0 && <p className="muted">Nada marcado nos próximos 90 dias.</p>}
      {upcoming.map((o) => (
        <a className="home-event" key={o.key} href={href(vaultRoute(o.event.path))}>
          <div className="date-stamp" aria-hidden="true">
            <strong>{o.start.getDate()}</strong>
            <span>{o.start.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span>
          </div>
          <div>
            <h3>{o.event.title}</h3>
            <small>{o.start.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })} · {o.event.allDay ? "dia inteiro" : `${String(o.start.getHours()).padStart(2, "0")}:${String(o.start.getMinutes()).padStart(2, "0")}`}{o.event.category ? ` · ${o.event.category}` : ""}</small>
          </div>
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      ))}
    </section>
  )
}

/**
 * INI-2: Centelhas gravam numa nota de entrada (`Notas/Entrada.md`, core/sparks.ts). Cada ideia pode ser riscada
 * como usada ou removida; “Limpar as usadas” tira as riscadas. Remover e limpar podem ser desfeitos logo em seguida.
 */
function Sparks() {
  const vault = useVault()
  const toast = useToast()
  const readOnly = vault.info?.readOnly ?? true
  const [text, setText] = useState("")
  const [undo, setUndo] = useState<{ label: string; before: string } | null>(null)
  const note = vault.index?.note(SPARKS_PATH)
  const sparks = useMemo(() => (note ? parseSparks(note.text) : []), [note?.text])
  const used = sparks.filter((s) => s.used).length
  const fail = (error: unknown) => toast(error instanceof Error ? error.message : String(error))

  const write = async (next: string, undoLabel?: string) => {
    const before = vault.index?.note(SPARKS_PATH)?.text
    if (before === undefined) await vault.createNote(SPARKS_FOLDER, SPARKS_NAME, next)
    else await vault.save(SPARKS_PATH, next)
    setUndo(undoLabel && before !== undefined ? { label: undoLabel, before } : null)
  }

  return (
    <section className="home-quick" aria-labelledby="home-sparks">
      <div className="home-section-head">
        <h2 id="home-sparks">Centelhas</h2>
        {note && <a href={href(vaultRoute(SPARKS_PATH))}>Abrir a nota <ArrowUpRight size={15} aria-hidden="true" /></a>}
      </div>
      <form
        className="home-capture"
        onSubmit={(event) => {
          event.preventDefault()
          if (!text.trim() || readOnly) return
          void write(addSpark(note?.text ?? null, text, new Date())).then(() => setText(""), fail)
        }}
      >
        <label className="sr-only" htmlFor="home-capture-input">Uma ideia para guardar</label>
        <input id="home-capture-input" className="input" placeholder="Uma ideia antes que ela escape…" value={text} onChange={(event) => setText(event.target.value)} disabled={readOnly} />
        <button className="btn primary" disabled={!text.trim() || readOnly}>
          <Plus size={16} /> Capturar
        </button>
      </form>
      <p className="small muted">{readOnly ? "Cofre em somente leitura: libere a gravação em Configurações para capturar." : <>Grava em <code>{SPARKS_PATH}</code>.</>}</p>
      {undo && (
        <div className="home-undo" role="status">
          <span>{undo.label}</span>
          <button className="btn sm ghost" onClick={() => void vault.save(SPARKS_PATH, undo.before).then(() => setUndo(null), fail)}><Undo2 size={14} /> Desfazer</button>
        </div>
      )}
      {sparks.length > 0 && (
        <ul className="home-sparks" aria-label="Ideias capturadas">
          {sparks.slice(0, 6).map((spark) => (
            <li key={`${spark.line}:${spark.text}`} className={spark.used ? "used" : ""}>
              <label className="check">
                <input type="checkbox" checked={spark.used} disabled={readOnly} onChange={() => note && void write(toggleSpark(note.text, spark.line)).catch(fail)} />
                <span>{spark.used ? <s>{spark.text}</s> : spark.text}{spark.used && <span className="sr-only"> (usada)</span>}</span>
              </label>
              {spark.at && <small>{spark.at.slice(8, 10)}/{spark.at.slice(5, 7)} {spark.at.slice(11)}</small>}
              <button className="icon-btn sm" disabled={readOnly} aria-label={`Remover a ideia “${spark.text}”`} title="Remover" onClick={() => note && void write(removeSpark(note.text, spark.line), "Ideia removida.").catch(fail)}>
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {(sparks.length > 6 || used > 0) && (
        <div className="row-wrap home-sparks-foot">
          {sparks.length > 6 && <a href={href(vaultRoute(SPARKS_PATH))}>E mais {sparks.length - 6} na nota</a>}
          {used > 0 && !readOnly && <button className="btn sm" onClick={() => note && void write(removeUsedSparks(note.text), `${used} ${used === 1 ? "ideia usada removida" : "ideias usadas removidas"}.`).catch(fail)}>Limpar as usadas ({used})</button>}
        </div>
      )}
      <button className="btn ghost sm home-new-note" onClick={() => navigate("/notas/nova")}><NotebookPen size={15} /> Nova nota</button>
    </section>
  )
}
