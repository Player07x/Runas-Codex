import { useId } from "react"
import { LOGO_VIEWBOX, logoShape } from "../core/logo"

const SHAPES = { normal: logoShape(), small: logoShape(true) }

/**
 * A logo em recorte, na cor do texto em volta (`color`): o CSS de cada lugar dá a cor de destaque da paleta. Decorativa
 * (o nome do app está ao lado ou no rótulo do link). `small` para 16–24 px.
 */
export function RuneLogo({ className, small = false }: { className?: string; small?: boolean }) {
  // Cada cópia com a sua máscara: a barra lateral e um estado vazio aparecem juntos.
  const maskId = `rachadura-${useId().replace(/[^\w-]/g, "")}`
  const { path, crack } = small ? SHAPES.small : SHAPES.normal
  return (
    <svg className={className} viewBox={`0 0 ${LOGO_VIEWBOX} ${LOGO_VIEWBOX}`} aria-hidden="true" focusable="false">
      {crack.length > 0 && (
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={LOGO_VIEWBOX} height={LOGO_VIEWBOX}>
          <rect width={LOGO_VIEWBOX} height={LOGO_VIEWBOX} fill="#fff" />
          {crack.map(({ d, width }) => <path key={d} d={d} fill="none" stroke="#000" strokeWidth={width} strokeLinecap="round" />)}
        </mask>
      )}
      <path d={path} fill="currentColor" fillRule="evenodd" mask={crack.length > 0 ? `url(#${maskId})` : undefined} />
    </svg>
  )
}
