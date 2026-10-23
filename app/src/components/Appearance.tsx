import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { Accessibility, Palette } from "lucide-react"
import { useAppearance, updateAppearance } from "../lib/appearance"
import { ACCESSIBILITY_DEFAULTS, BOTTOM_NAV_CHOICES, DEFAULT_BOTTOM_NAV, setBottomSlot, type Appearance } from "../core/appearance"
import { ChoiceGroup } from "./kit/ChoiceGroup"
import { Modal, Switch } from "./ui"
import "../styles/accessibility.css"
// A fonte legível vem com o app (sem rede); o navegador só carrega o arquivo quando ela é escolhida.
import "@fontsource-variable/atkinson-hyperlegible-next"
import "@fontsource-variable/atkinson-hyperlegible-next/wght-italic.css"

/** `prefers-contrast: more` do sistema, acompanhado ao vivo (o contraste alto liga sozinho). */
const contrastQuery = typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia("(prefers-contrast: more)") : null
const subscribeContrast = (listener: () => void) => { contrastQuery?.addEventListener("change", listener); return () => contrastQuery?.removeEventListener("change", listener) }
const useSystemContrast = () => useSyncExternalStore(subscribeContrast, () => Boolean(contrastQuery?.matches), () => false)

export function AppearanceRuntime({ skipLink = true }: { skipLink?: boolean }) {
  const prefs = useAppearance()
  const systemContrast = useSystemContrast()
  useEffect(() => {
    const root = document.documentElement
    root.dataset.palette = prefs.palette
    root.dataset.motion = prefs.motion
    root.dataset.tablet = String(prefs.tablet)
    root.dataset.spacing = prefs.spacing
    root.dataset.lineWidth = prefs.lineWidth
    root.dataset.readingFont = prefs.readingFont
    root.dataset.contrast = prefs.contrast === "high" || systemContrast ? "high" : "normal"
    root.dataset.underline = String(prefs.underlineLinks)
    root.dataset.solid = String(prefs.solid)
    root.dataset.labels = String(prefs.labels)
    root.dataset.focus = prefs.strongFocus ? "strong" : "normal"
    root.dataset.tones = prefs.ownColors ? "on" : "off"
    root.style.setProperty("--font-scale", String(prefs.scale / 100))
  }, [prefs, systemContrast])
  return skipLink ? <a className="skip-link" href="#runas-main" onClick={event => { event.preventDefault(); document.getElementById("runas-main")?.focus() }}>Pular para o conteúdo</a> : null
}

function Row({ title, hint, children, titleId, stacked }: { title: string; hint?: string; children: ReactNode; titleId?: string; stacked?: boolean }) {
  return <div className={`setting-row${stacked ? " stacked" : ""}`}><div><strong className="small" id={titleId}>{title}</strong>{hint && <span className="tiny muted">{hint}</span>}</div>{children}</div>
}

/** Linha com escolha segmentada: o título da linha é o nome do grupo de rádios. */
function ChoiceRow<T extends string>({ title, hint, value, options, onChange }: { title: string; hint?: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void }) {
  const id = useId()
  return <Row title={title} hint={hint} titleId={id} stacked><ChoiceGroup labelledBy={id} value={value} options={options} onChange={onChange} /></Row>
}

const BOTTOM_LABELS: Record<string, string> = { "": "Início", notas: "Notas", agenda: "Agenda", wiki: "Wiki", campanhas: "Campanhas", livros: "Livros", vtt: "VTT" }

