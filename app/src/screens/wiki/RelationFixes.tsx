import { useMemo, useState } from "react"
import { ArrowLeftRight, GitFork } from "lucide-react"
import { completeWrites, invertedRelations, invertWrites, oneSidedRelations, type PropertyWrite } from "../../core/relation-sides"
import { noteName } from "../../core/text"
import { RELATION_TYPES } from "../../core/wiki"
import { useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"

const label = (key: string) => RELATION_TYPES.find((type) => type.key === key)?.label ?? key

/**
 * Consertar as relações que já existem (U75), nas Ferramentas da wiki: as escritas de um lado só (grava o outro) e as
 * que parecem invertidas (organização “membro de” personagem). Prévia nota por nota; nada é gravado sem confirmar.
 */
export function RelationFixes({ root }: { root: string }) {
  const vault = useVault(), toast = useToast(), index = vault.index!
  const readOnly = vault.info?.readOnly ?? true
  const oneSided = useMemo(() => oneSidedRelations(index, root), [index, root, vault.version])
  const inverted = useMemo(() => invertedRelations(index, root), [index, root, vault.version])
  const [open, setOpen] = useState<"lados" | "invertidas" | null>(null)
  const [off, setOff] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const items = open === "lados" ? oneSided : open === "invertidas" ? inverted : []
  const chosen = items.filter((_, i) => !off.has(i))
  const toggle = (i: number) => setOff((current) => { const next = new Set(current); if (next.has(i)) next.delete(i); else next.add(i); return next })
  const show = (which: "lados" | "invertidas") => { setOpen(open === which ? null : which); setOff(new Set()) }
  const apply = async () => {
    const writes: PropertyWrite[] = open === "lados" ? completeWrites(index, oneSided.filter((_, i) => !off.has(i))) : invertWrites(index, inverted.filter((_, i) => !off.has(i)))
    setBusy(true)
    const failed: string[] = []
    for (const write of writes) {
      try { await vault.setProperty(write.path, write.key, write.value.length ? write.value : undefined) }
      catch (err) { failed.push(`${noteName(write.path)}: ${err instanceof Error ? err.message : String(err)}`) }
    }
    setBusy(false); setOff(new Set())
    const notes = new Set(writes.map((write) => write.path)).size
    toast(failed.length ? `Não deu para gravar: ${failed.join("; ")}` : `Relações gravadas em ${notes} ${notes === 1 ? "nota" : "notas"}.`)
  }
  return (
    <section className="card stack relation-fixes" aria-labelledby="conferir-relacoes">
      <h2 id="conferir-relacoes" className="section-title row"><GitFork size={15} aria-hidden="true" /> Conferir relações</h2>
      <p className="small muted">Relações escritas só numa das notas e organizações que parecem “membro de” um personagem. Confira a lista antes de gravar.</p>
      <div className="row-wrap">
        <button type="button" className={`btn sm ${open === "lados" ? "primary" : ""}`} aria-expanded={open === "lados"} aria-controls="relacoes-lista" onClick={() => show("lados")}>
          Relações de um lado só · {oneSided.length}
        </button>
        <button type="button" className={`btn sm ${open === "invertidas" ? "primary" : ""}`} aria-expanded={open === "invertidas"} aria-controls="relacoes-lista" onClick={() => show("invertidas")}>
          <ArrowLeftRight size={14} aria-hidden="true" /> Relações invertidas · {inverted.length}
        </button>
      </div>
      {open && <div id="relacoes-lista" className="stack relation-fixes-list">
        {items.length === 0
          ? <p className="small muted">{open === "lados" ? "Todas as relações desta wiki estão escritas dos dois lados." : "Nenhuma organização aparece como membro, líder ou subordinada de um personagem."}</p>
          : <>
            <ul>
              {open === "lados" && oneSided.map((item, i) => <li key={`${item.from}|${item.key}|${item.to}`}><label className="row">
                <input type="checkbox" checked={!off.has(i)} onChange={() => toggle(i)} />
                <span className="small"><b>{noteName(item.to)}</b> ganha “{label(item.inverse)}: {noteName(item.from)}” <span className="muted">(escrito em {noteName(item.from)} como “{label(item.key)}”)</span></span>
              </label></li>)}
              {open === "invertidas" && inverted.map((item, i) => <li key={`${item.org}|${item.key}|${item.person}`}><label className="row">
                <input type="checkbox" checked={!off.has(i)} onChange={() => toggle(i)} />
                <span className="small"><b>{noteName(item.org)}</b>: <del>{label(item.key)}: {noteName(item.person)}</del> → <ins>{label(item.mirror)}: {noteName(item.person)}</ins></span>
              </label></li>)}
            </ul>
            <div className="row">
              <button type="button" className="btn sm primary" disabled={readOnly || busy || chosen.length === 0} onClick={() => void apply()}>
                {open === "lados" ? `Gravar ${chosen.length}` : `Inverter ${chosen.length}`}
              </button>
              {readOnly && <span className="tiny muted">Cofre só de leitura.</span>}
            </div>
          </>}
      </div>}
    </section>
  )
}
