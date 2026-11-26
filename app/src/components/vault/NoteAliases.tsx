import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { Plus, X } from "lucide-react"
import { foldName, noteName } from "../../core/text"
import type { VaultIndex } from "../../core/vault-index"
import { flushOpenNotes } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { useToast } from "../ui"

/** Por que o apelido não serve (`null`: serve). */
export function aliasProblem(index: VaultIndex, path: string, aliases: readonly string[], value: string): string | null {
  const clean = value.trim()
  if (!clean) return "Escreva o apelido."
  if (/[[\]|#^\n]/.test(clean)) return "O apelido não pode ter [ ] | # ^."
  if (foldName(clean) === foldName(noteName(path))) return "Esse já é o nome da nota."
  if (aliases.some((alias) => foldName(alias) === foldName(clean))) return "A nota já tem esse apelido."
  const other = index.allNotes().find((note) => note.path !== path && (foldName(noteName(note.path)) === foldName(clean) || note.meta.aliases.some((alias) => foldName(alias) === foldName(clean))))
  if (other) return `“${noteName(other.path)}” já usa esse nome; os links iriam para ela.`
  return null
}

/**
 * Apelidos da nota (25/11): outros nomes pelos quais ela é citada. Ficam na propriedade `aliases` do frontmatter, a mesma
 * do Obsidian; contam nas menções sem link, nos links automáticos e na busca. Aparece no topo do painel Links (notas e
 * artigos da Wiki) e no item “Apelidos…” do menu da nota.
 */
export function NoteAliases({ index, path, readOnly, autoFocus = false }: { index: VaultIndex; path: string; readOnly: boolean; autoFocus?: boolean }) {
  const vault = useVault()
  const toast = useToast()
  const note = index.note(path)
  const aliases = note?.meta.aliases ?? []
  const [adding, setAdding] = useState(autoFocus)
  const [value, setValue] = useState("")
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const hintId = useId()
  useEffect(() => { if (adding) input.current?.focus() }, [adding])
  const save = async (next: string[]) => {
    setBusy(true)
    try {
      // O texto aberto vai para o cofre antes: a gravação da propriedade confere a versão lida.
      await flushOpenNotes()
      await vault.setProperty(path, "aliases", next.length ? next : undefined)
      // `alias` (singular) é o nome antigo da propriedade: some para não ficarem duas listas.
      if (note?.meta.frontmatter?.data && "alias" in note.meta.frontmatter.data) await vault.setProperty(path, "alias", undefined)
      return true
    } catch (error) {
      toast.error(error)
      return false
    } finally {
      setBusy(false)
    }
  }
  const add = async (event: FormEvent) => {
    event.preventDefault()
    const reason = aliasProblem(index, path, aliases, value)
    if (reason) { setProblem(reason); return }
    if (busy) return
    // O campo esvazia na hora (dá para ir digitando o próximo); se a gravação falhar, o texto volta.
    const typed = value
    setValue(""); setProblem(null)
    if (!await save([...aliases, typed.trim()])) setValue((current) => current || typed)
  }
  return <section className="stack note-aliases" aria-labelledby={titleId}>
    <span id={titleId} className="eyebrow">Apelidos · {aliases.length}</span>
    {!aliases.length && <span id={hintId} className="muted small">Outros nomes pelos quais esta nota é citada.</span>}
    {aliases.length > 0 && <ul className="note-alias-list">
      {aliases.map((alias) => <li key={alias} className="chip note-alias">
        <span>{alias}</span>
        {!readOnly && <button type="button" className="note-alias-remove" disabled={busy} aria-label={`Tirar o apelido ${alias}`} title="Tirar o apelido" onClick={() => void save(aliases.filter((item) => item !== alias))}><X size={12} /></button>}
      </li>)}
    </ul>}
    {!readOnly && (adding
      ? <form className="note-alias-form" onSubmit={(event) => void add(event)}>
        <input ref={input} className="input" value={value} aria-label="Novo apelido" aria-invalid={problem ? true : undefined} aria-describedby={problem ? `${hintId}-erro` : undefined} placeholder="Ex.: o Cinzento"
          onChange={(event) => { setValue(event.target.value); setProblem(null) }}
          onKeyDown={(event) => { if (event.key === "Escape" && !autoFocus) { event.preventDefault(); event.stopPropagation(); setAdding(false); setValue(""); setProblem(null) } }} />
        <button type="submit" className="btn sm primary" disabled={busy || !value.trim()}>Adicionar</button>
        {problem && <span id={`${hintId}-erro`} role="alert" className="small note-alias-problem">{problem}</span>}
      </form>
      : <button type="button" className="btn sm ghost note-alias-add" onClick={() => setAdding(true)}><Plus size={14} /> Apelido</button>)}
  </section>
}
