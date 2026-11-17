import { folderContents, folderContentsLabel } from "./folder-contents"

const folder = (notes: number, folders: string[]) => ({ notes: Array.from({ length: notes }, (_, i) => i), folders: new Map(folders.map(name => [name, {}])) })

describe("conteúdo imediato das pastas", () => {
  it("conta subpastas mesmo quando a pasta não tem notas próprias", () => {
    expect(folderContents(folder(0, ["Norte", "Sul"]))).toEqual({ notes: 0, folders: 2, total: 2 })
  })

  it("soma as notas e as subpastas que a árvore mostra, sem somar os descendentes", () => {
    expect(folderContents(folder(8, ["Arquivo", "Ideias", "Projetos"]))).toEqual({ notes: 8, folders: 3, total: 11 })
  })

  it("descreve a bolinha com os mesmos números, no singular e no plural", () => {
    expect(folderContentsLabel(folderContents(folder(1, [])))).toBe("1 item diretamente nesta pasta: 0 pastas e 1 nota")
    expect(folderContentsLabel(folderContents(folder(2, ["A"])))).toBe("3 itens diretamente nesta pasta: 1 pasta e 2 notas")
  })
})
