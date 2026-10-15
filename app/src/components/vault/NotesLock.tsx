import { useEffect, useRef, useState } from "react"
import { LockKeyhole } from "lucide-react"
import { checkPin, lockoutSeconds } from "../../core/pin"
import { storedPin, unlockNotes } from "../../lib/notes-lock"
import "./notes-lock.css"

/** Tela do espaço Notas bloqueado: o PIN deste aparelho libera até o app fechar. */
export function NotesLockScreen() {
  const [pin, setPin] = useState("")
  const [failures, setFailures] = useState(0)
  const [waitUntil, setWaitUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [error, setError] = useState("")
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])
  useEffect(() => {
    if (waitUntil <= now) return
    const timer = setTimeout(() => setNow(Date.now()), 500)
    return () => clearTimeout(timer)
  }, [waitUntil, now])
  const waiting = Math.ceil((waitUntil - now) / 1000)

  const submit = async () => {
    const stored = storedPin()
    if (!stored) return unlockNotes()
    if (waiting > 0) return
    if (await checkPin(pin, stored)) return unlockNotes()
    const next = failures + 1
    setFailures(next)
    setPin("")
    const pause = lockoutSeconds(next)
    if (pause) {
      setWaitUntil(Date.now() + pause * 1000)
      setNow(Date.now())
    }
    setError(pause ? `PIN errado. Espere ${pause} segundos para tentar de novo.` : "PIN errado.")
  }

  return (
    <div className="page notes-lock">
      <form
        className="card stack notes-lock-card"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <span className="notes-lock-icon">
          <LockKeyhole size={26} />
        </span>
        <h1 className="page-title">Notas bloqueadas</h1>
        <p className="small muted">Digite o PIN deste aparelho. O bloqueio só vale no app: os arquivos do cofre não são criptografados.</p>
        <input
          ref={input}
          className="input notes-lock-input"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          value={pin}
          aria-label="PIN"
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
        />
        {error && (
          <p className="small notes-lock-error" role="alert">
            {waiting > 0 ? `PIN errado. Espere ${waiting} s.` : error}
          </p>
        )}
        <button className="btn primary" type="submit" disabled={pin.length < 4 || waiting > 0}>
          Desbloquear
        </button>
      </form>
    </div>
  )
}
