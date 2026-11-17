import { describe, expect, it } from "vitest"
import { placeSelectionBar } from "./floating-place"

const viewport = { width: 1366, height: 800 }
// Coluna do texto do Livros entre o Sumário (até 432 px) e o Apoio (a partir de 1252 px).
const text = { top: 178, bottom: 760, left: 432, right: 1252 }
const bar = { width: 677, height: 44 }
const sel = (left: number, top = 400, width = 60) => ({ top, bottom: top + 20, left, right: left + width })

describe("posição da barra da seleção", () => {
  it("fica centrada acima do trecho selecionado", () => {
    expect(placeSelectionBar(sel(812), bar, text, viewport)).toEqual({ top: 348, left: 504, shown: true })
  })

  it("não passa para baixo do Sumário quando o trecho está no começo da linha", () => {
    // Antes: a barra começava em 293 px, embaixo da lista de capítulos.
    expect(placeSelectionBar(sel(450), bar, text, viewport).left).toBe(440)
  })

  it("não entra no painel da direita quando o trecho está no fim da linha", () => {
    expect(placeSelectionBar(sel(1180), bar, text, viewport).left).toBe(1252 - 8 - 677)
  })

  it("vai para baixo do trecho quando não cabe acima, sem cobrir a barra da tela", () => {
    expect(placeSelectionBar(sel(812, 190), bar, text, viewport).top).toBe(218)
  })

  it("seleção maior que a parte visível: a barra fica no alto do texto", () => {
    expect(placeSelectionBar({ top: 100, bottom: 900, left: 450, right: 1200 }, bar, text, viewport).top).toBe(186)
  })

  it("some quando o trecho rolou para fora da vista", () => {
    expect(placeSelectionBar(sel(812, 40), bar, text, viewport).shown).toBe(false)
    expect(placeSelectionBar(sel(812, 780), bar, text, viewport).shown).toBe(false)
  })

  it("mais larga que o texto, usa a largura da janela", () => {
    const narrow = { top: 178, bottom: 760, left: 300, right: 700 }
    expect(placeSelectionBar(sel(300), bar, narrow, { width: 900, height: 800 }).left).toBe(8)
    expect(placeSelectionBar(sel(680), bar, narrow, { width: 900, height: 800 }).left).toBe(900 - 8 - 677)
  })
})
