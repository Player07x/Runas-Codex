import { contrastRatio } from "./appearance"

/**
 * Cores de campanhas e categorias da Wiki (ADR 0027). A nota guarda só o tom (`cor: brasa` ou `cor: "#c2553a"`); o app
 * calcula a versão do tema escuro e a do claro, clareando ou escurecendo o tom até passar de 4,5:1 sobre todas as
 * superfícies de todas as paletas. Assim a cor pode ser texto, link, borda e fundo de botão sem perder contraste.
 */

export interface Tone {
  /** `brasa`… ou o hexadecimal de uma cor livre (`#c2553a`). */
  id: string
  label: string
  /** Versão para os temas escuros e para os claros. */
  dark: string
  light: string
  /** Cor livre que precisou mudar de tom para ficar legível. */
  adjusted: boolean
  /** Classe do snippet `runas-codex.css` no Obsidian (só nos 12 tons prontos). */
  cssClass?: string
}

/** Superfícies (`--bg`, `--bg-deep`, `--panel`, `--panel-2`) das três paletas, como em styles/tokens.css. */
export const DARK_SURFACES = ["#11131a", "#0c0f15", "#191d27", "#242936", "#111916", "#0b120f", "#19251f", "#24362c", "#1b1514", "#130e0d", "#29201e", "#382c28"]
export const LIGHT_SURFACES = ["#f0f2fa", "#e5e8f4", "#ffffff", "#e9edf8", "#eff4eb", "#e3ebdd", "#e7efdf", "#faf0e7", "#f0e4d8", "#f4e8db"]
/** Texto sobre o tom (botão principal): escuro nos temas escuros, branco nos claros. */
export const ON_TONE = { dark: "#12141b", light: "#ffffff" }
const MIN_CONTRAST = 4.5

const PRESETS: [id: string, label: string, base: string][] = [
  ["brasa", "Brasa", "#d9653b"],
  ["ambar", "Âmbar", "#e0902a"],
  ["ouro", "Ouro", "#c9a227"],
  ["musgo", "Musgo", "#7f9a3a"],
  ["jade", "Jade", "#2fa37a"],
  ["mare", "Maré", "#2a9bb0"],
  ["ceu", "Céu", "#4a8fe0"],
  ["lavanda", "Lavanda", "#8f8ff0"],
  ["ametista", "Ametista", "#a467d8"],
  ["rosa", "Rosa", "#d9649a"],
  ["sangue", "Sangue", "#c43c3c"],
  ["pedra", "Pedra", "#8a8f9c"],
]

/** Nomes antigos (as cinco cores dos eventos da Agenda e das campanhas antes da ADR 0027). */
const LEGACY: Record<string, string> = { red: "sangue", gold: "ouro", cyan: "lavanda", violet: "ametista", green: "jade" }

// ---------- Conversões ----------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join("") : hex.slice(1)
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

function rgbToHex(rgb: [number, number, number]): string {
  return `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255]
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === rr ? (gg - bb) / d + (gg < bb ? 6 : 0) : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4
  return [h / 6, s, l]
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  return [channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255]
}

const worst = (hex: string, surfaces: readonly string[]) => Math.min(...surfaces.map((s) => contrastRatio(hex, s)))

/** O tom mais próximo do original que passa de 4,5:1 sobre todas as superfícies do tema. */
export function readableVariant(hex: string, theme: "dark" | "light"): string {
  const surfaces = theme === "dark" ? DARK_SURFACES : LIGHT_SURFACES
  const base = rgbToHex(hexToRgb(hex))
  if (worst(base, surfaces) >= MIN_CONTRAST) return base
  const [h, s, l] = rgbToHsl(hexToRgb(base))
  const step = theme === "dark" ? 0.01 : -0.01
  for (let next = l + step; next >= 0 && next <= 1; next += step) {
    const candidate = rgbToHex(hslToRgb([h, s, next]))
    if (worst(candidate, surfaces) >= MIN_CONTRAST) return candidate
  }
  return theme === "dark" ? "#ffffff" : "#000000"
}

const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim()

export const TONES: Tone[] = PRESETS.map(([id, label, base]) => ({ id, label, dark: readableVariant(base, "dark"), light: readableVariant(base, "light"), adjusted: false, cssClass: `runas-cor-${id}` }))

/** `cor` de uma nota: nome de um dos 12 tons (com ou sem acento), um nome antigo ou um hexadecimal. */
export function parseTone(value: unknown): Tone | null {
  if (typeof value !== "string" || !value.trim()) return null
  const text = fold(value)
  const preset = TONES.find((t) => t.id === text || fold(t.label) === text) ?? TONES.find((t) => t.id === LEGACY[text])
  if (preset) return preset
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())
  if (!hex) return null
  const full = rgbToHex(hexToRgb(`#${hex[1]}`))
  const dark = readableVariant(full, "dark")
  const light = readableVariant(full, "light")
  return { id: full, label: full, dark, light, adjusted: dark !== full || light !== full }
}

