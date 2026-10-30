import { useMemo } from "react"
import { ArrowRight, Link2, Lock, Shapes } from "lucide-react"
import { QUEST_STATUS, type QuestStatus } from "../../core/campaigns"
import { canvasToSave, emptyCanvasText, parseCanvas } from "../../core/canvas"
import { buildQuestMap, QUEST_CARD, questMapCanvas, type QuestMapArc, type QuestMapNode } from "../../core/quest-map"
import { href, navigate } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import { useToast } from "../../components/ui"
import { Notice } from "../../components/kit/Layout"
import { useVault } from "../../platform/VaultProvider"
import { campaignRoute, type CampaignData } from "./campaign-state"

const label = (status: QuestStatus) => QUEST_STATUS.find((s) => s.id === status)?.label ?? status
const color = (status: QuestStatus) => `var(--${QUEST_STATUS.find((s) => s.id === status)?.color ?? "line"})`
export const QUEST_MAP_FILE = "Mapa de missões.canvas"

/**
 * Mapa de missões: os arcos (missões-mãe, `parte_de`) como grupos e, dentro, as missões em colunas pela ordem dos
 * pré-requisitos (`requer`). A borda é a situação; tracejada quer dizer bloqueada (não depende só da cor). A mesma
 * estrutura aparece como lista, a alternativa para o celular e para leitor de tela.
 */
