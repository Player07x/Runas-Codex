import { useMemo, useState } from "react"
import { Crown } from "lucide-react"
import type { GraphData } from "../../core/graph-data"
import { noteName } from "../../core/text"
import { articleKind, diplomacy, familyTree, orgChart, relationsOf, type OrgNode } from "../../core/wiki"
import { href, navigate } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import { Segmented } from "../../components/ui"
import { DEFAULT_FORCES, GraphView } from "../../components/vault/GraphView"
import { useVault } from "../../platform/VaultProvider"
import { useWiki } from "./wiki-state"

type Tab = "diplomacia" | "familia" | "organizacao"

const DIPLOMACY_COLORS: Record<string, { color: string; label: string }> = {
  aliados: { color: "#9dcbb4", label: "Aliança" },
  inimigos: { color: "#ffa48e", label: "Inimizade" },
  em_guerra_com: { color: "#ff6f5e", label: "Guerra" },
  rivais: { color: "#ecc484", label: "Rivalidade" },
  paz_tensa_com: { color: "#d9b26b", label: "Paz tensa" },
  vassalo_de: { color: "#bfadf1", label: "Vassalagem" },
}

export function WikiRelations({ path }: { path?: string }) {
  const vault = useVault()
  const { wiki } = useWiki()
  const index = vault.index!
  const root = wiki!.root
  const people = useMemo(() => index.notesIn(root).filter((n) => relationsOf(index, n.path, root).some((r) => r.type.group === "familia")).map((n) => n.path), [index, root, vault.version])
  const orgs = useMemo(() => index.notesIn(root).filter((n) => articleKind(n.meta.frontmatter?.data?.tipo)?.id === "organizacao").map((n) => n.path), [index, root, vault.version])
  const initial: Tab = path ? (articleKind(index.note(path)?.meta.frontmatter?.data?.tipo)?.id === "organizacao" ? "organizacao" : "familia") : "diplomacia"
  const [tab, setTab] = useState<Tab>(initial)
  const [person, setPerson] = useState(path && initial === "familia" ? path : (people[0] ?? ""))
  // Sem organização pedida, abre a primeira que tem membros.
  const [org, setOrg] = useState(() => (path && initial === "organizacao" ? path : (orgs.find((o) => orgChart(index, o, root).children.length > 0) ?? orgs[0] ?? "")))

  return (
    <div className="page wiki-relations-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Wiki · {wiki!.name}</span>
          <h1 className="page-title">Relações</h1>
        </div>
        <Segmented<Tab>
          label="Visão das relações"
          value={tab}
          onChange={setTab}
          options={[
            { value: "diplomacia", label: "Teia diplomática" },
            { value: "familia", label: "Árvore genealógica" },
            { value: "organizacao", label: "Organograma" },
          ]}
        />
      </div>
      {tab === "diplomacia" && <Diplomacy root={root} />}
      {tab === "familia" &&
        (people.length ? (
          <>
            <select className="select" value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Pessoa da árvore">
              {people.map((p) => (
                <option key={p} value={p}>
                  {noteName(p)}
                </option>
              ))}
            </select>
            {person && <FamilyTreeView center={person} root={root} />}
          </>
        ) : (
          <p className="muted">Nenhuma relação de família. Use as propriedades <code>pais</code>, <code>filhos</code>, <code>conjuges</code> e <code>irmaos</code> (listas de links) nos artigos.</p>
        ))}
      {tab === "organizacao" &&
        (orgs.length ? (
          <>
            <select className="select" value={org} onChange={(e) => setOrg(e.target.value)} aria-label="Organização">
              {orgs.map((p) => (
                <option key={p} value={p}>
                  {noteName(p)}
                </option>
              ))}
            </select>
            {org && <OrgChartView org={org} root={root} />}
          </>
        ) : (
          <p className="muted">Nenhuma organização. Crie artigos do tipo Organização; os membros usam <code>membro_de</code>, <code>lider_de</code> e <code>subordinado_a</code>.</p>
        ))}
    </div>
  )
}

