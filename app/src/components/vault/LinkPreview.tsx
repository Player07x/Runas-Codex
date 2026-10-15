import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react"
import { createPortal } from "react-dom"
import { ExternalLink, X } from "lucide-react"
import { previewText, splitLinkTarget } from "../../core/link-preview"
import { noteName } from "../../core/text"
import type { VaultIndex } from "../../core/vault-index"
import type { NoteSet } from "../../lib/note-set"
import { NoteSetContext } from "../../lib/note-set"
import { navigate } from "../../lib/router"
import { noteRoute, vaultNoteSet } from "../../lib/vault-notes"
import { isNotesLocked } from "../../lib/notes-lock"
import type { Platform } from "../../platform/platform"
import { Markdown } from "../Markdown"
import "./link-preview.css"

const HOVER_MS = 450
const HIDE_MS = 250
const LONG_PRESS_MS = 500
export const LINK_SELECTOR = "[data-href], [data-lp-wiki], [data-lp-href], a.wikilink"

interface Shown {
  path: string
  subpath?: string
  rect: DOMRect
}

/** O destino de um link do leitor (`data-href`, ou o caminho no `title` dos links Markdown) ou do live preview. */
export function targetOf(el: HTMLElement, noteSet: NoteSet, index: VaultIndex): { path: string; subpath?: string } | null {
  if (el.classList.contains("broken")) return null
  const wiki = el.dataset.href ?? el.dataset.lpWiki
  const href = el.dataset.lpHref
  if (wiki !== undefined || href !== undefined) {
    let raw = wiki ?? href!
    if (href !== undefined) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null
      try {
        raw = decodeURIComponent(raw)
      } catch {
        /* fica como está */
      }
    }
    const { target, subpath } = splitLinkTarget(raw)
    if (!target) return null
    const found = noteSet.resolve?.(target, wiki !== undefined ? "wiki" : "markdown")
    return found && index.note(found.path) ? { path: found.path, ...(subpath ? { subpath } : {}) } : null
  }
  // Link Markdown no modo leitura: o caminho resolvido vai no título.
  const title = el.getAttribute("title") ?? ""
  return index.note(title) ? { path: title } : null
}

interface Options {
  index: VaultIndex
  noteSet: NoteSet
  platform: Pick<Platform, "fileUrl" | "openFile">
  /** No modo de edição o mouse só abre a prévia com Ctrl (ou Cmd) apertado, como no Obsidian. */
  needsModifier: boolean
}

/**
 * Prévia de link sem abrir a nota: passar o mouse (desktop) ou tocar e segurar (celular) num link da nota. Os eventos
 * são ouvidos na borda da nota — o leitor e o live preview não mudam.
 */
