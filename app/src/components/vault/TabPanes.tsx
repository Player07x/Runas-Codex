import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react"
import { AppWindow, Columns2, Ellipsis, Layers, Pin, PinOff, Rows2, X } from "lucide-react"
import { activate, closeOthers, closePane, closeTab, focusPane, moveTab, split, toggleStacked, togglePin, type TabLayout } from "../../core/tabs"
import { TabSwitcherContext, useTabsAsButton } from "../../lib/tabs"
import { Modal } from "../ui"
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
  // U81: no celular (até 640 px) a faixa some e as abas ficam numa folha aberta pelo botão da barra da nota.
  const asButton = useTabsAsButton() && single
  const [sheet, setSheet] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  // Ao fechar a folha depois de trocar de aba, o botão que a abriu sumiu com a nota anterior: o foco vai para o da nova.
  const closeSheet = () => {
    setSheet(false)
    requestAnimationFrame(() => {
      if (document.activeElement === document.body || !document.activeElement) root.current?.querySelector<HTMLElement>(".tab-pane.focused .tab-count")?.focus()
    })
  }

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
    <div ref={root} className={`tab-panes ${layout.split}`} onDragLeave={(event) => !(event.currentTarget as Node).contains(event.relatedTarget as Node | null) && setDropAt(null)}>
      {layout.panes.map((pane, p) => {
        const focused = p === layout.focus
        if (single && !focused) return null
        const current = pane.tabs[pane.active]?.path
        const switcher = asButton ? (
          <button type="button" className="icon-btn tab-count" title="Abas abertas" aria-label={`Abas abertas: ${pane.tabs.length}`} aria-haspopup="dialog" aria-expanded={sheet} onClick={() => setSheet(true)}>
            <span aria-hidden="true">{pane.tabs.length}</span>
          </button>
        ) : null
        return (
          <div key={p} className={`tab-pane ${focused ? "focused" : ""}`} onPointerDownCapture={() => !focused && onChange(focusPane(layout, p))}>
            {/* T7: cada aba tem botões dentro (ações, fechar), o que o papel tab do ARIA não permite; a faixa é um grupo
                de botões e a aba aberta é marcada com aria-current. */}
            {!asButton && <div className="tab-strip" role="group" aria-label={`Abas do painel ${p + 1}`} {...dropProps(p, pane.tabs.length)}>
              {single && layout.panes.length > 1 && <select className="tab-pane-picker" aria-label="Painel ativo" value={p} onChange={event => onChange(focusPane(layout, Number(event.target.value)))}>{layout.panes.map((_, i) => <option key={i} value={i}>Painel {i + 1}</option>)}</select>}
              {pane.tabs.map((tab, i) => {
                const name = label(tab.path)
                return (
                  <div
                    key={tab.path}
                    className={`tab ${i === pane.active ? "active" : ""} ${dropAt?.pane === p && dropAt.index === i ? "drop-before" : ""}`}
                    title={tab.path}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(TAB_DRAG, `${p}:${i}`)
                      event.dataTransfer.effectAllowed = "move"
                    }}
                    {...dropProps(p, i)}
                    onClick={() => onChange(activate(layout, p, i))}
                    // Botão do meio fecha, como no Obsidian.
                    onAuxClick={(event) => event.button === 1 && !tab.pinned && (event.preventDefault(), onChange(closeTab(layout, p, i), { replace: true }))}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      setMenu({ pane: p, index: i, x: Math.min(event.clientX, window.innerWidth - 240), y: Math.min(event.clientY, window.innerHeight - 280) })
                    }}
                  >
                    <button type="button" className="tab-name" aria-current={i === pane.active ? "page" : undefined} aria-label={tab.pinned ? `${name} (fixada)` : undefined}>
                      {tab.pinned && <Pin size={12} className="tab-pin" aria-hidden="true" />}
                      <span className="truncate">{name}</span>
                    </button>
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
            </div>}
            <TabSwitcherContext.Provider value={switcher}>
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
              <div className="tab-body">{current ? renderTab(current, p, focused) : <div className="muted page">Escolha uma nota na lista ou crie uma nova. {switcher}</div>}</div>
            )}
            </TabSwitcherContext.Provider>
          </div>
        )
      })}
      {menu && layout.panes[menu.pane]?.tabs[menu.index] && <TabMenu menu={menu} actions={actionsFor(menu.pane, menu.index)} done={() => setMenu(null)} />}
      {sheet && asButton && (
        <TabSheet
          layout={layout}
          label={label}
          actionsFor={actionsFor}
          onChange={onChange}
          stripEnd={stripEnd}
          onClose={closeSheet}
        />
      )}
    </div>
  )

  function actionsFor(pane: number, index: number): TabAction[] {
    const tab = layout.panes[pane]!.tabs[index]!
    return tabActions({
      pinned: Boolean(tab.pinned),
      onPin: () => onChange(togglePin(layout, pane, index)),
      onSplit: (direction) => splitFrom(pane, tab.path, direction),
      onWindow: onOpenWindow ? () => onOpenWindow(tab.path) : undefined,
      onCloseOthers: () => onChange(closeOthers(layout, pane, index), { replace: true }),
      onClose: () => onChange(closeTab(layout, pane, index), { replace: true }),
    })
  }
}