export function AppearanceSettings({ theme, onTheme, bottomNav = true }: { theme: string; onTheme: (theme: string) => void; bottomNav?: boolean }) {
  const prefs = useAppearance()
  return <section className="card appearance-settings" aria-labelledby="appearance-title">
    {/* O botão fica fora do título, para o nome da seção ser só “Aparência”. */}
    <div className="row settings-card-head">
      <h2 id="appearance-title" className="section-title settings-card-title"><Palette size={16} /> Aparência</h2>
      <button className="btn sm ghost" onClick={() => updateAppearance({ palette: "orbita", bottomNav: [...DEFAULT_BOTTOM_NAV], ownColors: true })}>Restaurar padrão</button>
    </div>
    <p className="tiny muted">Ajustes deste aparelho, em todos os espaços. Tamanho do texto, contraste e o resto da leitura estão em Acessibilidade.</p>
    <Row title="Luminosidade"><select className="select" aria-label="Luminosidade" value={theme} onChange={e => onTheme(e.target.value)}><option value="dark">Escuro</option><option value="light">Claro</option></select></Row>
    <Row title="Paleta temática"><select className="select" aria-label="Paleta temática" value={prefs.palette} onChange={e => updateAppearance({ palette: e.target.value as Appearance["palette"] })}><option value="orbita">Órbita · lavanda e grafite</option><option value="floresta">Floresta · musgo e névoa</option><option value="brasa">Brasa · cobre e carvão</option></select></Row>
    <Row title="Usar a cor de cada campanha e categoria" hint="A cor, a capa e o ícone escolhidos em “Personalizar”. Desligado, tudo fica na paleta temática."><Switch label="Usar a cor de cada campanha e categoria" on={prefs.ownColors} onChange={ownColors => updateAppearance({ ownColors })} /></Row>
    {bottomNav && <div className="setting-row bottom-nav-setting" role="group" aria-labelledby="bottom-nav-title">
      <div><strong className="small" id="bottom-nav-title">Barra inferior do celular</strong><span className="tiny muted">Os quatro atalhos da barra; os outros espaços ficam em “Mais”. Escolher um que já está na barra troca os dois de lugar.</span></div>
      <div className="bottom-nav-slots">
        {prefs.bottomNav.map((match, slot) => (
          <select key={slot} className="select" aria-label={`${slot + 1}º atalho`} value={match} onChange={e => updateAppearance({ bottomNav: setBottomSlot(prefs.bottomNav, slot, e.target.value) })}>
            {BOTTOM_NAV_CHOICES.map(choice => <option key={choice} value={choice}>{BOTTOM_LABELS[choice]}</option>)}
          </select>
        ))}
      </div>
    </div>}
  </section>
}

/**
 * Configurações › Acessibilidade (rework F2). Tudo vale só para este aparelho (`runas-codex:aparencia`) e entra em vigor
 * na hora, então a prévia ao lado já mostra o resultado. As páginas impressas dos Livros não mudam.
 */
