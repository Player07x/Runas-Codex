import { useDialogFocus } from "../../components/useDialogFocus"
import { useEffect, useRef, useState } from "react"
import { Keyboard, RotateCcw, X } from "lucide-react"
import { bindKey, defaultKeyBindings, isBindableKey, KEY_ACTION_GROUPS, KEY_ACTIONS, keyLabel, MAX_KEYS_PER_ACTION, PAN_SPEED, unbindKey, type AppSettings, type KeyAction } from "../shared/settings"
import { saveSettings, useSettings } from "../settings"

type Section = "keyboard"

/** Configurações do aplicativo: atalhos de teclado e Token de Acesso. */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const saved = useSettings()
  const [draft, setDraft] = useState<AppSettings>(saved)
  const [section, setSection] = useState<Section>("keyboard")
  const [capturing, setCapturing] = useState<{ action: KeyAction; slot: number } | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const dialog = useRef<HTMLDivElement>(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  useDialogFocus(dialog, () => { if (capturing) setCapturing(null); else close() })

  useEffect(() => { dialog.current?.focus() }, [])
  // As configurações chegam do processo principal depois da primeira pintura.
  useEffect(() => { setDraft(saved) }, [saved])

  // Enquanto uma tecla é capturada, nenhuma outra tela recebe o teclado.
  useEffect(() => {
    if (!capturing) return
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.code === "Escape" && !event.shiftKey) { setCapturing(null); return }
      if (!isBindableKey(event.code)) return
      const previous = KEY_ACTIONS.find((action) => action.id !== capturing.action && draft.keyBindings[action.id].includes(event.code))
      setDraft({ ...draft, keyBindings: bindKey(draft.keyBindings, capturing.action, capturing.slot, event.code) })
      setNotice(previous ? `${keyLabel(event.code)} saiu de “${previous.label}”.` : "")
      setCapturing(null)
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [capturing, draft])

  async function save() {
    setError("")
    try { setDraft(await saveSettings(draft)); onClose() } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar.") }
  }

  function close() {
    if (dirty && !window.confirm("Descartar as alterações nas configurações?")) return
    onClose()
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <div ref={dialog} className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" tabIndex={-1} onKeyDown={(event) => { if (event.key === "Escape" && !capturing) close() }}>
      <header>
        <div><p className="eyebrow">Mesa</p><h2 id="settings-title">Configurações da mesa</h2></div>
        <button className="icon" aria-label="Fechar" onClick={close}><X size={16} /></button>
      </header>
      <nav className="settings-tabs" aria-label="Seções">
        <button className={section === "keyboard" ? "active" : ""} onClick={() => setSection("keyboard")}><Keyboard size={15} /> Teclado</button>
      </nav>

      <div className="settings-body">
        {section === "keyboard" && <>
          <label className="field">
            <span>Velocidade da câmera pelo teclado: {draft.panSpeed} px/s</span>
            <input type="range" min={PAN_SPEED.min} max={PAN_SPEED.max} step={100} value={draft.panSpeed} onChange={(event) => setDraft({ ...draft, panSpeed: Number(event.target.value) })} />
          </label>
          <p className="hint">Segure uma tecla de direção para mover a câmera. Com <b>Shift</b>, a mesma tecla move o objeto selecionado uma célula. Clique numa tecla para trocá-la; Esc cancela a troca.</p>
          {KEY_ACTION_GROUPS.map((group) => <section key={group} className="keybind-group">
            <h3>{group}</h3>
            {KEY_ACTIONS.filter((action) => action.group === group).map((action) => {
              const keys = draft.keyBindings[action.id]
              const slots = Math.min(MAX_KEYS_PER_ACTION, keys.length + 1)
              return <div key={action.id} className="keybind-row">
                <span>{action.label}</span>
                <div className="keybind-keys">
                  {Array.from({ length: slots }, (_, slot) => {
                    const code = keys[slot]
                    const active = capturing?.action === action.id && capturing.slot === slot
                    return <span key={slot} className="keybind-slot">
                      <button className={`keycap ${active ? "capturing" : ""} ${code ? "" : "empty"}`} onClick={() => setCapturing({ action: action.id, slot })}>{active ? "Pressione…" : code ? keyLabel(code) : "+"}</button>
                      {code && !active && <button className="keycap-remove" aria-label={`Remover ${keyLabel(code)}`} title="Remover" onClick={() => setDraft({ ...draft, keyBindings: unbindKey(draft.keyBindings, action.id, slot) })}><X size={11} /></button>}
                    </span>
                  })}
                </div>
              </div>
            })}
          </section>)}
          <button className="ghost small" onClick={() => { setDraft({ ...draft, keyBindings: defaultKeyBindings() }); setNotice("Atalhos padrão restaurados.") }}><RotateCcw size={13} /> Restaurar atalhos padrão</button>
          {notice && <p className="hint" role="status">{notice}</p>}
        </>}

      </div>

      <footer>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="ghost" onClick={close}>Cancelar</button>
        <button className="primary" disabled={!dirty} onClick={() => void save()}>Salvar</button>
      </footer>
    </div>
  </div>
}
