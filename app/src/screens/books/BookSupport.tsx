import { History } from "lucide-react"
import { useMemo, useState } from "react"
import { bookProperties } from "../../core/books"
import { bookReferences } from "../../core/books-finish"
import { removeReviewComment, reviewComment, reviewComments } from "../../core/books-review"
import { foldSearch } from "../../core/formatters"
import type { IndexedNote } from "../../core/vault-index"
import { Markdown } from "../../components/Markdown"
import { PanelTabs, TabPanel } from "../../components/kit/PanelTabs"
import type { NoteEditorApi } from "../../components/vault/NoteView"
import { NoteSetContext } from "../../lib/note-set"
import { flushOpenNotes, vaultNoteSet } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { useToast } from "../../components/ui"

export type SupportTab = "referencias" | "revisao" | "capitulo"

/**
 * Painel Apoio do capítulo (rework F3b, LIV-3): o que eram formulários soltos ao lado do texto, fechado por padrão e em
 * três abas. Referências da Wiki para citar ou transcluir, comentários de revisão do capítulo e as propriedades dele.
 */
export function BookSupport({ book, chapter, editor, tab, onTab, query, onQuery }: {
  book: IndexedNote; chapter: IndexedNote; editor: NoteEditorApi; tab: SupportTab; onTab(tab: SupportTab): void; query: string; onQuery(query: string): void
}) {
  const comments = reviewComments(editor.text)
  return <div className="book-support">
    <PanelTabs label="Apoio" idPrefix="apoio" value={tab} onChange={onTab} tabs={[
      { value: "referencias", label: "Referências" },
      { value: "revisao", label: "Revisão", count: comments.length },
      { value: "capitulo", label: "Capítulo" },
    ]} />
    <TabPanel idPrefix="apoio" value={tab}>
      {tab === "referencias" ? <References book={book} chapter={chapter} editor={editor} query={query} onQuery={onQuery} />
        : tab === "revisao" ? <Review editor={editor} />
        : <ChapterFields key={chapter.path + chapter.text.length} chapter={chapter} />}
    </TabPanel>
  </div>
}

function References({ book, chapter, editor, query, onQuery }: { book: IndexedNote; chapter: IndexedNote; editor: NoteEditorApi; query: string; onQuery(query: string): void }) {
  const vault = useVault(), index = vault.index!, readOnly = Boolean(vault.info?.readOnly)
  const [preview, setPreview] = useState("")
  // Quantos capítulos citam cada artigo: os mais citados vêm primeiro quando não há busca.
  const cited = new Map(bookReferences(index, book, { path: chapter.path, text: editor.text }).map((ref) => [ref.path, ref.chapters.length]))
  const q = foldSearch(query.trim())
  const candidates = index.notesIn("Wikis/").filter((note) => !q || foldSearch(note.name).includes(q))
    .sort((a, b) => (cited.get(b.path) ?? 0) - (cited.get(a.path) ?? 0) || a.name.localeCompare(b.name, "pt-BR")).slice(0, 40)
  const target = (path: string) => index.linkTarget(path, chapter.path)
  return <div className="stack">
    <label className="field"><span>Buscar na Wiki</span><input type="search" className="input" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Personagem, lugar, facção…" /></label>
    {candidates.length ? <ul className="book-ref-list">{candidates.map((note) => {
      const count = cited.get(note.path)
      const folder = note.path.split("/").slice(-2, -1)[0] ?? ""
      return <li key={note.path} className="book-ref">
        <button type="button" className="book-ref-name" aria-expanded={preview === note.path} onClick={() => setPreview(preview === note.path ? "" : note.path)}>
          <strong>{note.name}</strong><small>{folder}{count ? ` · citado em ${count} ${count === 1 ? "capítulo" : "capítulos"}` : ""}</small>
        </button>
        <div className="row">
          <button type="button" className="btn sm" disabled={readOnly} aria-label={`Citar ${note.name}`} onClick={() => editor.insert(`[[${target(note.path)}|${note.name}]]`)}>Citar</button>
          <button type="button" className="btn sm ghost" disabled={readOnly} aria-label={`Transcluir ${note.name}`} onClick={() => editor.insert(`![[${target(note.path)}]]`)}>Transcluir</button>
        </div>
        {preview === note.path && <ReferencePreview note={note} />}
      </li>
    })}</ul> : <p className="small muted">Nenhum artigo da Wiki com esse nome.</p>}
  </div>
}

