import { Plus, Target } from "lucide-react"
import { BOOKS } from "../../data/books"
import { href } from "../../lib/router"
import { Progress, useProtoAction } from "../../components/ui"
import { BookEditor } from "./BookEditor"
import "./books.css"

export function BooksScreen({ bookId }: { bookId?: string }) {
  const book = BOOKS.find((b) => b.id === bookId)
  if (book) return <BookEditor book={book} />
  return <BookList />
}

function BookList() {
  const proto = useProtoAction()
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Espaço Livros · cada capítulo é uma nota .md</span>
          <h1 className="page-title">Livros</h1>
        </div>
        <div className="row-wrap">
          <button className="btn" onClick={proto("importar Homebrewery / GM Binder / DOCX")}>Importar</button>
          <button className="btn primary" onClick={proto("criar livro")}>
            <Plus size={16} /> Novo livro
          </button>
        </div>
      </div>
      <div className="book-shelf">
        {BOOKS.map((book) => {
          const words = book.chapters.reduce((sum, c) => sum + c.words, 0)
          return (
            <a key={book.id} className="book-card" href={href(`/livros/${book.id}`)}>
              <div className="book-cover">
                <span className="display">{book.title}</span>
                <small>{book.subtitle}</small>
              </div>
              <div className="stack" style={{ gap: 6 }}>
                <strong>{book.title}</strong>
                <span className="muted small">
                  {book.chapters.length} capítulos · {book.page} · tema {book.theme}
                </span>
                <span className="row small">
                  <Target size={14} color="var(--gold)" /> {words.toLocaleString("pt-BR")} / {book.goal.toLocaleString("pt-BR")} palavras
                </span>
                <Progress value={words} max={book.goal} color="var(--gold)" />
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
