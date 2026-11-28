import { describe, expect, it } from "vitest"
import { linkedTokenMessage, linkTokenToNote, undoTokenChange, noteToken, parseTokenBar, savedTokenFileName, tokenBarText, tokenFromSaved, tokenProperties } from "./wiki-token"

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

describe("ligar o token a uma nota (U94)", () => {
  const fresh = { name: "Token", x: 10, y: 20, size: 1, image: null, rotation: 0, mirror: false, hidden: false, locked: false, disposition: "hostile" as const, elevation: 0, bars: [], showName: true, vision: { enabled: true, range: 0, ignoreDarkness: false }, light: { bright: 0, dim: 0, color: "#ffb45a" } }
  const guarda = { name: "Guarda", image: "tokens/guarda.png", size: 2, disposition: "friendly" as const, bars: [{ label: "PV", value: 12, max: 12, color: "#ff0000" }] }

  it("preenche tudo num token novo", () => {
    const { data, filled } = linkTokenToNote(fresh, "Wikis/Guarda.md", guarda)
    expect(data).toMatchObject({ name: "Guarda", notePath: "Wikis/Guarda.md", image: "tokens/guarda.png", size: 2, disposition: "friendly", x: 10, y: 20 })
    expect(data.bars).toEqual(guarda.bars)
    expect(filled).toEqual(["nome", "imagem", "tamanho", "disposição", "barras"])
    expect(linkedTokenMessage("Guarda", filled)).toBe("Token ligado a Guarda. Da nota: nome, imagem, tamanho, disposição e barras.")
  })

  it("não apaga o que o mestre já escolheu: nome, retrato, tamanho, disposição e barras", () => {
    const chosen = { ...fresh, name: "Sentinela do portão", image: "tokens/meu.png", size: 3, disposition: "secret" as const, bars: [{ label: "Vida", value: 4, max: 9, color: "#00ff00" }] }
    const { data, filled } = linkTokenToNote(chosen, "Wikis/Guarda.md", guarda)
    expect(data).toEqual({ ...chosen, notePath: "Wikis/Guarda.md" })
    expect(filled).toEqual([])
    expect(linkedTokenMessage("Guarda", filled)).toBe("Token ligado a Guarda. Nada mudou nele: o que você escolheu fica.")
  })

  it("nota sem retrato nem barras não tira a imagem nem a barra do token", () => {
    const withBar = { ...fresh, image: "tokens/meu.png", bars: [{ label: "PV", value: 3, max: 8, color: "#ff0000" }] }
    const { data } = linkTokenToNote(withBar, "Wikis/Lugar.md", { name: "Lugar", image: null, size: 1, disposition: "neutral", bars: [] })
    expect(data.image).toBe("tokens/meu.png")
    expect(data.bars).toEqual(withBar.bars)
    expect(data.disposition).toBe("hostile")
  })

  it("ao trocar a nota, troca o que ainda era da nota anterior e mantém o que o mestre mudou", () => {
    const linked = { ...fresh, name: "Guarda", notePath: "Wikis/Guarda.md", image: "tokens/guarda.png", size: 2, disposition: "friendly" as const, bars: [{ label: "PV", value: 5, max: 12, color: "#ff0000" }], elevation: 3 }
    const lobo = { name: "Lobo", image: "tokens/lobo.png", size: 1, disposition: "hostile" as const, bars: [{ label: "PV", value: 8, max: 8, color: "#ff0000" }] }
    const { data, filled } = linkTokenToNote({ ...linked, size: 4 }, "Wikis/Lobo.md", lobo, guarda)
    expect(data).toMatchObject({ name: "Lobo", image: "tokens/lobo.png", size: 4, disposition: "hostile", elevation: 3, notePath: "Wikis/Lobo.md" })
    expect(data.bars).toEqual(lobo.bars)
    expect(filled).toEqual(["nome", "imagem", "disposição", "barras"])
  })
})

describe("desfazer a ligação do token (U94)", () => {
  const before = { name: "Token", x: 10, y: 20, size: 1, image: null, rotation: 0, mirror: false, hidden: false, locked: false, disposition: "hostile" as const, elevation: 0, bars: [], showName: true, vision: { enabled: true, range: 0, ignoreDarkness: false }, light: { bright: 0, dim: 0, color: "#ffb45a" } }
  const after = { ...before, name: "Guarda", notePath: "Wikis/Guarda.md", size: 2, bars: [{ label: "PV", value: 12, max: 12, color: "#ff0000" }] }

  it("volta o que a nota trouxe", () => {
    expect(undoTokenChange(after, before, after)).toEqual(before)
  })

  it("mantém o que mudou depois: posição, PV e nome trocado à mão", () => {
    const moved = { ...after, x: 99, name: "Capitão", bars: [{ ...after.bars[0]!, value: 3 }] }
    expect(undoTokenChange(moved, before, after)).toEqual({ ...before, x: 99, name: "Capitão", bars: moved.bars })
  })

  it("não faz nada quando tudo o que a ação mudou já foi mexido", () => {
    expect(undoTokenChange({ ...after, name: "Outro", notePath: "Wikis/Outro.md", size: 3, bars: [] }, before, after)).toBeNull()
  })
})
