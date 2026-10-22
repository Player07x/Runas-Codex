import { ChevronLeft, Eye, FileDown, LayoutDashboard, Maximize2, Minimize2, PenLine, SlidersHorizontal } from "lucide-react"
import { lazy, Suspense, useEffect, useCallback, useRef, useState } from "react"
import { countWords, moveBookItem, readBook } from "../../core/books"
import { dirname } from "../../core/text"
import type { IndexedNote } from "../../core/vault-index"
import { NoteView } from "../../components/vault/NoteView"
import { navigate } from "../../lib/router"
import { vaultRoute } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { ResizablePanel } from "../../components/ResizablePanel"

import { BookWritingTools } from "./BookWritingTools"

const BookPreview = lazy(() => import("./BookPreview"))

export function BookEditor({ book }: { book: IndexedNote }) {
  const vault = useVault(), index = vault.index!
  const structure = readBook(index, book)
  const [selected, setSelected] = useState<string | undefined>(() => structure.items.find((i) => i.note)?.note?.path)
  const [view, setView] = useState("escrever")
  const [focus,setFocus] = useState(false)
  const [chapterHeader, setChapterHeader] = useState<HTMLDivElement | null>(null)
  const [referenceHeader, setReferenceHeader] = useState<HTMLDivElement | null>(null)
  const [commandHeader, setCommandHeader] = useState<HTMLDivElement | null>(null)
  const [focusHeader, setFocusHeader] = useState<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!focus) return
    document.body.classList.add("book-focus-active")
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setFocus(false) }
    window.addEventListener("keydown", escape)
    return () => { document.body.classList.remove("book-focus-active"); window.removeEventListener("keydown", escape) }
  }, [focus])
  const [preview, setPreview] = useState(false)
  const [draft, setDraft] = useState<{ path: string; text: string }>()
  const onDraftChange = useCallback((text: string) => { if (selected) setDraft({ path: selected, text }) }, [selected])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [kind, setKind] = useState("capitulo")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [announcement, setAnnouncement] = useState("")
  const drag = useRef<number | null>(null)
  const locked = Boolean(vault.info?.readOnly || busy || structure.error)
  const current = selected ? index.note(selected) : undefined
  const run = async (action: () => Promise<void>) => {
    if (locked) return
    setBusy(true); setError("")
    try { await action() } catch (e) { setError(String(e)) } finally { setBusy(false) }
  }
  const insertNote = async (path: string) => {
    // Relê a estrutura depois da criação para incluir mudanças recebidas pelo observador.
    const latest = readBook(index, index.note(book.path)!)
    if (latest.error) throw new Error(latest.error)
    const links = latest.items.map((i) => i.link)
    const pos = latest.items.findIndex((i) => i.note?.path === selected)
    links.splice(pos < 0 ? links.length : pos + 1, 0, `[[${index.linkTarget(path, book.path)}]]`)
    await vault.setProperty(book.path, "estrutura", links)
    setSelected(path)
  }
  const move = (from: number, to: number) => void run(async () => {
    await vault.setProperty(book.path, "estrutura", moveBookItem(structure.items.map((i) => i.link), from, to))
    setAnnouncement(`Item movido para a posição ${to + 1}.`)
  })
  const open = (path: string) => { setSelected(path); setView("escrever") }
  return <div className={`books-editor books-view-${view} ${focus ? "books-focus" : ""}`}>
    <header className="books-header">
      {focus && <div className="book-focus-navigation" ref={setFocusHeader} />}
      <nav className="row-wrap book-view-tabs" aria-label="Visão do livro"><button className="btn book-back" aria-label="Voltar" title="Voltar aos livros" onClick={() => navigate("/livros")}><ChevronLeft size={15}/></button><div className="book-chapter-control" ref={setChapterHeader} />{[["escrever", "Escrever", PenLine], ["cortica", "Cortiça", LayoutDashboard], ["previa", "Prévia", Eye]].map(([value, label, Icon]) => {
        const ViewIcon = Icon as typeof PenLine
        return <button key={String(value)} className="btn" aria-label={String(label)} title={String(label)} aria-pressed={view === value} onClick={() => { setView(String(value)); setPreview(value === "previa") }}><ViewIcon size={15}/><span>{String(label)}</span></button>
      })}</nav>
      <button className="btn primary book-focus-toggle" aria-label={focus ? "Sair do Foco" : "Modo foco"} title={focus ? "Sair do Foco" : "Modo foco"} aria-pressed={focus} onClick={() => { setFocus(!focus); setView("escrever"); setPreview(false) }}>{focus ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}<span>{focus ? "Sair do Foco" : "Modo foco"}</span></button>
      <button className="btn book-metadata-button" aria-label="Metadados" title="Metadados" onClick={() => navigate(vaultRoute(book.path))}><SlidersHorizontal size={17}/><span>Metadados</span></button>
      <button className="btn book-export-button" aria-label="Exportar" title="Exportar" onClick={() => { setPreview(true); setView("previa") }}><FileDown size={17}/><span>Exportar</span></button>
    </header>
    {vault.info?.readOnly && <p className="proto-note">Somente leitura. Libere a gravação em Configurações › Cofre.</p>}
    {(error || structure.error) && <p role="alert">{error || structure.error}</p>}
    <span className="books-announcement" role="status">{announcement}</span>
    <div className={`books-layout ${preview ? "has-preview" : ""}`}>
      <ResizablePanel id="book-binder" label="Capítulos" side="left" width={250} controlsTarget={chapterHeader} defaultCollapsed reveal={creating} className="books-binder">
        <h2>Estrutura</h2>
        <button className="btn primary" aria-label="Criar capítulo" disabled={locked} onClick={() => setCreating(!creating)}>Criar capítulo, parte ou seção</button>
        {creating && <form className="stack" onSubmit={(e) => {
          e.preventDefault(); void run(async () => {
            const path = await vault.createNote(dirname(book.path), name.trim(), `---\ntipo: ${kind}\nstatus: rascunho\nresumo: ""\n---\n# ${name.trim()}\n`)
            try { await insertNote(path) } catch (e) { throw new Error(`Nota criada; adicione-a por Fora do livro. ${String(e)}`) }
            setCreating(false); setName(""); setView("escrever")
          })
        }}>
          <label className="field">Título<input className="input" required aria-label="Título do capítulo" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">Tipo<select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="capitulo">Capítulo</option>
            <option value="parte">Parte</option>
            <option value="secao">Seção</option>
          </select>
          </label>
          <button className="btn" aria-label="Confirmar criar capítulo" disabled={locked || !name.trim()}>Criar</button>
        </form>}
        <ol>{structure.items.map((item, i) => <li key={i}>
          <button className="books-item" disabled={!item.note} aria-current={selected === item.note?.path ? "true" : undefined} onClick={() => item.note && open(item.note.path)}>
            <strong>{item.note?.name ?? item.link}</strong>
            <small>{item.note ? `${item.kind} · ${item.status} · ${item.words} palavras` : "Link quebrado"}</small>
          </button>
        </li>)}</ol>
        <h3>Fora do livro</h3>{structure.outside.map((n) => <div className="books-outside" key={n.path}>
          <button className="books-item" onClick={() => open(n.path)}>{n.name}</button>
          <button className="btn" disabled={locked} onClick={() => void run(() => insertNote(n.path))} aria-label={`Incluir ${n.name}`}>Incluir</button>
        </div>)}
      </ResizablePanel>
      <main className="books-main">
        {view === "cortica" ? <div className="books-cork" aria-label="Cortiça">{structure.items.map((item, i) => <article className="books-cork-card" data-book-position={i} key={`${item.link}:${structure.items.slice(0, i).filter((other) => other.link === item.link).length}`}>
          <button className="btn books-drag" disabled={locked} aria-label={`Arrastar ${item.note?.name ?? item.link}`} onPointerDown={(e) => { drag.current = i; e.currentTarget.setPointerCapture(e.pointerId) }} onPointerCancel={() => { drag.current = null }} onPointerUp={(e) => {
            const from = drag.current; drag.current = null
            const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-book-position]")
            if (from !== null && target && Number(target.dataset.bookPosition) !== from) move(from, Number(target.dataset.bookPosition))
          }}>⠿ Arrastar</button>
          <button className="books-item" disabled={!item.note} onClick={() => item.note && open(item.note.path)}>
            <strong>{item.note?.name ?? item.link}</strong>
          </button>
          <p>{item.summary || "Sem resumo"}</p>
          <small>{item.note ? `${item.status} · ${item.words} palavras` : "Link quebrado"}</small>
          <div className="row-wrap">
            <button className="btn" disabled={locked || i === 0} onClick={() => move(i, i - 1)} aria-label={`Subir ${item.note?.name ?? item.link}`}>↑ Subir</button>
            <button className="btn" disabled={locked || i === structure.items.length - 1} onClick={() => move(i, i + 1)} aria-label={`Descer ${item.note?.name ?? item.link}`}>↓ Descer</button>
          </div>
        </article>)}</div> : current ? <>
          <div className="books-chapter">
            <strong>{current.name}</strong>
            <span>{countWords(current.text)} palavras</span>
            <button className="btn" onClick={() => navigate(vaultRoute(current.path))}>Propriedades e resumo</button>
          </div>
          <NoteView hideBackControl={!focus} onTrashed={() => setSelected(structure.items.find(item => item.note && item.note.path !== current.path)?.note?.path)} focusHeader={focus ? focusHeader : commandHeader} sidebar={focus ? undefined : insert => <ResizablePanel id="book-tools" label="Referências" width={280} controlsTarget={referenceHeader} defaultCollapsed className="book-tools-panel"><BookWritingTools book={book} draft={draft} insert={insert} /></ResizablePanel>} onDraftChange={onDraftChange} key={current.path} path={current.path} folders={[...new Set(index.allNotes().map((n) => dirname(n.path)))]} onShowPanel={() => navigate(vaultRoute(current.path))} onBack={() => { if (focus) setFocus(false); else navigate("/livros") }} onCreate={(target) => { setName(target); setCreating(true); setView("escrever") }} onTag={() => navigate("/notas")} />
        </> : <p className="page">Selecione uma nota na estrutura. Links quebrados podem ser corrigidos nos metadados do livro.</p>}
      </main>
      {preview && <Suspense fallback={<p>Carregando prévia…</p>}><BookPreview book={book} draft={draft} onClose={() => { setPreview(false); setView("escrever") }} /></Suspense>}
      <div className="book-commandbar" ref={setCommandHeader} role="toolbar" aria-label="Ações e modos da nota" aria-orientation="vertical"><div className="book-reference-control" ref={setReferenceHeader} /></div>
    </div>
  </div>
}

import "./book-pages.css"
