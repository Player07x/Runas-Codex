import { describe, expect, it } from "vitest"
import { noteToken, parseTokenBar, savedTokenFileName, tokenBarText, tokenFromSaved, tokenProperties } from "./wiki-token"

describe("token da nota da Wiki", () => {
  it("lê imagem, tamanho, disposição e barras", () => {
    const token = noteToken({ token: "![[Anexos/guarda.png]]", token_tamanho: 2, token_disposicao: "friendly", token_barras: ["PV 12/12", "PA 3/5"] })!
    expect(token).toMatchObject({ image: "Anexos/guarda.png", size: 2, disposition: "friendly" })
    expect(token.bars.map(tokenBarText)).toEqual(["PV 12/12", "PA 3/5"])
  })
  it("recusa barra sem formato e faz a ida e volta das propriedades", () => {
    expect(parseTokenBar("sem valor")).toBeNull()
    const token = noteToken({ token: "[[guarda.png]]", token_disposicao: "hostile", token_barras: ["PV 4/8"] })!
    expect(tokenProperties(token)).toMatchObject({ token: "[[guarda.png]]", token_disposicao: "hostile", token_barras: ["PV 4/8"] })
  })
})

describe("token salvo na biblioteca", () => {
  const saved = { size: 2, disposition: "hostile" as const, bars: [{ label: "PV", value: 7, max: 20, color: "#ff0000" }] }

  it("traz tamanho, disposição e barras do token salvo, com a imagem copiada", () => {
    expect(tokenFromSaved(saved, "Anexos/Lobo (token).png", null)).toEqual({ image: "Anexos/Lobo (token).png", size: 2, disposition: "hostile", bars: saved.bars })
  })

  it("sem imagem no token salvo, mantém a imagem que a nota já tinha", () => {
    const current = { image: "Anexos/velho.png", size: 1, disposition: "neutral" as const, bars: [] }
    expect(tokenFromSaved(saved, undefined, current).image).toBe("Anexos/velho.png")
  })

  it("não deixa a barra da ficha presa ao objeto do token salvo", () => {
    const token = tokenFromSaved(saved, undefined, null)
    token.bars[0]!.value = 1
    expect(saved.bars[0]!.value).toBe(7)
  })

  it("dá ao anexo o nome do token e a extensão da imagem guardada", () => {
    expect(savedTokenFileName("Lobo: alfa", "tokens/ab12cd.webp")).toBe("Lobo alfa (token).webp")
    expect(savedTokenFileName("", "tokens/sem-extensao")).toBe("Token (token).png")
  })
})
