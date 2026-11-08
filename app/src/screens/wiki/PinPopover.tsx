import { useEffect, useId, useRef, useState } from "react"
import { ExternalLink, Map as MapIcon, Trash2, X } from "lucide-react"
import { FormField, FormGrid } from "../../components/kit/FormField"
import { NoteCombobox } from "../../components/kit/NoteCombobox"
import { OverflowMenu, type MenuEntry } from "../../components/kit/OverflowMenu"
import type { MapPin } from "../../core/wiki"

/**
 * Popover do pino (U18): diálogo sem bloqueio ao lado do ponto. A nota vem do campo de busca de notas, com “Criar…” no
 * fim (abre o Novo artigo e liga o pino no artigo criado). O rótulo só aparece em pino sem nota. Esc fecha (o que
 * mudou num pino que já existe fica gravado; o pino novo é descartado) e a tela devolve o foco ao pino.
 */
export function PinPopover({ pin, isNew, title, meta, layers, root, from, editable, resolves, nested, onDone, onClose, onDelete, onOpen, onEnterMap, onCreateNote }: {
  pin: MapPin
  isNew: boolean
  /** Título do pino (o nome da nota, nunca `[[ ]]`). */
  title: string
  meta?: string
  layers: string[]
  root: string
  from: string
  editable: boolean
  /** A nota digitada existe? */
  resolves(target: string): boolean
  nested: boolean
  onDone(pin: MapPin): void
  onClose(): void
  onDelete(): void
  onOpen(): void
  onEnterMap(): void
  /** “Criar “X”…”: abre o Novo artigo; `link` liga o pino na nota criada. */
  onCreateNote(name: string, link: (target: string) => void): void
}) {
  const titleId = useId()
  const [note, setNote] = useState(pin.note ?? "")
  const [label, setLabel] = useState(pin.label ?? "")
  const [layer, setLayer] = useState(pin.layer ?? "")
  const [secret, setSecret] = useState(Boolean(pin.secret))
  const [error, setError] = useState<string>()
  const box = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (!editable) heading.current?.focus() }, [])

  const cleanNote = note.trim()
  const next: MapPin = {
    x: pin.x, y: pin.y,
    ...(cleanNote ? { note: cleanNote } : {}),
    ...(!cleanNote && label.trim() ? { label: label.trim() } : cleanNote && pin.label ? { label: pin.label } : {}),
    ...(pin.category ? { category: pin.category } : {}),
    ...(layer ? { layer } : {}),
    ...(secret ? { secret: true } : {}),
  }
  const valid = Boolean(next.note || next.label)
  const changed = JSON.stringify(next) !== JSON.stringify(pin)
  const done = () => {
    if (!valid) { setError("Escolha uma nota ou escreva um rótulo."); return }
    if (isNew || changed) onDone(next)
    else onClose()
  }
  const close = () => { if (!isNew && editable && changed && valid) onDone(next); else onClose() }
  const exists = cleanNote ? resolves(cleanNote) : false
  const menu: MenuEntry[] = [
    ...(exists ? [{ label: "Abrir a nota", icon: <ExternalLink size={16} />, onSelect: onOpen }] : []),
    ...(exists && nested ? [{ label: "Entrar no mapa", icon: <MapIcon size={16} />, onSelect: onEnterMap }] : []),
    ...(!isNew && editable ? ["separator" as const, { label: "Apagar o pino", icon: <Trash2 size={16} />, danger: true, onSelect: onDelete }] : []),
  ].filter((entry, i, all) => entry !== "separator" || (i > 0 && i < all.length - 1))

  return <div ref={box} className="map-popover card" role="dialog" aria-labelledby={titleId}
    onPointerDown={(e) => e.stopPropagation()}
    onKeyDown={(e) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); e.stopPropagation(); close() } }}>
    <div className="map-popover-head">
      <h2 id={titleId} ref={heading} tabIndex={-1}>{isNew ? "Pino novo" : title}</h2>
      <button type="button" className="icon-btn" aria-label="Fechar" title="Fechar (Esc)" onClick={close}><X size={17} /></button>
    </div>
    {!editable ? <div className="map-popover-body">
      {meta && <p className="small muted">{meta}</p>}
      {pin.note && !exists && <p className="small muted">Sem nota para abrir.</p>}
      <div className="map-popover-actions">
        {nested && exists && <button type="button" className="btn sm" onClick={onEnterMap}><MapIcon size={15} /> Entrar no mapa</button>}
        {exists && <button type="button" className="btn sm primary" onClick={onOpen}>Abrir a nota</button>}
      </div>
    </div> : <form className="map-popover-body" onSubmit={(e) => { e.preventDefault(); done() }}>
      <FormGrid columns={1}>
        <FormField label="Nota" error={error} hint={cleanNote && !exists ? `“${cleanNote}” ainda não existe: escolha “Criar…” na lista.` : "O título da nota vira o nome do pino."}>
          {(f) => <NoteCombobox id={f.id} describedBy={f.describedBy} invalid={f.invalid} autoFocus root={root} from={from} value={note} placeholder="Buscar nota"
            onChange={(value) => { setNote(value); setError(undefined) }}
            onCreate={(name) => onCreateNote(name, (target) => { setNote(target); setError(undefined) })} />}
        </FormField>
        {!cleanNote && <FormField label="Rótulo" hint="Só para pino sem nota.">
          {(f) => <input id={f.id} aria-describedby={f.describedBy} className="input" value={label} onChange={(e) => { setLabel(e.target.value); setError(undefined) }} placeholder="Ex.: Ponte quebrada" />}
        </FormField>}
        <FormField label="Camada">
          {(f) => <select id={f.id} className="input" value={layer} onChange={(e) => setLayer(e.target.value)}>
            <option value="">Sem camada</option>
            {[...new Set([...layers, ...(layer ? [layer] : [])])].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>}
        </FormField>
        <FormField label="Para quem" group>
          {() => <label className="check"><input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} /> Segredo do mestre</label>}
        </FormField>
      </FormGrid>
      <div className="map-popover-actions">
        {menu.length > 0 && <OverflowMenu label="Mais ações do pino" items={menu} align="start" />}
        <span className="grow" />
        <button type="submit" className="btn sm primary">Pronto</button>
      </div>
    </form>}
  </div>
}
