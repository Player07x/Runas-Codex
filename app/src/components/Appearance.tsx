import { useEffect, useState, type ReactNode } from "react"
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
  const row = (title: string, control: ReactNode, hint?: string) => <div className="setting-row"><div><strong className="small">{title}</strong>{hint && <span className="tiny muted">{hint}</span>}</div>{control}</div>
  return <section className="card appearance-settings" aria-labelledby="appearance-title">
    <h2 id="appearance-title" className="section-title row settings-card-head"><Palette size={16} /> Aparência e acessibilidade
      <button className="btn sm ghost" onClick={() => updateAppearance({ scale: 100, palette: "orbita", motion: "system", tablet: false })}>Restaurar padrão</button>
    </h2>
    <p className="tiny muted">Ajustes deste aparelho, em todos os espaços. A prévia impressa mantém o tamanho do papel.</p>
    {row("Luminosidade", <select className="select" aria-label="Luminosidade" value={theme} onChange={e => onTheme(e.target.value)}><option value="dark">Escuro</option><option value="light">Claro</option></select>)}
    {row("Paleta temática", <select className="select" aria-label="Paleta temática" value={prefs.palette} onChange={e => updateAppearance({ palette: e.target.value as typeof prefs.palette })}><option value="orbita">Órbita · lavanda e grafite</option><option value="floresta">Floresta · musgo e névoa</option><option value="brasa">Brasa · cobre e carvão</option></select>)}
    {row(`Tamanho do texto: ${prefs.scale}%`, <input type="range" min="85" max="140" step="5" value={prefs.scale} aria-label="Tamanho do texto" aria-valuetext={`${prefs.scale}%`} onChange={e => updateAppearance({ scale: Number(e.target.value) })} />)}
    {row("Reduzir animações", <Switch label="Reduzir animações" on={prefs.motion === "reduce"} onChange={on => updateAppearance({ motion: on ? "reduce" : "system" })} />, "A preferência do sistema também é respeitada.")}
    {row("Modo tablet", <Switch label="Modo tablet" on={prefs.tablet} onChange={tablet => updateAppearance({ tablet })} />, "Navegação compacta e controles maiores, mesmo em telas largas.")}
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