function Diplomacy({ root }: { root: string }) {
  const vault = useVault()
  const index = vault.index!
  const web = useMemo(() => diplomacy(index, root), [index, root, vault.version])
  const data = useMemo<GraphData>(
    () => ({
      nodes: web.nodes.map((path) => ({ id: path, label: noteName(path), kind: "note" as const, path, degree: web.edges.filter((e) => e.from === path || e.to === path).length })),
      edges: web.edges.map((e) => ({ source: e.from, target: e.to, color: DIPLOMACY_COLORS[e.kind]?.color ?? "#69799c", ...(e.kind === "vassalo_de" ? {} : { mutual: true }) })),
    }),
    [web],
  )
  if (!web.edges.length) return <p className="muted">Nenhuma relação entre facções. Em organizações, países, culturas e religiões, use <code>aliados</code>, <code>inimigos</code>, <code>rivais</code>, <code>em_guerra_com</code>, <code>paz_tensa_com</code> e <code>vassalo_de</code>.</p>
  return (
    <div className="stack">
      <div className="diplomacy-graph card flat">
        <GraphView data={data} groups={[]} forces={{ ...DEFAULT_FORCES, repulsion: 400, distance: 120, linkWidth: 2.5, nodeSize: 1.6, arrows: true }} labels="always" onOpen={(node) => navigate(noteRoute(node.path))} />
      </div>
      <div className="row-wrap">
        {Object.entries(DIPLOMACY_COLORS)
          .filter(([kind]) => web.edges.some((e) => e.kind === kind))
          .map(([kind, { color, label }]) => (
            <span key={kind} className="chip" style={{ borderColor: color, color }}>
              {label}
            </span>
          ))}
      </div>
    </div>
  )
}

const BOX_W = 150
const BOX_H = 40
const GAP_X = 30
const GAP_Y = 70

function FamilyTreeView({ center, root }: { center: string; root: string }) {
  const vault = useVault()
  const tree = useMemo(() => familyTree(vault.index!, center, 2, root), [vault.index, center, root, vault.version])
  const levels = [...tree.generations.keys()].sort((a, b) => a - b)
  const widest = Math.max(...levels.map((g) => tree.generations.get(g)!.length))
  const width = widest * (BOX_W + GAP_X) + GAP_X
  const pos = new Map<string, { x: number; y: number }>()
  levels.forEach((g, row) => {
    const people = tree.generations.get(g)!
    const offset = (width - people.length * (BOX_W + GAP_X) + GAP_X) / 2
    people.forEach((p, i) => pos.set(p, { x: offset + i * (BOX_W + GAP_X), y: 20 + row * (BOX_H + GAP_Y) }))
  })
  const height = 40 + levels.length * (BOX_H + GAP_Y) - GAP_Y
  return (
    <div className="card flat family-tree">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={`Árvore genealógica de ${noteName(center)}`}>
        {tree.edges.map((e, i) => {
          const a = pos.get(e.from)
          const b = pos.get(e.to)
          if (!a || !b) return null
          if (e.kind === "casamento") return <line key={i} x1={a.x + BOX_W} y1={a.y + BOX_H / 2} x2={b.x} y2={b.y + BOX_H / 2} className="tree-marriage" />
          const [x1, y1, x2, y2] = [a.x + BOX_W / 2, a.y + BOX_H, b.x + BOX_W / 2, b.y]
          return <path key={i} d={`M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`} className="tree-line" />
        })}
        {[...pos].map(([path, p]) => (
          <a key={path} href={href(noteRoute(path))}>
            <rect x={p.x} y={p.y} width={BOX_W} height={BOX_H} rx={10} className={`tree-box ${path === center ? "center" : ""}`} />
            <text x={p.x + BOX_W / 2} y={p.y + BOX_H / 2 + 4} textAnchor="middle" className="tree-name">
              {noteName(path).length > 20 ? noteName(path).slice(0, 19) + "…" : noteName(path)}
            </text>
          </a>
        ))}
      </svg>
      <span className="tiny faint">Linha cheia: filiação · tracejada: casamento. Clique num nome para abrir o artigo.</span>
    </div>
  )
}

function OrgChartView({ org, root }: { org: string; root: string }) {
  const vault = useVault()
  const chart = useMemo(() => orgChart(vault.index!, org, root), [vault.index, org, root, vault.version])
  const node = (n: OrgNode, depth: number) => (
    <li key={n.path}>
      <a href={href(noteRoute(n.path))} className={`org-node ${depth === 0 ? "root" : ""} ${n.role === "lider" ? "leader" : ""}`}>
        {n.role === "lider" && <Crown size={13} />} {noteName(n.path)}
      </a>
      {n.children.length > 0 && <ul>{n.children.map((c) => node(c, depth + 1))}</ul>}
    </li>
  )
  return (
    <div className="card flat org-chart">
      {chart.children.length ? <ul className="org-tree">{node(chart, 0)}</ul> : <p className="muted small">Ninguém declarou ser membro desta organização (propriedade <code>membro_de</code> nos artigos dos membros).</p>}
    </div>
  )
}
