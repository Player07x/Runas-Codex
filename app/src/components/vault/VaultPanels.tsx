import { useState } from "react"
import { AlertTriangle, ArrowUpRight, Link2, ListTree, Network, Plus, Tags, Trash2, Unlink } from "lucide-react"
import type { PropertyValue } from "../../core/properties"
import { scopeOf } from "../../core/spaces"
import { noteName } from "../../core/text"
import type { VaultIndex } from "../../core/vault-index"
import { navigate } from "../../lib/router"
import { vaultRoute } from "../../lib/vault-notes"
import { useToast } from "../ui"

type Tab = "links" | "props" | "outline" | "graph"

interface Props {
  index: VaultIndex
  path: string
  readOnly: boolean
  onCreate(target: string): void
  onSetProperty(key: string, value: PropertyValue | undefined): Promise<void>
  onHeading(line: number): void
}

/** Painel da direita para notas do cofre: links, propriedades, sumário e gráfico local. */
export function VaultPanels(props: Props) {
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
        <button className={tab === "outline" ? "active" : ""} onClick={() => setTab("outline")} title="Sumário" aria-label="Sumário">
          <ListTree size={15} />
        </button>
        <button className={tab === "graph" ? "active" : ""} onClick={() => setTab("graph")} title="Gráfico local" aria-label="Gráfico local">
          <Network size={15} />
        </button>
      </div>
      <div className="pane-body">
        {tab === "links" && <LinksPanel {...props} />}
        {tab === "props" && <PropertiesPanel {...props} />}
        {tab === "outline" && <OutlinePanel {...props} />}
        {tab === "graph" && <VaultGraph index={props.index} path={props.path} />}
      </div>
    </div>
  )
}

