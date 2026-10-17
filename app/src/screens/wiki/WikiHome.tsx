import { ArticleArt } from "./ArticleArt"
import { categoryRoute } from "../../core/wiki-category"
import { useMemo, useState } from "react"
import { Folder, PenLine, Plus, Search, Unlink } from "lucide-react"
import { formatDate } from "../../core/calendar"
import { searchNotes } from "../../core/search"
import { noteBody } from "../../core/sections"
import { dirname, noteName } from "../../core/text"
import type { IndexedNote } from "../../core/vault-index"
import { ARTICLE_KINDS, articleKind, newArticleNote, newCalendarNote, newMapNote, type ArticleKind } from "../../core/wiki"
import { NoteSetContext } from "../../lib/note-set"
import { href, navigate } from "../../lib/router"
import { vaultNoteSet } from "../../lib/vault-notes"
import { Markdown } from "../../components/Markdown"
import { Modal, useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import { articleRoute, iconByName, KindIcon, takeWikiSearch, useWiki } from "./wiki-state"

interface FolderNode {
  name: string
  path: string
  notes: IndexedNote[]
  folders: FolderNode[]
}

function folderTree(notes: IndexedNote[], root: string, skip: string | undefined): FolderNode[] {
  const top: FolderNode = { name: "", path: root.replace(/\/$/, ""), notes: [], folders: [] }
  for (const note of notes) {
    if (note.path === skip) continue
    const rel = dirname(note.path).slice(top.path.length + 1)
    let node = top
    if (rel) {
      for (const part of rel.split("/")) {
        let child = node.folders.find((f) => f.name === part)
        if (!child) node.folders.push((child = { name: part, path: `${node.path}/${part}`, notes: [], folders: [] }))
        node = child
      }
    }
    node.notes.push(note)
  }
  const sort = (node: FolderNode) => {
    node.folders.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    node.notes.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    node.folders.forEach(sort)
  }
  sort(top)
  // Artigos soltos na raiz entram como a categoria "Sem pasta".
  return top.notes.length ? [...top.folders, { name: "Sem pasta", path: top.path, notes: top.notes, folders: [] }] : top.folders
}

const countNotes = (node: FolderNode): number => node.notes.length + node.folders.reduce((n, f) => n + countNotes(f), 0)

export function WikiHome() {
  const vault = useVault()
  const toast = useToast()
  const { wiki, calendar } = useWiki()
  const index = vault.index!
  const [query, setQuery] = useState(takeWikiSearch)
  const [creating, setCreating] = useState(false)
  const root = wiki!.root
  const notes = useMemo(() => index.notesIn(root), [index, root, vault.version])
  const tree = useMemo(() => folderTree(notes, root, wiki!.home), [notes, root, wiki])
  const recent = useMemo(() => [...notes].filter((n) => n.path !== wiki!.home).sort((a, b) => b.mtime - a.mtime).slice(0, 6), [notes, wiki])
  const toWrite = useMemo(() => index.unresolved(root).slice(0, 12), [index, root, vault.version])
  const results = useMemo(() => (query.trim() ? searchNotes(index, query, root, 40) : null), [index, query, root, vault.version])
  const home = wiki!.home ? index.note(wiki!.home) : undefined
  const noteSet = useMemo(() => vaultNoteSet(index, home?.path ?? root, {}, vault.platform), [index, home, root, vault.platform, vault.version])
  const readOnly = vault.info?.readOnly ?? true

  return (
    <div className="page wiki-home">
      <section className="wiki-cover card">
        <div className="stack" style={{ gap: 6, minWidth: 0 }}>
          <span className="eyebrow" style={{ color: "var(--violet)" }}>Wiki · {root}</span>
          <h1 className="page-title">{wiki!.name}</h1>
          {home && noteBody(home.text).replace(/^#[^\n]*\n/, "").trim() && (
            <NoteSetContext.Provider value={noteSet}>
              <Markdown source={noteBody(home.text).replace(/^#[^\n]*\n/, "")} className="wiki-intro" />
            </NoteSetContext.Provider>
          )}
          <div className="row-wrap">
            <span className="chip">{notes.length - (home ? 1 : 0)} artigos</span>
            {toWrite.length > 0 && <span className="chip red">{toWrite.length} a escrever</span>}
            {calendar?.calendar.today && (
              <a className="chip violet" href={href(`/wiki/calendario`)} title="Data atual da campanha">
                Hoje no mundo: {formatDate(calendar.calendar, calendar.calendar.today)}
              </a>
            )}
          </div>
        </div>
        <div className="row-wrap">
          {home && (
            <a className="btn" href={href(articleRoute(home.path))}>
              <PenLine size={15} /> Página inicial
            </a>
          )}
          <button className="btn primary" onClick={() => (readOnly ? toast("Libere a gravação em Configurações para criar artigos.") : setCreating(true))} aria-label="Novo artigo">
            <Plus size={16} /> Novo artigo
          </button>
        </div>
      </section>

      <label className="search wiki-search">
        <Search size={15} />
        <input className="input" placeholder={`Buscar em ${wiki!.name} (tag:, path:, file:, “frase”)`} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar na wiki" />
      </label>

      {results ? (
        <section className="card">
          <span className="eyebrow">{results.length} resultado(s)</span>
          <div className="list" style={{ marginTop: 6 }}>
            {results.map((hit) => (
              <a key={hit.path} className="list-item" href={href(articleRoute(hit.path))}>
                <KindIcon tipo={index.note(hit.path)?.meta.frontmatter?.data?.tipo} />
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="truncate" style={{ display: "block", fontWeight: 600 }}>{noteName(hit.path)}</span>
                  <span className="truncate tiny faint" style={{ display: "block" }}>{hit.snippet || hit.path.slice(root.length)}</span>
                </span>
              </a>
            ))}
          </div>
        </section>
      ) : (
        <>
          <div className="category-grid">
            {tree.map((folder) => (
              <Category key={folder.path + folder.name} folder={folder} />
            ))}
            {tree.length === 0 && <p className="muted">A wiki está vazia. Comece pelo primeiro artigo.</p>}
          </div>
          <div className="wiki-columns">
            <section className="card">
              <span className="section-title">Editados por último</span>
              <div className="list" style={{ marginTop: 6 }}>
                {recent.map((n) => (
                  <a key={n.path} className="list-item" href={href(articleRoute(n.path))}>
                    <KindIcon tipo={n.meta.frontmatter?.data?.tipo} />
                    <span className="grow truncate">{n.name}</span>
                    <span className="meta">{new Date(n.mtime).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                  </a>
                ))}
              </div>
            </section>
            {toWrite.length > 0 && (
              <section className="card">
                <span className="section-title row">
                  <Unlink size={15} /> A escrever
                </span>
                <span className="tiny faint">Citados em artigos, mas ainda sem nota.</span>
                <div className="list" style={{ marginTop: 6 }}>
                  {toWrite.map((u) => (
                    <button key={u.target} className="list-item small" onClick={() => (readOnly ? toast(`“${u.target}” ainda não existe.`) : setCreating(true))} title={`Citado em: ${u.from.map(noteName).join(", ")}`}>
                      <span className="grow truncate" style={{ color: "var(--red)" }}>{u.target}</span>
                      <span className="meta">{u.from.length}×</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </>
      )}
      {creating && <NewArticleDialog onClose={() => setCreating(false)} />}
    </div>
  )
}

function Category({ folder }: { folder: FolderNode }) {
  const collect = (node: FolderNode): IndexedNote[] => [...node.notes,...node.folders.flatMap(collect)]
  const notes = collect(folder).sort((a,b)=>b.mtime-a.mtime || a.name.localeCompare(b.name,"pt-BR"))
  const kinds = notes.map(note => articleKind(note.meta.frontmatter?.data?.tipo)).filter(Boolean) as ArticleKind[]
  const main = ARTICLE_KINDS.find(kind=>kind.folder === folder.name) ?? kinds[0], Icon = iconByName(main?.icon ?? "")
  return <section className="card category-card" style={{["--cat" as string]:"var(--violet)"}}>
    <a className="row wiki-category-heading" href={href(categoryRoute(folder.path))}><span className="cat-icon">{main ? <Icon size={18}/> : <Folder size={18}/>}</span><h2 className="grow">{folder.name}</h2><span className="chip">{countNotes(folder)}</span></a>
    <div className="wiki-category-preview">{notes.slice(0,5).map(note=><a className="list-item small" key={note.path} href={href(articleRoute(note.path))}><ArticleArt note={note} size="thumb"/><span className="grow truncate">{note.name}</span></a>)}</div>
    <a className="wiki-category-all" href={href(categoryRoute(folder.path))}>Ver todos os {notes.length}</a>
  </section>
}

const IMAGE = /\.(png|jpe?g|webp|gif|avif|svg)$/i

/** Novo artigo: tipo (com modelo e perguntas-guia), nome e pasta. Calendário e mapa têm o bloco pronto. */
export function NewArticleDialog({ onClose, initialName = "", initialKind, initialFolder }: { onClose(): void; initialName?: string; initialKind?: string; initialFolder?: string }) {
  const vault = useVault()
  const { wiki } = useWiki()
  const index = vault.index!
  const [kind, setKind] = useState<ArticleKind>(() => articleKind(initialKind) ?? ARTICLE_KINDS[0]!)
  const [name, setName] = useState(initialName)
  const [folder, setFolder] = useState(initialFolder ?? (articleKind(initialKind) ?? ARTICLE_KINDS[0]!).folder)
  const [image, setImage] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const root = wiki!.root.replace(/\/$/, "")
  const images = useMemo(() => index.allFiles().filter((f) => IMAGE.test(f.path)).map((f) => f.path), [index, wiki])

  const create = async () => {
    if (!name.trim()) return setError("Dê um nome ao artigo.")
    if (kind.id === "mapa" && !image) return setError("Escolha a imagem do mapa no cofre.")
    setBusy(true)
    setError(undefined)
    try {
      const title = name.trim()
      const text =
        kind.id === "calendario" ? newCalendarNote(title)
        : kind.id === "mapa" ? newMapNote(title, index.linkTarget(image, `${root}/${folder}/${title}.md`))
        : newArticleNote(kind, title)
      const created = await vault.createNote(folder.trim() ? `${root}/${folder.trim()}` : root, title, text)
      onClose()
      navigate(kind.id === "mapa" ? `/wiki/mapa/${encodeURIComponent(created)}` : articleRoute(created))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Novo artigo"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn primary" onClick={() => void create()} disabled={busy} aria-label="Criar artigo">
            {busy ? "Criando…" : "Criar"}
          </button>
        </>
      }
    >
      <div className="template-grid" role="radiogroup" aria-label="Tipo do artigo">
        {ARTICLE_KINDS.map((k) => {
          const Icon = iconByName(k.icon)
          return (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={k.id === kind.id}
              className={`card tight template ${k.id === kind.id ? "picked" : ""}`}
              onClick={() => {
                setKind(k)
                setFolder(k.folder)
              }}
            >
              <Icon size={18} />
              <span className="tiny">{k.label}</span>
            </button>
          )
        })}
      </div>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          void create()
        }}
      >
        <div className="form-grid">
          <label className="field">
            <span>Nome</span>
            <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome do artigo" />
          </label>
          <label className="field">
            <span>Pasta (dentro de {wiki!.name})</span>
            <input className="input" value={folder} onChange={(e) => setFolder(e.target.value)} aria-label="Pasta do artigo" />
          </label>
        </div>
        {kind.id === "mapa" && (
          <label className="field">
            <span>Imagem do mapa</span>
            <select className="select" value={image} onChange={(e) => setImage(e.target.value)} aria-label="Imagem do mapa">
              <option value="">Escolha…</option>
              {images.map((path) => (
                <option key={path} value={path}>
                  {path.startsWith(wiki!.root) ? path.slice(wiki!.root.length) : path}
                </option>
              ))}
            </select>
            {!images.length && <span className="tiny faint">Nenhuma imagem no cofre. Importe uma imagem numa nota e volte aqui.</span>}
          </label>
        )}
        {kind.questions.length > 0 && (
          <div className="card tight stack" style={{ gap: 4 }}>
            <span className="eyebrow">Perguntas-guia ({kind.label})</span>
            {kind.questions.map((q) => (
              <span key={q} className="small muted">
                • {q}
              </span>
            ))}
            <span className="tiny faint">Elas entram no artigo como comentários (%% %%): aparecem só ao editar.</span>
          </div>
        )}
        {kind.fields.length > 0 && <span className="tiny faint">Ficha: {kind.fields.map((field) => field.label).join(", ")}.</span>}
        {error && <p className="small" style={{ color: "var(--red)" }}>{error}</p>}
      </form>
    </Modal>
  )
}
