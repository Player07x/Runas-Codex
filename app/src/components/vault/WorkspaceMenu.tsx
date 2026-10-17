import { useDialogFocus } from "../useDialogFocus"
import { useEffect, useRef, useState } from "react"
import { LayoutDashboard, Trash2 } from "lucide-react"
import { workspaceNames, type Workspace } from "../../core/tabs"

interface Props {
  workspaces: Record<string, Workspace>
  onSave(name: string): void
  onOpen(name: string): void
  onDelete(name: string): void
}

/** Workspaces das Notas: guardar o arranjo de abas e painéis com um nome e voltar a ele depois. */
export function WorkspaceMenu({ workspaces, onSave, onOpen, onDelete }: Props) {
  const [open, setOpen] = useState<{ x: number; y: number } | null>(null)
  const [name, setName] = useState("")
  const box = useRef<HTMLDivElement>(null)
  useDialogFocus(box, () => setOpen(null), Boolean(open))
  const names = workspaceNames(workspaces)

  useEffect(() => {
    if (!open) return
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !box.current?.contains(event.target as Node)) setOpen(null)
    }
    window.addEventListener("pointerdown", close)
    window.addEventListener("keydown", close)
    return () => {
      window.removeEventListener("pointerdown", close)
      window.removeEventListener("keydown", close)
    }
  }, [open])

  return (
    <>
      <button
        className="icon-btn sm"
        title="Workspaces (arranjos de abas guardados)"
        aria-label="Workspaces"
        aria-expanded={Boolean(open)}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          setOpen(open ? null : { x: Math.max(8, Math.min(rect.right - 260, window.innerWidth - 268)), y: rect.bottom + 6 })
        }}
      >
        <LayoutDashboard size={14} />
      </button>
      {open && (
        <div ref={box} className="tab-menu card workspace-menu" tabIndex={-1} aria-modal="true" role="dialog" aria-label="Workspaces" style={{ left: open.x, top: open.y }}>
          <span className="eyebrow">Workspaces</span>
          {names.length === 0 && <span className="small muted">Nenhum guardado ainda.</span>}
          {names.map((n) => (
            <div key={n} className="outline-row">
              <button className="list-item small grow" onClick={() => (onOpen(n), setOpen(null))} title={`Guardado em ${new Date(workspaces[n]!.savedAt).toLocaleString("pt-BR")}`}>
                <LayoutDashboard size={14} /> <span className="grow truncate">{n}</span>
                <span className="faint tiny">{workspaces[n]!.layout.panes.reduce((sum, p) => sum + p.tabs.length, 0)} abas</span>
              </button>
              <button className="icon-btn sm" title={`Apagar “${n}”`} aria-label={`Apagar o workspace ${n}`} onClick={() => onDelete(n)}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <form
            className="row"
            style={{ gap: 4, marginTop: 4 }}
            onSubmit={(event) => {
              event.preventDefault()
              if (!name.trim()) return
              onSave(name.trim())
              setName("")
            }}
          >
            <input className="input grow" placeholder="Nome (ex.: Sessão)" value={name} onChange={(event) => setName(event.target.value)} aria-label="Nome do workspace" />
            <button className="btn sm" disabled={!name.trim()} title={names.includes(name.trim()) ? "Substitui o que tem esse nome" : undefined}>
              {names.includes(name.trim()) ? "Trocar" : "Guardar"}
            </button>
          </form>
        </div>
      )}
    </>
  )
}
