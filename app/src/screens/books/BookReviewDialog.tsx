import { useMemo, useState } from "react"
import { Notice } from "../../components/kit/Layout"
import { Modal } from "../../components/ui"
import { FIX_LABELS, applyBookFixes, blankRuns, findBookFixes, type BookFix } from "../../core/book-fixes"
import type { BookItem } from "../../core/books"
import { previewSettings } from "../../core/books-preview"
import type { IndexedNote } from "../../core/vault-index"
import { recordVersion } from "../../lib/note-history"
import { flushOpenNotes } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import "./book-review.css"

const key = (path: string, fix: BookFix) => `${path}\0${fix.line}`

/**
 * Revisar o livro (U43, G2): lista as gambiarras que o livro não precisa mais, capítulo por capítulo, com o antes e o
 * depois. Só troca as marcadas, depois de confirmar; a versão de antes de cada capítulo fica nos Snapshots dele.
 */
export function BookReviewDialog({ book, items, locked, onClose }: { book: IndexedNote; items: BookItem[]; locked: boolean; onClose(): void }) {
  const vault = useVault()
  const chapters = useMemo(() => {
    const seen = new Set<string>()
    return items.flatMap((item) => {
      if (!item.note || seen.has(item.note.path)) return []
      seen.add(item.note.path)
      return [{ note: item.note, fixes: findBookFixes(item.note.text), blanks: blankRuns(item.note.text) }]
    })
  }, [items])
  const all = chapters.flatMap((c) => c.fixes.map((fix) => key(c.note.path, fix)))
  const [marked, setMarked] = useState<Set<string>>(() => new Set())
  // Os números da confirmação ficam fixos: os capítulos mudam enquanto a troca grava.
  const [confirming, setConfirming] = useState<{ fixes: number; chapters: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState("")
  const [error, setError] = useState("")
  const settings = previewSettings(book)
  const blanks = chapters.reduce((sum, c) => sum + c.blanks, 0)
  const touched = chapters.filter((c) => c.fixes.some((fix) => marked.has(key(c.note.path, fix))))
  const toggle = (k: string) => setMarked((prev) => { const next = new Set(prev); if (next.has(k)) next.delete(k); else next.add(k); return next })

  async function apply() {
    setBusy(true); setError("")
    try {
      await flushOpenNotes()
      let applied = 0, skipped = 0
      for (const chapter of touched) {
        const latest = vault.index!.note(chapter.note.path)
        if (!latest) { skipped += chapter.fixes.length; continue }
        const chosen = chapter.fixes.filter((fix) => marked.has(key(chapter.note.path, fix)))
        const out = applyBookFixes(latest.text, chosen)
        skipped += out.skipped
        if (!out.applied) continue
        // Backup antes de gravar: a versão de agora vai para os Snapshots do capítulo.
        await recordVersion(vault.info!.path, chapter.note.path, latest.text, true)
        await vault.save(chapter.note.path, out.text)
        applied += out.applied
      }
      setResult(`${applied} ${applied === 1 ? "trecho trocado" : "trechos trocados"}${skipped ? `; ${skipped} ficaram como estavam porque o texto mudou` : ""}. A versão de antes de cada capítulo está em Snapshots do capítulo.`)
      setMarked(new Set()); setConfirming(null)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  const footer = confirming
    ? <>
      <button type="button" className="btn ghost" disabled={busy} onClick={() => setConfirming(null)}>Voltar</button>
      <button type="button" className="btn primary" disabled={busy} onClick={() => void apply()}>{busy ? "Trocando…" : "Confirmar e trocar"}</button>
    </>
    : <>
      <button type="button" className="btn ghost" onClick={onClose}>Fechar</button>
      <button type="button" className="btn primary" disabled={locked || !marked.size} onClick={() => setConfirming({ fixes: marked.size, chapters: touched.length })}>Trocar as marcadas ({marked.size})</button>
    </>

  return <Modal title="Revisar o livro" wide onClose={onClose} footer={footer}>
    <div className="book-review">
      {result && <Notice tone="ok">{result}</Notice>}
      {error && <Notice tone="danger">{error}</Notice>}
      {confirming ? <Notice tone="warn" title={`Trocar ${confirming.fixes} ${confirming.fixes === 1 ? "trecho" : "trechos"} em ${confirming.chapters} ${confirming.chapters === 1 ? "capítulo" : "capítulos"}?`}>
        Antes de gravar, a versão de agora de cada capítulo vai para os Snapshots do capítulo (menu do livro), para voltar se precisar.
      </Notice> : <>
        <p className="small muted">Trechos que o livro não precisa mais: o espaço entre parágrafos e a largura das tabelas agora vêm do Estilo do livro. Nada muda sem você marcar e confirmar.</p>
        {blanks > 0 && !settings.blankLines && <Notice title={`${blanks} ${blanks === 1 ? "lugar com" : "lugares com"} linhas vazias seguidas`} actions={<button type="button" className="btn sm" disabled={locked} onClick={() => void vault.setProperty(book.path, "linhas_vazias", "respeitar")}>Ligar “Linhas vazias contam”</button>}>
          Hoje o livro junta essas linhas, como o Obsidian. Com a opção ligada, cada linha a mais vira uma linha de espaço só no livro.
        </Notice>}
        {!all.length ? <p role="status">Nada para trocar: nenhuma gambiarra conhecida nos capítulos.</p> : <>
          <div className="row">
            <button type="button" className="btn sm ghost" onClick={() => setMarked(new Set(all))}>Marcar tudo</button>
            <button type="button" className="btn sm ghost" disabled={!marked.size} onClick={() => setMarked(new Set())}>Desmarcar</button>
          </div>
          {chapters.filter((c) => c.fixes.length).map((chapter) => <section key={chapter.note.path} className="book-review-chapter" aria-labelledby={`rev-${chapter.note.path}`}>
            <h3 id={`rev-${chapter.note.path}`}>{chapter.note.name}</h3>
            <ul>
              {chapter.fixes.map((fix) => {
                const k = key(chapter.note.path, fix)
                return <li key={k}>
                  <label className="check"><input type="checkbox" checked={marked.has(k)} disabled={locked} onChange={() => toggle(k)} />{FIX_LABELS[fix.kind]} <span className="muted">· linha {fix.line + 1}</span></label>
                  <div className="book-review-diff" aria-label="Antes e depois">
                    <pre className="antes" aria-label="Antes">{fix.before.join("\n") || " "}</pre>
                    <pre className="depois" aria-label="Depois">{fix.after.join("\n") || "(sai)"}</pre>
                  </div>
                </li>
              })}
            </ul>
          </section>)}
        </>}
      </>}
    </div>
  </Modal>
}