export function useLinkPreview(container: RefObject<HTMLElement | null>, { index, noteSet, platform, needsModifier }: Options) {
  const [shown, setShown] = useState<Shown | null>(null)
  const popover = useRef<HTMLDivElement>(null)
  const timers = useRef<{ show?: number; hide?: number; press?: number }>({})
  const press = useRef<{ x: number; y: number } | null>(null)
  const suppressUntil = useRef(0)
  const options = useRef({ noteSet, index, needsModifier })
  options.current = { noteSet, index, needsModifier }

  const hide = () => {
    window.clearTimeout(timers.current.show)
    setShown(null)
  }
  const scheduleHide = () => {
    window.clearTimeout(timers.current.hide)
    timers.current.hide = window.setTimeout(hide, HIDE_MS)
  }

  useEffect(() => {
    const root = container.current
    if (!root) return
    const linkAt = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>(LINK_SELECTOR) : null)
    const show = (el: HTMLElement) => {
      const found = targetOf(el, options.current.noteSet, options.current.index)
      // Notas pessoais com o espaço bloqueado por PIN não aparecem na prévia de outras telas.
      if (found && !(found.path.startsWith("Notas/") && isNotesLocked())) setShown({ ...found, rect: el.getBoundingClientRect() })
    }

    const onMouseOver = (event: MouseEvent) => {
      const el = linkAt(event.target)
      if (!el || Date.now() < suppressUntil.current) return
      if (options.current.needsModifier && !(event.ctrlKey || event.metaKey)) return
      window.clearTimeout(timers.current.hide)
      window.clearTimeout(timers.current.show)
      timers.current.show = window.setTimeout(() => show(el), HOVER_MS)
    }
    const onMouseOut = (event: MouseEvent) => {
      const el = linkAt(event.target)
      if (!el || (event.relatedTarget instanceof Node && el.contains(event.relatedTarget))) return
      window.clearTimeout(timers.current.show)
      scheduleHide()
    }
    // Toque longo: a prévia abre e o toque não segue como clique (nem abre o link, nem o menu do sistema).
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return
      const el = linkAt(event.target)
      if (!el) return
      press.current = { x: event.clientX, y: event.clientY }
      window.clearTimeout(timers.current.press)
      timers.current.press = window.setTimeout(() => {
        suppressUntil.current = Date.now() + 1500
        show(el)
      }, LONG_PRESS_MS)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!press.current) return
      if (Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) > 10) window.clearTimeout(timers.current.press)
    }
    const onPointerEnd = () => {
      press.current = null
      window.clearTimeout(timers.current.press)
    }
    const swallow = (event: Event) => {
      if (Date.now() > suppressUntil.current) return
      event.preventDefault()
      event.stopPropagation()
    }
    root.addEventListener("mouseover", onMouseOver)
    root.addEventListener("mouseout", onMouseOut)
    root.addEventListener("pointerdown", onPointerDown)
    root.addEventListener("pointermove", onPointerMove)
    root.addEventListener("pointerup", onPointerEnd)
    root.addEventListener("pointercancel", onPointerEnd)
    // Na captura: chega antes do clique do leitor e do mousedown do live preview.
    root.addEventListener("click", swallow, true)
    root.addEventListener("mousedown", swallow, true)
    root.addEventListener("contextmenu", swallow, true)
    return () => {
      root.removeEventListener("mouseover", onMouseOver)
      root.removeEventListener("mouseout", onMouseOut)
      root.removeEventListener("pointerdown", onPointerDown)
      root.removeEventListener("pointermove", onPointerMove)
      root.removeEventListener("pointerup", onPointerEnd)
      root.removeEventListener("pointercancel", onPointerEnd)
      root.removeEventListener("click", swallow, true)
      root.removeEventListener("mousedown", swallow, true)
      root.removeEventListener("contextmenu", swallow, true)
      window.clearTimeout(timers.current.show)
      window.clearTimeout(timers.current.hide)
      window.clearTimeout(timers.current.press)
    }
  }, [container])

  // Fecha com Esc, ao rolar, ao trocar de tela ou ao tocar fora.
  useEffect(() => {
    if (!shown) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && hide()
    const onOutside = (event: PointerEvent) => {
      if (popover.current?.contains(event.target as Node)) return
      if (Date.now() < suppressUntil.current) return
      hide()
    }
    const onScroll = (event: Event) => {
      if (popover.current?.contains(event.target as Node)) return
      hide()
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("pointerdown", onOutside, true)
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("hashchange", hide)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("pointerdown", onOutside, true)
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("hashchange", hide)
    }
  }, [shown])

  const note = shown ? index.note(shown.path) : undefined
  const preview = useMemo(() => (note ? previewText(note.text, shown?.subpath) : null), [note, shown?.subpath])
  const set = useMemo(() => (shown ? vaultNoteSet(index, shown.path, {}, platform) : null), [index, shown?.path, platform])
  if (!shown || !preview || !set) return null

  // Embaixo do link se couber; senão, em cima. No celular, como folha no pé da tela.
  const sheet = window.innerWidth < 560
  const width = Math.min(440, window.innerWidth - 24)
  const below = window.innerHeight - shown.rect.bottom
  const style: CSSProperties = sheet
    ? {}
    : {
        width,
        left: Math.min(Math.max(12, shown.rect.left), window.innerWidth - width - 12),
        ...(below >= 280 || below >= shown.rect.top
          ? { top: shown.rect.bottom + 8, maxHeight: Math.min(400, below - 20) }
          : { bottom: window.innerHeight - shown.rect.top + 8, maxHeight: Math.min(400, shown.rect.top - 20) }),
      }

  return createPortal(
    <div
      ref={popover}
      className={`link-preview card ${sheet ? "sheet" : ""}`}
      style={style}
      role="dialog"
      aria-label={`Prévia de ${noteName(shown.path)}`}
      onMouseEnter={() => window.clearTimeout(timers.current.hide)}
      onMouseLeave={scheduleHide}
    >
      <div className="link-preview-head">
        <strong className="truncate" title={shown.path}>
          {noteName(shown.path)}
          {shown.subpath && <span className="muted"> {shown.subpath.replace(/^#/, "› ").replace(/#/g, " › ")}</span>}
        </strong>
        <button
          className="btn sm"
          onClick={() => {
            hide()
            navigate(noteRoute(shown.path))
          }}
        >
          <ExternalLink size={13} /> Abrir
        </button>
        {sheet && (
          <button className="icon-btn sm" aria-label="Fechar a prévia" onClick={hide}>
            <X size={15} />
          </button>
        )}
      </div>
      {preview.missingSection && <p className="tiny link-preview-warning">“{shown.subpath}” não existe nesta nota; aparece a nota inteira.</p>}
      <div className="link-preview-body">
        <NoteSetContext.Provider value={set}>{preview.markdown ? <Markdown source={preview.markdown} /> : <p className="muted small">Nota vazia.</p>}</NoteSetContext.Provider>
        {preview.truncated && <p className="tiny muted">… a nota continua.</p>}
      </div>
    </div>,
    document.body,
  )
}
