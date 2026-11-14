import { useId } from "react"
import { Tags } from "lucide-react"
import { ChoiceGroup } from "../kit/ChoiceGroup"
import { useRemembered } from "../../lib/remembered"
import { parsePropertiesDisplay, PROPERTIES_DISPLAY_KEY, type PropertiesDisplay } from "../../lib/properties-display"

const OPTIONS: readonly { value: PropertiesDisplay; label: string }[] = [
  { value: "recolhidas", label: "Recolhidas" },
  { value: "abertas", label: "Abertas" },
  { value: "escondidas", label: "Escondidas" },
]

const HINTS: Record<PropertiesDisplay, string> = {
  recolhidas: "Uma barra “Propriedades” no topo da nota; clique para ver a tabela.",
  abertas: "A tabela aparece aberta; a barra recolhe.",
  escondidas: "Nada no topo da nota. Veja e edite no painel Propriedades, ao lado da nota.",
}

/**
 * Configurações › Editor e atalhos (U77): como o frontmatter aparece no modo Editar. Em qualquer opção o YAML só vira
 * texto pelo “Editar como texto” ou no modo Código, para ninguém mexer nele sem querer. Vale por aparelho.
 */
export function PropertiesDisplaySettings() {
  const [display, setDisplay] = useRemembered(PROPERTIES_DISPLAY_KEY, parsePropertiesDisplay)
  const id = useId()
  return (
    <section className="card">
      <span className="section-title row settings-card-head"><Tags size={16} aria-hidden="true" /> Propriedades no documento</span>
      <div className="setting-row stacked">
        <div>
          <strong className="small" id={id}>No modo Editar</strong>
          <span className="tiny muted" aria-live="polite">{HINTS[display]} Vale para a próxima nota aberta.</span>
        </div>
        <ChoiceGroup labelledBy={id} value={display} options={OPTIONS} onChange={setDisplay} />
      </div>
    </section>
  )
}
