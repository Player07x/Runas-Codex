import { useEffect, useState, type CSSProperties, type DragEvent, type ReactNode } from "react"
import { AppWindow, Columns2, Ellipsis, Layers, Pin, PinOff, Rows2, X } from "lucide-react"
import { activate, closeOthers, closePane, closeTab, focusPane, moveTab, split, toggleStacked, togglePin, type TabLayout } from "../../core/tabs"
import "./tabs.css"

/** Tipo dos dados ao arrastar uma aba (painel e posição de origem). */
const TAB_DRAG = "application/x-runas-codex-tab"

interface Props {
  layout: TabLayout
  /** Novo arranjo; `replace` quando a mudança não deve ficar no histórico (fechar aba). */
  onChange(next: TabLayout, options?: { replace?: boolean }): void
  /** O conteúdo de uma aba (a nota, a base…). */
  renderTab(path: string, pane: number, focused: boolean): ReactNode
  label(path: string): string
  /** Tipo dos dados de arrastar da árvore de notas (soltar na barra de abas abre ali). */
  treeDragType: string
  onOpenWindow?(path: string): void
  /** Mostrar só o painel em foco (celular). */
  single: boolean
  /** Botões a mais no fim da barra de abas do primeiro painel (workspaces). */
  stripEnd?: ReactNode
}

interface Menu {
  pane: number
  index: number
  x: number
  y: number
}

/** Os painéis da área central das Notas, cada um com a sua barra de abas. */
export function TabPanes({ layout, onChange, renderTab, label, treeDragType, onOpenWindow, single, stripEnd }: Props) {
  const [menu, setMenu] = useState<Menu | null>(null)
  const [dropAt, setDropAt] = useState<{ pane: number; index: number } | null>(null)

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    window.addEventListener("pointerdown", close)
    window.addEventListener("keydown", close)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("pointerdown", close)
      window.removeEventListener("keydown", close)
      window.removeEventListener("resize", close)
    }
  }, [menu])

  const splitFrom = (pane: number, path: string, direction: "lado" | "baixo") => onChange(split(focusPane(layout, pane), path, direction))

  const dropProps = (pane: number, index: number) => ({
    onDragOver: (event: DragEvent) => {
      const types = event.dataTransfer.types
      if (!types.includes(TAB_DRAG) && !types.includes(treeDragType)) return
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = types.includes(TAB_DRAG) ? "move" : "copy"
      if (dropAt?.pane !== pane || dropAt.index !== index) setDropAt({ pane, index })
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setDropAt(null)
      const tab = event.dataTransfer.getData(TAB_DRAG)
      if (tab) {
        const [fromPane, fromIndex] = tab.split(":").map(Number)
        onChange(moveTab(layout, { pane: fromPane!, index: fromIndex! }, { pane, index }))
        return
      }
      // Nota (ou base) solta da árvore: abre numa aba nova deste painel, naquela posição.
      const path = event.dataTransfer.getData(treeDragType)
      if (!path || !/\.(md|base)$/i.test(path)) return
      const focused = focusPane(layout, pane)
      const target = focused.panes[pane]!
      const existing = target.tabs.findIndex((t) => t.path === path)
      if (existing >= 0) onChange(activate(focused, pane, existing))
      else {
        const panes = focused.panes.map((p, i) => (i === pane ? { ...p, tabs: [...p.tabs.slice(0, index), { path }, ...p.tabs.slice(index)], active: index } : p))
        onChange({ ...focused, panes })
      }
    },
  })

  return (
    <div className={`tab-panes ${layout.split}`} onDragLeave={(event) => !(event.currentTarget as Node).contains(event.relatedTarget as Node | null) && setDropAt(null)}>
      {layout.panes.map((pane, p) => {
        const focused = p === layout.focus
        if (single && !focused) return null
        const current = pane.tabs[pane.active]?.path
        return (
          <div key={p} className={`tab-pane ${focused ? "focused" : ""}`} onPointerDownCapture={() => !focused && onChange(focusPane(layout, p))}>
            <div className="tab-strip" role="tablist" aria-label={`Abas do painel ${p + 1}`} {...dropProps(p, pane.tabs.length)}>
              {single && layout.panes.length > 1 && <select className="tab-pane-picker" aria-label="Painel ativo" value={p} onChange={event => onChange(focusPane(layout, Number(event.target.value)))}>{layout.panes.map((_, i) => <option key={i} value={i}>Painel {i + 1}</option>)}</select>}
              {pane.tabs.map((tab, i) => {
                const name = label(tab.path)
                return (
                  <div
                    key={tab.path}
                    role="tab"
                    tabIndex={0}
                    aria-selected={i === pane.active}
                    className={`tab ${i === pane.active ? "active" : ""} ${dropAt?.pane === p && dropAt.index === i ? "drop-before" : ""}`}
                    title={tab.path}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(TAB_DRAG, `${p}:${i}`)
                      event.dataTransfer.effectAllowed = "move"
                    }}
                    {...dropProps(p, i)}
                    onClick={() => onChange(activate(layout, p, i))}
                    onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && (event.preventDefault(), onChange(activate(layout, p, i)))}
                    // Botão do meio fecha, como no Obsidian.
                    onAuxClick={(event) => event.button === 1 && !tab.pinned && (event.preventDefault(), onChange(closeTab(layout, p, i), { replace: true }))}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      setMenu({ pane: p, index: i, x: Math.min(event.clientX, window.innerWidth - 240), y: Math.min(event.clientY, window.innerHeight - 280) })
                    }}
                  >
                    {tab.pinned && <Pin size={12} className="tab-pin" aria-label="fixada" />}
                    <span className="truncate">{name}</span>
                    <button className="tab-more" aria-label={`Ações da aba ${name}`} onClick={event => { event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); setMenu({ pane: p, index: i, x: Math.max(8, Math.min(rect.left, window.innerWidth - 240)), y: Math.max(8, Math.min(rect.bottom, window.innerHeight - 310)) }) }}><Ellipsis size={14} /></button>
                    {!tab.pinned && (
                      <button
                        className="tab-close"
                        aria-label={`Fechar ${name}`}
                        title="Fechar (botão do meio também fecha)"
                        onClick={(event) => {
                          event.stopPropagation()
                          onChange(closeTab(layout, p, i), { replace: true })
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )
              })}
              <span className="grow" />
              {pane.tabs.length > 1 && (
                <button className={`icon-btn sm ${pane.stacked ? "active" : ""}`} title={pane.stacked ? "Uma aba por vez" : "Empilhar as abas"} aria-label="Empilhar as abas" aria-pressed={Boolean(pane.stacked)} onClick={() => onChange(toggleStacked(layout, p))}>
                  <Layers size={14} />
                </button>
              )}
              {current && (
                <span className="tab-split">
                  <button className="icon-btn sm" title="Dividir à direita" aria-label="Dividir à direita" onClick={() => splitFrom(p, current, "lado")}>
                    <Columns2 size={14} />
                  </button>
                  <button className="icon-btn sm" title="Dividir para baixo" aria-label="Dividir para baixo" onClick={() => splitFrom(p, current, "baixo")}>
                    <Rows2 size={14} />
                  </button>
                </span>
              )}
              {(single || p === 0) && stripEnd}
              {layout.panes.length > 1 && (
                <button className="icon-btn sm tab-split" title="Fechar este painel" aria-label={`Fechar o painel ${p + 1}`} onClick={() => onChange(closePane(layout, p), { replace: true })}>
                  <X size={14} />
                </button>
              )}
            </div>
            {pane.stacked && pane.tabs.length > 1 ? (
              <div className="tab-stack">
                {pane.tabs.map((tab, i) => (
                  <section key={tab.path} className={`stack-col ${i === pane.active ? "active" : ""}`} style={{ "--i": i } as CSSProperties} onPointerDownCapture={() => i !== pane.active && onChange(activate(layout, p, i))}>
                    <button className="stack-spine" title={tab.path} onClick={() => onChange(activate(layout, p, i))}>
                      {label(tab.path)}
                    </button>
                    <div className="stack-content">{renderTab(tab.path, p, focused && i === pane.active)}</div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="tab-body">{current ? renderTab(current, p, focused) : <p className="muted page">Escolha uma nota na lista ou crie uma nova.</p>}</div>
            )}
          </div>
        )
      })}
      {menu && layout.panes[menu.pane]?.tabs[menu.index] && (
        <TabMenu
          menu={menu}
          pinned={Boolean(layout.panes[menu.pane]!.tabs[menu.index]!.pinned)}
          onPin={() => onChange(togglePin(layout, menu.pane, menu.index))}
          onSplit={(direction) => splitFrom(menu.pane, layout.panes[menu.pane]!.tabs[menu.index]!.path, direction)}
          onWindow={onOpenWindow ? () => onOpenWindow(layout.panes[menu.pane]!.tabs[menu.index]!.path) : undefined}
          onCloseOthers={() => onChange(closeOthers(layout, menu.pane, menu.index), { replace: true })}
          onClose={() => onChange(closeTab(layout, menu.pane, menu.index), { replace: true })}
          done={() => setMenu(null)}
        />
      )}
    </div>
  )
}

