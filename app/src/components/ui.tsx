import { useDialogFocus } from "./useDialogFocus"
import { createContext, useCallback, useContext, useId, useRef, useState, type ReactNode } from "react"
import { CheckCircle2, X } from "lucide-react"
import runa from "../assets/runa.png"

export function Modal({ title, onClose, children, footer, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useDialogFocus(ref, onClose)
  return (
    <div className="backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal ${wide ? "wide" : ""}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="modal-head">
          <strong id={titleId}>{title}</strong>
          <button className="icon-btn sm" onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode; icon?: ReactNode }[]; onChange: (value: T) => void; label: string }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} role="tab" tabIndex={value === option.value ? 0 : -1} aria-selected={value === option.value} onKeyDown={event => {
          const at = options.findIndex(item => item.value === value)
          const next = event.key === "ArrowRight" ? (at + 1) % options.length : event.key === "ArrowLeft" ? (at + options.length - 1) % options.length : event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : -1
          if (next < 0) return
          event.preventDefault(); onChange(options[next]!.value); (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus()
        }} className={value === option.value ? "active" : ""} onClick={() => onChange(option.value)}>
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <img className="rune-mark" src={runa} alt="" />
      <strong style={{ color: "var(--text)", fontSize: 16 }}>{title}</strong>
      {children && <p style={{ maxWidth: 420 }}>{children}</p>}
      {action}
    </div>
  )
}

export function Switch({ on, onChange, label }: { on: boolean; onChange?: (value: boolean) => void; label: string }) {
  return <button className={`switch ${on ? "on" : ""}`} disabled={!onChange} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange?.(!on)} />
}

export function Progress({ value, max, color = "var(--cyan)" }: { value: number; max: number; color?: string }) {
  return (
    <div style={{ height: 6, borderRadius: 99, background: "var(--panel-2)", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: "100%", background: color }} />
    </div>
  )
}

/** Relógio de progresso em segmentos (Blades in the Dark). */
export function ClockDial({ segments, filled, color, size = 54 }: { segments: number; filled: number; color: string; size?: number }) {
  const r = size / 2 - 3
  const c = size / 2
  const slices = Array.from({ length: segments }, (_, i) => {
    const a0 = (i / segments) * Math.PI * 2 - Math.PI / 2
    const a1 = ((i + 1) / segments) * Math.PI * 2 - Math.PI / 2
    const d = `M${c},${c} L${c + r * Math.cos(a0)},${c + r * Math.sin(a0)} A${r},${r} 0 0 1 ${c + r * Math.cos(a1)},${c + r * Math.sin(a1)} Z`
    return <path key={i} d={d} fill={i < filled ? color : "var(--panel-2)"} stroke="var(--bg)" strokeWidth={2} />
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${filled} de ${segments}`}>
      {slices}
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--line-strong)" />
    </svg>
  )
}

/* ---------- Aviso rápido ---------- */
const ToastContext = createContext<(message: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const show = useCallback((text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage((current) => (current === text ? null : current)), 2600)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && (
        <div className="toast" role="status">
          <CheckCircle2 size={16} color="var(--green)" /> {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

/** Ação que no protótipo só avisa o que faria. */
export function useProtoAction() {
  const toast = useToast()
  return (what: string) => () => toast(`Protótipo: ${what}`)
}
