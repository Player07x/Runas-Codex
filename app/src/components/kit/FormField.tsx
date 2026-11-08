import "./kit.css"
import { useId, type ReactNode } from "react"

export interface FieldControlProps {
  /** Id do controle (o `<label>` aponta para ele). */
  id: string
  /** Id do rótulo, para grupos (`aria-labelledby`). */
  labelId: string
  /** Id da dica ou do erro, quando há (`aria-describedby`). */
  describedBy?: string
  invalid: boolean
}

/**
 * Grade de formulário: os campos de uma mesma fileira alinham o rótulo, o controle e a dica (subgrid), todos com a
 * mesma borda esquerda e a mesma largura por coluna. Duas colunas quando cabem, uma no celular.
 */
export function FormGrid({ children, columns = 2 }: { children: ReactNode; columns?: 1 | 2 }) {
  return <div className={`kit-form-grid${columns === 1 ? " one" : ""}`}>{children}</div>
}

/**
 * Um campo da grade: rótulo sempre à vista, o controle, e embaixo a dica ou o erro (ligados ao controle por
 * `aria-describedby`). `group` para controles compostos (data, lista de links, imagem): o rótulo nomeia o grupo.
 * `wide` ocupa a fileira inteira.
 */
export function FormField({ label, hint, error, wide, group, children }: {
  label: ReactNode; hint?: ReactNode; error?: string; wide?: boolean; group?: boolean; children: (control: FieldControlProps) => ReactNode
}) {
  const id = useId(), labelId = `${id}-rotulo`, hintId = `${id}-dica`
  const note = error || hint
  return <div className={`kit-field${wide ? " wide" : ""}`} role={group ? "group" : undefined} aria-labelledby={group ? labelId : undefined}>
    {group ? <span className="kit-field-label" id={labelId}>{label}</span> : <label className="kit-field-label" id={labelId} htmlFor={id}>{label}</label>}
    <div className="kit-field-control">{children({ id, labelId, describedBy: note ? hintId : undefined, invalid: Boolean(error) })}</div>
    <span className={`kit-field-hint${error ? " error" : ""}`} id={hintId}>{note}</span>
  </div>
}
