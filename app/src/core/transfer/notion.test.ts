import { strFromU8, strToU8, zipSync } from "fflate"
import { describe, expect, it } from "vitest"
import { readTransferArchive, TRANSFER_LIMITS, type TransferFile } from "./archive"
import { convertNotionExport, isNotionExport, parseCsv, rewriteLinks, stripNotionId, unwrapNestedZips } from "./notion"

const A = "0123456789abcdef0123456789abcdef"
const B = "fedcba9876543210fedcba9876543210"
const C = "aaaabbbbccccddddeeeeffff00001111"
const file = (path: string, text: string): TransferFile => ({ path, bytes: strToU8(text) })
const text = (files: TransferFile[], path: string) => { const found = files.find((f) => f.path === path); if (!found) throw new Error(`faltou ${path}: ${files.map((f) => f.path).join(", ")}`); return strFromU8(found.bytes) }

const exportFiles = () => [
  file(`Campanha ${A}.md`, `# Campanha\n\nVeja [Personagens](Campanha%20${A}/Personagens%20${B}.csv) e [Mapa](Campanha%20${A}/Mapa%20${C}.md).\n\n![mapa.png](Campanha%20${A}/mapa.png)\n\n[site](https://exemplo.org)\n`),
  file(`Campanha ${A}/Mapa ${C}.md`, `# Mapa\n\nVolta para a [Campanha](../Campanha%20${A}.md).\n`),
  { path: `Campanha ${A}/mapa.png`, bytes: new Uint8Array([137, 80, 78, 71]) },
  file(`Campanha ${A}/Personagens ${B}.csv`, "﻿Name,Status\nIgnorado,x\n"),
  file(`Campanha ${A}/Personagens ${B}_all.csv`, `﻿Name,Status,Sessão,Aliados\nOrmund,Vivo,"October 17, 2026","Lyra (Lyra%20${C}.md)"\nLyra,Morta,,\n"Sem, página",Vivo,,\n`),
  file(`Campanha ${A}/Personagens ${B}/Ormund ${A}.md`, "# Ormund\n\nStatus: Vivo\nSessão: October 17, 2026\nAliados: Lyra\n\nO duque.\n"),
  file(`Campanha ${A}/Personagens ${B}/Lyra ${C}.md`, "# Lyra\n\nStatus: Morta\n\nA espiã.\n"),
]

describe("importar do Notion", () => {
  it("tira o id do Notion dos nomes de arquivos e pastas", () => {
    expect(stripNotionId(`Ideias ${A}.md`, true)).toBe("Ideias.md")
    expect(stripNotionId(`v1.2 ${A}`, false)).toBe("v1.2")
    expect(stripNotionId("foto.png", true)).toBe("foto.png")
  })

  it("só reconhece a exportação do Notion, não um ZIP Markdown comum", () => {
    expect(isNotionExport(exportFiles())).toBe(true)
    expect(isNotionExport([file("Notas/Ideias.md", "# Ideias"), file("Notas/Outra.md", "x")])).toBe(false)
    expect(convertNotionExport([file("Notas/Ideias.md", "# Ideias")])).toBeNull()
  })

  it("lê CSV com aspas, vírgulas e quebras de linha", () => {
    expect(parseCsv('﻿a,b\n"x, y","linha 1\nlinha 2"\n"com ""aspas""",\n')).toEqual([["a", "b"], ["x, y", "linha 1\nlinha 2"], ['com "aspas"', ""]])
  })

  it("converte páginas, links, imagens e bancos de dados numa pasta Notion", () => {
    const result = convertNotionExport(exportFiles())!
    const paths = result.files.map((f) => f.path).sort()
    expect(paths).toEqual([
      "Notion/Campanha.md", "Notion/Campanha/Mapa.md", "Notion/Campanha/Personagens.md",
      "Notion/Campanha/Personagens/Lyra.md", "Notion/Campanha/Personagens/Ormund.md", "Notion/Campanha/Personagens/Sem, página.md",
      "Notion/Campanha/mapa.png",
    ])
    expect(result.ignored).toEqual([`Campanha ${A}/Personagens ${B}.csv`])
    expect(result.databases).toBe(1)
    const home = text(result.files, "Notion/Campanha.md")
    expect(home).toContain("[[Notion/Campanha/Personagens]]")
    expect(home).toContain("[[Notion/Campanha/Mapa]]")
    expect(home).toContain("![[Notion/Campanha/mapa.png]]")
    expect(home).toContain("[site](https://exemplo.org)")
    expect(text(result.files, "Notion/Campanha/Mapa.md")).toContain("[[Notion/Campanha]]")
  })

  it("as colunas do banco viram propriedades e saem do texto da página", () => {
    const result = convertNotionExport(exportFiles())!
    const ormund = text(result.files, "Notion/Campanha/Personagens/Ormund.md")
    expect(ormund).toBe('---\nStatus: "Vivo"\nSessão: "2026-10-17"\nAliados:\n  - "[[Notion/Campanha/Personagens/Lyra]]"\n---\n# Ormund\n\nO duque.\n')
    expect(text(result.files, "Notion/Campanha/Personagens/Sem, página.md")).toBe('---\nStatus: "Vivo"\n---\n# Sem, página\n')
    const db = text(result.files, "Notion/Campanha/Personagens.md")
    expect(db).toContain("- [[Notion/Campanha/Personagens/Ormund]]\n- [[Notion/Campanha/Personagens/Lyra]]")
  })

  it("nomes que coincidem sem o id ganham um número", () => {
    const result = convertNotionExport([file(`Ideia ${A}.md`, "# Ideia"), file(`Ideia ${B}.md`, "# Ideia")])!
    expect(result.files.map((f) => f.path).sort()).toEqual(["Notion/Ideia 2.md", "Notion/Ideia.md"])
  })

  it("links dentro de tabelas usam a barra escapada", () => {
    const moved = new Map([[`Pasta ${A}/Página ${B}.md`, "Notion/Pasta/Página.md"]])
    expect(rewriteLinks(`| [Outra coisa](P%C3%A1gina%20${B}.md) |`, `Pasta ${A}`, moved)).toBe("| [[Notion/Pasta/Página\\|Outra coisa]] |")
  })

  it("abre a exportação grande, com ZIPs dentro do ZIP", async () => {
    const inner = zipSync({ [`Ideia ${A}.md`]: strToU8("# Ideia") })
    const outer = zipSync({ "Export-1-Part-1.zip": inner })
    const archive = await unwrapNestedZips(await readTransferArchive(outer, "Export", TRANSFER_LIMITS), TRANSFER_LIMITS)
    expect(archive.files.map((f) => f.path)).toEqual([`Ideia ${A}.md`])
  })
})
