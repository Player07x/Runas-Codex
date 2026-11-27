import { BoxSelect } from "lucide-react"

/**
 * Seleção no mapa a partir das abas da cena (1.9 B): com a aba aberta, “Selecionar e mover” também pega os objetos
 * dela. O botão seleciona todos de uma vez (o mesmo que Ctrl+A no mapa).
 */
export function SelectAllButton({ count, onSelectAll }: { count: number; onSelectAll?: () => void }) {
  if (!onSelectAll || count === 0) return null
  return <button type="button" className="ghost small" title="Selecionar todas no mapa (Ctrl+A)" onClick={onSelectAll}><BoxSelect size={14} aria-hidden="true" /> Selecionar todas</button>
}

/** Como mexer nos objetos da aba com “Selecionar e mover”. */
export function SideSelectHint({ what }: { what: string }) {
  return <p className="hint scene-side-select-hint">Com esta aba aberta, <b>Selecionar e mover</b> também pega {what}: arraste para mover, use uma caixa ou Shift para várias e as alças dos cantos para redimensionar todas juntas (Shift mantém a proporção; Alt solta da grade).</p>
}
