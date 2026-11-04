import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, Circle, Copy, FilePlus2, PenLine, Plus, Trash2 } from "lucide-react"
import { blockOf, bookOutline, canIndent, canOutdent, copyName, moveInOutline, moveRange, retitle, visibleRows, type OutlineRow } from "../../core/books-outline"
import type { BookItem } from "../../core/books"
import { dirname } from "../../core/text"
import type { IndexedNote } from "../../core/vault-index"
import { OverflowMenu, type MenuEntry } from "../../components/kit/OverflowMenu"
import { Modal } from "../../components/ui"
import { NameDialog, RenameDialog } from "../../components/vault/dialogs"
import { flushOpenNotes } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"

const CLOSED_KEY = "runas-codex:livros:fechados"
const SUMMARIES_KEY = "runas-codex:livros:resumos"
type Status = "pronto" | "revisao" | "rascunho"
const STATUS: { id: Status; label: string }[] = [{ id: "rascunho", label: "Rascunho" }, { id: "revisao", label: "Revisão" }, { id: "pronto", label: "Pronto" }]
// No menu, o ponto vira ícone (o item do menu estica os <span>).
const STATUS_ICON: Record<Status, { color: string; fill: string }> = { rascunho: { color: "var(--line-strong)", fill: "none" }, revisao: { color: "var(--gold)", fill: "var(--gold)" }, pronto: { color: "var(--green)", fill: "var(--green)" } }
const STATUS_TEXT: Record<Status, string> = { pronto: "pronto", revisao: "revisão", rascunho: "rascunho" }
const statusOf = (status: string): Status => (/pront/i.test(status) ? "pronto" : /revis/i.test(status) ? "revisao" : "rascunho")
const words = (count: number) => `${count.toLocaleString("pt-BR")} ${count === 1 ? "palavra" : "palavras"}`
const KIND_LABEL: Record<string, string> = { capitulo: "capítulo", parte: "parte", secao: "seção", indice: "índice" }

function readClosed(book: string): string[] {
  try { const all = JSON.parse(localStorage.getItem(CLOSED_KEY) ?? "{}") as Record<string, unknown>; const list = all[book]; return Array.isArray(list) ? list.filter((v): v is string => typeof v === "string") : [] } catch { return [] }
}
function writeClosed(book: string, paths: string[]) {
  try { const all = JSON.parse(localStorage.getItem(CLOSED_KEY) ?? "{}") as Record<string, unknown>; if (paths.length) all[book] = paths; else delete all[book]; localStorage.setItem(CLOSED_KEY, JSON.stringify(all)) } catch { /* preferência deste aparelho, opcional */ }
}
const noteText = (kind: string, name: string) => `---\ntipo: ${kind}\nstatus: rascunho\nresumo: ""\n---\n# ${name}\n`

type Dialog = { kind: "new"; type: "secao" | "capitulo"; at: number } | { kind: "rename"; path: string } | { kind: "remove"; pos: number }
type Drop = { target: number; after: boolean; level: 1 | 2 }

/**
 * Sumário em árvore (Livros): capítulos com as seções recuadas embaixo, que fecham e abrem. Cada linha tem a alça ⠿
 * (arrastar; para a direita vira seção, para a esquerda vira capítulo) e o ⋯ com as ações. É uma árvore acessível:
 * ↑↓ andam, →← abrem e fecham, Enter abre, Alt+↑↓ movem, Alt+→← mudam o nível, F2 renomeia, Ctrl+D duplica, Del remove.
 * A `estrutura` continua uma lista reta de links; o nível é o `tipo` de cada nota (books-outline.ts).
 */
