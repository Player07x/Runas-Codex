import "./kit.css"
import { useRef, type ReactNode } from "react"
import { nextIndex } from "../../core/roving"

export type PanelTab<T extends string> = { value: T; label: string; count?: number; icon?: ReactNode }

/**
 * Abas do painel lateral único (Links, Propriedades, Ficha, Sessão…): padrão de abas da WAI-ARIA, com um só ponto
 * de parada do Tab e setas para trocar. O contador entra no nome acessível (“Relações, 3”).
 */
export function PanelTabs<T extends string>({ tabs, value, onChange, label, idPrefix }: { tabs: PanelTab<T>[]; value: T; onChange: (value: T) => void; label: string; idPrefix: string }) {
  const list = useRef<HTMLDivElement>(null)
  const current = Math.max(0, tabs.findIndex((tab) => tab.value === value))
  return <div ref={list} className="kit-tabs" role="tablist" aria-label={label} onKeyDown={(event) => {
    const next = nextIndex(event.key, current, tabs.map(() => false), "horizontal")
    if (next === null) return
    event.preventDefault()
    onChange(tabs[next]!.value)
    list.current?.querySelectorAll<HTMLElement>("[role=tab]")[next]?.focus()
  }}>
    {tabs.map((tab) => {
      const selected = tab.value === value
      return <button key={tab.value} type="button" role="tab" id={`${idPrefix}-tab-${tab.value}`} aria-selected={selected} aria-controls={`${idPrefix}-panel`} tabIndex={selected ? 0 : -1}
        aria-label={tab.count !== undefined ? `${tab.label}, ${tab.count}` : undefined} className="kit-tab" onClick={() => onChange(tab.value)}>
        {tab.icon}<span>{tab.label}</span>{tab.count !== undefined && <span className="kit-tab-count" aria-hidden="true">{tab.count}</span>}
      </button>
    })}
  </div>
}

/** Conteúdo da aba escolhida, ligado à aba para leitores de tela. */
export function TabPanel({ idPrefix, value, children }: { idPrefix: string; value: string; children: ReactNode }) {
  return <div className="kit-tabpanel" role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-tab-${value}`} tabIndex={0}>{children}</div>
}
