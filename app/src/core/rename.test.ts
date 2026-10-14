import type { VaultEntry } from "../platform/platform"
import { setProperty } from "./properties"
import { planFolderRename, planRename, renameProblem } from "./rename"
import { VaultIndex } from "./vault-index"

function vault(files: Record<string, string>): VaultIndex {
  const entries: VaultEntry[] = Object.keys(files).map((path, i) => ({ path, size: files[path]!.length, mtime: 1000 + i }))
  return new VaultIndex(entries, files)
}

describe("planRename", () => {
  const files = {
    "Wikis/OxC/Aldren.md": "# Aldren\nVer [[Valdris]] e [mapa](../../Mapas/mapa.png).\n",
    "Wikis/OxC/Valdris.md": "[[Aldren]] [[Aldren#Juventude|jovem]] ![[Aldren]] [[Wikis/OxC/Aldren.md]] | [[Aldren\\|tab]] |\r\n",
    "Notas/Caderno.md": "---\nligado: \"[[Aldren]]\"\n---\n[a](../Wikis/OxC/Aldren.md) [b](<../Wikis/OxC/Aldren.md#Sec>) [c](../Wikis/OxC/Aldren.md \"título\") `[[Aldren]]`\n",
    "Mapas/mapa.png": "",
  }
  const canvas = { "Quadros/q.canvas": '{\n\t"nodes":[\n\t\t{"id":"1","type":"file","file":"Wikis/OxC/Aldren.md","x":0,"extra":true}\n\t],\n\t"edges":[]\n}' }

  it("atualiza wikilinks, propriedades, links markdown e canvas, sem tocar no resto", () => {
    const plan = planRename(vault(files), "Wikis/OxC/Aldren.md", "Wikis/OxC/Personagens/Aldren Vael.md", canvas)
    const after = Object.fromEntries(plan.edits.map((e) => [e.path, e.after]))
    expect(after["Wikis/OxC/Valdris.md"]).toBe(
      "[[Aldren Vael]] [[Aldren Vael#Juventude|jovem]] ![[Aldren Vael]] [[Wikis/OxC/Personagens/Aldren Vael.md]] | [[Aldren Vael\\|tab]] |\r\n",
    )
    expect(after["Notas/Caderno.md"]).toBe(
      "---\nligado: \"[[Aldren Vael]]\"\n---\n[a](../Wikis/OxC/Personagens/Aldren%20Vael.md) [b](<../Wikis/OxC/Personagens/Aldren Vael.md#Sec>) [c](../Wikis/OxC/Personagens/Aldren%20Vael.md \"título\") `[[Aldren]]`\n",
    )
    // A própria nota mudou de pasta: o link relativo para o mapa ganha um "../".
    expect(after["Wikis/OxC/Aldren.md"]).toBe("# Aldren\nVer [[Valdris]] e [mapa](../../../Mapas/mapa.png).\n")
    expect(after["Quadros/q.canvas"]).toContain('"file":"Wikis/OxC/Personagens/Aldren Vael.md","x":0,"extra":true')
    expect(plan.edits).toHaveLength(4)
  })

  it("usa o caminho completo quando o novo nome já existe em outro lugar", () => {
    const index = vault({ ...files, "Notas/Aldren Vael.md": "" })
    const plan = planRename(index, "Wikis/OxC/Aldren.md", "Wikis/OxC/Aldren Vael.md")
    expect(plan.edits.find((e) => e.path === "Wikis/OxC/Valdris.md")!.after.startsWith("[[Wikis/OxC/Aldren Vael]]")).toBe(true)
  })

  it("recusa nomes inválidos e colisões de maiúsculas, mas aceita trocar só as maiúsculas", () => {
    const index = vault({ ...files, "Notas/Outra.md": "" })
    expect(renameProblem(index, "Notas/Caderno.md", "Notas/outra.md")).toMatch(/Já existe/)
    expect(renameProblem(index, "Notas/Caderno.md", "Notas/Ca#derno.md")).toMatch(/#/)
    expect(renameProblem(index, "Notas/Caderno.md", "Notas/CON.md")).toMatch(/reservado/)
    expect(renameProblem(index, "Notas/Caderno.md", "Notas/caderno.md")).toBeNull()
  })
})

describe("setProperty", () => {
  it("troca só a linha da chave e mantém CRLF", () => {
    const text = "---\r\ntitulo: Velho # comentário\r\ntags:\r\n  - a\r\noutra: 1\r\n---\r\nCorpo\r\n"
    expect(setProperty(text, "titulo", "Novo: com dois-pontos")).toBe("---\r\ntitulo: \"Novo: com dois-pontos\"\r\ntags:\r\n  - a\r\noutra: 1\r\n---\r\nCorpo\r\n")
    expect(setProperty(text, "tags", ["a", "npc"])).toBe("---\r\ntitulo: Velho # comentário\r\ntags:\r\n  - a\r\n  - npc\r\noutra: 1\r\n---\r\nCorpo\r\n")
  })

  it("mantém listas no estilo [a, b] e cria chaves novas no fim", () => {
    expect(setProperty("---\ntags: [a]\n---\n", "tags", ["a", "b"])).toBe("---\ntags: [a, b]\n---\n")
    expect(setProperty("---\na: 1\n---\nx", "local", "[[Valdris]]")).toBe('---\na: 1\nlocal: "[[Valdris]]"\n---\nx')
  })

  it("cria o frontmatter quando não existe (depois do BOM) e remove chaves", () => {
    expect(setProperty("﻿# Nota\n", "tags", ["a"])).toBe("﻿---\ntags:\n  - a\n---\n# Nota\n")
    expect(setProperty("---\na: 1\nb: 2\n---\n", "a", undefined)).toBe("---\nb: 2\n---\n")
    expect(setProperty("---\n---\n", "a", true)).toBe("---\na: true\n---\n")
  })

  it("protege valores que o YAML leria como outro tipo", () => {
    expect(setProperty("---\n---\n", "ano", "1492")).toBe('---\nano: "1492"\n---\n')
    expect(setProperty("---\n---\n", "data_mundo", "4031-03-15")).toBe('---\ndata_mundo: "4031-03-15"\n---\n')
  })

  it("não regrava frontmatter inválido", () => {
    expect(() => setProperty("---\ntags: [a\n---\n", "x", 1)).toThrow(/erro/)
  })
})

describe("setProperty com quebras de linha misturadas", () => {
  it("mantém a quebra de cada linha ao criar e remover", () => {
    const text = "---\nTipo: Plano\r\ntags:\r\n  - a\r\naliases:\n---\n# X\r\n"
    expect(setProperty(setProperty(text, "novo", "ok"), "novo", undefined)).toBe(text)
    expect(setProperty(text, "Tipo", "Reino")).toBe("---\nTipo: Reino\r\ntags:\r\n  - a\r\naliases:\n---\n# X\r\n")
  })
})

describe("planFolderRename", () => {
  it("atualiza links de fora e de dentro da pasta, inclusive relativos entre arquivos movidos", () => {
    const index = vault({
      "Wikis/OxC/Locais/Valdris.md": "[[Lago]] [lago](Lago.md) [fora](../Notas.md)\n",
      "Wikis/OxC/Locais/Lago.md": "# Lago\n",
      "Wikis/OxC/Notas.md": "[[Locais/Valdris]] [v](Locais/Valdris.md)\n",
    })
    const plan = planFolderRename(index, "Wikis/OxC/Locais", "Wikis/OxC/Geografia/Lugares")
    const after = Object.fromEntries(plan.edits.map((e) => [e.path, e.after]))
    expect(after["Wikis/OxC/Notas.md"]).toBe("[[Wikis/OxC/Geografia/Lugares/Valdris]] [v](Geografia/Lugares/Valdris.md)\n")
    expect(after["Wikis/OxC/Locais/Valdris.md"]).toBe("[[Lago]] [lago](Lago.md) [fora](../../Notas.md)\n")
    expect(() => planFolderRename(index, "Wikis/OxC", "Wikis/OxC/Sub")).toThrow(/dentro dela mesma/)
  })
})
