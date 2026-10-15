import { describe, expect, it } from "vitest"
import { addSnapshot, compareTexts, extractText, mergeCanvasLinks, mergeLinks, mergeText, textStats } from "./note-tools"
import { VaultIndex } from "./vault-index"
describe("ferramentas de notas", () => {
  it("extrai só o trecho escolhido e deixa um link no lugar, com CRLF", () => {
    expect(extractText("Um\r\nTexto\r\nFim", 4, 9, "[[Trecho]]")).toEqual({ extracted: "Texto", text: "Um\r\n[[Trecho]]\r\nFim", cursor: 14 })
    expect(() => extractText("---\na: 1\n---\nTexto", 4, 8, "[[X]]")).toThrow(/frontmatter/)
  })
  it("mescla preservando as propriedades da origem e as do destino", () => {
    const text = mergeText("---\na: 1\n---\nDestino", "---\na: 2\n---\nOrigem", "Nota")
    expect(text).toContain("a: 1")
    expect(text).toContain("```yaml\na: 2\n```")
    expect(text).toContain("Origem")
  })
  it("mesclar atualiza backlinks e leva imagens relativas para a nova pasta", () => {
    const texts = { "Notas/A/Origem.md": "![mapa](mapa.png)\n[[Origem#Parte|ver]]", "Notas/Destino.md": "[[Origem]]" }
    const index = new VaultIndex([...Object.keys(texts), "Notas/A/mapa.png"].map(path => ({ path, mtime: 1, size: 1 })), texts)
    expect(mergeLinks(texts["Notas/Destino.md"], "Notas/Destino.md", "Notas/A/Origem.md", "Notas/Destino.md", index)).toBe("[[Notas/Destino|Origem]]")
    const moved = mergeLinks(texts["Notas/A/Origem.md"], "Notas/A/Origem.md", "Notas/A/Origem.md", "Notas/Destino.md", index, true)
    expect(moved).toContain("![mapa](/Notas/A/mapa.png)")
    expect(moved).toContain("[[Notas/Destino#Parte|ver]]")
  })
  it("deduplica, agrupa digitação, preserva a primeira versão e limita o histórico", () => {
    let history = addSnapshot([], "zero", 0)
    history = addSnapshot(history, "um", 1000)
    history = addSnapshot(history, "dois", 2000)
    expect(history.map(v => v.text)).toEqual(["zero", "dois"])
    expect(addSnapshot(history, "dois", 3000)).toBe(history)
    for (let n = 0; n < 50; n++) history = addSnapshot(history, String(n), 4000 + n, true)
    expect(history).toHaveLength(40)
  })
  it("conta palavras Unicode e caracteres sem o frontmatter", () => {
    expect(textStats("---\nsegredo: 1\n---\nOlá, João! 😀")).toEqual({ words: 2, characters: 12 })
  })
  it("compara o trecho alterado sem uma matriz quadrática", () => {
    expect(compareTexts("a\nb\nc", "a\nnovo\nc")).toMatchObject({ removed: "b", added: "novo" })
  })
  it("mesclar atualiza cartões de arquivo sem apagar dados extras do quadro", () => {
    const original = JSON.stringify({ custom: true, nodes: [{ id: "a", type: "file", x: 0, y: 0, width: 200, height: 100, file: "Notas/A.md", extra: "preservar" }], edges: [] })
    const result = JSON.parse(mergeCanvasLinks(original, "Notas/A.md", "Notas/B.md"))
    expect(result).toMatchObject({ custom: true, nodes: [{ file: "Notas/B.md", extra: "preservar" }] })
    expect(mergeCanvasLinks(original, "Outra.md", "B.md")).toBe(original)
  })
})
