import { previewText, splitLinkTarget } from "./link-preview"

const NOTE = `---
tipo: npc
---
# Aldren

Caçador da Ordem.

## Passado

Nasceu em Myrr. ^origem

### Juventude

Fugiu da erupção.

## Hoje

Vive na Cidade Alta.
`

describe("prévia de link", () => {
  it("separa o alvo do título ou bloco", () => {
    expect(splitLinkTarget("Aldren")).toEqual({ target: "Aldren" })
    expect(splitLinkTarget("Aldren#Passado#Juventude")).toEqual({ target: "Aldren", subpath: "#Passado#Juventude" })
    expect(splitLinkTarget("Aldren#^origem")).toEqual({ target: "Aldren", subpath: "#^origem" })
    expect(splitLinkTarget("#Hoje")).toEqual({ target: "", subpath: "#Hoje" })
  })

  it("mostra a nota sem o frontmatter", () => {
    const preview = previewText(NOTE)
    expect(preview.markdown.startsWith("# Aldren")).toBe(true)
    expect(preview.markdown).not.toContain("tipo: npc")
    expect(preview.missingSection).toBe(false)
  })

  it("mostra só o título ou o bloco do link", () => {
    expect(previewText(NOTE, "#Hoje").markdown).toBe("## Hoje\n\nVive na Cidade Alta.")
    expect(previewText(NOTE, "#Passado#Juventude").markdown).toBe("### Juventude\n\nFugiu da erupção.")
    expect(previewText(NOTE, "#^origem").markdown).toBe("Nasceu em Myrr.")
  })

  it("título que não existe: a nota inteira, com aviso", () => {
    const preview = previewText(NOTE, "#Futuro")
    expect(preview.missingSection).toBe(true)
    expect(preview.markdown.startsWith("# Aldren")).toBe(true)
  })

  it("corta notas grandes no fim de um parágrafo", () => {
    const big = Array.from({ length: 200 }, (_, i) => `Parágrafo ${i} com algum texto para encher.`).join("\n\n")
    const preview = previewText(big, undefined, 1000)
    expect(preview.truncated).toBe(true)
    expect(preview.markdown.length).toBeLessThanOrEqual(1000)
    expect(preview.markdown.endsWith("encher.")).toBe(true)
  })
})