function LinksPanel({ index, path, onCreate }: Props) {
  const backs = index.backlinks(path)
  const same = backs.filter((b) => !b.crossScope)
  const other = backs.filter((b) => b.crossScope)
  const seen = new Set<string>()
  const outgoing = index.outgoing(path).filter((r) => r.link.target && !seen.has(r.link.target + (r.link.subpath ?? "")) && seen.add(r.link.target + (r.link.subpath ?? "")))
  const card = (b: (typeof backs)[number]) => (
    <button key={b.from} className="card tight link" data-backlink={b.from} onClick={() => navigate(vaultRoute(b.from))}>
      <span className="row" style={{ gap: 6 }}>
        <strong className="small grow truncate">{noteName(b.from)}</strong>
        {b.crossScope && <span className="chip violet">{scopeOf(b.from).space ?? "raiz"}</span>}
      </span>
      {b.context.map((line, i) => (
        <p key={i} className="muted small" style={{ marginTop: 2 }}>
          {line}
        </p>
      ))}
    </button>
  )
  return (
    <>
      <div className="stack">
        <span className="eyebrow">Ligam para esta nota · {same.length}</span>
        {same.length === 0 && <span className="muted small">Nenhuma nota deste espaço aponta para cá.</span>}
        {same.map(card)}
      </div>
      {other.length > 0 && (
        <div className="stack">
          <span className="eyebrow">De outros espaços · {other.length}</span>
          {other.map(card)}
        </div>
      )}
      <div className="stack">
        <span className="eyebrow">Links de saída · {outgoing.length}</span>
        {outgoing.length === 0 && <span className="muted small">Esta nota não aponta para nenhuma outra.</span>}
        {outgoing.map((r) => (
          <button
            key={r.link.start}
            className="list-item"
            onClick={() => (r.dest ? navigate(vaultRoute(r.dest)) : onCreate(r.link.target))}
            title={r.dest ? r.dest : `“${r.link.target}” não existe — clique para criar`}
          >
            {r.dest ? <ArrowUpRight size={15} /> : <Unlink size={15} color="var(--red)" />}
            <span className="grow truncate" style={{ color: r.dest ? undefined : "var(--red)" }}>
              {r.dest ? noteName(r.dest) : r.link.target}
              {r.link.subpath && <span className="faint"> {r.link.subpath}</span>}
            </span>
            {(r.ambiguous || r.viaAlias || r.subpathMissing) && (
              <span title={r.viaAlias ? "Resolvido pelo apelido: o Obsidian não segue este link." : r.ambiguous ? "Há mais de uma nota com esse nome: o Obsidian pode abrir outra." : "O título ou bloco não existe na nota."}>
                <AlertTriangle size={14} color="var(--gold)" />
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  )
}

const asText = (value: unknown) => (Array.isArray(value) ? value.join(", ") : value === null || value === undefined ? "" : String(value))

function PropertiesPanel({ index, path, readOnly, onSetProperty }: Props) {
  const toast = useToast()
  const note = index.note(path)
  const [newKey, setNewKey] = useState("")
  const fm = note?.meta.frontmatter
  if (!note) return null
  if (fm?.error) return <p className="small" style={{ color: "var(--red)" }}>O frontmatter desta nota tem erro e o app não vai alterá-lo: {fm.error}</p>
  const data = fm?.data ?? {}
  const commit = (key: string, original: unknown, raw: string) => {
    const value: PropertyValue = Array.isArray(original) ? raw.split(",").map((s) => s.trim()).filter(Boolean) : typeof original === "number" && raw.trim() !== "" && !Number.isNaN(Number(raw)) ? Number(raw) : raw
    if (JSON.stringify(value) === JSON.stringify(original)) return
    onSetProperty(key, value).catch((error: unknown) => toast(error instanceof Error ? error.message : String(error)))
  }
  return (
    <div className="stack">
      {Object.keys(data).length === 0 && <span className="muted small">Sem propriedades.</span>}
      {Object.entries(data).map(([key, value]) => (
        <label key={key} className="field">
          <span className="row between">
            {key}
            {!readOnly && (
              <button type="button" className="icon-btn sm" title={`Remover “${key}”`} onClick={() => onSetProperty(key, undefined).catch((e: unknown) => toast(String(e)))}>
                <Trash2 size={13} />
              </button>
            )}
          </span>
          {typeof value === "boolean" ? (
            <input type="checkbox" checked={value} disabled={readOnly} onChange={(event) => onSetProperty(key, event.target.checked).catch((e: unknown) => toast(String(e)))} />
          ) : (
            <input
              className="input"
              defaultValue={asText(value)}
              key={`${path}:${key}:${asText(value)}`}
              readOnly={readOnly || (typeof value === "object" && value !== null && !Array.isArray(value))}
              onBlur={(event) => commit(key, value, event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && (event.target as HTMLInputElement).blur()}
            />
          )}
        </label>
      ))}
      {!readOnly && (
        <form
          className="row"
          onSubmit={(event) => {
            event.preventDefault()
            if (!newKey.trim()) return
            onSetProperty(newKey.trim(), "").then(() => setNewKey(""), (e: unknown) => toast(e instanceof Error ? e.message : String(e)))
          }}
        >
          <input className="input" placeholder="Nova propriedade" value={newKey} onChange={(event) => setNewKey(event.target.value)} aria-label="Nova propriedade" />
          <button className="icon-btn" title="Adicionar propriedade" disabled={!newKey.trim()}>
            <Plus size={16} />
          </button>
        </form>
      )}
      <span className="tiny faint">Tags: {note.meta.tags.length ? note.meta.tags.map((t) => `#${t}`).join(" ") : "nenhuma"}</span>
    </div>
  )
}

function OutlinePanel({ index, path, onHeading }: Props) {
  const headings = index.note(path)?.meta.headings ?? []
  if (!headings.length) return <span className="muted small">Sem títulos.</span>
  return (
    <div className="list">
      {headings.map((h) => (
        <button key={h.line} className="list-item small" style={{ paddingLeft: 10 + (h.level - 1) * 12 }} onClick={() => onHeading(h.line)}>
          {h.text}
        </button>
      ))}
    </div>
  )
}

/** Vizinhança da nota (profundidade 1): saídas e backlinks. */
export function VaultGraph({ index, path, size = 260 }: { index: VaultIndex; path: string; size?: number }) {
  const out = index.outgoing(path).map((r) => r.dest).filter((d): d is string => Boolean(d) && d !== path)
  const back = index.backlinks(path).map((b) => b.from)
  const neighbors = [...new Set([...out, ...back])]
  const c = size / 2
  const r = size / 2 - 40
  const root = scopeOf(path).root
  return (
    <div className="stack">
      <span className="eyebrow">Gráfico local · profundidade 1</span>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ background: "var(--bg)", borderRadius: 10, border: "1px solid var(--line)" }}>
        {neighbors.map((n, i) => {
          const a = (i / neighbors.length) * Math.PI * 2 - Math.PI / 2
          const x = c + r * Math.cos(a)
          const y = c + r * Math.sin(a)
          const cross = scopeOf(n).root !== root
          const title = noteName(n)
          return (
            <g key={n} style={{ cursor: "pointer" }} onClick={() => navigate(vaultRoute(n))}>
              <line x1={c} y1={c} x2={x} y2={y} stroke="var(--line-strong)" strokeDasharray={cross ? "4 3" : undefined} />
              <circle cx={x} cy={y} r={7} fill={cross ? "var(--violet)" : "var(--cyan-dim)"} />
              <text x={x} y={y + 19} textAnchor="middle" fontSize={9.5} fill="var(--muted)">
                {title.length > 18 ? title.slice(0, 17) + "…" : title}
              </text>
            </g>
          )
        })}
        <circle cx={c} cy={c} r={11} fill="var(--cyan)" />
        <text x={c} y={c + 25} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text)">
          {noteName(path)}
        </text>
      </svg>
      <span className="tiny muted">Linha tracejada = nota de outro espaço (“portal”).</span>
    </div>
  )
}