export function AccessibilitySettings({ routeFocus = false }: { routeFocus?: boolean }) {
  const prefs = useAppearance()
  const set = (patch: Partial<Appearance>) => updateAppearance(patch)
  // Aberta pelo endereço (/config/acessibilidade) logo ao carregar, a seção só rola até a vista; trocando de tela, o
  // Shell também leva o foco até ela.
  const section = useRef<HTMLElement>(null)
  useEffect(() => { if (routeFocus) section.current?.scrollIntoView({ block: "start" }) }, [routeFocus])
  return <section ref={section} className="card a11y-settings" id="acessibilidade" aria-labelledby="a11y-title">
    <div className="row settings-card-head">
      <h2 id="a11y-title" className="section-title settings-card-title" tabIndex={-1} data-route-focus={routeFocus || undefined}><Accessibility size={16} /> Acessibilidade</h2>
      <button className="btn sm ghost" onClick={() => set(ACCESSIBILITY_DEFAULTS)}>Restaurar padrão</button>
    </div>
    <p className="tiny muted">Vale para este aparelho e muda na hora. As páginas impressas dos Livros não mudam. O contraste alto e a redução de animações também seguem o sistema.</p>
    <div className="a11y-layout">
      <div className="a11y-groups">
        <div role="group" aria-labelledby="a11y-leitura" className="a11y-group">
          <h3 id="a11y-leitura" className="a11y-group-title">Leitura</h3>
          <Row title={`Tamanho do texto: ${prefs.scale}%`} hint="Leitura e edição.">
            <input type="range" min="85" max="140" step="5" value={prefs.scale} aria-label="Tamanho do texto" aria-valuetext={`${prefs.scale}%`} onChange={e => set({ scale: Number(e.target.value) })} />
          </Row>
          <ChoiceRow title="Espaçamento do texto" hint="Entre linhas, letras, palavras e parágrafos. “Muito amplo” segue a WCAG 1.4.12." value={prefs.spacing} onChange={spacing => set({ spacing })}
            options={[{ value: "normal", label: "Normal" }, { value: "amplo", label: "Amplo" }, { value: "muito-amplo", label: "Muito amplo" }]} />
          <ChoiceRow title="Largura da linha" hint="Quantos caracteres cabem por linha nas notas e nos artigos." value={prefs.lineWidth} onChange={lineWidth => set({ lineWidth })}
            options={[{ value: "estreita", label: "Estreita" }, { value: "media", label: "Média" }, { value: "larga", label: "Larga" }]} />
          <ChoiceRow title="Fonte de leitura" hint="Garamond só no texto das notas. A legível (Atkinson Hyperlegible) vale para o app inteiro." value={prefs.readingFont} onChange={readingFont => set({ readingFont })}
            options={[{ value: "geist", label: "Geist" }, { value: "garamond", label: "Garamond" }, { value: "legivel", label: "Legível" }]} />
        </div>
        <div role="group" aria-labelledby="a11y-visao" className="a11y-group">
          <h3 id="a11y-visao" className="a11y-group-title">Visão</h3>
          <Row title="Contraste alto" hint="Texto, texto secundário e bordas mais fortes nos temas claro e escuro."><Switch label="Contraste alto" on={prefs.contrast === "high"} onChange={on => set({ contrast: on ? "high" : "system" })} /></Row>
          <Row title="Sublinhar links sempre" hint="Para não depender só da cor ao procurar links no texto."><Switch label="Sublinhar links sempre" on={prefs.underlineLinks} onChange={underlineLinks => set({ underlineLinks })} /></Row>
          <Row title="Sem transparências e brilhos" hint="Fundos chapados no lugar de vidro, desfoque e gradientes."><Switch label="Sem transparências e brilhos" on={prefs.solid} onChange={solid => set({ solid })} /></Row>
        </div>
        <div role="group" aria-labelledby="a11y-interacao" className="a11y-group">
          <h3 id="a11y-interacao" className="a11y-group-title">Interação</h3>
          <Row title="Mostrar rótulos junto aos ícones" hint="Os botões só de ícone mostram o nome ao lado."><Switch label="Mostrar rótulos junto aos ícones" on={prefs.labels} onChange={labels => set({ labels })} /></Row>
          <Row title="Foco reforçado" hint="Anel de foco do teclado mais grosso e afastado."><Switch label="Foco reforçado" on={prefs.strongFocus} onChange={strongFocus => set({ strongFocus })} /></Row>
          <Row title="Controles maiores" hint="Alvos de 44 px também com mouse, navegação compacta e um painel lateral por vez (o antigo Modo tablet)."><Switch label="Controles maiores" on={prefs.tablet} onChange={tablet => set({ tablet })} /></Row>
          <Row title="Reduzir animações" hint="A preferência do sistema também é respeitada."><Switch label="Reduzir animações" on={prefs.motion === "reduce"} onChange={on => set({ motion: on ? "reduce" : "system" })} /></Row>
        </div>
      </div>
      <figure className="a11y-preview">
        <figcaption className="a11y-group-title">Prévia</figcaption>
        <div className="a11y-sample">
          <div className="md">
            <h3>O Lago Espelhado</h3>
            <p>Nas noites sem lua, o lago devolve os reflexos de quem já morreu. Veja também <span className="wikilink">Conde Ormund</span> e a <span className="wikilink">Crônica das Cinzas</span>.</p>
          </div>
          <span className="btn a11y-focus-demo" aria-hidden="true">Botão com foco</span>
        </div>
      </figure>
    </div>
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
    {open && <Modal title="Aparência da sala" onClose={() => setOpen(false)}><AppearanceSettings theme={theme} onTheme={setTheme} bottomNav={false} /><AccessibilitySettings /></Modal>}</>
}
