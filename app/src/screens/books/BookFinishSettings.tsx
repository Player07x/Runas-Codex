import { useState } from "react"
import { bookProperties } from "../../core/books"
import type { PropertyValue } from "../../core/properties"
import { scopeBookCss } from "../../core/books-finish"
import type { IndexedNote } from "../../core/vault-index"
import { useVault } from "../../platform/VaultProvider"

export function BookFinishSettings({ book }: { book: IndexedNote }) {
  const vault = useVault(), props = bookProperties(book)
  const [base,setBase] = useState(book.text)
  const [values,setValues] = useState<Record<string, unknown>>({ indice_remissivo: props.indice_remissivo === true, glossario: props.glossario === true, indice_termos: Array.isArray(props.indice_termos)?props.indice_termos.join("\n"):"", margem_mm: props.margem_mm ?? "", sangria_mm: props.sangria_mm ?? 0, marcas_corte: props.marcas_corte === true, fundo_pagina: props.fundo_pagina ?? "", textura: props.textura ?? "nenhuma", marca_agua: props.marca_agua ?? "", css_livro: props.css_livro ?? "" })
  const [busy,setBusy] = useState(false), [message,setMessage] = useState("")
  const change = (key: string,value: unknown) => setValues({...values,[key]:value})
  return <details className="book-finish-settings"><summary>Índice, glossário e acabamento</summary><form className="book-metadata" onSubmit={e => {
    e.preventDefault(); setBusy(true); setMessage("")
    void (async () => {
      try {
        if (vault.index!.note(book.path)!.text !== base) throw new Error("O livro mudou. Feche e reabra o acabamento antes de salvar.")
        scopeBookCss(String(values.css_livro))
        for (const [key,value] of Object.entries(values)) {
          const next: PropertyValue = key === "indice_termos" ? String(value).split("\n").map(s=>s.trim()).filter(Boolean) : ["margem_mm","sangria_mm"].includes(key) ? value === "" ? null : Number(value) : value as PropertyValue
          if (JSON.stringify(next) !== JSON.stringify(props[key] ?? null)) await vault.setProperty(book.path,key,next)
        }
        setBase(vault.index!.note(book.path)!.text)
        setMessage("Acabamento salvo. Reabra este formulário para fazer outras alterações.")
      } catch (err) { setMessage(String(err)) } finally { setBusy(false) }
    })()
  }}>
    {[['indice_remissivo','Incluir índice remissivo'],['glossario','Incluir glossário da Wiki'],['marcas_corte','Marcas de corte']].map(([key,label]) => <label key={key} className="check"><input type="checkbox" checked={Boolean(values[key!])} onChange={e=>change(key!,e.target.checked)} />{label}</label>)}
    <label>Termos do índice (um por linha)<textarea className="input" value={String(values.indice_termos)} onChange={e=>change('indice_termos',e.target.value)} /></label>
    <p className="small">O índice também usa os artigos citados. O glossário usa o resumo de cada artigo da Wiki. As referências mostram o capítulo e a página na prévia impressa.</p>
    <label>Margem (mm; vazio usa o perfil)<input className="input" type="number" min="0" max="40" step="0.5" value={String(values.margem_mm)} onChange={e=>change('margem_mm',e.target.value)} /></label>
    <label>Sangria (mm)<input className="input" type="number" min="0" max="10" step="0.5" value={String(values.sangria_mm)} onChange={e=>change('sangria_mm',e.target.value)} /></label>
    <label>Cor do papel (#RRGGBB ou vazio)<input className="input" pattern="#[0-9a-fA-F]{6}|" value={String(values.fundo_pagina)} onChange={e=>change('fundo_pagina',e.target.value)} /></label>
    <label>Textura<select className="input" value={String(values.textura)} onChange={e=>change('textura',e.target.value)}><option value="nenhuma">Sem textura</option><option value="papel">Papel</option><option value="linho">Linho</option></select></label>
    <label>Marca d’água<input className="input" maxLength={100} value={String(values.marca_agua)} onChange={e=>change('marca_agua',e.target.value)} /></label>
    <label>CSS do livro<textarea className="input" rows={5} placeholder="h1 { color: #763c35; }" value={String(values.css_livro)} onChange={e=>change('css_livro',e.target.value)} /></label>
    <p className="small">CSS aplicado ao conteúdo do livro. Use regras simples de tipografia e cores. Sem recursos externos nem blocos @.</p>
    <button className="btn primary" disabled={busy || vault.info?.readOnly}>Salvar acabamento</button>{message && <p role="status">{message}</p>}
  </form></details>
}
