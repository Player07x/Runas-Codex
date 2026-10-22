import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, ArrowUpRight, Calendar, CheckSquare, Clock, Copy, Hash, Link2, List, ListTree, Network, Plus, Star, Tags, Trash2, Type, Unlink } from "lucide-react"
import { hasBookmark, type Bookmark } from "../../core/bookmarks"
import { toggleFavorite, useFavorites } from "../../lib/bookmarks"
import { buildGraph } from "../../core/graph-data"
import { splitLinkTarget } from "../../core/link-preview"
import { linkMention, unlinkedMentions, type Mention } from "../../core/mentions"
import type { PropertyValue } from "../../core/properties"
import { emptyValue, parseInput, propertyKind, PROPERTY_KINDS, type PropertyKind } from "../../core/property-types"
import { scopeOf } from "../../core/spaces"
import { noteName } from "../../core/text"
import type { VaultIndex } from "../../core/vault-index"
import { navigate } from "../../lib/router"
import { copyLinkTarget, copyText, headingLinkText, noteRoute, vaultRoute } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { useToast } from "../ui"
import { DEFAULT_FORCES, GraphView } from "./GraphView"
import { PanelTabs, TabPanel } from "../kit/PanelTabs"
import { GraphList } from "./GraphPage"

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

/** Painel da direita para notas do cofre: links, propriedades, sumário e gráfico local, em abas do kit (rework F4a). */
export function VaultPanels(props: Props) {
  const [tab, setTab] = useState<Tab>("links")
  const links = props.index.backlinks(props.path).length
  const properties = Object.keys(props.index.note(props.path)?.meta.frontmatter?.data ?? {}).length
  return (
    <div className="vault-panels">
      <PanelTabs<Tab> label="Detalhes da nota" idPrefix="nota-painel" value={tab} onChange={setTab} tabs={[
        { value: "links", label: "Links", count: links, icon: <Link2 size={15} /> },
        { value: "props", label: "Propriedades", count: properties, icon: <Tags size={15} /> },
        { value: "outline", label: "Sumário", icon: <ListTree size={15} /> },
        { value: "graph", label: "Gráfico", icon: <Network size={15} /> },
      ]} />
      <TabPanel idPrefix="nota-painel" value={tab}>
        <div className="pane-body">
          {tab === "links" && <LinksPanel {...props} />}
          {tab === "props" && <PropertiesPanel {...props} />}
          {tab === "outline" && <OutlinePanel {...props} />}
          {tab === "graph" && <VaultGraph index={props.index} path={props.path} onCreate={props.onCreate} />}
        </div>
      </TabPanel>
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

const KIND_ICON: Record<PropertyKind, typeof Type> = { texto: Type, lista: List, numero: Hash, caixa: CheckSquare, data: Calendar, "data-hora": Clock, link: Link2 }

function PropertiesPanel({ index, path, readOnly, onSetProperty, onCreate }: Props) {
  const toast = useToast()
  const { config } = useVault()
  const note = index.note(path)
  const [newKey, setNewKey] = useState("")
  const [newKind, setNewKind] = useState<PropertyKind>("texto")
  // Tipo escolhido para uma propriedade criada agora e ainda vazia (um link vazio, no YAML, é só texto vazio).
  const [chosen, setChosen] = useState<Record<string, PropertyKind>>({})
  const fm = note?.meta.frontmatter
  if (!note) return null
  if (fm?.error) return <p className="small" style={{ color: "var(--red)" }}>O frontmatter desta nota tem erro e o app não vai alterá-lo: {fm.error}</p>
  const data = fm?.data ?? {}
  const save = (key: string, value: PropertyValue | undefined) => onSetProperty(key, value).catch((error: unknown) => toast(error instanceof Error ? error.message : String(error)))
  return (
    <div className="stack">
      {Object.keys(data).length === 0 && <span className="muted small">Sem propriedades.</span>}
      {Object.entries(data).map(([key, value]) => {
        const kind = (value === "" || value === null) && chosen[key] ? chosen[key]! : propertyKind(key, value, config.types[key])
        const Icon = KIND_ICON[kind]
        const label = PROPERTY_KINDS.find((k) => k.kind === kind)!.label
        return (
          <div key={key} className="field prop-field">
            <span className="row between">
              <span className="row" style={{ gap: 6 }} title={key.endsWith("_mundo") ? `${label} — data do mundo, no calendário da campanha` : label}>
                <Icon size={13} className="faint" aria-hidden /> {key}
              </span>
              {!readOnly && (
                <button type="button" className="icon-btn sm" title={`Remover “${key}”`} onClick={() => void save(key, undefined)}>
                  <Trash2 size={13} />
                </button>
              )}
            </span>
            <PropertyField index={index} path={path} name={key} value={value} kind={kind} readOnly={readOnly} onCreate={onCreate} onSave={(next) => void save(key, next)} onInvalid={(raw) => toast(`“${raw}” não serve para ${label.toLowerCase()}.`)} />
          </div>
        )
      })}
      {!readOnly && (
        <form
          className="row prop-new"
          onSubmit={(event) => {
            event.preventDefault()
            const key = newKey.trim()
            if (!key) return
            if (key in data) return toast(`A nota já tem a propriedade “${key}”.`)
            onSetProperty(key, emptyValue(newKind)).then(
              () => {
                setChosen((current) => ({ ...current, [key]: newKind }))
                setNewKey("")
              },
              (e: unknown) => toast(e instanceof Error ? e.message : String(e)),
            )
          }}
        >
          <input className="input grow" placeholder="Nova propriedade" value={newKey} onChange={(event) => setNewKey(event.target.value)} aria-label="Nova propriedade" />
          <select className="input" style={{ width: "auto", flex: "none" }} value={newKind} onChange={(event) => setNewKind(event.target.value as PropertyKind)} aria-label="Tipo da nova propriedade">
            {PROPERTY_KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </select>
          <button className="icon-btn" title="Adicionar propriedade" disabled={!newKey.trim()}>
            <Plus size={16} />
          </button>
        </form>
      )}
      <span className="tiny faint">Tags: {note.meta.tags.length ? note.meta.tags.map((t) => `#${t}`).join(" ") : "nenhuma"}</span>
    </div>
  )
}

/** O campo de uma propriedade, conforme o tipo. Grava ao sair do campo (ou logo depois de escolher no seletor de data). */
function PropertyField({ index, path, name, value, kind, readOnly, onCreate, onSave, onInvalid }: { index: VaultIndex; path: string; name: string; value: unknown; kind: PropertyKind; readOnly: boolean; onCreate(target: string): void; onSave(value: PropertyValue): void; onInvalid(raw: string): void }) {
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  if (kind === "caixa") return <input type="checkbox" checked={value === true} disabled={readOnly} aria-label={name} onChange={(event) => onSave(event.target.checked)} />
  const nested = typeof value === "object" && value !== null && !Array.isArray(value)
  const shown = kind === "link" ? asText(value).replace(/^\[\[|\]\]$/g, "") : asText(value)
  const commit = (input: HTMLInputElement) => {
    window.clearTimeout(timer.current)
    if (input.value === shown) return
    const next = parseInput(kind, input.value)
    if (next === null) {
      onInvalid(input.value)
      input.value = shown
      return
    }
    if (JSON.stringify(next) !== JSON.stringify(value ?? "")) onSave(next)
  }
  const field = (
    <input
      className="input grow"
      type={kind === "data" ? "date" : kind === "data-hora" ? "datetime-local" : "text"}
      inputMode={kind === "numero" ? "decimal" : undefined}
      defaultValue={shown}
      key={`${path}:${name}:${shown}`}
      aria-label={name}
      placeholder={kind === "link" ? "Nome da nota" : kind === "lista" ? "itens, separados, por vírgula" : undefined}
      readOnly={readOnly || nested}
      onBlur={(event) => commit(event.target)}
      // O seletor de data do celular não tira o foco do campo: grava um instante depois da escolha.
      onChange={(event) => {
        if (kind !== "data" && kind !== "data-hora") return
        const input = event.target
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => commit(input), 1200)
      }}
      onKeyDown={(event) => event.key === "Enter" && (event.target as HTMLInputElement).blur()}
    />
  )
  if (kind !== "link" || !shown) return field
  const { target, subpath } = splitLinkTarget(shown.split("|")[0]!)
  const resolved = index.resolve({ kind: "wiki", embed: false, target, subpath, start: 0, end: 0, raw: asText(value), inFrontmatter: true }, path)
  return (
    <span className="row" style={{ gap: 4 }}>
      {field}
      <button
        type="button"
        className="icon-btn sm"
        title={resolved.dest ? `Abrir ${noteName(resolved.dest)}` : `“${target}” não existe — clique para criar`}
        aria-label={resolved.dest ? `Abrir ${noteName(resolved.dest)}` : `Criar ${target}`}
        onClick={() => (resolved.dest ? navigate(noteRoute(resolved.dest)) : onCreate(target))}
      >
        {resolved.dest ? <ArrowUpRight size={14} /> : <Unlink size={14} color="var(--red)" />}
      </button>
    </span>
  )
}

function OutlinePanel({ index, path, onHeading }: Props) {
  const toast = useToast()
  const vault = useVault()
  const favorites = useFavorites(vault.info?.path)
  const mark = (text: string): Bookmark => ({ type: "file", path, subpath: `#${headingLinkText(text)}` })
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
          <HeadingStar on={hasBookmark(favorites, mark(h.text))} text={h.text} onToggle={() => toggleFavorite(vault.info?.path, mark(h.text))} />
        </div>
      ))}
    </div>
  )
}

function HeadingStar({ on, text, onToggle }: { on: boolean; text: string; onToggle(): void }) {
  return (
    <button className="icon-btn sm" title={on ? "Tirar dos favoritos" : "Favoritar o título"} aria-label={`${on ? "Tirar dos favoritos" : "Favoritar"} o título ${text}`} aria-pressed={on} onClick={onToggle}>
      <Star size={13} fill={on ? "currentColor" : "none"} color={on ? "var(--gold)" : undefined} />
    </button>
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
      {/* Os mesmos nós como botões: o gráfico em WebGL não recebe foco do teclado (rework F4a, NOT-3). */}
      <GraphList compact data={data} exclude={path} onOpen={(node) => (node.kind === "missing" ? onCreate(node.path) : node.kind !== "attachment" ? navigate(vaultRoute(node.path)) : undefined)} />
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

