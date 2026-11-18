import { useEffect, useRef, useState } from "react"
import { titleProblem } from "../../core/note-title"
import type { VaultIndex } from "../../core/vault-index"
import { takeFreshNote } from "../../lib/fresh-note"

/**
 * U99 (decisão 13): o nome no topo da nota é editável, como o título do Obsidian. Enter ou sair do campo renomeia na
 * mesma pasta (os links são atualizados); Esc desfaz. A nota recém-criada abre com o nome selecionado.
 * Continua sendo o h1 da tela: o campo fica dentro dele.
 */
export function NoteTitle({ index, path, name, readOnly, onRename }: { index: VaultIndex; path: string; name: string; readOnly: boolean; onRename(name: string): Promise<void> }) {
  const [value, setValue] = useState(name)
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  // O Esc tira o foco antes de o React redesenhar: sem a marca, o blur veria o texto digitado e renomearia.
  const cancelled = useRef(false)
  // Ao trocar de nota (ou o nome mudar por fora), o campo volta ao nome do arquivo.
  useEffect(() => { setValue(name); setProblem(null) }, [path, name])
  const fresh = useRef(false)
  useEffect(() => {
    if (takeFreshNote(path)) fresh.current = true
    if (!fresh.current) return
    // Dois quadros: o Shell leva o foco ao título da rota no primeiro; o nome é selecionado depois dele.
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        const field = input.current
        fresh.current = false
        // Com as abas, o título fica escondido (só para leitores de tela): não rouba o foco do editor.
        if (field && field.offsetWidth > 1) { field.focus(); field.select(); setEditing(true) }
      })
    })
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner) }
  }, [path])

  if (readOnly) return <h1>{name}</h1>

  const commit = async (fromEnter: boolean) => {
    if (busy) return
    if (value.trim() === name) { setValue(name); setProblem(null); return }
    const reason = titleProblem(index, path, value)
    if (reason) {
      // Enter mantém o campo aberto com o aviso; sair do campo volta ao nome que vale.
      if (fromEnter) setProblem(reason)
      else { setValue(name); setProblem(null) }
      return
    }
    setBusy(true)
    try { await onRename(value.trim()); setProblem(null) } catch (error) { setProblem(error instanceof Error ? error.message : String(error)); setValue(name) } finally { setBusy(false) }
  }

  return <>
    <h1 className={`note-title${editing ? " editing" : ""}`}>
      <input
        ref={input}
        className="note-title-input"
        aria-label="Nome da nota"
        aria-invalid={problem ? true : undefined}
        aria-describedby={problem ? "note-title-problem" : undefined}
        title="Clique para renomear. Para mudar de pasta, use “Renomear ou mover”."
        value={value}
        disabled={busy}
        spellCheck={false}
        onChange={(event) => { setValue(event.target.value); if (problem) setProblem(null) }}
        onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); void commit(true) }
          else if (event.key === "Escape") { event.preventDefault(); cancelled.current = true; setValue(name); setProblem(null); event.currentTarget.blur() }
        }}
        onFocus={() => setEditing(true)}
        onBlur={() => { setEditing(false); if (cancelled.current) { cancelled.current = false; return } void commit(false) }}
      />
    </h1>
    {problem && <span id="note-title-problem" role="alert" className="note-title-problem" title={problem}>{problem}</span>}
  </>
}
