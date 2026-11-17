import { markdown } from "@codemirror/lang-markdown"
import { ensureSyntaxTree } from "@codemirror/language"
import { EditorState, type Extension } from "@codemirror/state"
import { GFM } from "@lezer/markdown"
import { obsidianSyntax } from "../../markdown/lezer-obsidian"
import type { PropertiesDisplay } from "../../lib/properties-display"
import { blockField, cursorAfterProperties, frontmatterRange, pointerHeld, pointerHold, propertiesDisplay, propertiesGuard, propertiesBar, propertiesState, renderableBlocks, setProperties } from "./live-preview"

function state(doc: string) {
  const s = EditorState.create({ doc, extensions: [markdown({ extensions: [GFM, obsidianSyntax] })] })
  expect(ensureSyntaxTree(s, s.doc.length, 5000)).not.toBeNull()
  // ensureSyntaxTree avança o contexto; a transação publica a árvore completa no estado imutável.
  return s.update({}).state
}

/** Estado com a árvore de sintaxe completa e as extensões pedidas. */
function parsed(doc: string, anchor: number, extensions: Extension[]) {
  const s = EditorState.create({ doc, selection: { anchor }, extensions: [markdown({ extensions: [GFM, obsidianSyntax] }), ...extensions] })
  expect(ensureSyntaxTree(s, s.doc.length, 5000)).not.toBeNull()
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

  it("com o botão do mouse apertado, o cursor não abre nem fecha blocos até o botão subir (U16)", () => {
    const doc = "# Caderno\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n- Uma ponte\n- Um mercador\n"
    let s = parsed(doc, doc.length, [pointerHeld, blockField])
    const card = (st: EditorState) => st.field(blockField).size
    expect(card(s)).toBe(1)
    s = s.update({ effects: pointerHold.of(true) }).state
    s = s.update({ selection: { anchor: 14 }, userEvent: "select.pointer" }).state
    // O cursor entrou na tabela, mas ela continua desenhada enquanto o botão está apertado.
    expect(card(s)).toBe(1)
    s = s.update({ effects: pointerHold.of(false) }).state
    expect(card(s)).toBe(0)
    // Pelo teclado, o desenho acompanha na hora, mesmo com o botão apertado.
    s = s.update({ effects: pointerHold.of(true) }).state
    s = s.update({ selection: { anchor: doc.length }, userEvent: "select" }).state
    expect(card(s)).toBe(1)
  })
})

describe("propriedades recolhidas (U77)", () => {
  const doc = "---\ntags: [ideias]\nlocal: Porto\n---\n# Caderno\n\nUma ponte\n"
  const body = doc.indexOf("# Caderno")
  const make = (display: PropertiesDisplay = "recolhidas", anchor = body) => parsed(doc, anchor, [propertiesDisplay.of(display), propertiesState, propertiesGuard, pointerHeld, blockField])
  const barState = (st: EditorState) => { const bar = propertiesBar(st); return bar ? { open: bar.open } : null }

  it("começa como uma barra fechada; “Abertas” mostra a tabela; “Escondidas” não desenha nada", () => {
    expect(barState(make())).toEqual({ open: false })
    expect(barState(make("abertas"))).toEqual({ open: true })
    expect(barState(make("escondidas"))).toBeNull()
  })

  it("abrir a barra não põe o cursor no YAML", () => {
    const s = make().update({ effects: setProperties.of({ open: true }) }).state
    expect(barState(s)).toEqual({ open: true })
    expect(s.selection.main.head).toBe(body)
  })

  it("o cursor que cairia dentro das propriedades vai para depois delas", () => {
    let s = make()
    s = s.update({ selection: { anchor: 0 }, userEvent: "select" }).state
    expect(s.selection.main.head).toBe(body)
    s = s.update({ selection: { anchor: 8 }, userEvent: "select.pointer" }).state
    expect(s.selection.main.head).toBe(body)
    expect(barState(s)).toEqual({ open: false })
  })

  it("Backspace no começo do corpo e colar dentro do frontmatter não estragam a nota", () => {
    let s = make()
    s = s.update({ changes: { from: body - 1, to: body }, userEvent: "delete.backward" }).state
    expect(s.doc.toString()).toBe(doc)
    s = s.update({ changes: { from: 5, insert: "x" }, userEvent: "input.paste" }).state
    expect(s.doc.toString()).toBe(doc)
    // Digitar no corpo continua normal; apagar a nota inteira (Ctrl A) também.
    s = s.update({ changes: { from: body, insert: "Oi " }, userEvent: "input.type" }).state
    expect(s.doc.toString()).toBe(doc.slice(0, body) + "Oi " + doc.slice(body))
    s = s.update({ changes: { from: 0, to: s.doc.length }, userEvent: "delete.selection" }).state
    expect(s.doc.toString()).toBe("")
  })

  it("o cursor que começa antes das propriedades escondidas vai para depois delas, menos ao editar o YAML", () => {
    expect(cursorAfterProperties(make("recolhidas", 0))).toBe(body)
    expect(cursorAfterProperties(make("recolhidas", body))).toBeNull()
    expect(cursorAfterProperties(make("recolhidas", 0).update({ effects: setProperties.of({ editing: true }) }).state)).toBeNull()
    expect(cursorAfterProperties(parsed("# Sem propriedades\n", 0, [propertiesState, propertiesGuard]))).toBeNull()
  })

  it("o que se digita ou cola com o cursor antes do cartão vai para o começo do corpo, sem tocar no YAML", () => {
    let s = make()
    s = s.update({ changes: { from: 0, insert: "Oi " }, userEvent: "input.type" }).state
    expect(s.doc.toString()).toBe(doc.slice(0, body) + "Oi " + doc.slice(body))
    expect(s.selection.main.head).toBe(body + 3)
    s = s.update({ changes: { from: 0, insert: "x" }, userEvent: "input.paste" }).state
    expect(s.doc.toString()).toBe(doc.slice(0, body) + "xOi " + doc.slice(body))
    // Nota só com propriedades: o texto começa numa linha nova depois delas.
    const only = "---\ntags: [a]\n---"
    let t = parsed(only, 0, [propertiesState, propertiesGuard])
    t = t.update({ changes: { from: 0, insert: "Texto" }, userEvent: "input.type" }).state
    expect(t.doc.toString()).toBe(only + "\nTexto")
  })

  it("“Editar como texto” mostra o YAML e volta ao cartão quando o cursor sai", () => {
    let s = make()
    s = s.update({ effects: setProperties.of({ editing: true }), selection: { anchor: 17 } }).state
    expect(barState(s)).toBeNull()
    s = s.update({ changes: { from: 17, insert: ", mapa" }, userEvent: "input.type" }).state
    expect(s.doc.toString()).toContain("tags: [ideias, mapa]")
    s = s.update({ selection: { anchor: s.doc.length }, userEvent: "select" }).state
    expect(barState(s)).toEqual({ open: false })
  })
})
