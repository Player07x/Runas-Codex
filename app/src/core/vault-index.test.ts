import type { VaultEntry } from "../platform/platform"
import { VaultIndex } from "./vault-index"

function vault(files: Record<string, string>): VaultIndex {
  const entries: VaultEntry[] = Object.keys(files).map((path, i) => ({ path, size: files[path]!.length, mtime: 1000 + i }))
  return new VaultIndex(entries, files)
}

const files = {
  "Wikis/Ordem x Caos/Personagens/Aldren.md": "---\naliases: [O Cinzento]\n---\n# Aldren\n\n## Juventude\nNasceu em [[Valdris]]. ^origem\n",
  "Wikis/Ordem x Caos/Valdris.md": "# Valdris\nCondado de [[Aldren|o Cinzento]] e [[Aldren#Juventude]] e [[Aldren#Velhice]]. #local/cidade\n",
  "Wikis/Outro Mundo/Valdris.md": "# Valdris (outro)\n",
  "Campanhas/Cinzas/Sessão 12.md": "- Encontro com [[Wikis/Ordem x Caos/Personagens/Aldren|Aldren]] em [[Lago Espelhado]]. #sessao\n",
  "Notas/Caderno.md": "Ver [[O Cinzento]], [o mapa](../Wikis/Ordem%20x%20Caos/mapa.png) e [[Lago Espelhado]]. #sessao #Rascunho\n",
  "Wikis/Ordem x Caos/mapa.png": "",
}

describe("VaultIndex: resolução", () => {
  const index = vault(files)
  const out = (path: string) => index.outgoing(path).map((r) => [r.link.target, r.dest, r.viaAlias ?? false, r.ambiguous ?? false, r.subpathMissing ?? false])

  it("resolve nome, caminho completo, cabeçalho e apelido", () => {
    expect(out("Wikis/Ordem x Caos/Valdris.md")).toEqual([
      ["Aldren", "Wikis/Ordem x Caos/Personagens/Aldren.md", false, false, false],
      ["Aldren", "Wikis/Ordem x Caos/Personagens/Aldren.md", false, false, false],
      ["Aldren", "Wikis/Ordem x Caos/Personagens/Aldren.md", false, false, true],
    ])
    expect(out("Notas/Caderno.md")).toEqual([
      ["O Cinzento", "Wikis/Ordem x Caos/Personagens/Aldren.md", true, false, false],
      ["../Wikis/Ordem x Caos/mapa.png", "Wikis/Ordem x Caos/mapa.png", false, false, false],
      ["Lago Espelhado", null, false, false, false],
    ])
  })

  it("com nomes repetidos, prefere o mesmo mundo e marca a ambiguidade", () => {
    expect(out("Wikis/Ordem x Caos/Personagens/Aldren.md")).toEqual([["Valdris", "Wikis/Ordem x Caos/Valdris.md", false, true, false]])
  })

  it("aceita caminho parcial e não diferencia maiúsculas", () => {
    const local = vault({ ...files, "Notas/x.md": "[[personagens/aldren]] [[NOTAS/CADERNO]]" })
    expect(local.outgoing("Notas/x.md").map((r) => r.dest)).toEqual(["Wikis/Ordem x Caos/Personagens/Aldren.md", "Notas/Caderno.md"])
  })
})

describe("VaultIndex: backlinks, links quebrados, tags e busca", () => {
  const index = vault(files)

  it("agrupa backlinks por nota, com contexto e marca de outro espaço", () => {
    const backs = index.backlinks("Wikis/Ordem x Caos/Personagens/Aldren.md")
    expect(backs.map((b) => [b.from, b.links.length, b.crossScope])).toEqual([
      ["Wikis/Ordem x Caos/Valdris.md", 3, false],
      ["Campanhas/Cinzas/Sessão 12.md", 1, true],
      ["Notas/Caderno.md", 1, true],
    ])
    expect(backs[1]!.context[0]).toBe("Encontro com Aldren em Lago Espelhado. #sessao")
  })

  it("lista o que falta escrever, por raiz", () => {
    expect(index.unresolved()).toEqual([{ target: "Lago Espelhado", from: ["Campanhas/Cinzas/Sessão 12.md", "Notas/Caderno.md"] }])
    expect(index.unresolved("Wikis/")).toEqual([])
  })

  it("conta tags sem diferenciar maiúsculas", () => {
    expect(index.tags()).toEqual([
      { tag: "local/cidade", count: 1 },
      { tag: "Rascunho", count: 1 },
      { tag: "sessao", count: 2 },
    ])
  })

  it("busca por nome, apelido, texto e operadores", () => {
    expect(index.search("aldren")[0]!.path).toBe("Wikis/Ordem x Caos/Personagens/Aldren.md")
    expect(index.search("cinzento").map((h) => h.path)).toContain("Wikis/Ordem x Caos/Personagens/Aldren.md")
    expect(index.search("tag:sessao -path:notas").map((h) => h.path)).toEqual(["Campanhas/Cinzas/Sessão 12.md"])
    expect(index.search('"Condado de"').map((h) => h.path)).toEqual(["Wikis/Ordem x Caos/Valdris.md"])
    expect(index.search("valdris", "Wikis/Outro Mundo/").map((h) => h.path)).toEqual(["Wikis/Outro Mundo/Valdris.md"])
  })

  it("escolhe o texto do link: nome curto se único no mesmo espaço, senão o caminho", () => {
    expect(index.linkTarget("Wikis/Ordem x Caos/Personagens/Aldren.md", "Wikis/Ordem x Caos/Valdris.md")).toBe("Aldren")
    expect(index.linkTarget("Wikis/Ordem x Caos/Personagens/Aldren.md", "Notas/Caderno.md")).toBe("Wikis/Ordem x Caos/Personagens/Aldren")
    expect(index.linkTarget("Wikis/Ordem x Caos/Valdris.md", "Wikis/Ordem x Caos/Personagens/Aldren.md")).toBe("Wikis/Ordem x Caos/Valdris")
  })

  it("atualiza ao gravar e ao apagar", () => {
    const local = vault(files)
    local.set({ path: "Wikis/Ordem x Caos/Lago Espelhado.md", size: 10, mtime: 5 }, "# Lago\n")
    expect(local.unresolved()).toEqual([])
    local.remove("Wikis/Ordem x Caos/Lago Espelhado.md")
    expect(local.unresolved()).toHaveLength(1)
  })
})
