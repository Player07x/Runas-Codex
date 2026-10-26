import { ChevronLeft, ChevronRight, LocateFixed } from "lucide-react"
import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react"
import { ChoiceGroup } from "../../components/kit/ChoiceGroup"
import { OverflowMenu, type MenuEntry } from "../../components/kit/OverflowMenu"
import { cursorAnchor, firstBodyLine, followPage, lineForRendered, matchHeadings, sourceHeadings } from "../../core/books-follow"
import type { IndexedNote } from "../../core/vault-index"
import { useVault } from "../../platform/VaultProvider"
import { BookPages, type BookPagesHandle, type PagesState, type PagesZoom } from "./BookPages"
import type { CursorStore } from "./cursor-store"
import "./book-side.css"

const ZOOM_KEY = "runas-codex:livros:previa-zoom"
const FOLLOW_KEY = "runas-codex:livros:previa-seguir"
const CHAPTER_KEY = "runas-codex:livros:previa-capitulo"
const ZOOMS: { value: PagesZoom; label: string }[] = [{ value: "largura", label: "Largura" }, { value: "pagina", label: "Página" }, { value: "duas", label: "Duas" }]
const stored = (key: string) => { try { return localStorage.getItem(key) } catch { return null } }
const store = (key: string, value: string) => { try { localStorage.setItem(key, value) } catch { /* preferência opcional */ } }
const reducedMotion = () => document.documentElement.dataset.motion === "reduce" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

interface ChapterPages { start: number; end: number; headings: { el: HTMLElement; text: string; page: number }[] }
interface PageMap { pages: HTMLElement[]; chapters: Map<string, ChapterPages> }

/** Páginas de cada capítulo e os títulos desenhados nelas, na ordem. Um capítulo listado duas vezes conta a primeira. */
function mapPages(output: HTMLElement): PageMap {
  const pages = [...output.querySelectorAll<HTMLElement>(".pagedjs_page")]
  const chapters = new Map<string, ChapterPages>()
  const first = new Map<string, string>()
  pages.forEach((page, p) => {
    for (const section of page.querySelectorAll<HTMLElement>("[data-book-path]")) {
      const path = section.dataset.bookPath!, chapter = section.dataset.bookChapter ?? ""
      if ((first.get(path) ?? chapter) !== chapter) continue
      first.set(path, chapter)
      const entry = chapters.get(path) ?? { start: p, end: p, headings: [] }
      entry.end = p
      for (const heading of section.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")) {
        if (!heading.classList.contains("book-chapter-heading")) entry.headings.push({ el: heading, text: heading.textContent ?? "", page: p })
      }
      chapters.set(path, entry)
    }
  })
  return { pages, chapters }
}

/**
 * Prévia ao lado do texto (L1): as páginas se refazem enquanto se escreve e acompanham o cursor; o trecho em edição
 * fica marcado e clicar num título da página leva o editor até ele. `tela` é a versão do celular, em tela cheia.
 */
