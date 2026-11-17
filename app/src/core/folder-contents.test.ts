import { folderContents } from "./folder-contents"

describe("conteúdo imediato das pastas", () => {
  it("conta subpastas mesmo quando a pasta não tem notas próprias", () => {
    const counts = folderContents(["Campanhas/Norte/Sessões/Uma.md", "Campanhas/Sul/Sessões/Duas.md"])
    expect(counts.get("Campanhas")).toEqual({ files: 0, folders: 2, total: 2 })
    expect(counts.get("Campanhas/Norte")).toEqual({ files: 0, folders: 1, total: 1 })
    expect(counts.get("Campanhas/Norte/Sessões")).toEqual({ files: 1, folders: 0, total: 1 })
  })

  it("soma arquivos de qualquer tipo e cada subpasta uma vez, sem somar os descendentes", () => {
    const counts = folderContents(["Notas/Caderno.md", "Notas/mapa.png", "Notas/pacote.zip", "Notas/Sub/A.md", "Notas/Sub/B.md", "Notas/Sub/A.md"])
    expect(counts.get("Notas")).toEqual({ files: 3, folders: 1, total: 4 })
    expect(counts.get("Notas/Sub")).toEqual({ files: 2, folders: 0, total: 2 })
    expect(counts.get("")).toEqual({ files: 0, folders: 1, total: 1 })
  })

  it("inclui pastas vazias e não mistura pastas com o mesmo nome em lugares diferentes", () => {
    const counts = folderContents(["A/Itens/Uma.md", "B/Itens/Duas.md"], ["A/Vazia", "A/Vazia/", "B/Itens"])
    expect(counts.get("A")).toEqual({ files: 0, folders: 2, total: 2 })
    expect(counts.get("B")).toEqual({ files: 0, folders: 1, total: 1 })
    expect(counts.get("A/Vazia")).toEqual({ files: 0, folders: 0, total: 0 })
  })

  it("não inclui dados ocultos que ficam fora da árvore de notas", () => {
    const counts = folderContents([".runas/mesas/a.json", "Notas/.cache/Um.md", "Notas/Uma.md"], [".trash", "Notas/.oculta"])
    expect(counts.get("")).toEqual({ files: 0, folders: 1, total: 1 })
    expect(counts.get("Notas")).toEqual({ files: 1, folders: 0, total: 1 })
  })
})
