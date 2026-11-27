import { readFileSync } from "node:fs"
import { androidStatusIcon, faviconSvg, LOGO_VIEWBOX, logoShape, logoSvg } from "./logo"

const numbers = (path: string) => [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]))

describe("logo em recorte", () => {
  it("vaza a rachadura só na versão normal", () => {
    expect(logoShape().crack).toHaveLength(3)
    expect(logoShape(true).crack).toEqual([])
    expect(logoSvg()).toContain('mask="url(#rachadura)"')
    expect(logoSvg({ small: true })).not.toContain("mask")
  })

  it("desenha a pedra, o furo da runa e o miolo do bojo como contornos fechados", () => {
    for (const small of [false, true]) {
      const { path } = logoShape(small)
      expect(path.match(/M/g)).toHaveLength(3)
      expect(path.match(/Z/g)).toHaveLength(3)
      for (const value of numbers(path.replace(/A[\d. ]+0 0 1/g, "A"))) expect(value).toBeGreaterThanOrEqual(0)
      for (const value of numbers(path)) expect(value).toBeLessThanOrEqual(LOGO_VIEWBOX)
    }
  })

  it("engrossa a runa na versão pequena", () => {
    const radius = (path: string) => Number(path.match(/A(\d+(?:\.\d+)?)/)?.[1])
    expect(radius(logoShape(true).path)).toBeGreaterThan(radius(logoShape().path))
  })

  it("põe o fundo pedido atrás da pedra", () => {
    expect(logoSvg({ background: { color: "#11131a", shape: "circle" } })).toContain('<circle cx="256" cy="256" r="256" fill="#11131a"/>')
    expect(logoSvg({ background: { color: "#11131a", shape: "rounded", inset: 24 } })).toMatch(/<rect x="24" y="24" width="464" height="464" rx="[\d.]+" fill="#11131a"\/>/)
    expect(logoSvg({ background: { color: "#11131a", shape: "full" } })).toContain('<rect x="0" y="0" width="512" height="512" fill="#11131a"/>')
  })

  it("mantém o favicon e o ícone de notificação do Android iguais à geometria (gerados por gerar-icones)", () => {
    const file = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
    expect(file("../../public/favicon.svg")).toBe(faviconSvg())
    expect(file("../../../mobile/android/app/src/main/res/drawable/ic_stat_runa.xml")).toBe(androidStatusIcon())
  })
})
