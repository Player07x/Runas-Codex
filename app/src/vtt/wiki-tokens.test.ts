import { describe, expect, it } from "vitest"
import { VaultIndex } from "../core/vault-index"
import { listWikiTokens, wikiTokenSource } from "./wiki-tokens"

describe("tokens da wiki para a mesa", () => {
  it("lê a imagem pelo caminho no cofre, não pelo texto do link", () => {
    const texts: Record<string, string> = {
      "Wikis/Mundo/Personagens/Guarda.md": "---\ntipo: personagem\ntoken: \"[[guarda.png]]\"\ntoken_barras: [\"PV 12/12\"]\n---\n# Guarda",
      "Wikis/Mundo/Personagens/Ana.md": "---\ntipo: personagem\nretrato: \"[[ana.webp]]\"\n---\n# Ana",
      "Wikis/Mundo/Personagens/Sem.md": "---\ntipo: personagem\n---\n# Sem imagem",
    }
    const files = [...Object.keys(texts), "Anexos/Tokens/guarda.png", "Wikis/Mundo/Imagens/ana.webp"]
    const index = new VaultIndex(files.map((path) => ({ path, size: 1, mtime: 1 })), texts)
    const tokens = listWikiTokens(index, "Wikis/")
    expect(Object.fromEntries(tokens.map((t) => [t.name, t.image]))).toEqual({ Ana: "Wikis/Mundo/Imagens/ana.webp", Guarda: "Anexos/Tokens/guarda.png" })
    expect(tokens.find((t) => t.name === "Guarda")?.token.bars).toEqual([expect.objectContaining({ label: "PV", value: 12, max: 12 })])
  })

  it("acha a fonte de uma nota só, para arrastar e trocar a nota do token", () => {
    const texts: Record<string, string> = {
      "Wikis/Mundo/Personagens/Guarda.md": "---\ntipo: personagem\ntoken: \"[[guarda.png]]\"\ntoken_tamanho: 2\n---\n# Guarda",
      "Wikis/Mundo/Personagens/Sem.md": "---\ntipo: personagem\n---\n# Sem imagem",
    }
    const index = new VaultIndex([...Object.keys(texts), "Anexos/guarda.png"].map((path) => ({ path, size: 1, mtime: 1 })), texts)
    expect(wikiTokenSource(index, "Wikis/Mundo/Personagens/Guarda.md")).toEqual(expect.objectContaining({ image: "Anexos/guarda.png", token: expect.objectContaining({ size: 2 }) }))
    expect(wikiTokenSource(index, "Wikis/Mundo/Personagens/Sem.md")).toBeNull()
    expect(wikiTokenSource(index, "Wikis/Mundo/Personagens/Sumiu.md")).toBeNull()
  })

  it("não oferece a imagem de um mapa como token", () => {
    const texts: Record<string, string> = { "Wikis/Mundo/Mapas/Condado.md": "---\ntipo: mapa\nimagem: \"[[condado.png]]\"\n---\n# Condado" }
    const index = new VaultIndex([...Object.keys(texts), "Anexos/condado.png"].map((path) => ({ path, size: 1, mtime: 1 })), texts)
    expect(listWikiTokens(index, "Wikis/")).toEqual([])
  })
})
