import { useId, useMemo, useState } from "react"
import { findAutoLinks, type AutoLink } from "../../core/auto-links"
import { noteName } from "../../core/text"
import type { VaultIndex } from "../../core/vault-index"
import { Modal } from "../ui"

/**
 * “Criar links automáticos…” (25/11): a lista do que vai virar link nesta nota, agrupada pela nota de destino, antes de
 * mexer no texto. Começa marcada só a primeira menção de cada nota que ainda não tem link (como numa wiki); o resto
 * fica a um clique.
 */
export function AutoLinksDialog({ index, path, text, onApply, onClose }: { index: VaultIndex; path: string; text: string; onApply(links: AutoLink[]): void; onClose(): void }) {
  const links = useMemo(() => findAutoLinks(index, path, text), [index, path, text])
  const [chosen, setChosen] = useState(() => new Set(links.flatMap((link, i) => (link.repeated ? [] : [i]))))
  const groups = useMemo(() => {
    const map = new Map<string, { link: AutoLink; items: number[] }>()
    links.forEach((link, i) => {
      const key = link.dest ?? `?${link.linkTarget}`
      const group = map.get(key) ?? { link, items: [] }
      group.items.push(i)
      map.set(key, group)
    })
    return [...map.values()]
  }, [links])
  const toggle = (i: number) => setChosen((current) => { const next = new Set(current); if (next.has(i)) next.delete(i); else next.add(i); return next })
  const idPrefix = useId()
  const count = chosen.size
  return <Modal wide title="Criar links automáticos" onClose={onClose} footer={!links.length ? <button type="button" className="btn primary" onClick={onClose}>Fechar</button> : <>
    <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
    <button type="button" className="btn primary" disabled={!count} onClick={() => onApply(links.filter((_, i) => chosen.has(i)))}>{count === 1 ? "Criar 1 link" : `Criar ${count} links`}</button>
  </>}>
    {!links.length ? <p className="muted">Nenhum nome de outra nota (nem apelido, nem nota citada que ainda não existe) aparece sem link nesta nota.</p> : <>
      <p className="small muted">Nomes e apelidos de outras notas que aparecem aqui sem link. Marcada vem só a primeira vez de cada nota; o texto que se lê não muda.</p>
      {links.length > 1 && <div className="row-wrap auto-links-bulk">
        <button type="button" className="btn sm ghost" onClick={() => setChosen(new Set(links.map((_, i) => i)))}>Marcar todas ({links.length})</button>
        {links.some((link) => link.repeated) && <button type="button" className="btn sm ghost" onClick={() => setChosen(new Set(links.flatMap((link, i) => (link.repeated ? [] : [i]))))}>Só a primeira de cada</button>}
        <button type="button" className="btn sm ghost" onClick={() => setChosen(new Set())}>Desmarcar todas</button>
      </div>}
      <div className="stack auto-links-list">
        {groups.map(({ link, items }) => {
          const headingId = `${idPrefix}-${items[0]}`
          return <fieldset key={items[0]} className="auto-links-group" aria-labelledby={headingId}>
            <div className="row auto-links-head" id={headingId}>
              <strong className="truncate">{link.dest ? noteName(link.dest) : link.linkTarget}</strong>
              {!link.dest && <span className="chip gold" title="A nota ainda não existe; o link fica esperando por ela, como os outros links a escrever.">a escrever</span>}
              {links.some((other, i) => items.includes(i) && other.viaAlias) && <span className="chip" title="Achado por um apelido da nota.">apelido</span>}
              <span className="tiny faint">{items.length === 1 ? "1 vez" : `${items.length} vezes`}</span>
            </div>
            {items.map((i) => {
              const item = links[i]!
              return <label key={i} className="auto-links-item">
                <input type="checkbox" checked={chosen.has(i)} onChange={() => toggle(i)} />
                <span className="small">{item.before}<mark>{item.text}</mark>{item.after}{item.repeated && <span className="tiny faint"> · já citada antes</span>}</span>
              </label>
            })}
          </fieldset>
        })}
      </div>
    </>}
  </Modal>
}
