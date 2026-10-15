import { useState } from "react"
import { Lock } from "lucide-react"
import { checkPin, createPin, pinProblem } from "../../core/pin"
import { savePin, storedPin, useNotesLock } from "../../lib/notes-lock"
import { Modal, useToast } from "../ui"

/** Linha das Configurações: criar, trocar ou tirar o PIN do espaço Notas (só neste aparelho). */
export function PinRow() {
  const { hasPin } = useNotesLock()
  const [open, setOpen] = useState(false)
  return (
    <div className="setting-row">
      <div>
        <span className="small" style={{ fontWeight: 650 }}>Bloquear o espaço Notas com PIN</span>
        <span className="tiny faint">{hasPin ? "Ligado neste aparelho. Impede abrir no app; não criptografa os arquivos." : "Impede abrir no app; não criptografa os arquivos. Vale só neste aparelho."}</span>
      </div>
      <button className="btn sm" onClick={() => setOpen(true)}>
        <Lock size={14} /> {hasPin ? "Trocar ou tirar" : "Definir"}
      </button>
      {open && <PinDialog hasPin={hasPin} onClose={() => setOpen(false)} />}
    </div>
  )
}

function PinDialog({ hasPin, onClose }: { hasPin: boolean; onClose(): void }) {
  const toast = useToast()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [again, setAgain] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const digits = (value: string) => value.replace(/\D/g, "").slice(0, 8)

  const run = async (remove: boolean) => {
    setBusy(true)
    setError("")
    try {
      const stored = storedPin()
      if (stored && !(await checkPin(current, stored))) throw new Error("O PIN atual não confere.")
      if (remove) {
        savePin(null)
        toast("Bloqueio do espaço Notas desligado")
      } else {
        const problem = pinProblem(next)
        if (problem) throw new Error(problem)
        if (next !== again) throw new Error("Os dois PINs novos não são iguais.")
        savePin(await createPin(next))
        toast("PIN do espaço Notas salvo neste aparelho")
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const field = (label: string, value: string, set: (v: string) => void) => (
    <label className="field">
      <span>{label}</span>
      <input className="input" type="password" inputMode="numeric" autoComplete="off" value={value} aria-label={label} onChange={(event) => set(digits(event.target.value))} />
    </label>
  )
  return (
    <Modal
      title={hasPin ? "PIN do espaço Notas" : "Definir PIN do espaço Notas"}
      onClose={onClose}
      footer={
        <>
          {hasPin && (
            <button className="btn danger" disabled={busy || current.length < 4} onClick={() => void run(true)}>
              Tirar o bloqueio
            </button>
          )}
          <button className="btn primary" disabled={busy || next.length < 4} onClick={() => void run(false)}>
            Salvar PIN
          </button>
        </>
      }
    >
      <p className="small muted">De 4 a 8 algarismos. O app pede o PIN ao abrir as Notas até ser fechado; quem abrir a pasta do cofre fora do app continua vendo os arquivos.</p>
      {hasPin && field("PIN atual", current, setCurrent)}
      {field("PIN novo", next, setNext)}
      {field("Repita o PIN novo", again, setAgain)}
      {error && (
        <p className="small" role="alert" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}
    </Modal>
  )
}
