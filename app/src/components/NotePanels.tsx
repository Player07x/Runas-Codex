import { useState } from "react"
import { ArrowUpRight, Link2, ListTree, Network, Tags, Unlink } from "lucide-react"
import type { Note } from "../data/types"
import { backlinksOf, outgoingOf, splitFrontmatter } from "../lib/links"
import { navigate } from "../lib/router"
import { useNoteSet } from "../lib/note-set"
import { SPACES } from "../lib/spaces"
import { useToast } from "./ui"

type Tab = "props" | "links" | "outline" | "graph"

export function NotePanels({ note }: { note: Note }) {
  const [tab, setTab] = useState<Tab>("links")
  return (
    <div className="stack" style={{ gap: 0 }}>
      <div className="tabs" style={{ padding: "0 8px" }}>
        <button className={tab === "links" ? "active" : ""} onClick={() => setTab("links")} title="Backlinks e links de saída">
          <Link2 size={15} /> Links
        </button>
        <button className={tab === "props" ? "active" : ""} onClick={() => setTab("props")} title="Propriedades">
          <Tags size={15} /> Prop.
        </button>
        <button className={tab === "outline" ? "active" : ""} onClick={() => setTab("outline")} title="Sumário">
          <ListTree size={15} />
        </button>
        <button className={tab === "graph" ? "active" : ""} onClick={() => setTab("graph")} title="Gráfico local">
          <Network size={15} />
        </button>
      </div>
      <div className="pane-body">
        {tab === "links" && <LinksPanel note={note} />}
        {tab === "props" && <PropertiesPanel note={note} />}
        {tab === "outline" && <OutlinePanel note={note} />}
        {tab === "graph" && <LocalGraph note={note} />}
      </div>
    </div>
  )
}

