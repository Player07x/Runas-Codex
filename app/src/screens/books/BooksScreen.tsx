import { useState } from "react"
import { bookProperties, bookRoute, findBooks, newBookText, readBook } from "../../core/books"
import { nameProblem } from "../../core/names"
import { href, navigate } from "../../lib/router"
import { useVault } from "../../platform/VaultProvider"
import { BookEditor } from "./BookEditor"
import { BookImport } from "./BookImport"
import "../notes.css"
import "./books.css"
import "./book-workspace.css"

export function BooksScreen({ bookId }: { bookId?: string }) {
  const vault = useVault()
  if (vault.loading) return <div className="page">Carregando livros…</div>
  if (!vault.index || !vault.info) return <div className="page">
    <h1>Livros</h1>
    <p>{vault.error ?? "Abra um cofre em Configurações para acessar seus livros."}</p>
  </div>
  if (bookId) {
    const book = findBooks(vault.index).find((n) => n.path === bookId)
    return book ? <BookEditor key={book.path} book={book} /> : <div className="page">
      <p>Livro não encontrado.</p>
      <a href={href("/livros")}>Voltar aos livros</a>
    </div>
  }
  return <BookList />
}
function BookList() {
  const vault = useVault()
  const index = vault.index!
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [title, setTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function create() {
    setBusy(true); setError("")
    try {
      const name = title.trim()
      const problem = nameProblem(name)
      if (problem) throw new Error(problem)
      const folder = `Livros/${name}`
      if (index.allFiles().some((f) => f.path.toLocaleLowerCase().startsWith(folder.toLocaleLowerCase() + "/"))) throw new Error("Já existe uma pasta para esse livro.")
      await vault.createFolder(folder)
      const path = await vault.createNote(folder, name, newBookText(name))
      const chapterName = name === "Capítulo 1 — Início" ? "Capítulo 1" : "Capítulo 1 — Início"
      const chapter = await vault.createNote(folder, chapterName, "---\ntipo: capitulo\nstatus: rascunho\n---\n# Início\n")
      await vault.setProperty(path, "estrutura", [`[[${index.linkTarget(chapter, path)}]]`])
      navigate(bookRoute(path))
    } catch (e) { setError(String(e)) } finally { setBusy(false) }
  }
  return <div className="page books-list">
    <div className="page-head">
      <div>
        <span className="eyebrow">Sua biblioteca</span>
        <h1 className="page-title">Livros</h1>
      </div>
      <div className="row-wrap">
        <button className="btn" disabled={vault.info?.readOnly} onClick={() => setImporting(true)}>Importar livro</button>
        <button className="btn primary" disabled={vault.info?.readOnly} onClick={() => setCreating(!creating)}>Novo livro</button>
      </div>
    </div>
    {vault.info?.readOnly && <p className="proto-note">Cofre em somente leitura. Libere a gravação em Configurações › Cofre para criar ou editar livros.</p>}
    {importing && <BookImport onClose={() => setImporting(false)} />}
    {creating && <form className="row-wrap" onSubmit={(e) => { e.preventDefault(); if (!busy) void create() }}>
      <label className="field">Título do livro<input className="input" aria-label="Título do livro" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <button className="btn primary" disabled={busy || !title.trim()}>Criar livro</button>
    </form>}
    {error && <p role="alert">{error} Se houve criação parcial, as notas permanecem disponíveis em Notas.</p>}
    <div className="book-shelf">{findBooks(index).map((book) => {
      const stats = readBook(index, book), data = bookProperties(book)
      return <a key={book.path} className="book-card" href={href(bookRoute(book.path))}>
        <div className="book-cover">
          <span className="display">{book.name}</span>
        </div>
        <div className="stack">
          <strong>{book.name}</strong>
          <span>{String(data.subtitulo ?? "")}</span>
          <span className="small muted">{stats.chapters} capítulos · {stats.words.toLocaleString("pt-BR")} palavras</span></div>
      </a>
    })}</div>
    {!findBooks(index).length && <p>Nenhum livro neste cofre. Crie seu primeiro livro.</p>}
  </div>
}