function TabMenu({ menu, pinned, onPin, onSplit, onWindow, onCloseOthers, onClose, done }: { menu: Menu; pinned: boolean; onPin(): void; onSplit(direction: "lado" | "baixo"): void; onWindow?: () => void; onCloseOthers(): void; onClose(): void; done(): void }) {
  const item = (label: ReactNode, run: () => void) => (
    <button
      role="menuitem"
      className="list-item small"
      onClick={() => {
        done()
        run()
      }}
    >
      {label}
    </button>
  )
  return (
    <div className="tab-menu card" role="menu" style={{ left: menu.x, top: menu.y }} onPointerDown={(event) => event.stopPropagation()}>
      {item(
        <>
          {pinned ? <PinOff size={14} /> : <Pin size={14} />} {pinned ? "Desafixar" : "Fixar a aba"}
        </>,
        onPin,
      )}
      {item(
        <>
          <Columns2 size={14} /> Abrir à direita
        </>,
        () => onSplit("lado"),
      )}
      {item(
        <>
          <Rows2 size={14} /> Abrir embaixo
        </>,
        () => onSplit("baixo"),
      )}
      {onWindow &&
        item(
          <>
            <AppWindow size={14} /> Abrir em outra janela
          </>,
          onWindow,
        )}
      {item(<>Fechar as outras abas</>, onCloseOthers)}
      {!pinned && item(<>Fechar</>, onClose)}
    </div>
  )
}