/** Variáveis do elemento que leva a cor (com a classe `toned`): o CSS escolhe a do tema. */
export function toneStyle(tone: Tone | null | undefined): Record<string, string> | undefined {
  return tone ? { "--tone-dark": tone.dark, "--tone-light": tone.light } : undefined
}

/** `cssclasses` com a classe do tom escolhido no lugar da anterior; as demais classes da nota ficam. */
export function withToneClass(current: unknown, tone: Tone | null): string[] {
  const list = (Array.isArray(current) ? current : typeof current === "string" ? current.split(/[\s,]+/) : []).map(String).filter((c) => c && !c.startsWith("runas-cor-"))
  return tone?.cssClass ? [...list, tone.cssClass] : list
}

// ---------- Ícones ----------

/**
 * Ícones que uma campanha ou categoria pode escolher (`icone: coroa`). O nome em português é o que vai para a nota;
 * os nomes do Lucide que os tipos da Wiki já usam (`map-pin`, `paw-print`…) também valem.
 */
export const EMBLEMS: [id: string, label: string, lucide: string][] = [
  ["espadas", "Espadas", "swords"], ["escudo", "Escudo", "shield"], ["coroa", "Coroa", "crown"], ["caveira", "Caveira", "skull"],
  ["chama", "Chama", "flame"], ["castelo", "Castelo", "castle"], ["torre", "Monumento", "landmark"], ["mapa", "Mapa", "map"],
  ["bussola", "Bússola", "compass"], ["local", "Local", "map-pin"], ["pergaminho", "Pergaminho", "scroll-text"], ["livro", "Livro", "book-open"],
  ["gema", "Gema", "gem"], ["lua", "Lua", "moon"], ["sol", "Sol", "sun"], ["estrela", "Estrela", "star"],
  ["brilho", "Magia", "sparkles"], ["arvore", "Árvore", "tree-pine"], ["folha", "Folha", "leaf"], ["montanha", "Montanha", "mountain"],
  ["onda", "Mar", "waves"], ["navio", "Navio", "ship"], ["ancora", "Âncora", "anchor"], ["pena", "Pena", "feather"],
  ["olho", "Olho", "eye"], ["chave", "Chave", "key-round"], ["dados", "Dados", "dices"], ["pessoa", "Pessoa", "user"],
  ["grupo", "Grupo", "users"], ["bandeira", "Bandeira", "flag"], ["pata", "Pata", "paw-print"], ["raio", "Raio", "zap"],
  ["ampulheta", "Ampulheta", "hourglass"], ["idioma", "Idioma", "languages"], ["camadas", "Camadas", "layers"], ["engrenagem", "Engrenagem", "cog"],
]

/** O id do ícone (`coroa`), aceitando o nome em português (com ou sem acento) ou o do Lucide. */
export function parseEmblem(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  const text = fold(value)
  return EMBLEMS.find(([id, label, lucide]) => id === text || fold(label) === text || lucide === text)?.[0] ?? null
}
