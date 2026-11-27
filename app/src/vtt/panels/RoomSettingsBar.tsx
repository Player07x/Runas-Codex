import { useId, useRef, useState } from "react"
import { Download, Save, Trash2, Upload } from "lucide-react"
import { useOptionalVault } from "../../platform/VaultProvider"
import { exportRoomSettings, importRoomSettings, normalizePresets, savePreset, type RoomPreset, type RoomSettings } from "../shared/room-settings"

const PRESETS_KEY = "runas-codex:sala-predefinicoes"

function readPresets(): RoomPreset[] {
  try { return normalizePresets(JSON.parse(localStorage.getItem(PRESETS_KEY) ?? "[]")) } catch { return [] }
}

function writePresets(presets: RoomPreset[]): void {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)) } catch { /* preferência opcional */ }
}

/**
 * Configurações da sala (1.9): predefinições com nome (neste aparelho), exportar e importar. Escolher ou importar uma
 * configuração aplica na hora (`onApply`): com a sala desligada, vale ao ligar.
 */
export function RoomSettingsBar({ current, onApply }: { current: RoomSettings; onApply(settings: RoomSettings, label: string): Promise<void> }) {
  const vault = useOptionalVault()
  const [presets, setPresets] = useState(readPresets)
  const [chosen, setChosen] = useState("")
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState("")
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const nameId = useId()
  const update = (next: RoomPreset[]) => { setPresets(next); writePresets(next) }
  const say = (text: string, error = false) => setMessage({ text, error })

  async function apply(settings: RoomSettings, label: string) {
    try { await onApply(settings, label); say(`Configuração “${label}” aplicada.`) } catch (reason) { say(reason instanceof Error ? reason.message : String(reason), true) }
  }

  return <div className="room-settings" role="group" aria-labelledby={`${nameId}-title`}>
    <strong id={`${nameId}-title`}>Configuração da sala</strong>
    <p className="hint">A mesa guarda as escolhas da última sessão e a sala volta assim ao ser ligada. Salve com um nome para reusar em outras mesas, ou exporte para outro aparelho.</p>
    <div className="room-settings-row">
      <label className="field"><span>Predefinição</span>
        <select value={chosen} onChange={(event) => {
          const preset = presets.find((entry) => entry.name === event.target.value)
          setChosen(event.target.value)
          if (preset) void apply(preset.settings, preset.name)
        }}>
          <option value="">Última sessão desta mesa</option>
          {presets.map((preset) => <option key={preset.name} value={preset.name}>{preset.name}</option>)}
        </select>
      </label>
      {chosen && <button className="ghost small danger" title={`Excluir a predefinição “${chosen}” deste aparelho`} onClick={() => { update(presets.filter((preset) => preset.name !== chosen)); say(`Predefinição “${chosen}” excluída.`); setChosen("") }}><Trash2 size={13} /> Excluir</button>}
    </div>
    {naming
      ? <form className="room-settings-row" onSubmit={(event) => {
        event.preventDefault()
        if (!name.trim()) return
        update(savePreset(presets, name, current))
        setChosen(name.trim().slice(0, 60))
        say(`Salva como “${name.trim()}”.`)
        setNaming(false)
        setName("")
      }}>
        <label className="field"><span>Nome</span><input autoFocus value={name} maxLength={60} placeholder="Mega dungeon" onChange={(event) => setName(event.target.value)} /></label>
        <button className="primary small" type="submit" disabled={!name.trim()}>Salvar</button>
        <button className="ghost small" type="button" onClick={() => { setNaming(false); setName("") }}>Cancelar</button>
      </form>
      : <div className="row-actions room-settings-actions">
        <button className="ghost small" onClick={() => { setNaming(true); setMessage(null) }}><Save size={13} /> Salvar como…</button>
        {vault && <button className="ghost small" onClick={() => {
          const label = chosen || "Sala"
          void vault.platform.saveFile(`Sala — ${label}.json`, exportRoomSettings(current, label), "application/json")
            .then((saved) => { if (saved) say(`Exportada para ${saved}.`) }, (reason: unknown) => say(reason instanceof Error ? reason.message : String(reason), true))
        }}><Download size={13} /> Exportar</button>}
        <button className="ghost small" onClick={() => input.current?.click()}><Upload size={13} /> Importar</button>
        <input ref={input} type="file" accept=".json,application/json" hidden onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (!file) return
          void file.text().then((text) => {
            const imported = importRoomSettings(text)
            update(savePreset(presets, imported.name, imported.settings))
            setChosen(imported.name)
            return apply(imported.settings, imported.name)
          }).catch((reason: unknown) => say(reason instanceof Error ? reason.message : String(reason), true))
        }} />
      </div>}
    {message && <small className={message.error ? "error" : "hint"} role={message.error ? "alert" : "status"}>{message.text}</small>}
  </div>
}
