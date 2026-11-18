import { useEffect, useMemo, useState } from "react"
import { ArrowRight, ArrowUpRight, Dices, FileText, Plus, ScrollText, Undo2, Users, X } from "lucide-react"
import { href } from "../lib/router"
import { formatDate } from "../lib/navigation"
import { expandEvents, isoDate, type AgendaEvent } from "../core/agenda"
import { agendaEvents } from "../lib/agenda-data"
import { vaultRoute } from "../lib/vault-notes"
import { useVault } from "../platform/VaultProvider"
import { campaignInfo, listPlayers } from "../core/campaigns"
import { isRpgSession, nextSession } from "../core/next-session"
import { campaignHomePath, campaignLook } from "../core/personalization"
import { toneStyle } from "../core/tones"
import { displayTitle, editedAgo, spaceOf } from "../core/relative-time"
import { addSpark, parseSparks, removeSpark, removeUsedSparks, SPARKS_FOLDER, SPARKS_NAME, SPARKS_PATH, toggleSpark } from "../core/sparks"
import { CoverBand, Crest } from "../components/kit/Emblem"
import { useToast } from "../components/ui"
import { useNotesLock } from "../lib/notes-lock"
import { scopeOf } from "../core/spaces"
import { campaignRoute, sessionRoute } from "./campaigns/campaign-state"
import { listCampaigns } from "../core/campaigns"
import { activeCampaignsNow, homeTasks } from "../core/home-today"
import { vaultTasks } from "../lib/tasks"
import { useTaskActions } from "../components/tasks/useTaskActions"
import type { Task } from "../core/tasks/task"
import "./home.css"

/**
 * Início 1.6 (U46, maquete aprovada em 17/11, decisão 7): cinco blocos, como antes, trocados de lugar. O destaque
 * vira “Mesa de hoje” no dia da sessão; “Hoje” (evento, tarefas e hábito) troca o “No horizonte”; “Campanhas ativas”
 * troca a fileira de contadores (os espaços continuam na navegação do app); “Retome o fio” e as Centelhas encolhem.
 */
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
      <div className="home-columns">
        <Today />
        <ActiveCampaigns />
        <div className="home-secondary">
          <Recent />
          <Sparks />
        </div>
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
  const info = vault.index && next?.campaign ? campaignInfo(vault.index, next.campaign) : null
  const mesa = info?.mesa

  if (!next) {
    // Os Espaços logo abaixo já levam à Agenda e às Campanhas: o botão daqui vai direto às sessões da campanha ativa
    // (onde fica “Nova sessão”) e some quando não há campanha ativa.
    const active = vault.index ? listCampaigns(vault.index).filter((c) => c.status === "ativa") : []
    const latest = active.sort((a, b) => (vault.index!.note(b.home ?? "")?.mtime ?? 0) - (vault.index!.note(a.home ?? "")?.mtime ?? 0))[0]
    return (
      <section className="home-session empty" aria-labelledby="home-session-title">
        <div className="session-copy">
          <span className="home-kicker">Próxima sessão</span>
          <h2 id="home-session-title">Nenhuma sessão marcada</h2>
          <p className="muted">Escolha uma data na campanha para a próxima mesa, ou marque um evento de sessão na Agenda.</p>
        </div>
        {latest && <div className="session-buttons">
          <a className="btn primary" href={href(campaignRoute(latest.name, "sessoes"))} aria-label={`Marcar sessão em ${latest.name}`} title={`Sessões de ${latest.name}`}>Marcar sessão <ArrowRight size={16} /></a>
        </div>}
      </section>
    )
  }

  const session = next.session
  const prepDone = session?.prep.filter((p) => p.done).length ?? 0
  const present = session ? players.filter((p) => session.present.includes(p.path)).length : 0
  const hour = next.when && !next.allDay ? `${String(next.when.getHours()).padStart(2, "0")}:${String(next.when.getMinutes()).padStart(2, "0")}` : ""
  // No dia marcado, o destaque vira “Mesa de hoje” e diz só a hora.
  const today = Boolean(next.when && isoDate(next.when) === isoDate(new Date()) && isRpgSession(next))
  const whenText = today ? hour || "dia inteiro" : next.when ? `${next.when.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}${hour ? ` · ${hour}` : ""}` : "sem data marcada"
  return (
    <section className={`home-session${look?.tone ? " toned" : ""}`} style={toneStyle(look?.tone)} aria-labelledby="home-session-title">
      {look?.cover && next.campaign && <CoverBand tone={look.tone} cover={look.cover} from={campaignHomePath(next.campaign)} height={96} className="home-session-cover" />}
      <div className="session-copy">
        <span className="home-kicker"><span className="status-dot" /> {today ? "Mesa de hoje" : isRpgSession(next) ? "Próxima sessão" : "Próximo evento"}{next.campaign ? ` · ${next.campaign}` : next.event?.event.category ? ` · ${next.event.event.category}` : ""}</span>
        <h2 id="home-session-title" className="row" style={{ gap: 12 }}>
          {next.campaign && <Crest tone={look?.tone} emblem={look?.emblem} name={next.campaign} size={40} />}
          {next.title}
        </h2>
        <dl className="session-stats">
          <div><dt>{today ? "Hoje" : "Quando"}</dt><dd>{whenText}{countdown && <span className="session-countdown">{countdown}</span>}</dd></div>
          {session && session.prep.length > 0 && <div><dt>Preparação</dt><dd>{prepDone} de {session.prep.length}</dd></div>}
          {players.length > 0 && <div><dt>Presença</dt><dd><Users size={14} aria-hidden="true" /> {session?.present.length ? `${present} de ${players.length}` : <span>{players.length} jogadores<span className="session-unmarked">, ainda não marcada</span></span>}</dd></div>}
        </dl>
      </div>
      <div className="session-buttons">
        {session ? (
          <a className="btn primary" href={href(sessionRoute(session))}>Preparar sessão <ArrowRight size={16} /></a>
        ) : next.event ? (
          <a className="btn primary" href={href(vaultRoute(next.event.event.path))}>Abrir o evento <ArrowRight size={16} /></a>
        ) : null}
        {/* A campanha ativa abre pelo cartão de Campanhas ativas; o botão fica só para as outras. */}
        {next.campaign && info?.status !== "ativa" && <a className="btn" href={href(campaignRoute(next.campaign))}><ScrollText size={16} /> Abrir campanha</a>}
        {mesa && <a className="btn" href={href(`/vtt/mesa/${encodeURIComponent(mesa)}`)}><Dices size={16} /> Abrir mesa</a>}
      </div>
    </section>
  )
}

