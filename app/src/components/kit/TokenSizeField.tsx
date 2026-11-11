import "./kit.css"
import { useEffect, useState } from "react"
import { TOKEN_SIZE_SHORTCUTS, formatTokenSize, parseTokenSize, tokenSizeLabel } from "../../core/token-size"

/**
 * Campo do tamanho do token (U41): número livre de 0,25 a 20 (com vírgula) e atalhos 0,5 · 1 · 2 · 3 · 4. O mesmo na
 * ficha da Wiki e nas propriedades do token da mesa. Grava ao sair do campo, com Enter ou num atalho.
 */
export function TokenSizeField({ value, onCommit, id, describedBy, label = "Tamanho do token em células", disabled }: {
  value: number
  onCommit: (size: number) => void
  id?: string
  describedBy?: string
  label?: string
  disabled?: boolean
}) {
  const [draft, setDraft] = useState(formatTokenSize(value))
  useEffect(() => setDraft(formatTokenSize(value)), [value])
  const invalid = parseTokenSize(draft) === null
  const commit = () => {
    const size = parseTokenSize(draft)
    if (size === null) return setDraft(formatTokenSize(value))
    setDraft(formatTokenSize(size))
    if (size !== value) onCommit(size)
  }
  return (
    <div className="kit-token-size">
      <span className="kit-token-size-input">
        <input
          id={id}
          className="input"
          inputMode="decimal"
          autoComplete="off"
          aria-label={id ? undefined : label}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit() } }}
        />
        <span aria-hidden="true">{value === 1 ? "célula" : "células"}</span>
      </span>
      <span className="kit-token-size-shortcuts" role="group" aria-label="Tamanhos comuns">
        {TOKEN_SIZE_SHORTCUTS.map((size) => (
          <button key={size} type="button" className="kit-token-size-chip" aria-pressed={size === value} aria-label={tokenSizeLabel(size)} disabled={disabled} onClick={() => { setDraft(formatTokenSize(size)); if (size !== value) onCommit(size) }}>
            {formatTokenSize(size)}
          </button>
        ))}
      </span>
    </div>
  )
}
