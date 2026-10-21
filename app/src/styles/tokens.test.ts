import { readFileSync } from "node:fs"

// O contraste dos tokens é regra de aceite (docs/ux-ui-acessibilidade.md): este teste falha antes de um tom novo
// chegar à tela. Texto pede 4,5:1; bordas e indicadores de controles, 3:1 (WCAG 1.4.3 e 1.4.11).
const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8")

function blocks(): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>()
  for (const [, selector, body] of css.matchAll(/(:root[^{]*)\{([^}]*)\}/g)) {
    const vars: Record<string, string> = {}
    for (const [, name, value] of body!.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\b/g)) vars[name!] = value!
    map.set(selector!.trim(), { ...(map.get(selector!.trim()) ?? {}), ...vars })
  }
  return map
}

function luminance(hex: string): number {
  const h = hex.length === 4 ? hex.slice(1).split("").map((c) => c + c).join("") : hex.slice(1)
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

const all = blocks()
const dark = all.get(":root")!
const light = { ...dark, ...all.get(':root[data-theme="light"]') }
const themes: [string, Record<string, string>][] = [
  ["Órbita escuro", dark],
  ["Órbita claro", light],
  ["Floresta escuro", { ...dark, ...all.get(':root[data-palette="floresta"]') }],
  ["Floresta claro", { ...light, ...all.get(':root[data-palette="floresta"][data-theme="light"]') }],
  ["Brasa escuro", { ...dark, ...all.get(':root[data-palette="brasa"]') }],
  ["Brasa claro", { ...light, ...all.get(':root[data-palette="brasa"][data-theme="light"]') }],
]
const surfaces = ["bg", "bg-deep", "panel", "panel-2"]

describe.each(themes)("contraste das cores no tema %s", (_name, t) => {
  it("texto, texto secundário e links passam de 4,5:1 em todas as superfícies", () => {
    for (const fg of ["text", "muted", "faint", "cyan"]) for (const bg of surfaces) expect(contrast(t[fg]!, t[bg]!), `${fg} sobre ${bg}`).toBeGreaterThanOrEqual(4.5)
  })

  it("cores de estado passam de 4,5:1 sobre o painel", () => {
    for (const fg of ["gold", "red", "green"]) expect(contrast(t[fg]!, t.panel!), fg).toBeGreaterThanOrEqual(4.5)
  })

  it("a borda de controles passa de 3:1 em todas as superfícies", () => {
    for (const bg of surfaces) expect(contrast(t["line-strong"]!, t[bg]!), `line-strong sobre ${bg}`).toBeGreaterThanOrEqual(3)
  })

  it("o texto do botão principal passa de 4,5:1 sobre a cor de destaque", () => {
    expect(contrast(t["on-accent"]!, t.cyan!)).toBeGreaterThanOrEqual(4.5)
  })
})