export default function BookSidePreview({ book, draft, chapterPath, cursor, variant = "painel", onOpenAt, onDiagramar, onClose }: {
  book: IndexedNote
  draft?: { path: string; text: string }
  /** Capítulo aberto no editor. */
  chapterPath?: string
  cursor: CursorStore
  variant?: "painel" | "tela"
  onOpenAt(path: string, line: number): void
  onDiagramar(): void
  onClose?(): void
}) {
  const vault = useVault(), index = vault.index!
  const pages = useRef<BookPagesHandle>(null)
  const map = useRef<PageMap | null>(null)
  const marked = useRef<{ page?: HTMLElement; heading?: HTMLElement }>({})
  const followed = useRef(-1)
  const back = useRef<HTMLButtonElement>(null)
  const [state, setState] = useState<PagesState>({ ready: false, status: "Preparando as páginas…", error: "", total: 0 })
  const [zoom, setZoom] = useState<PagesZoom>(() => { const saved = stored(ZOOM_KEY); return variant === "painel" && ZOOMS.some((z) => z.value === saved) ? saved as PagesZoom : "largura" })
  const [follow, setFollow] = useState(() => variant === "tela" || stored(FOLLOW_KEY) !== "false")
  const [onlyChapter, setOnlyChapter] = useState(() => stored(CHAPTER_KEY) === "true")
  const [current, setCurrent] = useState(0)
  const [announcement, setAnnouncement] = useState("")
  const position = useSyncExternalStore(cursor.subscribe, cursor.get)
  useEffect(() => { if (variant === "painel") store(ZOOM_KEY, zoom) }, [zoom, variant])
  useEffect(() => { if (variant === "painel") store(FOLLOW_KEY, String(follow)) }, [follow, variant])
  useEffect(() => store(CHAPTER_KEY, String(onlyChapter)), [onlyChapter])

  const textOf = (path: string) => (draft?.path === path ? draft.text : index.note(path)?.text ?? "")

  /** Página e título do cursor; antes de o cursor andar, o começo do capítulo aberto. */
  function locate(): { page: number; heading?: HTMLElement } | null {
    const entry = chapterPath ? map.current?.chapters.get(chapterPath) : undefined
    if (!chapterPath || !entry) return null
    const text = textOf(chapterPath)
    const headings = sourceHeadings(text)
    const match = matchHeadings(headings.map((h) => h.text), entry.headings.map((h) => h.text))
    const line = position?.path === chapterPath ? position.line - 1 : firstBodyLine(text)
    const anchor = cursorAnchor(headings, line, text.split("\n").length)
    const page = followPage(anchor, match.map((r) => (r === undefined ? undefined : entry.headings[r]!.page)), entry)
    const rendered = anchor.heading >= 0 ? match[anchor.heading] : undefined
    return { page, heading: rendered === undefined ? undefined : entry.headings[rendered]!.el }
  }

  function scrollToPage(page: number, always: boolean) {
    const container = pages.current?.scroll, target = map.current?.pages[page]
    if (!container || !target) return
    const box = container.getBoundingClientRect(), rect = target.getBoundingClientRect()
    // Já inteira à vista: não mexe, para a prévia não pular enquanto se digita.
    if (!always && rect.top >= box.top && rect.bottom <= box.bottom) return
    container.scrollTo({ top: container.scrollTop + rect.top - box.top - 12, behavior: reducedMotion() ? "auto" : "smooth" })
  }

  /** Marca a página e o título do cursor e, seguindo o texto, traz a página à vista quando ela muda. */
  function sync(force: boolean) {
    marked.current.page?.removeAttribute("data-cursor-page")
    marked.current.heading?.removeAttribute("data-cursor-heading")
    marked.current = {}
    const found = locate()
    const target = found ? map.current?.pages[found.page] : undefined
    if (!found || !target) return
    target.setAttribute("data-cursor-page", "")
    found.heading?.setAttribute("data-cursor-heading", "")
    marked.current = { page: target, heading: found.heading }
    if (!follow || (!force && found.page === followed.current)) return
    followed.current = found.page
    scrollToPage(found.page, false)
    setAnnouncement(`Página ${found.page + 1} de ${map.current!.pages.length}`)
  }

  function trackCurrent() {
    const container = pages.current?.scroll, list = map.current?.pages
    if (!container || !list?.length) return
    const box = container.getBoundingClientRect(), line = box.top + box.height * 0.35
    let found = 0
    list.forEach((page, i) => { if (page.getBoundingClientRect().top <= line) found = i })
    setCurrent(found)
  }
  const frame = useRef(0)
  const onScroll = () => { cancelAnimationFrame(frame.current); frame.current = requestAnimationFrame(trackCurrent) }
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const onPaginated = (output: HTMLDivElement) => {
    map.current = mapPages(output)
    sync(true)
    requestAnimationFrame(trackCurrent)
  }
  useEffect(() => { followed.current = -1 }, [chapterPath])
  useEffect(() => sync(false), [position, chapterPath, follow, draft])

  useEffect(() => {
    if (variant !== "tela") return
    back.current?.focus()
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) onClose?.() }
    window.addEventListener("keydown", escape)
    return () => window.removeEventListener("keydown", escape)
  }, [variant])

  function openFromPage(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as Element
    const heading = target.closest<HTMLElement>("h1, h2, h3, h4, h5, h6"), section = target.closest<HTMLElement>("[data-book-path]")
    if (!heading || !section) return
    const path = section.dataset.bookPath!, text = textOf(path)
    if (heading.classList.contains("book-chapter-heading")) return onOpenAt(path, firstBodyLine(text))
    const entry = map.current?.chapters.get(path)
    if (!entry) return
    const headings = sourceHeadings(text)
    const line = lineForRendered(headings, matchHeadings(headings.map((h) => h.text), entry.headings.map((h) => h.text)), entry.headings.findIndex((h) => h.el === heading))
    if (line !== undefined) onOpenAt(path, line)
  }

  const goToCursor = () => { const found = locate(); if (found) { followed.current = found.page; scrollToPage(found.page, true) } }
  const step = (delta: number) => { const next = Math.min(state.total - 1, Math.max(0, current + delta)); scrollToPage(next, true); setCurrent(next) }
  const pageTitle = (page: number) => {
    const element = map.current?.pages[page]
    // A página do cursor leva o nome do capítulo aberto; nas outras, o primeiro capítulo que começa nela (o que só
    // continua da página anterior, marcado pelo Paged.js com data-split-from, fica por último).
    if (element && element === marked.current.page && chapterPath) return index.note(chapterPath)?.name ?? ""
    const section = element?.querySelector<HTMLElement>("[data-book-path]:not([data-split-from])") ?? element?.querySelector<HTMLElement>("[data-book-path]")
    const path = section?.dataset.bookPath
    if (path) return index.note(path)?.name ?? ""
    return element?.querySelector(".book-print-cover") ? "Capa" : ""
  }
  const title = state.total ? pageTitle(current) : ""
  const label = state.total ? <>Página <b>{current + 1}</b> de {state.total}{title && <> · {title}</>}</> : state.status
  const menu: MenuEntry[] = [
    { label: "Ir para a página do cursor", icon: <LocateFixed size={16} />, disabled: !state.total, onSelect: goToCursor },
    { label: onlyChapter ? "Mostrar o livro inteiro" : "Mostrar só este capítulo", disabled: !chapterPath, onSelect: () => setOnlyChapter(!onlyChapter) },
    "separator",
    { label: "Diagramar e exportar…", onSelect: onDiagramar },
  ]

  return <section className={`book-side ${variant}`} aria-label="Prévia das páginas" role={variant === "tela" ? "dialog" : undefined} aria-modal={variant === "tela" || undefined}>
    {variant === "tela" ? <header className="book-side-bar">
      <button ref={back} type="button" className="btn ghost" onClick={onClose}><ChevronLeft size={16} /> Texto</button>
      <span className="book-side-page">{label}</span>
      <OverflowMenu label="Opções da prévia" items={menu} />
    </header> : <header className="book-side-head">
      <span className="book-side-page">{label}</span>
      <ChoiceGroup label="Tamanho das páginas" value={zoom} onChange={setZoom} options={ZOOMS} />
      <button type="button" className="btn sm" aria-pressed={follow} onClick={() => { if (!follow) followed.current = -1; setFollow(!follow) }} title="A página onde está o cursor fica à vista"><LocateFixed size={15} /> Seguir o texto</button>
      <OverflowMenu label="Opções da prévia" items={menu} />
    </header>}
    {onlyChapter && chapterPath && <p className="book-side-note small muted">Só o capítulo aberto; a numeração recomeça em 1.</p>}
    <span className="sr-only" aria-live="polite">{announcement}</span>
    <BookPages ref={pages} book={book} draft={draft} decorative zoom={zoom} onlyPath={onlyChapter ? chapterPath : undefined} onState={setState} onPaginated={onPaginated} onScroll={onScroll} onPagesClick={openFromPage} />
    {variant === "tela" && <footer className="book-side-pager">
      <button type="button" className="btn ghost" aria-label="Página anterior" disabled={current <= 0} onClick={() => step(-1)}><ChevronLeft size={18} /></button>
      <span>{state.total ? `${current + 1} de ${state.total}` : ""}</span>
      <button type="button" className="btn ghost" aria-label="Próxima página" disabled={current >= state.total - 1} onClick={() => step(1)}><ChevronRight size={18} /></button>
    </footer>}
  </section>
}
