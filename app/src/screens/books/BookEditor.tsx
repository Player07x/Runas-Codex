import { lazy, Suspense, useCallback, useRef, useState } from "react"
import { bookProperties, countWords, moveBookItem, readBook } from "../../core/books"
import { dirname } from "../../core/text"
import type { IndexedNote } from "../../core/vault-index"
import { NoteView } from "../../components/vault/NoteView"
import { Progress } from "../../components/ui"
import { href, navigate } from "../../lib/router"
import { vaultRoute } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { FORMATTER_GROUPS } from "./formatters"

const BookPreview = lazy(() => import("./BookPreview"))

export function BookEditor({ book }: { book: IndexedNote }) {
  const vault = useVault(), index = vault.index!
  const structure = readBook(index, book)
  const [selected, setSelected] = useState<string | undefined>(() => structure.items.find((i) => i.note)?.note?.path)
  const [view, setView] = useState("escrever")
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
  const goal = Number(bookProperties(book).meta_palavras) || 0
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
  return <div className={`books-editor books-view-${view}`}>
    <header className="books-header">
      <a className="btn" href={href("/livros")}>Livros</a>
      <strong>{book.name}</strong>
      <span>{structure.words.toLocaleString("pt-BR")} / {goal || "sem meta"} palavras</span>{goal > 0 && <div className="books-progress" aria-label={`Progresso: ${Math.round(structure.words / goal * 100)}%`}>
        <Progress value={structure.words} max={goal} />
      </div>}<nav className="row-wrap" aria-label="Visão do livro">{[["estrutura", "Estrutura"], ["escrever", "Escrever"], ["cortica", "Cortiça"], ["previa", "Prévia"]].map(([value, label]) => <button key={value} className="btn" aria-pressed={view === value} onClick={() => { setView(value!); if (value === "previa") setPreview(true) }}>{label}</button>)}</nav>
      <button className="btn" onClick={() => navigate(vaultRoute(book.path))}>Metadados do livro</button>
    </header>
    {vault.info?.readOnly && <p className="proto-note">Somente leitura. Libere a gravação em Configurações › Cofre.</p>}
    {(error || structure.error) && <p role="alert">{error || structure.error}</p>}
    <span className="books-announcement" role="status">{announcement}</span>
    <div className={`books-layout ${preview ? "has-preview" : ""}`}>
      <aside className="books-binder" aria-label="Estrutura do livro">
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
      </aside>
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
          <NoteView onDraftChange={onDraftChange} key={current.path} path={current.path} folders={[...new Set(index.allNotes().map((n) => dirname(n.path)))]} onShowPanel={() => navigate(vaultRoute(current.path))} onBack={() => setView("estrutura")} onCreate={(target) => { setName(target); setCreating(true); setView("estrutura") }} onTag={() => navigate("/notas")} toolbar={(insert) => <div className="books-formatters">
            <label>Inserir formatador<select className="input" aria-label="Inserir formatador" value="" onChange={(e) => { if (e.target.value) insert(e.target.value) }}>
              <option value="">Escolha uma formatação…</option>{FORMATTER_GROUPS.map((group) => <optgroup key={group.title} label={group.title}>{group.items.map((f) => <option key={f.label} value={f.syntax}>{f.label}</option>)}</optgroup>)}</select>
            </label>
          </div>} />
        </> : <p className="page">Selecione uma nota na estrutura. Links quebrados podem ser corrigidos nos metadados do livro.</p>}
      </main>
      {preview && <Suspense fallback={<p>Carregando prévia…</p>}><BookPreview book={book} draft={draft} onClose={() => { setPreview(false); setView("escrever") }} /></Suspense>}
    </div>
  </div>
}