export function BookBinder({ book, items, selected, locked, onOpen, onSelect, run, announce }: {
  book: IndexedNote; items: BookItem[]; selected?: string; locked: boolean
  onOpen(path: string): void; onSelect(path: string | undefined): void
  run(action: () => Promise<void>): Promise<void>; announce(message: string): void
}) {
  const vault = useVault(), index = vault.index!
  const rows = useMemo(() => bookOutline(items.map((item) => item.kind)), [items])
  const [closedPaths, setClosedPaths] = useState(() => readClosed(book.path))
  useEffect(() => writeClosed(book.path, closedPaths), [book.path, closedPaths])
  const closed = useMemo(() => new Set(rows.filter((row) => row.children.length && closedPaths.includes(items[row.index]?.note?.path ?? "")).map((row) => row.index)), [rows, items, closedPaths])
  const shown = visibleRows(rows, closed)
  const [summaries, setSummaries] = useState(() => { try { return localStorage.getItem(SUMMARIES_KEY) === "true" } catch { return false } })
  useEffect(() => { try { localStorage.setItem(SUMMARIES_KEY, String(summaries)) } catch { /* opcional */ } }, [summaries])
  const [focusPos, setFocusPos] = useState(() => Math.max(0, items.findIndex((item) => item.note?.path === selected)))
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [drop, setDrop] = useState<Drop | null>(null)
  const drag = useRef<{ from: number; x: number } | null>(null)
  const tree = useRef<HTMLUListElement>(null)
  // Depois de mover pelo teclado, o foco segue a nota na posição nova (espera a gravação chegar ao índice).
  const [follow, setFollow] = useState<string | null>(null)
  useEffect(() => {
    if (!follow) return
    const at = items.findIndex((item) => item.note?.path === follow)
    if (at < 0) return
    setFocusPos(at); setFollow(null)
    requestAnimationFrame(() => tree.current?.querySelector<HTMLElement>(`[data-pos="${at}"]`)?.focus())
  }, [items, follow])

  const links = () => items.map((item) => item.link)
  const pathAt = (pos: number) => items[pos]?.note?.path
  const nameAt = (pos: number) => items[pos]?.note?.name ?? items[pos]?.link ?? ""
  const folder = dirname(book.path)
  const writeOrder = (order: number[]) => vault.setProperty(book.path, "estrutura", order.map((pos) => items[pos]!.link))
  const toggle = (row: OutlineRow, open?: boolean) => {
    const path = pathAt(row.index)
    if (!path || !row.children.length) return
    const isClosed = closed.has(row.index)
    if (open === undefined ? isClosed : open === isClosed) setClosedPaths((list) => (isClosed ? list.filter((p) => p !== path) : [...list, path]))
  }

  const move = (pos: number, direction: -1 | 1) => {
    const order = moveInOutline(rows, pos, direction)
    const path = pathAt(pos)
    if (!order || locked) return
    void run(async () => {
      await writeOrder(order)
      if (path) setFollow(path)
      announce(`${nameAt(pos)} ${direction < 0 ? "subiu" : "desceu"}.`)
    })
  }
  const setKind = (pos: number, kind: "secao" | "capitulo") => {
    const path = pathAt(pos)
    if (!path || locked) return
    void run(async () => {
      await vault.setProperty(path, "tipo", kind)
      setFollow(path)
      announce(kind === "secao" ? `${nameAt(pos)} virou seção do capítulo de cima.` : `${nameAt(pos)} virou capítulo.`)
    })
  }
  const setStatus = (pos: number, status: Status) => {
    const path = pathAt(pos)
    if (path) void run(async () => { await vault.setProperty(path, "status", status); announce(`${nameAt(pos)}: ${STATUS_TEXT[status]}.`) })
  }
  const duplicate = (pos: number) => {
    if (locked) return
    const [from, to] = blockOf(rows, pos)
    void run(async () => {
      await flushOpenNotes()
      const created: string[] = []
      for (let i = from; i < to; i++) {
        const note = items[i]?.note
        if (!note) continue
        const dir = dirname(note.path)
        const name = copyName(note.name, (candidate) => index.hasFile(`${dir ? dir + "/" : ""}${candidate}.md`))
        created.push(await vault.createNote(dir, name, retitle(note.text, note.name, name)))
      }
      const next = links()
      next.splice(to, 0, ...created.map((path) => `[[${index.linkTarget(path, book.path)}]]`))
      await vault.setProperty(book.path, "estrutura", next)
      if (created[0]) { onSelect(created[0]); setFollow(created[0]) }
      announce(created.length > 1 ? `${nameAt(pos)} duplicado com ${created.length - 1} ${created.length === 2 ? "seção" : "seções"}.` : `${nameAt(pos)} duplicado.`)
    })
  }
  const create = (type: "secao" | "capitulo", at: number, name: string) => run(async () => {
    const path = await vault.createNote(folder, name, noteText(type, name))
    const next = links()
    next.splice(at, 0, `[[${index.linkTarget(path, book.path)}]]`)
    await vault.setProperty(book.path, "estrutura", next)
    onSelect(path); setFollow(path)
    announce(`${type === "secao" ? "Seção" : "Capítulo"} “${name}” criado.`)
  })

  const onDragStart = (event: ReactPointerEvent<HTMLElement>, pos: number) => {
    if (locked) return
    drag.current = { from: pos, x: event.clientX }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const dropAt = (event: ReactPointerEvent<HTMLElement>): Drop | null => {
    const start = drag.current
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-pos]")
    if (!start || !target) return null
    const pos = Number(target.dataset.pos), box = target.getBoundingClientRect()
    const row = rows[pos]
    if (!row) return null
    const after = event.clientY > box.top + box.height / 2
    const dx = event.clientX - start.x
    // Para a direita vira seção, para a esquerda vira capítulo; sem andar para os lados, fica no nível de onde cai.
    let level: 1 | 2 = dx > 24 ? 2 : dx < -24 ? 1 : row.level === 2 || (after && row.children.length > 0 && !closed.has(pos)) ? 2 : 1
    const moving = rows[start.from]
    if (moving?.kind === "parte" || moving?.kind === "indice") level = 1
    return { target: pos, after, level }
  }
  const onDragMove = (event: ReactPointerEvent<HTMLElement>) => { if (drag.current) setDrop(dropAt(event)) }
  const onDragEnd = (event: ReactPointerEvent<HTMLElement>) => {
    const start = drag.current, result = dropAt(event)
    drag.current = null; setDrop(null)
    if (!start || !result) return
    const [from, to] = blockOf(rows, start.from)
    const targetRow = rows[result.target]!
    // Capítulo solto depois de um capítulo vai para depois das seções dele; seção cai logo depois da linha.
    const before = result.after ? (result.level === 1 ? blockOf(rows, targetRow.parent ?? result.target)[1] : result.target + 1) : result.target
    if (before >= from && before <= to && result.level === rows[start.from]!.level) return
    const order = moveRange(rows.map((r) => r.index), [from, to], before)
    const path = pathAt(start.from), kind = items[start.from]?.kind
    const nextKind = result.level === 2 && kind !== "secao" ? "secao" : result.level === 1 && kind === "secao" ? "capitulo" : null
    void run(async () => {
      await writeOrder(order)
      if (path && nextKind) await vault.setProperty(path, "tipo", nextKind)
      if (path) setFollow(path)
      announce(`${nameAt(start.from)} movido${nextKind ? `, agora ${KIND_LABEL[nextKind]}` : ""}.`)
    })
  }

  const menuFor = (row: OutlineRow): MenuEntry[] => {
    const pos = row.index, item = items[pos]!, path = item.note?.path
    const status = statusOf(item.status)
    const [, end] = blockOf(rows, pos)
    return [
      ...(row.kind === "capitulo" ? [{ label: "Nova seção dentro", icon: <FilePlus2 size={16} />, disabled: locked, onSelect: () => setDialog({ kind: "new", type: "secao", at: end }) }] : []),
      { label: "Novo capítulo depois", icon: <Plus size={16} />, disabled: locked, onSelect: () => setDialog({ kind: "new", type: "capitulo", at: row.level === 2 ? blockOf(rows, row.parent!)[1] : end }) },
      "separator",
      { label: "Renomear", icon: <PenLine size={16} />, hint: "F2", disabled: locked || !path, onSelect: () => path && setDialog({ kind: "rename", path }) },
      { label: "Duplicar", icon: <Copy size={16} />, hint: "Ctrl+D", disabled: locked || !path, onSelect: () => duplicate(pos) },
      { label: "Subir", icon: <ArrowUp size={16} />, hint: "Alt+↑", disabled: locked || !moveInOutline(rows, pos, -1), onSelect: () => move(pos, -1) },
      { label: "Descer", icon: <ArrowDown size={16} />, hint: "Alt+↓", disabled: locked || !moveInOutline(rows, pos, 1), onSelect: () => move(pos, 1) },
      ...(canIndent(rows, pos) ? [{ label: "Virar seção do capítulo de cima", icon: <ArrowRight size={16} />, hint: "Alt+→", disabled: locked, onSelect: () => setKind(pos, "secao") }] : []),
      ...(canOutdent(rows, pos) ? [{ label: "Virar capítulo", icon: <ArrowLeft size={16} />, hint: "Alt+←", disabled: locked, onSelect: () => setKind(pos, "capitulo") }] : []),
      "separator",
      ...STATUS.map((s) => ({ label: `Status: ${s.label.toLowerCase()}`, icon: s.id === status ? <Check size={16} /> : <Circle size={12} style={STATUS_ICON[s.id]} />, disabled: locked || !path || s.id === status, onSelect: () => setStatus(pos, s.id) })),
      "separator",
      { label: "Remover…", icon: <Trash2 size={16} />, hint: "Del", danger: true, disabled: locked, onSelect: () => setDialog({ kind: "remove", pos }) },
    ]
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>, row: OutlineRow) => {
    if (event.target !== event.currentTarget) return
    const at = shown.findIndex((r) => r.index === row.index)
    const go = (next: OutlineRow | undefined) => { if (!next) return; event.preventDefault(); setFocusPos(next.index); tree.current?.querySelector<HTMLElement>(`[data-pos="${next.index}"]`)?.focus() }
    if (event.altKey && event.key === "ArrowUp") { event.preventDefault(); move(row.index, -1) }
    else if (event.altKey && event.key === "ArrowDown") { event.preventDefault(); move(row.index, 1) }
    else if (event.altKey && event.key === "ArrowRight") { event.preventDefault(); if (canIndent(rows, row.index)) setKind(row.index, "secao") }
    else if (event.altKey && event.key === "ArrowLeft") { event.preventDefault(); if (canOutdent(rows, row.index)) setKind(row.index, "capitulo") }
    else if (event.key === "ArrowDown") go(shown[at + 1])
    else if (event.key === "ArrowUp") go(shown[at - 1])
    else if (event.key === "Home") go(shown[0])
    else if (event.key === "End") go(shown[shown.length - 1])
    else if (event.key === "ArrowRight") { event.preventDefault(); if (row.children.length && closed.has(row.index)) toggle(row, true); else if (row.children.length) go(rows[row.children[0]!]) }
    else if (event.key === "ArrowLeft") { event.preventDefault(); if (row.children.length && !closed.has(row.index)) toggle(row, false); else if (row.parent !== null) go(rows[row.parent]) }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); const path = pathAt(row.index); if (path) onOpen(path) }
    else if (event.key === "F2") { event.preventDefault(); const path = pathAt(row.index); if (path && !locked) setDialog({ kind: "rename", path }) }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") { event.preventDefault(); duplicate(row.index) }
    else if (event.key === "Delete") { event.preventDefault(); if (!locked) setDialog({ kind: "remove", pos: row.index }) }
  }

  const focusable = shown.some((r) => r.index === focusPos) ? focusPos : shown[0]?.index
  return <>
    <label className="check book-tree-summaries"><input type="checkbox" checked={summaries} onChange={(event) => setSummaries(event.target.checked)} /> Mostrar resumos</label>
    <ul className={`book-tree ${drop ? "dragging" : ""}`} role="tree" aria-label="Sumário do livro" ref={tree}>
      {shown.map((row) => {
        const item = items[row.index]!, title = item.note?.name ?? item.link, status = statusOf(item.status)
        const isClosed = closed.has(row.index)
        const total = item.words + (isClosed ? row.children.reduce((sum, child) => sum + (items[child]?.words ?? 0), 0) : 0)
        const current = Boolean(item.note && item.note.path === selected)
        const dropHere = drop?.target === row.index ? ` drop-${drop.after ? "after" : "before"} drop-level-${drop.level}` : ""
        // Chave estável (o link e quantas vezes ele já apareceu): ao mover, a linha anda sem remontar e o foco fica nela.
        const key = `${item.link}#${items.slice(0, row.index).filter((other) => other.link === item.link).length}`
        return <li key={key} role="treeitem" data-pos={row.index} tabIndex={row.index === focusable ? 0 : -1}
          aria-level={row.level} aria-expanded={row.children.length ? !isClosed : undefined} aria-selected={current}
          aria-label={`${title}, ${KIND_LABEL[row.kind] ?? row.kind}, ${item.note ? `${STATUS_TEXT[status]}, ${words(total)}` : "link quebrado"}${row.children.length ? `, ${row.children.length} ${row.children.length === 1 ? "seção" : "seções"}` : ""}`}
          className={`book-tree-row level-${row.level} kind-${row.kind}${current ? " current" : ""}${dropHere}`}
          onFocus={(event) => { if (event.target === event.currentTarget) setFocusPos(row.index) }}
          onKeyDown={(event) => onKeyDown(event, row)}>
          <div className="book-tree-line">
            <span className="book-tree-grip" aria-hidden="true" title="Arrastar (para a direita vira seção)" onPointerDown={(e) => onDragStart(e, row.index)} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={() => { drag.current = null; setDrop(null) }}>⠿</span>
            {row.children.length ? <span className="book-tree-toggle" aria-hidden="true" onClick={() => toggle(row)}><ChevronDown size={14} /></span> : <span className="book-tree-toggle no-children" aria-hidden="true" />}
            <button type="button" className="book-tree-name" tabIndex={-1} disabled={!item.note} onClick={() => { setFocusPos(row.index); if (item.note) onOpen(item.note.path) }} onDoubleClick={() => item.note && !locked && setDialog({ kind: "rename", path: item.note.path })}>
              {row.kind !== "parte" && <span className={`book-dot ${status}`} aria-hidden="true" />}
              <span className="book-toc-name">{title}</span>
            </button>
            <small className="book-tree-words" aria-hidden="true">{item.note ? total.toLocaleString("pt-BR") : "—"}</small>
            <span className="book-tree-menu"><OverflowMenu label={`Ações de ${title}`} triggerClassName="icon-btn sm" items={menuFor(row)} /></span>
          </div>
          {summaries && item.note && row.kind !== "parte" && <p className="book-tree-summary" aria-hidden="true">{item.summary || "Sem resumo"}</p>}
        </li>
      })}
    </ul>
    {dialog?.kind === "new" && <NameDialog title={dialog.type === "secao" ? "Nova seção" : "Novo capítulo"} label="Título" confirmLabel="Criar" onClose={() => setDialog(null)} onConfirm={(name) => create(dialog.type, dialog.at, name)} />}
    {dialog?.kind === "rename" && <RenameDialog index={index} path={dialog.path} folders={[...new Set(index.allNotes().map((n) => dirname(n.path)))]} onClose={() => setDialog(null)}
      onRename={async (to) => { await flushOpenNotes(); await vault.rename(dialog.path, to); if (selected === dialog.path) onSelect(to); announce("Renomeado.") }} />}
    {dialog?.kind === "remove" && <RemoveDialog rows={rows} items={items} pos={dialog.pos} onClose={() => setDialog(null)} onRemove={async (trash) => {
      const [from, to] = blockOf(rows, dialog.pos)
      const removed = items.slice(from, to)
      await flushOpenNotes()
      if (trash) for (const item of removed) { if (item.note) await vault.trash(item.note.path) }
      else await vault.setProperty(book.path, "estrutura", links().filter((_, i) => i < from || i >= to))
      if (removed.some((item) => item.note?.path === selected)) onSelect(items.find((item, i) => (i < from || i >= to) && item.note)?.note?.path)
      announce(trash ? "Mandado para a lixeira do cofre." : "Tirado do livro; está em “Fora do livro”.")
    }} />}
  </>
}

