import { useMemo, useState } from "react"
import { ArrowLeftRight, GitFork } from "lucide-react"
import { completeWrites, invertedRelations, invertWrites, oneSidedRelations, type PropertyWrite } from "../../core/relation-sides"
import { noteName } from "../../core/text"
import { RELATION_TYPES } from "../../core/wiki"
import { useToast } from "../../components/ui"
import { ChoiceGroup } from "../../components/kit/ChoiceGroup"
import { useVault } from "../../platform/VaultProvider"

const label = (key: string) => RELATION_TYPES.find((type) => type.key === key)?.label ?? key

/** As duas conferências, contadas uma vez para a aba (“Conferir a wiki · n”) e para a lista. */
export function useRelationChecks(root: string) {
  const vault = useVault(), index = vault.index!
  const oneSided = useMemo(() => oneSidedRelations(index, root), [index, root, vault.version])
  const inverted = useMemo(() => invertedRelations(index, root), [index, root, vault.version])
  return { oneSided, inverted, total: oneSided.length + inverted.length }
}

/**
 * Consertar as relações que já existem (U75), na aba “Conferir a wiki” das Ferramentas (U118): as escritas de um lado só
 * (grava o outro) e as que parecem invertidas (organização “membro de” personagem). A lista aparece inteira, com caixas
 * de marcar; nada é gravado sem o clique em Gravar.
 */
export function RelationFixes({ checks }: { checks: ReturnType<typeof useRelationChecks> }) {
  const vault = useVault(), toast = useToast(), index = vault.index!
  const readOnly = vault.info?.readOnly ?? true
  const { oneSided, inverted } = checks
  const [open, setOpen] = useState<"lados" | "invertidas">(() => !oneSided.length && inverted.length ? "invertidas" : "lados")
  const [off, setOff] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const items = open === "lados" ? oneSided : inverted
  const chosen = items.filter((_, i) => !off.has(i))
  const toggle = (i: number) => setOff((current) => { const next = new Set(current); if (next.has(i)) next.delete(i); else next.add(i); return next })
  const show = (which: "lados" | "invertidas") => { setOpen(which); setOff(new Set()) }
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
    if (failed.length) toast.error(`Não deu para gravar: ${failed.join("; ")}`)
    else toast(`Relações gravadas em ${notes} ${notes === 1 ? "nota" : "notas"}.`)
  }
  return (
    <section className="card stack relation-fixes" aria-labelledby="conferir-relacoes">
      <div className="row-wrap relation-fixes-head">
        <h2 id="conferir-relacoes" className="wiki-tools-title row"><GitFork size={16} aria-hidden="true" /> Conferir relações</h2>
        <ChoiceGroup label="Que relações conferir" value={open} onChange={show} options={[
          { value: "lados", label: `De um lado só ${oneSided.length}` }, { value: "invertidas", label: `Invertidas ${inverted.length}` },
        ]} />
      </div>
      <p className="small muted">{open === "lados"
        ? "Relações escritas só numa das notas: Gravar escreve o outro lado. Desmarque o que não quiser."
        : <><ArrowLeftRight size={13} aria-hidden="true" /> Organizações que aparecem como membro, líder ou subordinada de um personagem: Inverter troca para o lado certo.</>}</p>
      <div id="relacoes-lista" className="stack relation-fixes-list">
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
            <div className="row-wrap">
              <button type="button" className="btn primary" disabled={readOnly || busy || chosen.length === 0} onClick={() => void apply()}>
                {open === "lados" ? `Gravar ${chosen.length} ${chosen.length === 1 ? "relação" : "relações"}` : `Inverter ${chosen.length}`}
              </button>
              {readOnly && <span className="tiny muted">Cofre só de leitura.</span>}
            </div>
          </>}
      </div>
    </section>
  )
}
