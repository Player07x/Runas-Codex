import { useMemo, useState } from "react"
import { bookReferences } from "../../core/books-finish"
import type { IndexedNote } from "../../core/vault-index"
import { Markdown } from "../../components/Markdown"
import { NoteSetContext } from "../../lib/note-set"
import { vaultNoteSet } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"

export function BookWritingTools({ book, draft, insert }: { book: IndexedNote; draft?: { path: string; text: string }; insert(text:string):void }) {
  const vault = useVault(), [query,setQuery] = useState(""), [chosen,setChosen] = useState(""), [comment,setComment] = useState("")
  const refs = bookReferences(vault.index!,book,draft)
  const candidates = vault.index!.notesIn("Wikis/").filter(n => !query || n.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))).slice(0,100)
  const note = vault.index!.note(chosen)
  const notes = useMemo(()=>note?vaultNoteSet(vault.index!,note.path,{},vault.platform):undefined,[note?.path,vault.version,vault.platform])
  return <details className="book-writing-tools" open><summary>Referências e revisão</summary>
    <div className="stack"><label>Buscar na Wiki<input className="input" value={query} onChange={e=>setQuery(e.target.value)} /></label>
    <label>Artigo de referência<select className="input" value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">Escolha um artigo…</option>{candidates.map(n=><option key={n.path} value={n.path}>{n.name}</option>)}</select></label>
    {note && <><div className="row-wrap"><button type="button" className="btn" disabled={vault.info?.readOnly} onClick={()=>insert(`[[${vault.index!.linkTarget(note.path,draft?.path ?? book.path)}|${note.name}]]`)}>Marcar personagem, local ou artigo</button><button type="button" className="btn" disabled={vault.info?.readOnly} onClick={()=>insert(`![[${vault.index!.linkTarget(note.path,draft?.path ?? book.path)}]]`)}>Transcluir artigo</button></div><aside className="book-wiki-reference" aria-label="Artigo da Wiki"><NoteSetContext.Provider value={notes!}><Markdown source={note.text} space="wiki" /></NoteSetContext.Provider></aside></>}
    {refs.length>0 && <p className="small">Citações: {refs.map(r=>r.title).join(", ")}</p>}
    <label>Comentário de revisão<input className="input" value={comment} onChange={e=>setComment(e.target.value)} maxLength={2000} /></label>
    <button type="button" className="btn" disabled={vault.info?.readOnly || !comment.trim()} onClick={()=>{insert(`%% revisão: ${comment.replace(/%%/g,"%")} %%`);setComment("")}}>Inserir comentário no cursor</button>
    <p className="small">Comentários ficam no Markdown como %% revisão: … %%, ocultos na leitura e na impressão. Revise e remova no modo Código.</p>
    <button type="button" className="btn" onClick={()=>window.dispatchEvent(new CustomEvent("runas-codex:nota-acao",{detail:"history"}))}>Snapshots: guardar e comparar capítulo</button>
    </div></details>
}