/** Remover pergunta o destino: tirar do livro (padrão, a nota fica no cofre) ou mandar para a lixeira. */
function RemoveDialog({ rows, items, pos, onClose, onRemove }: { rows: OutlineRow[]; items: BookItem[]; pos: number; onClose(): void; onRemove(trash: boolean): Promise<void> }) {
  const [trash, setTrash] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [from, to] = blockOf(rows, pos)
  const title = items[pos]?.note?.name ?? items[pos]?.link ?? ""
  const sections = to - from - 1
  return <Modal title={`Remover “${title}”`} onClose={onClose} footer={<>
    <button className="btn" onClick={onClose}>Cancelar</button>
    <button className={`btn ${trash ? "danger" : "primary"}`} disabled={busy} onClick={() => { setBusy(true); setError(""); onRemove(trash).then(onClose, (e: unknown) => { setError(String(e)); setBusy(false) }) }}>
      {busy ? "Gravando…" : trash ? "Mandar para a lixeira" : "Tirar do livro"}
    </button>
  </>}>
    {sections > 0 && <p className="small">Vai junto {sections === 1 ? "a seção" : `as ${sections} seções`} deste capítulo.</p>}
    <fieldset className="stack book-remove-choice">
      <legend className="sr-only">O que fazer</legend>
      <label className="check"><input type="radio" name="remover" checked={!trash} onChange={() => setTrash(false)} /> <span><strong>Tirar do livro</strong><br /><span className="small muted">A nota fica no cofre e aparece em “Fora do livro”, para incluir de novo.</span></span></label>
      <label className="check"><input type="radio" name="remover" checked={trash} onChange={() => setTrash(true)} /> <span><strong>Mandar para a lixeira</strong><br /><span className="small muted">Vai para a lixeira do cofre (<code>.trash</code>), a mesma do Obsidian. Dá para recuperar de lá.</span></span></label>
    </fieldset>
    {error && <p className="small" role="alert" style={{ color: "var(--red)" }}>{error}</p>}
  </Modal>
}
