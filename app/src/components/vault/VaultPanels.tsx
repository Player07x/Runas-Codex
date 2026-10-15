import { useMemo, useState } from "react"
import { AlertTriangle, ArrowUpRight, Copy, Link2, ListTree, Network, Plus, Tags, Trash2, Unlink } from "lucide-react"
import { buildGraph } from "../../core/graph-data"
import { linkMention, unlinkedMentions, type Mention } from "../../core/mentions"
import type { PropertyValue } from "../../core/properties"
import { scopeOf } from "../../core/spaces"
import { noteName } from "../../core/text"
import type { VaultIndex } from "../../core/vault-index"
import { navigate } from "../../lib/router"
import { copyLinkTarget, copyText, headingLinkText, vaultRoute } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { useToast } from "../ui"
import { DEFAULT_FORCES, GraphView } from "./GraphView"

type Tab = "links" | "props" | "outline" | "graph"

interface Props {
  index: VaultIndex
  path: string
  readOnly: boolean
  onCreate(target: string): void
  onSetProperty(key: string, value: PropertyValue | undefined): Promise<void>
  onHeading(line: number): void
  /** Grava o texto de outra nota (para "Linkar" uma menção); sem isto, as menções só aparecem. */
  onSaveNote?(path: string, text: string): Promise<void>
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
        {tab === "graph" && <VaultGraph index={props.index} path={props.path} onCreate={props.onCreate} />}
      </div>
    </div>
  )
}

function LinksPanel({ index, path, onCreate, readOnly, onSaveNote }: Props) {
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
      <MentionsList index={index} path={path} canLink={!readOnly && Boolean(onSaveNote)} onLink={async (m) => {
        const text = index.note(m.path)?.text
        const next = text === undefined ? null : linkMention(text, m, index.linkTarget(path, m.path))
        if (next === null) throw new Error("A nota mudou nesse ponto; abra o painel de novo.")
        await onSaveNote!(m.path, next)
      }} />
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
  const toast = useToast()
  const headings = index.note(path)?.meta.headings ?? []
  if (!headings.length) return <span className="muted small">Sem títulos.</span>
  return (
    <div className="list">
      {headings.map((h) => (
        <div key={h.line} className="outline-row">
          <button className="list-item small grow" style={{ paddingLeft: 10 + (h.level - 1) * 12 }} onClick={() => onHeading(h.line)}>
            {h.text}
          </button>
          <button
            className="icon-btn sm"
            title="Copiar link do título"
            aria-label={`Copiar link do título ${h.text}`}
            onClick={() => {
              const link = `[[${copyLinkTarget(index, path)}#${headingLinkText(h.text)}]]`
              void copyText(link).then((ok) => toast(ok ? `Link copiado: ${link}` : "O sistema não deixou copiar."))
            }}
          >
            <Copy size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

/** Vizinhança da nota (profundidade 1): saídas e backlinks. */
/** Gráfico local da nota aberta (WebGL), com a profundidade escolhida. Notas de outro espaço aparecem como portais. */
export function VaultGraph({ index, path, onCreate }: { index: VaultIndex; path: string; onCreate(target: string): void }) {
  const [depth, setDepth] = useState(1)
  const [fit, setFit] = useState(0)
  const root = scopeOf(path).root
  const data = useMemo(() => buildGraph(index, { root, filter: "", showOrphans: true, showAttachments: false, showMissing: true, groups: [], center: path, depth }), [index, path, root, depth, index.size])
  return (
    <div className="stack">
      <div className="row between">
        <span className="eyebrow">Gráfico local</span>
        <div className="segmented" role="tablist" aria-label="Profundidade do gráfico local">
          {[1, 2, 3].map((d) => (
            <button key={d} className={depth === d ? "active" : ""} onClick={() => (setDepth(d), setFit((n) => n + 1))} aria-label={`Profundidade ${d}`}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <GraphView
        className="local"
        data={data}
        groups={[]}
        forces={LOCAL_FORCES}
        center={path}
        labels="always"
        fitSignal={fit}
        onOpen={(node) => (node.kind === "missing" ? onCreate(node.path) : node.kind !== "attachment" && node.path !== path ? navigate(vaultRoute(node.path)) : undefined)}
      />
      <span className="tiny muted">
        {data.nodes.length - 1} {data.nodes.length === 2 ? "nota ligada" : "notas ligadas"} · losango = outro espaço (portal) ·{" "}
        <a href="#" onClick={(e) => (e.preventDefault(), navigate("/notas/grafico"))}>
          gráfico inteiro
        </a>
      </span>
    </div>
  )
}

const LOCAL_FORCES = { ...DEFAULT_FORCES, repulsion: 220, distance: 55, arrows: true }

/** Notas que citam o nome ou um apelido desta nota sem link, com "Linkar" em cada citação. */
function MentionsList({ index, path, canLink, onLink }: { index: VaultIndex; path: string; canLink: boolean; onLink(m: Mention): Promise<void> }) {
  const toast = useToast()
  const { version } = useVault()
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  // `version` muda a cada gravação: depois de "Linkar", a menção sai da lista.
  const mentions = useMemo(() => (open ? unlinkedMentions(index, path) : null), [open, index, path, version])
  return (
    <div className="stack">
      <button className="eyebrow mentions-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        Menções sem link{mentions ? ` · ${mentions.length}` : ""} {open ? "▾" : "▸"}
      </button>
      {mentions?.length === 0 && <span className="muted small">Nenhuma nota cita o nome sem link.</span>}
      {mentions?.map((m) => (
        <div key={`${m.path}:${m.start}`} className="card tight mention-card" data-mention={m.path}>
          <span className="row" style={{ gap: 6 }}>
            <button className="link-button small grow truncate" onClick={() => navigate(vaultRoute(m.path))} title={m.path}>
              <strong>{noteName(m.path)}</strong>
            </button>
            {canLink && (
              <button
                className="btn sm"
                disabled={busy}
                onClick={() => {
                  setBusy(true)
                  onLink(m)
                    .then(() => toast(`Link criado em “${noteName(m.path)}”`))
                    .catch((e: unknown) => toast(e instanceof Error ? e.message : String(e)))
                    .finally(() => setBusy(false))
                }}
              >
                Linkar
              </button>
            )}
          </span>
          <p className="muted small" style={{ marginTop: 2 }}>
            {highlight(m.context, m.text)}
          </p>
        </div>
      ))}
    </div>
  )
}

/** A linha com a menção em destaque. */
function highlight(line: string, text: string) {
  const at = line.toLocaleLowerCase("pt-BR").indexOf(text.toLocaleLowerCase("pt-BR"))
  if (at < 0) return line
  return (
    <>
      {line.slice(0, at)}
      <mark>{line.slice(at, at + text.length)}</mark>
      {line.slice(at + text.length)}
    </>
  )
}

