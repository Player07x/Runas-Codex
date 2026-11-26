import { describe, expect, it } from "vitest"
import { applyAutoLinks, autoLinkNames, findAutoLinks } from "./auto-links"
import { VaultIndex } from "./vault-index"

const texts: Record<string, string> = {
  "Wiki/Albio.md": "---\naliases: [Plano da Luz, Al]\n---\nO plano das estrelas.\n",
  "Wiki/Ordem Valknut.md": "A ordem.\n",
  "Wiki/Ordem.md": "O conceito.\n",
  "Wiki/Mapa.png": "",
  // Bitu só foi citado: a nota ainda não existe.
  "Wiki/Dubno.md": "---\naliases: [o Abismo]\n---\nVizinho de [[Bitu]].\n",
}
const index = new VaultIndex(Object.keys(texts).map((path) => ({ path, size: 1, mtime: 1 })), texts)

const NOTE = "Wiki/Dubno.md"
const found = (text: string) => findAutoLinks(index, NOTE, text).map((link) => `${link.text}→${link.linkTarget}${link.dest ? "" : " (a escrever)"}${link.repeated ? " (repetido)" : ""}`)

describe("links automáticos", () => {
  it("junta nomes de notas, apelidos e notas citadas que ainda não existem, sem a própria nota", () => {
    const names = autoLinkNames(index, NOTE)
    expect([...names.keys()].sort()).toEqual(["albio", "bitu", "ordem", "ordem valknut", "plano da luz"])
    expect(names.get("plano da luz")).toEqual({ linkTarget: "Albio", dest: "Wiki/Albio.md", viaAlias: true })
    expect(names.get("bitu")).toEqual({ linkTarget: "Bitu", dest: null, viaAlias: false })
  })

  it("acha o nome inteiro, o maior primeiro, e marca o que já tem link ou se repete", () => {
    const text = "A Ordem Valknut guarda Albio. Do plano da luz se vê Bitu e de novo albio; a Ordem fica.\n"
    expect(found(text)).toEqual(["Ordem Valknut→Ordem Valknut", "Albio→Albio", "plano da luz→Albio (repetido)", "Bitu→Bitu (a escrever)", "albio→Albio (repetido)", "Ordem→Ordem"])
    expect(found("[[Bitu]] e Bitu; Albiondo não conta.\n")).toEqual(["Bitu→Bitu (a escrever) (repetido)"])
  })

  it("não mexe em frontmatter, títulos, código, links, endereços nem tags", () => {
    const text = "---\nlocal: Albio\n---\n## Albio\n`Albio` e [[Ordem]] e [Albio](Wiki/Albio.md)\nhttps://ex.com/Albio #Albio\n%%Albio%%\n"
    expect(found(text)).toEqual([])
  })

  it("grava o link que o Obsidian segue: o apelido vai depois da barra, escapada numa tabela", () => {
    const text = "Do plano da luz a Albio.\n| Lugar |\n| --- |\n| plano da luz |\n"
    const links = findAutoLinks(index, NOTE, text)
    expect(applyAutoLinks(text, links)).toEqual({ text: "Do [[Albio|plano da luz]] a [[Albio]].\n| Lugar |\n| --- |\n| [[Albio\\|plano da luz]] |\n", count: 3 })
  })

  it("pula o trecho que mudou depois da busca", () => {
    const links = findAutoLinks(index, NOTE, "Albio e Bitu.\n")
    expect(applyAutoLinks("Albio e Bito.\n", links)).toEqual({ text: "[[Albio]] e Bito.\n", count: 1 })
  })
})