/** O que o PIN do espaço Notas esconde: as notas de Notas/ e as de fora dos espaços (lib/tasks.ts faz igual). */
const isLockedNote = (path: string) => { const space = scopeOf(path).space; return space === "notas" || space === null }

/** INI-4: o título da nota, o espaço e quando foi editada. */
function Recent() {
  const vault = useVault()
  const now = Date.now()
  // Com o PIN das Notas bloqueado, nem o título delas aparece aqui (como nas tarefas da Agenda).
  const { locked } = useNotesLock()
  const recent = useMemo(() => vault.index?.allNotes().filter((note) => !locked || !isLockedNote(note.path)).sort((a, b) => b.mtime - a.mtime).slice(0, 2) ?? [], [vault.index, vault.version, locked])
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

const hourOf = (date: Date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
const shortDay = (iso: string) => new Date(`${iso}T12:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })

/** U46: o que é de hoje — eventos, tarefas que vencem (e atrasadas) e hábitos, com a caixa de marcar do Tasks. */
function Today() {
  const vault = useVault()
  const events = useAgendaEvents()
  const actions = useTaskActions()
  const { locked } = useNotesLock()
  const todayIso = isoDate(new Date())
  const next = useMemo(() => (vault.index ? nextSession(vault.index, new Date()) : null), [vault.index, vault.version])
  const occurrences = useMemo(() => {
    const start = new Date(`${todayIso}T00:00`)
    return expandEvents(events, start, new Date(start.getTime() + 86_400_000 - 1)).slice(0, 2)
  }, [events, todayIso])
  const all = useMemo(() => (vault.index ? vaultTasks(vault.index, actions.settings, { notesLocked: locked }) : []), [vault.index, vault.version, actions.settings, locked])
  const { tasks, habits, hidden } = useMemo(() => homeTasks(all, todayIso), [all, todayIso])
  // A sessão do destaque já abre por lá: aqui ela é só o horário.
  const highlighted = next?.event?.event.path ?? next?.session?.path
  const check = (task: Task, detail?: string, overdue = false) => (
    <label key={`${task.path}:${task.line}`} className={`today-check${overdue ? " overdue" : ""}`}>
      <input type="checkbox" checked={task.status.type === "DONE"} disabled={actions.readOnly} onChange={() => void actions.toggle(task)} />
      <span>{task.description}{detail && <small>{detail}</small>}</span>
    </label>
  )
  return (
    <section className="home-block home-today" aria-labelledby="home-today">
      <div className="home-section-head"><h2 id="home-today">Hoje</h2><span className="tiny muted">{shortDay(todayIso)}</span></div>
      {occurrences.length === 0 && <p className="small muted today-empty">Nenhum evento hoje.</p>}
      {occurrences.map((o) => {
        const body = <>
          <span className="today-time">{o.event.allDay ? "dia" : hourOf(o.start)}</span>
          <span>{o.event.title}{o.event.category && <small>{o.event.category}</small>}</span>
        </>
        return o.event.path === highlighted
          ? <div className="today-event" key={o.key}>{body}</div>
          : <a className="today-event" key={o.key} href={href(vaultRoute(o.event.path))}>{body}<ArrowUpRight size={14} aria-hidden="true" /></a>
      })}
      {tasks.length > 0 && <div className="today-group" aria-hidden="true">Tarefas</div>}
      {tasks.length > 0 && <div role="group" aria-label="Tarefas de hoje">{tasks.map(({ task, overdue }) => check(task, overdue ? `Atrasada · ${shortDay(task.dueDate!)}` : "Vence hoje", overdue))}</div>}
      {habits.length > 0 && <div className="today-group" aria-hidden="true">{habits.length === 1 ? "Hábito" : "Hábitos"}</div>}
      {habits.length > 0 && <div role="group" aria-label="Hábitos de hoje">{habits.map((task) => check(task))}</div>}
      {tasks.length === 0 && habits.length === 0 && <p className="small muted">Nenhuma tarefa ou hábito para hoje.</p>}
      <a className="today-more" href={href("/agenda")}>{hidden ? `Mais ${hidden} na Agenda` : "Ver o dia na Agenda"} <ArrowUpRight size={14} aria-hidden="true" /></a>
    </section>
  )
}

/** U46: troca a fileira de contadores; cada campanha ativa com a data (e a hora) no mundo e o atalho para ela. */
function ActiveCampaigns() {
  const vault = useVault()
  const { list, total } = useMemo(() => (vault.index ? activeCampaignsNow(vault.index) : { list: [], total: 0 }), [vault.index, vault.version])
  return (
    <section className="home-block active-campaigns" aria-labelledby="home-campaigns">
      <div className="home-section-head"><h2 id="home-campaigns">Campanhas ativas</h2>{total > 0 && <span className="tiny muted">{total}</span>}</div>
      {list.length === 0 && <p className="small muted">Nenhuma campanha ativa. <a href={href("/campanhas")}>Abrir Campanhas</a></p>}
      {list.map(({ campaign, world }) => {
        const look = campaignLook(vault.index!, campaign.name)
        return (
          <a className="campaign-item" key={campaign.name} href={href(campaignRoute(campaign.name))}>
            <Crest tone={look.tone} emblem={look.emblem} name={campaign.name} size={32} />
            <span><strong>{campaign.name}</strong><small>{world ?? "Sem calendário do mundo"}</small></span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        )
      })}
      {total > list.length && <a className="today-more" href={href("/campanhas")}>Todas as {total} campanhas ativas <ArrowUpRight size={14} aria-hidden="true" /></a>}
      {list.some((c) => c.world) && <p className="tiny muted">Data e hora no mundo de cada campanha.</p>}
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
  // A nota de entrada fica em Notas/: com o PIN bloqueado, dá para capturar, mas as ideias não aparecem.
  const { locked } = useNotesLock()
  const sparks = useMemo(() => (note && !locked ? parseSparks(note.text) : []), [note?.text, locked])
  const used = sparks.filter((s) => s.used).length
  const fail = (error: unknown) => toast.error(error)

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
        {note && !locked && <a href={href(vaultRoute(SPARKS_PATH))}>Abrir a nota <ArrowUpRight size={15} aria-hidden="true" /></a>}
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
        <button type="submit" className="btn primary home-capture-btn" disabled={!text.trim() || readOnly} title="Capturar ideia">
          <Plus size={16} aria-hidden="true" /><span className="sr-only">Capturar ideia</span>
        </button>
      </form>
      <p className="small muted">{readOnly ? "Cofre em somente leitura: libere a gravação em Configurações para capturar." : locked ? <>Grava em <code>{SPARKS_PATH}</code>. As ideias guardadas aparecem depois de desbloquear as Notas com o PIN.</> : <>Grava em <code>{SPARKS_PATH}</code>.</>}</p>
      {undo && !locked && (
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
          {sparks.length > 6 && <span className="small muted">E mais {sparks.length - 6} na nota</span>}
          {used > 0 && !readOnly && <button className="btn sm" onClick={() => note && void write(removeUsedSparks(note.text), `${used} ${used === 1 ? "ideia usada removida" : "ideias usadas removidas"}.`).catch(fail)}>Limpar as usadas ({used})</button>}
        </div>
      )}
    </section>
  )
}
