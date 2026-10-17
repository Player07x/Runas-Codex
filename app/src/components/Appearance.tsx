import { useEffect, useState } from "react"
import { Palette } from "lucide-react"
import { useAppearance, updateAppearance } from "../lib/appearance"
import { Modal, Switch } from "./ui"
import "../styles/accessibility.css"
export function AppearanceRuntime({ skipLink = true }: { skipLink?: boolean }) {
  const prefs = useAppearance()
  useEffect(() => {
    const root = document.documentElement
    root.dataset.palette = prefs.palette
    root.dataset.motion = prefs.motion
    root.dataset.tablet = String(prefs.tablet)
    root.style.setProperty("--font-scale", String(prefs.scale / 100))
  }, [prefs])
  return skipLink ? <a className="skip-link" href="#runas-main" onClick={event => { event.preventDefault(); document.getElementById("runas-main")?.focus() }}>Pular para o conteúdo</a> : null
}
export function AppearanceSettings({ theme, onTheme }: { theme: string; onTheme: (theme: string) => void }) {
  const prefs = useAppearance()
  return <section className="card appearance-settings" aria-labelledby="appearance-title">
    <h2 id="appearance-title" className="section-title row"><Palette size={16} /> Aparência e acessibilidade</h2>
    <p className="small muted">Ajustes deste aparelho, aplicados a todos os espaços. A prévia impressa mantém o tamanho do papel.</p>
    <label className="field"><span>Luminosidade</span><select className="select" value={theme} onChange={e => onTheme(e.target.value)}><option value="dark">Escuro</option><option value="light">Claro</option></select></label>
    <label className="field"><span>Paleta temática</span><select className="select" value={prefs.palette} onChange={e => updateAppearance({ palette: e.target.value as typeof prefs.palette })}><option value="orbita">Órbita · lavanda e grafite</option><option value="floresta">Floresta · musgo e névoa</option><option value="brasa">Brasa · cobre e carvão</option></select></label>
    <label className="field"><span>Tamanho do texto: {prefs.scale}%</span><input type="range" min="85" max="140" step="5" value={prefs.scale} aria-label="Tamanho do texto" aria-valuetext={`${prefs.scale}%`} onChange={e => updateAppearance({ scale: Number(e.target.value) })} /></label>
    <div className="setting-row"><div><strong className="small">Reduzir animações</strong><span className="tiny muted">A preferência do sistema também é respeitada.</span></div><Switch label="Reduzir animações" on={prefs.motion === "reduce"} onChange={on => updateAppearance({ motion: on ? "reduce" : "system" })} /></div>
    <div className="setting-row"><div><strong className="small">Modo tablet</strong><span className="tiny muted">Navegação compacta e controles maiores, mesmo em telas largas.</span></div><Switch label="Modo tablet" on={prefs.tablet} onChange={tablet => updateAppearance({ tablet })} /></div>
    <p className="small" aria-live="polite">O tamanho e as cores desta frase mostram sua preferência atual.</p>
    <button className="btn sm" onClick={() => updateAppearance({ scale: 100, palette: "orbita", motion: "system", tablet: false })}>Restaurar aparência padrão</button>
  </section>
}

/** A sala mantém as preferências de acessibilidade no aparelho de cada participante. */
export function RoomAppearance() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem("runas-codex:tema") === "light" ? "light" : "dark" } catch { return "dark" } })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem("runas-codex:tema", theme) } catch { /* Continua nesta sessão. */ }
  }, [theme])
  return <><AppearanceRuntime skipLink={false} /><button className="btn room-appearance" aria-label="Aparência da sala" onClick={() => setOpen(true)}><Palette size={18} /></button>
    {open && <Modal title="Aparência da sala" onClose={() => setOpen(false)}><AppearanceSettings theme={theme} onTheme={setTheme} /></Modal>}</>
}
