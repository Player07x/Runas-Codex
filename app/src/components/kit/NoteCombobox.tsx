import "./kit.css"
import { Plus, X } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { dirname } from "../../core/text"
import { articleKind } from "../../core/wiki"
import { useVault } from "../../platform/VaultProvider"

/** O nome de uma nota a partir do texto do link (`Pasta/Nota` → `Nota`). */
export const noteLabel = (target: string) => target.split("/").at(-1) ?? target

const fold = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR")

/** `name` é o que aparece; `target`, o que vai para o link (o caminho quando o nome se repete no cofre). */
type Option = { kind: "note"; name: string; target: string; path: string; meta: string } | { kind: "create"; name: string }

/**
 * Campo de link para uma nota (combobox do ARIA 1.2): digitar filtra as notas (da wiki, com `root`), as setas
 * escolhem, Enter confirma, Esc fecha a lista sem fechar o diálogo. O valor é o nome da nota, como vai dentro de
 * `[[…]]`; um nome que ainda não existe também vale (link a criar, como no Obsidian). Com `onCreate`, a lista termina
 * em “Criar “X”…”.
 */
export function NoteCombobox({ id, value, onChange, onPick, onCreate, root = "", from, placeholder, describedBy, invalid, labelledBy, label, autoFocus }: {
  id?: string
  value: string
  onChange(value: string): void
  /** Quando uma opção é escolhida (lista de links usa para acrescentar e limpar). */
  onPick?(value: string): void
  onCreate?(name: string): void
  root?: string
  /** Nota de onde sai o link: o nome vira o mais curto que resolve dali. */
  from?: string
  placeholder?: string
  describedBy?: string
  invalid?: boolean
  labelledBy?: string
  label?: string
  autoFocus?: boolean
}) {
  const vault = useVault(), index = vault.index!
  const own = useId(), inputId = id ?? own, listId = `${inputId}-lista`
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  // O campo mostra o nome da nota; o valor pode ser o caminho (nome repetido no cofre), que só o link precisa.
  const [draft, setDraft] = useState<string | null>(null)
  const shownText = draft ?? noteLabel(value)
  const input = useRef<HTMLInputElement>(null)
  // Valor trocado de fora (a lista limpou o campo, o diálogo reabriu): volta a mostrar o nome dele.
  const emitted = useRef(value)
  useEffect(() => {
    if (value !== emitted.current) setDraft(null)
    emitted.current = value
  }, [value])
  const notes = useMemo(() => index.allNotes().filter((note) => note.path.startsWith(root)), [index, vault.version, root])
  const query = fold(shownText.trim())
  const options = useMemo<Option[]>(() => {
    const found = notes
      .filter((note) => !query || fold(note.name).includes(query))
      .sort((a, b) => Number(!fold(a.name).startsWith(query)) - Number(!fold(b.name).startsWith(query)) || a.name.localeCompare(b.name, "pt-BR"))
      .slice(0, 8)
      .map((note): Option => ({ kind: "note", name: note.name, target: from ? index.linkTarget(note.path, from) : note.name, path: note.path, meta: articleKind(note.meta.frontmatter?.data?.tipo)?.label ?? (dirname(note.path).split("/").at(-1) || "Nota") }))
    const exact = notes.some((note) => fold(note.name) === query)
    return onCreate && shownText.trim() && !exact ? [...found, { kind: "create", name: shownText.trim() }] : found
  }, [notes, query, shownText, onCreate, from, index])
  const shown = open && options.length > 0
  const current = Math.min(active, options.length - 1)

  // Esc com a lista aberta fecha só a lista: o diálogo escuta Esc no documento, então este ouvinte vem antes (janela).
  useEffect(() => {
    if (!shown) return
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || document.activeElement !== input.current) return
      event.preventDefault(); event.stopImmediatePropagation(); setOpen(false)
    }
    window.addEventListener("keydown", escape, true)
    return () => window.removeEventListener("keydown", escape, true)
  }, [shown])

  const pick = (option: Option) => {
    setOpen(false)
    if (option.kind === "create") { onCreate?.(option.name); return }
    setDraft(onPick ? null : option.name)
    emitted.current = option.target
    onChange(option.target)
    onPick?.(option.target)
  }

  const key = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (!open) { setOpen(true); setActive(event.key === "ArrowDown" ? 0 : options.length - 1); return }
      setActive((at) => (at + (event.key === "ArrowDown" ? 1 : -1) + options.length) % Math.max(options.length, 1))
    } else if (event.key === "Enter") {
      if (shown && options[current]) { event.preventDefault(); pick(options[current]!) }
      else if (onPick && shownText.trim()) { event.preventDefault(); setDraft(null); onPick(shownText.trim()) }
    } else if (event.key === "Tab") setOpen(false)
  }

  return <div className="kit-combobox">
    <input
      ref={input} id={inputId} className="input" type="text" role="combobox" autoComplete="off" autoFocus={autoFocus}
      aria-autocomplete="list" aria-expanded={shown} aria-controls={listId} aria-activedescendant={shown ? `${listId}-${current}` : undefined}
      aria-describedby={describedBy} aria-invalid={invalid || undefined} aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : label}
      value={shownText} placeholder={placeholder}
      onChange={(event) => { setDraft(event.target.value); emitted.current = event.target.value; onChange(event.target.value); setOpen(true); setActive(0) }}
      onKeyDown={key} onBlur={() => setOpen(false)}
    />
    <ul className="kit-listbox" id={listId} role="listbox" aria-label={label ?? "Notas"} hidden={!shown}>
      {options.map((option, at) => <li
        key={option.kind === "note" ? option.path : "criar"} id={`${listId}-${at}`} role="option" aria-selected={at === current}
        className={`kit-option${at === current ? " active" : ""}`}
        onMouseDown={(event) => event.preventDefault()} onClick={() => pick(option)} onMouseMove={() => setActive(at)}
      >
        {option.kind === "note" ? <><span className="kit-option-name">{option.name}</span><small>{option.meta}</small></> : <><Plus size={15} aria-hidden="true" /><span className="kit-option-name">Criar “{option.name}”…</span></>}
      </li>)}
    </ul>
  </div>
}

/**
 * Lista de links (afiliação, envolvidos…): cada nota é uma ficha com “Remover”, e o campo de busca acrescenta mais
 * uma. O valor é a lista de nomes.
 */
export function NoteListField({ id, value, onChange, root, from, describedBy, invalid, name }: {
  id?: string; value: string[]; onChange(value: string[]): void; root?: string; from?: string; describedBy?: string; invalid?: boolean
  /** Nome do campo (“Afiliação”): o campo de busca se chama “Acrescentar em Afiliação”. */
  name: string
}) {
  const [draft, setDraft] = useState("")
  const add = (name: string) => {
    const clean = name.trim()
    setDraft("")
    if (clean && !value.some((item) => fold(noteLabel(item)) === fold(noteLabel(clean)))) onChange([...value, clean])
  }
  return <div className="kit-note-list">
    {value.length > 0 && <ul className="kit-note-chips" aria-label={name}>
      {value.map((item) => <li key={item} className="kit-note-chip"><span>{noteLabel(item)}</span><button type="button" className="icon-btn sm" aria-label={`Remover ${noteLabel(item)}`} onClick={() => onChange(value.filter((other) => other !== item))}><X size={14} /></button></li>)}
    </ul>}
    <NoteCombobox id={id} value={draft} onChange={setDraft} onPick={add} root={root} from={from} describedBy={describedBy} invalid={invalid} label={`Acrescentar em ${name}`} />
  </div>
}
