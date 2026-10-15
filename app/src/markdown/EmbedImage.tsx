import { createContext, useContext, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { MoveDiagonal2, RotateCcw, StretchHorizontal, TextAlignCenter, TextAlignEnd, TextAlignStart, type LucideIcon } from "lucide-react"
import type { EmbedOptions, ImagePosition } from "../core/embeds"

/**
 * Quem desenha a imagem dentro do editor (o live preview) passa isto: a alça e o menu regravam só o apelido do link
 * (`![[mapa.png|direita|300]]`). Sem ele (modo leitura, prévia do livro), a imagem é só imagem.
 */
export interface ImageEditApi {
  change(target: string, alias: string | undefined, next: EmbedOptions): void
}

export const ImageEditContext = createContext<ImageEditApi | null>(null)

const POSITIONS: { value: ImagePosition; label: string; icon: LucideIcon }[] = [
  { value: "esquerda", label: "À esquerda, com o texto em volta", icon: TextAlignStart },
  { value: "centro", label: "No centro", icon: TextAlignCenter },
  { value: "direita", label: "À direita, com o texto em volta", icon: TextAlignEnd },
  { value: "largo", label: "Largura total", icon: StretchHorizontal },
]

const MIN_WIDTH = 40
const KEY_STEP = 20

interface Props {
  src: string
  alt: string
  options: EmbedOptions
  /** Alvo e apelido como estão no texto, para achar o link certo ao regravar. */
  target: string
  alias: string | undefined
  className?: string
}

/** Imagem de anexo com a posição (`pos-direita`…) e o tamanho do link; no editor, com alça e menu. */
export function EmbedImage({ src, alt, options, target, alias, className = "embed-image" }: Props) {
  const edit = useContext(ImageEditContext)
  const position = options.position ? ` pos-${options.position}` : ""
  const wide = options.position === "largo"
  if (!edit) return <img className={`${className}${position}`} src={src} alt={alt} width={wide ? undefined : options.width} height={wide ? undefined : options.height} loading="lazy" />
  return <EditableImage src={src} alt={alt} options={options} target={target} alias={alias} className={className} edit={edit} />
}

function EditableImage({ src, alt, options, target, alias, className, edit }: Required<Omit<Props, "alias">> & { alias: string | undefined; edit: ImageEditApi }) {
  const image = useRef<HTMLImageElement>(null)
  const drag = useRef<{ startX: number; startWidth: number; max: number } | null>(null)
  const [dragWidth, setDragWidth] = useState<number | null>(null)
  const wide = options.position === "largo"
  const commit = (next: EmbedOptions) => edit.change(target, alias, next)
  // Redimensionar tira o "largura total" (ele ignoraria o tamanho).
  const resizeTo = (width: number) => commit({ ...options, width: Math.round(width), height: undefined, position: wide ? undefined : options.position })
  const maxWidth = () => image.current?.closest(".cm-content, .md")?.clientWidth ?? 2000
  const shownWidth = dragWidth ?? (wide ? undefined : options.width)

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!image.current) return
    event.preventDefault()
    event.stopPropagation()
    drag.current = { startX: event.clientX, startWidth: image.current.getBoundingClientRect().width, max: maxWidth() }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = drag.current
    if (!start) return
    setDragWidth(Math.round(Math.min(start.max, Math.max(MIN_WIDTH, start.startWidth + event.clientX - start.startX))))
  }
  const onPointerUp = () => {
    if (!drag.current) return
    drag.current = null
    if (dragWidth !== null) resizeTo(dragWidth)
    setDragWidth(null)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowUp" ? KEY_STEP : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -KEY_STEP : 0
    if (!step || !image.current) return
    event.preventDefault()
    resizeTo(Math.min(maxWidth(), Math.max(MIN_WIDTH, image.current.getBoundingClientRect().width + step)))
  }

  return (
    <span className={`img-edit${options.position ? ` pos-${options.position}` : ""}`}>
      <img ref={image} className={className} src={src} alt={alt} width={shownWidth} height={dragWidth !== null || wide ? undefined : options.height} loading="lazy" draggable={false} />
      {/* Sem isto, apertar o botão muda a seleção do editor, o cursor entra no bloco e o botão some antes do clique. */}
      <span className="img-edit-bar" role="toolbar" aria-label="Posição e tamanho da imagem" onMouseDown={(event) => event.preventDefault()}>
        {POSITIONS.map(({ value, label, icon: Icon }) => {
          const active = options.position === value
          return (
            <button
              key={value}
              type="button"
              className={active ? "active" : ""}
              aria-pressed={active}
              aria-label={label}
              title={active ? `${label} (clique de novo para tirar)` : label}
              onClick={() => commit(value === "largo" && !active ? { ...options, position: value, width: undefined, height: undefined } : { ...options, position: active ? undefined : value })}
            >
              <Icon size={15} />
            </button>
          )
        })}
        {(options.width || options.height) && (
          <button type="button" aria-label="Tamanho original" title="Tamanho original" onClick={() => commit({ ...options, width: undefined, height: undefined })}>
            <RotateCcw size={15} />
          </button>
        )}
        {shownWidth !== undefined && <span className="img-edit-size">{shownWidth} px</span>}
      </span>
      {!wide && (
        <button
          type="button"
          className="img-edit-handle"
          aria-label="Redimensionar a imagem (arraste, ou use as setas)"
          title="Arraste para mudar o tamanho"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <MoveDiagonal2 size={14} />
        </button>
      )}
    </span>
  )
}
