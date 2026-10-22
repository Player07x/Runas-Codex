import "./kit.css"
import { useId } from "react"

export type ChoiceOption<T extends string> = { value: T; label: string }

/**
 * Escolha entre poucas opções, desenhada como um seletor segmentado. Por baixo são botões de rádio de verdade: as
 * setas trocam a escolha e o leitor de tela anuncia o grupo e a posição (“Amplo, 2 de 3”). A opção escolhida tem
 * fundo, borda e peso próprios, não só cor.
 */
export function ChoiceGroup<T extends string>({ label, labelledBy, value, options, onChange }: {
  label?: string; labelledBy?: string; value: T; options: readonly ChoiceOption<T>[]; onChange: (value: T) => void
}) {
  const name = useId()
  return <div className="kit-choice" role="radiogroup" aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy}>
    {options.map((option) => (
      <label key={option.value} className={`kit-choice-option${option.value === value ? " on" : ""}`}>
        <input type="radio" name={name} value={option.value} checked={option.value === value} onChange={() => onChange(option.value)} />
        <span>{option.label}</span>
      </label>
    ))}
  </div>
}
