import { describe, expect, it } from "vitest"
import { VaultIndex } from "../vault-index"
import { expandTransferItems, listTransferItems, missingFromPackage, transferStats, type TransferItem } from "./items"

// Cofre pequeno com os casos do plano: anexo fora da wiki, capítulo fora do livro, mesa com capa, anexo compartilhado.
const texts: Record<string, string> = {
  "Wikis/Cronos/Cronos.md": "# Cronos\n\n![[Mapa.png]]\n[[Aldeia]] e [[Valknut]]\n",
  "Wikis/Cronos/Lugares/Aldeia.md": "# Aldeia\n\n![[Brasão.png]]\n",
  "Wikis/Valknut/Valknut.md": "# Valknut\n\n![[Brasão.png]]\n",
  "Livros/Guia/Guia.md": '---\ntipo: livro\ncapa: "[[Capa.png]]"\nestrutura:\n  - "[[Prólogo]]"\n  - "[[Capítulo solto]]"\n---\n# Guia\n',
  "Livros/Guia/Prólogo.md": "# Prólogo\n",
  "Notas/Capítulo solto.md": "# Capítulo solto\n",
  "Notas/Ideias.md": "# Ideias\n",
  "Campanhas/Porto/Porto.md": "---\nmesa: porto-1234\n---\n# Porto\n",
  "Campanhas/Porto/Sessão 1.md": "# Sessão 1\n",
  "Agenda/2026-11-20 Sessão.md": "# Sessão\n\n[[Campanhas/Porto/Sessão 1]]\n",
  "Wikis/Solta.md": "# Nota solta em Wikis\n",
  "LEIA-ME.md": "# Leia\n",
}
const binaries = ["Anexos/Imagens/Mapa.png", "Anexos/Imagens/Brasão.png", "Anexos/Capa.png", "Anexos/Galeria/Pintura.kra", "Anexos/Mesa capa.png"]
const managed = [".runas/mesas/porto-1234/mesa.json", ".runas/mesas/porto-1234/cenas/1.json", ".runas/mesas/biblioteca/token.json"]
const entries = [...Object.keys(texts), ...binaries, ...managed].map((path, i) => ({ path, mtime: 1, size: 100 + i }))
const index = new VaultIndex(entries.filter(entry => !entry.path.startsWith(".runas/")), texts)
const worlds = [{ root: ".runas/mesas/porto-1234", id: "porto-1234", title: "Porto Sombrio", cover: "Anexos/Mesa capa.png" }]
const worldRoots = new Map([["porto-1234", ".runas/mesas/porto-1234"]])
const items = listTransferItems(index, entries, worlds)
const item = (id: string) => items.find(candidate => candidate.id === id)!
const expand = (chosen: TransferItem[], linked = false) => expandTransferItems(index, entries, chosen, linked, worldRoots)

describe("exportar por itens (U52)", () => {
  it("lista wikis, livros, mesas, biblioteca, campanhas, agenda, pastas e o que sobra", () => {
    expect(items.map(candidate => candidate.id)).toEqual([
      "wiki:Cronos", "wiki:Valknut", "livro:Livros/Guia/Guia.md", "mesa:.runas/mesas/porto-1234", "biblioteca",
      "campanha:Porto", "agenda", "pasta:Anexos", "pasta:Notas", "outros:", "outros:Wikis",
    ])
    expect(item("mesa:.runas/mesas/porto-1234").name).toBe("Porto Sombrio")
    expect(item("outros:").name).toBe("Arquivos na raiz do cofre")
  })

  it("todo arquivo do cofre está em algum item", () => {
    const all = expand(items)
    for (const entry of entries) expect(all).toContain(entry.path)
  })

  it("a wiki leva a pasta inteira e as imagens que usa, onde estiverem, sem puxar a outra wiki", () => {
    expect(expand([item("wiki:Cronos")])).toEqual(["Anexos/Imagens/Brasão.png", "Anexos/Imagens/Mapa.png", "Wikis/Cronos/Cronos.md", "Wikis/Cronos/Lugares/Aldeia.md"])
    expect(expand([item("wiki:Cronos")], true)).toContain("Wikis/Valknut/Valknut.md")
  })

  it("o livro leva a pasta, o capítulo de fora da pasta e a capa", () => {
    expect(expand([item("livro:Livros/Guia/Guia.md")])).toEqual(["Anexos/Capa.png", "Livros/Guia/Guia.md", "Livros/Guia/Prólogo.md", "Notas/Capítulo solto.md"])
  })

  it("a mesa leva a pasta dela e a capa, sem a campanha; a biblioteca é um item à parte", () => {
    expect(expand([item("mesa:.runas/mesas/porto-1234")])).toEqual([".runas/mesas/porto-1234/cenas/1.json", ".runas/mesas/porto-1234/mesa.json", "Anexos/Mesa capa.png"])
    expect(expand([item("biblioteca")])).toEqual([".runas/mesas/biblioteca/token.json"])
  })

  it("a campanha leva os eventos da Agenda que apontam para ela e a mesa ligada", () => {
    const paths = expand([item("campanha:Porto")])
    expect(paths).toContain("Agenda/2026-11-20 Sessão.md")
    expect(paths).toContain(".runas/mesas/porto-1234/mesa.json")
    expect(paths).not.toContain("Notas/Ideias.md")
  })

  it("um anexo usado por duas wikis entra uma vez", () => {
    const paths = expand([item("wiki:Cronos"), item("wiki:Valknut")])
    expect(paths.filter(path => path.endsWith("Brasão.png"))).toEqual(["Anexos/Imagens/Brasão.png"])
  })

  it("conta notas, anexos e tamanho e confere se toda nota escolhida está no pacote", () => {
    const paths = expand([item("wiki:Cronos")])
    const stats = transferStats(entries, paths)
    expect(stats).toMatchObject({ notes: 2, attachments: 2 })
    expect(stats.size).toBe(entries.filter(entry => paths.includes(entry.path)).reduce((total, entry) => total + entry.size, 0))
    expect(missingFromPackage(paths, paths)).toEqual([])
    expect(missingFromPackage(paths, paths.filter(path => !path.endsWith("Aldeia.md")))).toEqual(["Wikis/Cronos/Lugares/Aldeia.md"])
  })

  it("sem itens marcados, nada sai", () => {
    expect(expand([])).toEqual([])
  })
})
