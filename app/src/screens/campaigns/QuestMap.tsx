import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { ArrowRight, Link2, Lock, Shapes, X } from "lucide-react"
import { listValue, QUEST_STATUS, type QuestStatus } from "../../core/campaigns"
import { buildQuestMap, QUEST_CARD, questMapCanvas, requireProblem, type QuestMapArc, type QuestMapNode } from "../../core/quest-map"
import { href, navigate } from "../../lib/router"
import { useToast } from "../../components/ui"
import { Notice } from "../../components/kit/Layout"
import { useVault } from "../../platform/VaultProvider"
import { campaignRoute, questRoute, type CampaignData } from "./campaign-state"
import { QuestMenu } from "./QuestPage"
import { writeGeneratedCanvas } from "./board-actions"

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
      await writeGeneratedCanvas(vault, file, (existing) => questMapCanvas(map, existing))
      navigate(campaignRoute(data.campaign.name, "quadro", file))
    } catch (err) { fail(err) }
  }
  // Ligar: arrastar da bolinha de um cartão até outro (ou tocar na bolinha e depois em “Ligar aqui”) grava `requer`
  // na missão de destino; a seta vai da que vem antes para a que depende dela.
  const [linking, setLinking] = useState<string | null>(null)
  const connect = (from: string, to: string) => {
    setLinking(null)
    if (data.readOnly) return toast("Libere a gravação em Configurações para ligar missões.")
    const problem = requireProblem(data.quests, from, to)
    if (problem) return toast(problem)
    const note = vault.index!.note(to)
    const current = listValue(note?.meta.frontmatter?.data?.requer)
    vault.setProperty(to, "requer", [...current, `[[${vault.index!.linkTarget(from, to)}]]`]).then(() => toast(`“${title(to)}” agora depende de “${title(from)}”.`), fail)
  }
  useEffect(() => {
    if (!linking) return
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setLinking(null) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [linking])
  const campaign = data.campaign.name
  const questOf = (path: string) => data.quests.find((q) => q.path === path)
  if (!data.quests.length) return <p className="muted small">Crie missões para ver o mapa. Use “Parte de” para pôr uma missão dentro de um arco e “Depende de” para as setas.</p>
  return (
    <div className="stack campaign-questmap">
      <div className="row-wrap campaign-questmap-bar">
        <span className="tiny muted grow">{map.arcs.filter((a) => a.path).length} arcos · {map.nodes.length} missões · {map.edges.length} pré-requisitos</span>
        <button className="btn sm" onClick={() => void toCanvas()} title={`Cria ou atualiza ${data.campaign.root}${QUEST_MAP_FILE}; o que você acrescentar no quadro continua`}><Shapes size={14} /> Gerar no Quadro</button>
      </div>
      {map.warnings.length > 0 && <Notice tone="warn" title="Ligações para conferir">{map.warnings.slice(0, 5).map((w) => <span key={w} style={{ display: "block" }}>{w}</span>)}</Notice>}
      <div role="status" className="campaign-questmap-linking-slot">
        {linking && (
          <div className="campaign-questmap-linking row-wrap">
            <span className="small grow">Escolha a missão que depende de “{title(linking)}” e toque em <strong>Ligar aqui</strong>. Esc cancela.</span>
            <button type="button" className="btn sm ghost" onClick={() => setLinking(null)}><X size={14} /> Cancelar</button>
          </div>
        )}
      </div>
      {mode === "mapa" ? (
        <div className="campaign-questmap-scroll" tabIndex={0} role="region" aria-label="Mapa de missões (role para os lados)">
          <LinkLayer map={map} byPath={byPath} readOnly={data.readOnly} onConnect={connect}>
            <svg className="campaign-questmap-edges" width={map.width + 2} height={map.height + 2} aria-hidden="true">
              <defs><marker id="seta-missao" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--line-strong)" /></marker></defs>
              {map.edges.map((e) => {
                const a = byPath.get(e.from), b = byPath.get(e.to)
                if (!a || !b) return null
                const x1 = a.x + QUEST_CARD.width, y1 = a.y + QUEST_CARD.height / 2, x2 = b.x - 2, y2 = b.y + QUEST_CARD.height / 2, mid = (x1 + x2) / 2
                return <path key={`${e.from}>${e.to}`} d={`M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`} fill="none" stroke="var(--line-strong)" strokeWidth="1.5" markerEnd="url(#seta-missao)" />
              })}
            </svg>
            {map.arcs.map((arc) => <ArcBox key={arc.path ?? "soltas"} arc={arc} campaign={campaign} />)}
            {map.nodes.map((node) => (
              <QuestCard key={node.path} node={node} data={data} title={title} readOnly={data.readOnly} onSaveParent={saveParent}
                linking={linking} onStartLink={(path) => setLinking(linking === path ? null : path)} onLinkHere={(path) => linking && connect(linking, path)} />
            ))}
          </LinkLayer>
        </div>
      ) : (
        <ul className="campaign-questmap-list">
          {map.arcs.map((arc) => (
            <li key={arc.path ?? "soltas"}>
              <span className="campaign-questmap-arc-title">
                {arc.path ? <a href={href(questRoute(campaign, arc.path))}>{arc.order && `${arc.order} · `}{arc.title}</a> : arc.title}
                <span className="tiny muted"> · {arc.done} de {arc.nodes.length} concluídas</span>
              </span>
              {arc.nodes.length > 0 && <ul>
                {arc.nodes.map((n) => (
                  <li key={n.path} className={n.blocked ? "blocked" : ""}>
                    <span className="campaign-questmap-item">
                      <span className="grow">
                        <a href={href(questRoute(data.campaign.name, n.path))}>{n.order && `${n.order} `}{n.title}</a>
                        <span className="tiny muted"> — {label(n.status)}{n.blocked ? ", bloqueada" : ""}{n.requires.length ? `; requer ${n.requires.map(title).join(", ")}` : ""}</span>
                      </span>
                      {questOf(n.path) && <QuestMenu data={data} quest={questOf(n.path)!} />}
                    </span>
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

function ArcBox({ arc, campaign }: { arc: QuestMapArc; campaign: string }) {
  return (
    <div className="campaign-questmap-arc" style={{ left: arc.x, top: arc.y, width: arc.width, height: arc.height, ["--col" as string]: arc.status ? color(arc.status) : "var(--line-strong)" }}>
      <span className="campaign-questmap-arc-title">
        {arc.path ? <a href={href(questRoute(campaign, arc.path))}>{arc.order && `${arc.order} · `}{arc.title}</a> : arc.title}
      </span>
      <span className="tiny muted">{arc.path ? "arco" : "sem arco"} · {arc.done} de {arc.nodes.length} concluídas</span>
    </div>
  )
}

function QuestCard({ node, data, title, readOnly, onSaveParent, linking, onStartLink, onLinkHere }: {
  node: QuestMapNode
  data: CampaignData
  title(path: string): string
  readOnly: boolean
  onSaveParent(node: QuestMapNode): void
  linking: string | null
  onStartLink(path: string): void
  onLinkHere(path: string): void
}) {
  const quest = data.quests.find((q) => q.path === node.path)
  return (
    <div data-quest-path={node.path} className={`campaign-questmap-card ${node.blocked ? "blocked" : ""} ${linking === node.path ? "linking" : ""}`} style={{ left: node.x, top: node.y, width: QUEST_CARD.width, height: QUEST_CARD.height, ["--col" as string]: color(node.status) }}>
      <a className="campaign-questmap-name truncate" href={href(questRoute(data.campaign.name, node.path))}>{node.order && <span className="mono faint">{node.order} </span>}{node.title}</a>
      <span className="tiny campaign-questmap-meta truncate">
        {node.blocked ? <><Lock size={11} aria-hidden="true" /> espera {node.requires.filter(Boolean).map(title).join(" e ")}</> : <>{label(node.status)}{node.requires.length ? <> · <ArrowRight size={11} aria-hidden="true" /> depois de {node.requires.length}</> : ""}</>}
      </span>
      {node.inferred && !readOnly && (
        <button type="button" className="campaign-questmap-link" onClick={() => onSaveParent(node)} title={`Está no arco pela ordem; gravar “parte de ${title(node.arc!)}” na nota`} aria-label={`Gravar que ${node.title} é parte de ${title(node.arc!)}`}>
          <Link2 size={12} />
        </button>
      )}
      {quest && <span className="campaign-questmap-menu"><QuestMenu data={data} quest={quest} /></span>}
      {!readOnly && linking && linking !== node.path && (
        <button type="button" className="btn sm primary campaign-questmap-here" onClick={() => onLinkHere(node.path)} aria-label={`Ligar aqui: ${node.title} passa a depender de ${title(linking)}`}>
          Ligar aqui
        </button>
      )}
      {!readOnly && (
        <button type="button" className="campaign-questmap-handle" data-link-from={node.path} onClick={(e) => {
          // Depois de arrastar, o clique que o navegador manda no fim não abre o modo de ligar.
          if (e.currentTarget.dataset.dragged) { delete e.currentTarget.dataset.dragged; return }
          onStartLink(node.path)
        }} aria-pressed={linking === node.path} aria-label={`Ligar ${node.title} a outra missão (a outra passa a depender desta)`} title="Arraste até outra missão para ligar" />
      )}
    </div>
  )
}

/**
 * O desenho do mapa com o arrastar das ligações: apertar a bolinha de um cartão e soltar sobre outro liga os dois. A
 * linha provisória segue o ponteiro (mouse, caneta ou dedo).
 */
function LinkLayer({ map, byPath, readOnly, onConnect, children }: {
  map: ReturnType<typeof buildQuestMap>
  byPath: Map<string, QuestMapNode>
  readOnly: boolean
  onConnect(from: string, to: string): void
  children: ReactNode
}) {
  const canvas = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ from: string; x: number; y: number } | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const point = (event: ReactPointerEvent) => {
    const box = canvas.current!.getBoundingClientRect()
    return { x: event.clientX - box.left, y: event.clientY - box.top }
  }
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const handle = (event.target as HTMLElement).closest<HTMLElement>("[data-link-from]")
    if (readOnly || !handle || event.button !== 0) return
    handle.setPointerCapture(event.pointerId)
    start.current = { x: event.clientX, y: event.clientY }
    setDrag({ from: handle.dataset.linkFrom!, ...point(event) })
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag) setDrag({ ...drag, ...point(event) })
  }
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const moved = start.current ? Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 6 : false
    setDrag(null)
    if (!moved) return
    const handle = (event.target as HTMLElement).closest<HTMLElement>("[data-link-from]")
    if (handle) handle.dataset.dragged = "1"
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-quest-path]")?.dataset.questPath
    if (target && target !== drag.from) onConnect(drag.from, target)
  }
  const from = drag ? byPath.get(drag.from) : undefined
  return (
    <div ref={canvas} className="campaign-questmap-canvas" style={{ width: map.width + 2, height: map.height + 2 }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => setDrag(null)}>
      {children}
      {drag && from && (
        <svg className="campaign-questmap-drag" width={map.width + 2} height={map.height + 2} aria-hidden="true">
          <line x1={from.x + QUEST_CARD.width} y1={from.y + QUEST_CARD.height / 2} x2={drag.x} y2={drag.y} stroke="var(--cyan)" strokeWidth="2" strokeDasharray="6 4" />
        </svg>
      )}
    </div>
  )
}