export function QuestMapView({ data, mode }: { data: CampaignData; mode: "mapa" | "lista" }) {
  const vault = useVault()
  const toast = useToast()
  const map = useMemo(() => buildQuestMap(data.quests), [data.quests])
  const byPath = useMemo(() => new Map(map.nodes.map((n) => [n.path, n])), [map])
  const title = (path: string) => byPath.get(path)?.title ?? data.quests.find((q) => q.path === path)?.title ?? path
  const fail = (err: unknown) => toast(err instanceof Error ? err.message : String(err))
  // A ligação deduzida pela ordem (2.1 dentro de 2) vira `parte_de` de verdade na nota.
  const saveParent = (node: QuestMapNode) => {
    if (data.readOnly || !node.arc) return toast("Libere a gravação em Configurações para gravar a ligação.")
    vault.setProperty(node.path, "parte_de", `[[${vault.index!.linkTarget(node.arc, node.path)}]]`).then(() => toast(`“${node.title}” agora é parte de “${title(node.arc!)}”.`), fail)
  }
  const toCanvas = async () => {
    if (data.readOnly) return toast("Libere a gravação em Configurações para gerar o quadro.")
    const file = `${data.campaign.root}${QUEST_MAP_FILE}`
    try {
      const current = vault.index!.hasFile(file) ? (await vault.platform.readTexts([file]))[file] ?? null : null
      const parsed = current ? parseCanvas(current) : null
      if (parsed && "error" in parsed) throw new Error(`O quadro ${QUEST_MAP_FILE} tem um erro: ${parsed.error}`)
      const doc = questMapCanvas(map, parsed?.doc)
      if (!current) await vault.createFile(file, canvasToSave(emptyCanvasText(), doc) ?? emptyCanvasText())
      else {
        const text = canvasToSave(current, doc)
        if (text) await vault.save(file, text)
      }
      navigate(campaignRoute(data.campaign.name, "quadro", file))
    } catch (err) { fail(err) }
  }
  if (!data.quests.length) return <p className="muted small">Crie missões para ver o mapa. Use “Parte de” para pôr uma missão dentro de um arco e “Depende de” para as setas.</p>
  return (
    <div className="stack campaign-questmap">
      <div className="row-wrap campaign-questmap-bar">
        <span className="tiny muted grow">{map.arcs.filter((a) => a.path).length} arcos · {map.nodes.length} missões · {map.edges.length} pré-requisitos</span>
        <button className="btn sm" onClick={() => void toCanvas()} title={`Cria ou atualiza ${data.campaign.root}${QUEST_MAP_FILE}; o que você acrescentar no quadro continua`}><Shapes size={14} /> Gerar no Quadro</button>
      </div>
      {map.warnings.length > 0 && <Notice tone="warn" title="Ligações para conferir">{map.warnings.slice(0, 5).map((w) => <span key={w} style={{ display: "block" }}>{w}</span>)}</Notice>}
      {mode === "mapa" ? (
        <div className="campaign-questmap-scroll" tabIndex={0} role="region" aria-label="Mapa de missões (role para os lados)">
          <div className="campaign-questmap-canvas" style={{ width: map.width + 2, height: map.height + 2 }}>
            <svg className="campaign-questmap-edges" width={map.width + 2} height={map.height + 2} aria-hidden="true">
              <defs><marker id="seta-missao" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--line-strong)" /></marker></defs>
              {map.edges.map((e) => {
                const a = byPath.get(e.from), b = byPath.get(e.to)
                if (!a || !b) return null
                const x1 = a.x + QUEST_CARD.width, y1 = a.y + QUEST_CARD.height / 2, x2 = b.x - 2, y2 = b.y + QUEST_CARD.height / 2, mid = (x1 + x2) / 2
                return <path key={`${e.from}>${e.to}`} d={`M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`} fill="none" stroke="var(--line-strong)" strokeWidth="1.5" markerEnd="url(#seta-missao)" />
              })}
            </svg>
            {map.arcs.map((arc) => <ArcBox key={arc.path ?? "soltas"} arc={arc} />)}
            {map.nodes.map((node) => <QuestCard key={node.path} node={node} title={title} readOnly={data.readOnly} onSaveParent={saveParent} />)}
          </div>
        </div>
      ) : (
        <ul className="campaign-questmap-list">
          {map.arcs.map((arc) => (
            <li key={arc.path ?? "soltas"}>
              <span className="campaign-questmap-arc-title">
                {arc.path ? <a href={href(noteRoute(arc.path))}>{arc.order && `${arc.order} · `}{arc.title}</a> : arc.title}
                <span className="tiny muted"> · {arc.done} de {arc.nodes.length} concluídas</span>
              </span>
              {arc.nodes.length > 0 && <ul>
                {arc.nodes.map((n) => (
                  <li key={n.path} className={n.blocked ? "blocked" : ""}>
                    <a href={href(noteRoute(n.path))}>{n.order && `${n.order} `}{n.title}</a>
                    <span className="tiny muted"> — {label(n.status)}{n.blocked ? ", bloqueada" : ""}{n.requires.length ? `; requer ${n.requires.map(title).join(", ")}` : ""}</span>
                  </li>
                ))}
              </ul>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ArcBox({ arc }: { arc: QuestMapArc }) {
  return (
    <div className="campaign-questmap-arc" style={{ left: arc.x, top: arc.y, width: arc.width, height: arc.height, ["--col" as string]: arc.status ? color(arc.status) : "var(--line-strong)" }}>
      <span className="campaign-questmap-arc-title">
        {arc.path ? <a href={href(noteRoute(arc.path))}>{arc.order && `${arc.order} · `}{arc.title}</a> : arc.title}
      </span>
      <span className="tiny muted">{arc.path ? "arco" : "sem arco"} · {arc.done} de {arc.nodes.length} concluídas</span>
    </div>
  )
}

function QuestCard({ node, title, readOnly, onSaveParent }: { node: QuestMapNode; title(path: string): string; readOnly: boolean; onSaveParent(node: QuestMapNode): void }) {
  return (
    <div className={`campaign-questmap-card ${node.blocked ? "blocked" : ""}`} style={{ left: node.x, top: node.y, width: QUEST_CARD.width, height: QUEST_CARD.height, ["--col" as string]: color(node.status) }}>
      <a className="campaign-questmap-name truncate" href={href(noteRoute(node.path))}>{node.order && <span className="mono faint">{node.order} </span>}{node.title}</a>
      <span className="tiny campaign-questmap-meta truncate">
        {node.blocked ? <><Lock size={11} aria-hidden="true" /> espera {node.requires.filter(Boolean).map(title).join(" e ")}</> : <>{label(node.status)}{node.requires.length ? <> · <ArrowRight size={11} aria-hidden="true" /> depois de {node.requires.length}</> : ""}</>}
      </span>
      {node.inferred && !readOnly && (
        <button type="button" className="campaign-questmap-link" onClick={() => onSaveParent(node)} title={`Está no arco pela ordem; gravar “parte de ${title(node.arc!)}” na nota`} aria-label={`Gravar que ${node.title} é parte de ${title(node.arc!)}`}>
          <Link2 size={12} />
        </button>
      )}
    </div>
  )
}