function ReferencePreview({ note }: { note: IndexedNote }) {
  const vault = useVault()
  const notes = useMemo(() => vaultNoteSet(vault.index!, note.path, {}, vault.platform), [vault.index, vault.version, note.path, vault.platform])
  return <aside className="book-wiki-reference" aria-label={`Artigo ${note.name}`}><NoteSetContext.Provider value={notes}><Markdown source={note.text} space="wiki" /></NoteSetContext.Provider></aside>
}

function Review({ editor }: { editor: NoteEditorApi }) {
  const vault = useVault(), readOnly = Boolean(vault.info?.readOnly)
  const [text, setText] = useState("")
  const comments = reviewComments(editor.text)
  return <div className="stack">
    {comments.length ? <ol className="book-review-list">{comments.map((comment) => (
      <li key={comment.from}>
        <p>“{comment.text}”</p>
        <small>Linha {comment.line}</small>
        <div className="row">
          <button type="button" className="btn sm ghost" aria-label={`Ir ao comentário da linha ${comment.line}`} onClick={() => editor.select(comment.from, comment.to)}>Ir</button>
          <button type="button" className="btn sm ghost" disabled={readOnly} aria-label={`Remover o comentário da linha ${comment.line}`} onClick={() => editor.replaceAll((current) => removeReviewComment(current, comment))}>Remover</button>
        </div>
      </li>
    ))}</ol> : <p className="small muted">Nenhum comentário de revisão neste capítulo.</p>}
    <label className="field"><span>Novo comentário no cursor</span><textarea className="input" rows={2} maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} /></label>
    <button type="button" className="btn sm" disabled={readOnly || !text.trim()} onClick={() => { editor.insert(` ${reviewComment(text)}`); setText("") }}>Comentar no cursor</button>
    <p className="small muted">Ficam no Markdown como <code>%% revisão: … %%</code>, ocultos na leitura e na impressão. No texto, selecione um trecho e use Comentar.</p>
    <button type="button" className="btn sm" onClick={() => window.dispatchEvent(new CustomEvent("runas-codex:nota-acao", { detail: "history" }))}><History size={15} /> Snapshots do capítulo</button>
  </div>
}

const KINDS: [string, string][] = [["capitulo", "Capítulo"], ["parte", "Parte"], ["secao", "Seção"]]
const STATUSES: [string, string][] = [["rascunho", "Rascunho"], ["revisão", "Revisão"], ["pronto", "Pronto"]]

/** Tipo, status e resumo do capítulo: as mesmas propriedades que o sumário, a cortiça e a prévia leem. */
function ChapterFields({ chapter }: { chapter: IndexedNote }) {
  const vault = useVault(), toast = useToast(), readOnly = Boolean(vault.info?.readOnly)
  const props = bookProperties(chapter)
  const initial = { tipo: typeof props.tipo === "string" ? props.tipo : "capitulo", status: typeof props.status === "string" ? props.status : "rascunho", resumo: typeof props.resumo === "string" ? props.resumo : "" }
  const [values, setValues] = useState(initial)
  const [busy, setBusy] = useState(false)
  const changed = (Object.keys(values) as (keyof typeof values)[]).filter((key) => values[key] !== initial[key])
  const options = (list: [string, string][], current: string) => list.some(([value]) => value === current) ? list : [...list, [current, current] as [string, string]]
  const save = async () => {
    setBusy(true)
    try {
      // O texto em edição é gravado antes, para a mudança de propriedade não virar conflito com o editor.
      await flushOpenNotes()
      for (const key of changed) await vault.setProperty(chapter.path, key, values[key] || undefined)
      toast("Capítulo atualizado.")
    } catch (error) { toast(error instanceof Error ? error.message : String(error)) } finally { setBusy(false) }
  }
  return <form className="stack" onSubmit={(event) => { event.preventDefault(); if (!busy && changed.length) void save() }}>
    <label className="field"><span>Tipo</span><select className="select" value={values.tipo} disabled={readOnly} onChange={(event) => setValues({ ...values, tipo: event.target.value })}>{options(KINDS, values.tipo).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="field"><span>Status</span><select className="select" value={values.status} disabled={readOnly} onChange={(event) => setValues({ ...values, status: event.target.value })}>{options(STATUSES, values.status).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="field"><span>Resumo</span><textarea className="input" rows={3} value={values.resumo} disabled={readOnly} onChange={(event) => setValues({ ...values, resumo: event.target.value })} /></label>
    <button className="btn sm primary" disabled={readOnly || busy || !changed.length}>{busy ? "Salvando…" : "Salvar capítulo"}</button>
    {readOnly && <p className="small muted">Cofre em somente leitura.</p>}
  </form>
}
