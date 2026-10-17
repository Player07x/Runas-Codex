import { markdown } from "@codemirror/lang-markdown"
import { ensureSyntaxTree } from "@codemirror/language"
import { EditorState } from "@codemirror/state"
import { GFM } from "@lezer/markdown"
import { obsidianSyntax } from "../../markdown/lezer-obsidian"
import { frontmatterRange, renderableBlocks } from "./live-preview"

function state(doc: string) {
  const s = EditorState.create({ doc, extensions: [markdown({ extensions: [GFM, obsidianSyntax] })] })
  expect(ensureSyntaxTree(s, s.doc.length, 5000)).not.toBeNull()
  // ensureSyntaxTree avança o contexto; a transação publica a árvore completa no estado imutável.
  return s.update({}).state
}

describe("live preview", () => {
  it("acha os blocos que viram versão desenhada", () => {
    const doc = [
      "# Título",
      "",
      "| a | b |",
      "|---|---|",
      "| 1 | 2 |",
      "",
      "> [!nota] Callout",
      "> corpo",
      "",
      "> citação comum",
      "",
      "```mermaid",
      "graph LR",
      "```",
      "",
      "```ts",
      "const x = 1",
      "```",
      "",
      "$$",
      "x^2",
      "$$",
      "",
      "![[mapa.png|300]]",
      "",
      "texto com ![[mapa.png]] no meio",
      "",
      '<div class="quebra-pagina"></div>',
    ].join("\n")
    const blocks = renderableBlocks(state(doc)).map((b) => b.source.split("\n")[0])
    expect(blocks).toEqual(["| a | b |", "> [!nota] Callout", "```mermaid", "$$", "![[mapa.png|300]]", '<div class="quebra-pagina"></div>'])
  })

  it("o sumário é desenhado com os títulos da nota inteira", () => {
    const blocks = renderableBlocks(state("# Um\n\n```table-of-contents\n```"))
    expect(blocks).toMatchObject([{ kind: "toc" }])
  })

  it("frontmatter vira o bloco de propriedades e não é lido como título", () => {
    const s = state("---\ntags: [a]\n---\n# Corpo\n")
    expect(frontmatterRange(s)).toEqual({ from: 0, to: 17 })
    expect(renderableBlocks(s)).toEqual([])
    expect(frontmatterRange(state("# Sem\n"))).toBeNull()
  })

  it("o parser reconhece wikilinks, embeds, destaques, tags e comentários", () => {
    const s = state("[[Nota|apelido]] ![[img.png]] ==sim== #tag/x %%oculto%% #1492")
    const names: string[] = []
    ensureSyntaxTree(s, s.doc.length, 5000)!.iterate({ enter: (n) => void names.push(n.name) })
    expect(names).toEqual(expect.arrayContaining(["WikiLink", "Embed", "Highlight", "HashTag", "ObsidianComment"]))
    expect(names.filter((n) => n === "HashTag")).toHaveLength(1)
  })
})