function LinksPanel({ note }: { note: Note }) {
  const toast = useToast()
  const { notes, routeOf } = useNoteSet()
  const backs = backlinksOf(note, notes)
  const same = backs.filter((b) => !b.crossSpace)
  const other = backs.filter((b) => b.crossSpace)
  const outgoing = outgoingOf(note, notes)
  const mentions = note.title === "Valdris" ? ["Rascunho — O Corvo Manco"] : []
  return (
    <>
      <div className="stack">
        <span className="eyebrow">Ligam para esta nota · {same.length}</span>
        {same.length === 0 && <span className="muted small">Nenhuma nota deste espaço aponta para cá.</span>}
        {same.map((b) => (
          <button key={b.note.id} className="card tight link" onClick={() => navigate(routeOf(b.note))}>
            <strong className="small">{b.note.title}</strong>
            <p className="muted small" style={{ marginTop: 2 }}>{b.context}</p>
          </button>
        ))}
      </div>
      {other.length > 0 && (
        <div className="stack">
          <span className="eyebrow" style={{ color: "var(--violet)" }}>De outros espaços · {other.length}</span>
          {other.map((b) => (
            <button key={b.note.id} className="card tight link" onClick={() => navigate(routeOf(b.note))}>
              <span className="row small">
                <span className="chip violet">{SPACES[b.note.space].label}</span>
                <strong className="truncate">{b.note.title}</strong>
              </span>
              <p className="muted small" style={{ marginTop: 4 }}>{b.context}</p>
            </button>
          ))}
        </div>
      )}
      {mentions.length > 0 && (
        <div className="stack">
          <span className="eyebrow">Menções sem link · {mentions.length}</span>
          {mentions.map((m) => (
            <div key={m} className="row card tight">
              <span className="grow small">{m}</span>
              <button className="btn sm" onClick={() => toast("Protótipo: a menção viraria [[Valdris]]")}>Linkar</button>
            </div>
          ))}
        </div>
      )}
      <div className="stack">
        <span className="eyebrow">Links de saída · {outgoing.length}</span>
        <div className="list">
          {outgoing.map(({ link, note: target }) => (
            <button key={link.target + link.heading} className="list-item" onClick={() => (target ? navigate(routeOf(target)) : toast(`Protótipo: criaria “${link.target}”`))}>
              {target ? <ArrowUpRight size={15} /> : <Unlink size={15} color="var(--red)" />}
              <span className={`grow truncate ${target ? "" : "wikilink broken"}`}>{target?.title ?? link.target}</span>
              {target && target.space !== note.space && <span className="chip violet">{SPACES[target.space].label}</span>}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function PropertiesPanel({ note }: { note: Note }) {
  const { properties } = splitFrontmatter(note.markdown)
  const rows: [string, string][] = properties.length
    ? properties
    : [
        ["tags", note.tags.join(", ")],
        ["aliases", (note.aliases ?? []).join(", ") || "—"],
      ]
  return (
    <div className="stack">
      <span className="eyebrow">Propriedades (frontmatter)</span>
      {rows.map(([key, value]) => (
        <label key={key} className="field">
          <span className="mono">{key}</span>
          <input className="input" defaultValue={value} />
        </label>
      ))}
      <div className="divider" />
      <span className="eyebrow">Arquivo</span>
      <span className="mono tiny muted" style={{ wordBreak: "break-all" }}>{note.path}</span>
      <span className="small muted">Editado em {new Date(note.updated).toLocaleString("pt-BR")}</span>
      <span className="small muted">{note.markdown.split(/\s+/).length} palavras</span>
    </div>
  )
}

function OutlinePanel({ note }: { note: Note }) {
  const headings = splitFrontmatter(note.markdown)
    .body.split("\n")
    .map((line) => line.match(/^(#{1,6})\s+(.*)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
  return (
    <div className="stack">
      <span className="eyebrow">Sumário</span>
      {headings.map((h, i) => (
        <span key={i} className="small" style={{ paddingLeft: (h[1].length - 1) * 14, color: h[1].length === 1 ? "var(--text)" : "var(--muted)" }}>
          {h[2]}
        </span>
      ))}
    </div>
  )
}

/** Vizinhança da nota (profundidade 1): saídas e backlinks. */
export function LocalGraph({ note, size = 260 }: { note: Note; size?: number }) {
  const { notes, routeOf } = useNoteSet()
  const out = outgoingOf(note, notes).filter((o) => o.note).map((o) => o.note!)
  const back = backlinksOf(note, notes).map((b) => b.note)
  const neighbors = [...new Map([...out, ...back].map((n) => [n.id, n])).values()]
  const c = size / 2
  const r = size / 2 - 40
  return (
    <div className="stack">
      <span className="eyebrow">Gráfico local · profundidade 1</span>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ background: "var(--bg)", borderRadius: 10, border: "1px solid var(--line)" }}>
        {neighbors.map((n, i) => {
          const a = (i / neighbors.length) * Math.PI * 2 - Math.PI / 2
          const x = c + r * Math.cos(a)
          const y = c + r * Math.sin(a)
          const cross = n.space !== note.space
          return (
            <g key={n.id} style={{ cursor: "pointer" }} onClick={() => navigate(routeOf(n))}>
              <line x1={c} y1={c} x2={x} y2={y} stroke="var(--line-strong)" strokeDasharray={cross ? "4 3" : undefined} />
              <circle cx={x} cy={y} r={7} fill={cross ? "var(--violet)" : "var(--cyan-dim)"} />
              <text x={x} y={y + 19} textAnchor="middle" fontSize={9.5} fill="var(--muted)">
                {n.title.length > 18 ? n.title.slice(0, 17) + "…" : n.title}
              </text>
            </g>
          )
        })}
        <circle cx={c} cy={c} r={11} fill="var(--red)" />
        <text x={c} y={c + 25} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text)">
          {note.title}
        </text>
      </svg>
      <span className="tiny muted">Linha tracejada = nota de outro espaço (“portal”).</span>
    </div>
  )
}