interface TabAction {
  key: string
  label: ReactNode
  run(): void
}

/** As ações de uma aba, as mesmas no menu (clique direito, ⋯) e na folha das abas do celular. */
function tabActions({ pinned, onPin, onSplit, onWindow, onCloseOthers, onClose }: { pinned: boolean; onPin(): void; onSplit(direction: "lado" | "baixo"): void; onWindow?: () => void; onCloseOthers(): void; onClose(): void }): TabAction[] {
  const actions: TabAction[] = [
    { key: "fixar", label: <>{pinned ? <PinOff size={14} /> : <Pin size={14} />} {pinned ? "Desafixar" : "Fixar a aba"}</>, run: onPin },
    { key: "lado", label: <><Columns2 size={14} /> Abrir à direita</>, run: () => onSplit("lado") },
    { key: "baixo", label: <><Rows2 size={14} /> Abrir embaixo</>, run: () => onSplit("baixo") },
  ]
  if (onWindow) actions.push({ key: "janela", label: <><AppWindow size={14} /> Abrir em outra janela</>, run: onWindow })
  actions.push({ key: "outras", label: <>Fechar as outras abas</>, run: onCloseOthers })
  if (!pinned) actions.push({ key: "fechar", label: <>Fechar</>, run: onClose })
  return actions
}

/**
 * U81: as abas abertas do painel em foco, em folha (o `Modal` vira folha de baixo no celular). Tudo o que a faixa e o
 * menu da aba fazem continua aqui: abrir, fechar, as ações da aba, empilhar, trocar e fechar painel, workspaces.
 */
function TabSheet({ layout, label, actionsFor, onChange, stripEnd, onClose }: { layout: TabLayout; label(path: string): string; actionsFor(pane: number, index: number): TabAction[]; onChange: Props["onChange"]; stripEnd?: ReactNode; onClose(): void }) {
  const [open, setOpen] = useState<string | null>(null)
  const p = layout.focus
  const pane = layout.panes[p]
  if (!pane) return null
  return (
    <Modal title={`Abas abertas (${pane.tabs.length})`} onClose={onClose}>
      {layout.panes.length > 1 && (
        <div className="row tab-sheet-panes">
          <select className="tab-pane-picker grow" aria-label="Painel ativo" value={p} onChange={(event) => onChange(focusPane(layout, Number(event.target.value)))}>
            {layout.panes.map((_, i) => <option key={i} value={i}>Painel {i + 1}</option>)}
          </select>
          <button type="button" className="btn sm" onClick={() => onChange(closePane(layout, p), { replace: true })}><X size={14} /> Fechar este painel</button>
        </div>
      )}
      {pane.tabs.length === 0 ? <p className="muted">Nenhuma aba aberta neste painel.</p> : (
        <ul className="tab-sheet-list">
          {pane.tabs.map((tab, i) => {
            const name = label(tab.path)
            const folder = tab.path.includes("/") ? tab.path.slice(0, tab.path.lastIndexOf("/")) : ""
            return (
              <li key={tab.path} className={`tab-sheet-row ${i === pane.active ? "active" : ""}`}>
                <div className="tab-sheet-line">
                  <button type="button" className="list-item tab-sheet-name" title={tab.path} aria-current={i === pane.active ? "page" : undefined} onClick={() => (onChange(activate(layout, p, i)), onClose())}>
                    {tab.pinned && <Pin size={14} className="tab-pin" aria-hidden="true" />}
                    <span className="tab-sheet-text"><span className="truncate">{name}{tab.pinned && <span className="sr-only"> (fixada)</span>}</span>{folder && <span className="faint tiny truncate">{folder}</span>}</span>
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Ações da aba ${name}`} aria-expanded={open === tab.path} onClick={() => setOpen(open === tab.path ? null : tab.path)}><Ellipsis size={16} /></button>
                  {!tab.pinned && <button type="button" className="icon-btn" aria-label={`Fechar ${name}`} onClick={() => onChange(closeTab(layout, p, i), { replace: true })}><X size={16} /></button>}
                </div>
                {open === tab.path && (
                  <div className="tab-sheet-actions" role="group" aria-label={`Ações da aba ${name}`}>
                    {actionsFor(p, i).map((action) => <button type="button" key={action.key} className="list-item small" onClick={() => (setOpen(null), action.run())}>{action.label}</button>)}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {(pane.tabs.length > 1 || stripEnd) && (
        <div className="row tab-sheet-foot">
          {pane.tabs.length > 1 && (
            <button type="button" className={`btn sm ${pane.stacked ? "active" : ""}`} aria-pressed={Boolean(pane.stacked)} onClick={() => onChange(toggleStacked(layout, p))}><Layers size={14} /> Empilhar as abas</button>
          )}
          <span className="grow" />
          {stripEnd}
        </div>
      )}
    </Modal>
  )
}

function TabMenu({ menu, actions, done }: { menu: Menu; actions: TabAction[]; done(): void }) {
  return (
    <div className="tab-menu card" role="menu" style={{ left: menu.x, top: menu.y }} onPointerDown={(event) => event.stopPropagation()}>
      {actions.map((action) => (
        <button
          key={action.key}
          role="menuitem"
          className="list-item small"
          onClick={() => {
            done()
            action.run()
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}
