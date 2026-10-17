import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { BookOpen, Brush, FileText, Flag, Folder, Gem, Heart, Keyboard, Map, ScrollText, Shield, Skull, Sparkles, Star, Sword, Users } from "lucide-react"
import { SHORTCUTS, eventShortcut, shortcutAction, type ShortcutAction } from "../../core/shortcuts"
import { NOTE_COLORS, type NoteColor } from "../../core/note-flags"
import { folderKey, preferences, updatePreferences, usePreferences } from "../../lib/customization"
import { useVault } from "../../platform/VaultProvider"
import { Modal, useToast } from "../ui"
export const NOTE_ICONS = { file: FileText, folder: Folder, book: BookOpen, star: Star, shield: Shield, sword: Sword, users: Users, map: Map, scroll: ScrollText, heart: Heart, gem: Gem, flag: Flag, skull: Skull, magic: Sparkles }
export const ICON_LABELS: Record<keyof typeof NOTE_ICONS, string> = { file: "Nota", folder: "Pasta", book: "Livro", star: "Estrela", shield: "Escudo", sword: "Espada", users: "Pessoas", map: "Mapa", scroll: "Pergaminho", heart: "Coração", gem: "Gema", flag: "Bandeira", skull: "Caveira", magic: "Magia" }
export function NoteIcon({ icon, color, folder = false }: { icon?: string; color?: string; folder?: boolean }) {
  const Icon = NOTE_ICONS[icon as keyof typeof NOTE_ICONS] ?? (folder ? Folder : FileText)
  return <Icon size={14} style={{ color: NOTE_COLORS[color as NoteColor] }} />
}
export function FolderAppearance({ path }: { path: string }) {
  const vault = useVault(), prefs = usePreferences(), toast = useToast(), [open, setOpen] = useState(false)
  const key = folderKey(vault.info!.path, path), current = prefs.folders[key] ?? {}
  return <><button className="icon-btn sm" aria-label={`Aparência da pasta ${path}`} title="Ícone e cor da pasta" onClick={e => { e.preventDefault(); setOpen(true) }}><Sparkles size={13} /></button>{open && createPortal(<Modal title="Ícone e cor da pasta" onClose={() => setOpen(false)}>
    <p className="small muted">Preferências deste aparelho para {path}.</p>
    <label className="field"><span>Ícone</span><select className="input" aria-label="Ícone da pasta" value={current.icon ?? "folder"} onChange={e => { try { updatePreferences(p => ({ ...p, folders: { ...p.folders, [key]: { ...current, icon: e.target.value } } })) } catch (error) { toast(String(error)) } }}>{Object.keys(NOTE_ICONS).map(icon => <option key={icon} value={icon}>{ICON_LABELS[icon as keyof typeof NOTE_ICONS]}</option>)}</select></label>
    <label className="field"><span>Cor</span><select className="input" aria-label="Cor da pasta" value={current.color ?? ""} onChange={e => { try { updatePreferences(p => ({ ...p, folders: { ...p.folders, [key]: { ...current, color: e.target.value } } })) } catch (error) { toast(String(error)) } }}><option value="">Padrão</option>{Object.keys(NOTE_COLORS).map(color => <option key={color}>{color}</option>)}</select></label>
  </Modal>, document.body)}</>
}
/** Estilos locais e atalhos são carregados uma vez para todas as telas. A CSP continua bloqueando recursos externos. */
export function CustomizationRuntime() {
  const prefs = usePreferences()
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return
      if (event.target instanceof HTMLElement && event.target.closest('[aria-label^="Atalho:"]')) return
      // A prévia paginada usa Ctrl+P para imprimir o livro e tem precedência sobre a paleta global.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p" && document.body.classList.contains("book-preview-open")) return
      const action = shortcutAction(event, preferences().shortcuts)
      if (!action) return
      if (["undo", "redo"].includes(action) && (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) return
      event.preventDefault(); event.stopImmediatePropagation()
      window.dispatchEvent(new CustomEvent<ShortcutAction>("runas-codex:comando", { detail: action }))
    }
    window.addEventListener("keydown", key, true)
    return () => window.removeEventListener("keydown", key, true)
  }, [])
  return <>{prefs.snippets.filter(s => s.enabled).map(s => <style key={s.id} data-snippet={s.name}>{s.css}</style>)}</>
}
/** Atalhos editáveis, cada um numa linha das Configurações (preferência deste aparelho). */
export function ShortcutSettings() {
  const prefs = usePreferences()
  const [error, setError] = useState("")
  const change = (action: ShortcutAction, key: string) => {
    const duplicate = (Object.keys(SHORTCUTS) as ShortcutAction[]).find(other => other !== action && (prefs.shortcuts[other] ?? SHORTCUTS[other].key) === key)
    if (duplicate) { setError(`Esse atalho já está em “${SHORTCUTS[duplicate].label}”.`); return }
    try { updatePreferences(p => ({ ...p, shortcuts: { ...p.shortcuts, [action]: key } })); setError("") } catch (e) { setError(String(e)) }
  }
  return <section className="card customization-settings">
    <span className="section-title row settings-card-head"><Keyboard size={16} /> Atalhos
      <button className="btn sm ghost" onClick={() => { try { updatePreferences(p => ({ ...p, shortcuts: {} })); setError("") } catch (e) { setError(String(e)) } }}>Restaurar padrão</button>
    </span>
    <p className="tiny faint">Mod é Ctrl (Cmd no macOS). Selecione o campo e pressione a combinação.</p>
    {error && <p role="alert" className="query-error">{error}</p>}
    {(Object.keys(SHORTCUTS) as ShortcutAction[]).map(action => <label className="setting-row" key={action}><span className="small">{SHORTCUTS[action].label}</span><input className="input mono small shortcut-input" aria-label={`Atalho: ${SHORTCUTS[action].label}`} readOnly value={prefs.shortcuts[action] ?? SHORTCUTS[action].key} onKeyDown={event => { event.preventDefault(); event.stopPropagation(); const key = eventShortcut(event); if (key) change(action, key) }} /></label>)}
  </section>
}
/** Trechos CSS locais; o formulário só abre quando se vai acrescentar um. */
export function SnippetSettings() {
  const prefs = usePreferences(), toast = useToast()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState(""), [css, setCss] = useState(""), [error, setError] = useState("")
  const save = () => {
    if (!name.trim() || !css.trim()) return
    try { updatePreferences(p => ({ ...p, snippets: [...p.snippets, { id: crypto.randomUUID(), name: name.trim(), css, enabled: true }] })); setName(""); setCss(""); setAdding(false) } catch (e) { setError(String(e)) }
  }
  return <section className="card customization-settings">
    <span className="section-title row settings-card-head"><Brush size={16} /> Trechos CSS
      {!adding && <button className="btn sm" onClick={() => setAdding(true)}>Adicionar</button>}
    </span>
    <p className="tiny faint">CSS deste aparelho, ou um snippet do Obsidian (as classes próprias dele podem precisar de ajuste). Ícones e cores ficam no menu da nota e na árvore de pastas.</p>
    {error && <p role="alert" className="query-error">{error}</p>}
    {prefs.snippets.map(snippet => <div className="setting-row" key={snippet.id}><label className="check"><input type="checkbox" checked={snippet.enabled} onChange={e => { try { updatePreferences(p => ({ ...p, snippets: p.snippets.map(s => s.id === snippet.id ? { ...s, enabled: e.target.checked } : s) })) } catch (error) { toast(String(error)) } }} />{snippet.name}</label><button className="btn sm ghost" onClick={() => { try { updatePreferences(p => ({ ...p, snippets: p.snippets.filter(s => s.id !== snippet.id) })) } catch (error) { toast(String(error)) } }}>Remover</button></div>)}
    {adding && <div className="stack" style={{ gap: 8, marginTop: 8 }}>
      <label className="field"><span>Nome do trecho</span><input className="input" aria-label="Nome do trecho CSS" value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="field"><span>CSS</span><textarea className="input" aria-label="Trecho CSS" rows={6} value={css} onChange={e => setCss(e.target.value)} /></label>
      <div className="row-wrap"><button className="btn sm primary" disabled={!name.trim() || !css.trim()} onClick={save}>Adicionar trecho CSS</button><label className="btn sm">Importar .css<input type="file" accept=".css,text/css" hidden onChange={e => { const file = e.target.files?.[0]; if (file) void file.text().then(text => { setName(file.name); setCss(text) }, error => setError(String(error))); e.target.value = "" }} /></label><button className="btn sm ghost" onClick={() => { setAdding(false); setName(""); setCss("") }}>Cancelar</button></div>
    </div>}
  </section>
}
