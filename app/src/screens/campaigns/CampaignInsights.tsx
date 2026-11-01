import { useMemo } from "react"
import { castRows, type SessionInfo } from "../../core/campaigns"
import { changesSince, hasChanges, hasLooseThreads, looseThreads, secretQuest } from "../../core/campaign-insights"
import { noteName } from "../../core/text"
import { href } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { questRoute, sessionRoute, type CampaignData } from "./campaign-state"

const STATUS_LABEL: Record<string, string> = { ideia: "ideia", ativa: "ativa", pausada: "em pausa", concluida: "concluída", falhou: "falhou" }

/** Linhas do Elenco (com as sessões em que cada NPC aparece), refeitas só quando o cofre muda. */
function useCastRows(data: CampaignData) {
  const vault = useVault()
  return useMemo(() => castRows(vault.index!, data.npcs, data.sessions), [vault.index, vault.version, data.npcs, data.sessions])
}

/**
 * “O que mudou desde a última sessão” (ideia da revisão das Campanhas), no topo da preparação: o recap do mestre,
 * montado com o que o cofre já sabe. Missões “mexidas” são as notas alteradas do dia da sessão em diante.
 */
export function ChangesSinceCard({ data, last }: { data: CampaignData; last: SessionInfo }) {
  const vault = useVault()
  const rows = useCastRows(data)
  const changes = useMemo(
    () => changesSince(vault.index!, { quests: data.quests, secrets: data.secrets, rows, clocks: "error" in data.clocks ? [] : data.clocks, home: data.campaign.home }, last),
    [vault.index, vault.version, data, rows, last],
  )
  if (!hasChanges(changes)) return null
  return (
    <section className="campaign-changes stack" aria-labelledby="mudou-desde">
      <h3 id="mudou-desde" className="eyebrow">Desde a <a href={href(sessionRoute(last))}>{noteName(last.path)}</a></h3>
      {changes.quests.length > 0 && (
        <p className="small">
          <strong>Missões mexidas:</strong>{" "}
          {changes.quests.map((q, i) => <span key={q.path}>{i > 0 && ", "}<a href={href(questRoute(data.campaign.name, q.path))}>{q.title}</a> ({STATUS_LABEL[q.status]})</span>)}
        </p>
      )}
      {changes.revealed.length > 0 && (
        <p className="small"><strong>Pistas reveladas:</strong> {changes.revealed.map((s) => secretQuest(s.clean)?.text ?? s.clean).join("; ")}</p>
      )}
      {changes.newNpcs.length > 0 && (
        <p className="small">
          <strong>NPCs novos:</strong>{" "}
          {changes.newNpcs.map((r, i) => <span key={r.item.position}>{i > 0 && ", "}{r.item.dest ? <a href={href(noteRoute(r.item.dest))}>{r.name}</a> : r.name}</span>)}
        </p>
      )}
      {changes.clocks.length > 0 && (
        <p className="small">
          <strong>Relógios quase cheios:</strong>{" "}
          {changes.clocks.map((c) => `${c.name} ${c.filled}/${c.segments}${c.quest ? ` (${c.quest.title})` : ""}`).join("; ")}
        </p>
      )}
    </section>
  )
}

/**
 * Fios soltos (ideia da revisão das Campanhas): missões ativas que as últimas sessões não citam, NPCs que apareceram
 * uma vez e sumiram, e pistas guardadas de missões já encerradas. Some quando não há nada.
 */
export function LooseThreadsCard({ data }: { data: CampaignData }) {
  const vault = useVault()
  const rows = useCastRows(data)
  const threads = useMemo(
    () => looseThreads(vault.index!, { quests: data.quests, sessions: data.sessions, secrets: data.secrets, rows, home: data.campaign.home }),
    [vault.index, vault.version, data, rows],
  )
  if (!hasLooseThreads(threads)) return null
  return (
    <section className="card stack">
      <span className="section-title">Fios soltos</span>
      <span className="tiny faint">Pontas que os jogadores já conhecem e ficaram para trás nas últimas 3 sessões.</span>
      {threads.quiet.length > 0 && (
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow">Missões ativas sem aparecer</span>
          {threads.quiet.slice(0, 6).map((q) => <a key={q.path} className="small" href={href(questRoute(data.campaign.name, q.path))}>{q.order && `${q.order} `}{q.title}</a>)}
        </div>
      )}
      {threads.vanished.length > 0 && (
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow">NPCs que apareceram uma vez</span>
          {threads.vanished.slice(0, 6).map((r) => (
            <span key={r.item.position} className="small">
              {r.item.dest ? <a href={href(noteRoute(r.item.dest))}>{r.name}</a> : r.name} <span className="tiny faint">· {noteName(r.seen[0]!.path)}</span>
            </span>
          ))}
        </div>
      )}
      {threads.stale.length > 0 && (
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow">Pistas de missões encerradas</span>
          {threads.stale.slice(0, 6).map(({ secret, quest }) => (
            <span key={secret.line} className="small">{secretQuest(secret.clean)?.text ?? secret.clean} <span className="tiny faint">· {quest.title} ({STATUS_LABEL[quest.status]})</span></span>
          ))}
        </div>
      )}
    </section>
  )
}
