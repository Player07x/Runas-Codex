import { describe, expect, it } from "vitest"
import { VaultIndex } from "../vault-index"
import { parseBase, runBase } from "./bases"
import { runDataview } from "./dataview"
import { evaluate } from "./expression"

const texts = { "Notas/Porto.md": "# Porto", "Notas/Ana.md": '---\ntags: [npc, npc/aliado]\ncidade: "[[Porto]]"\nvivo: true\npontos: 8\n---\n[[Porto]]', "Notas/Bia.md": '---\ntags: [npc]\ncidade: ["[[Porto]]"]\nvivo: false\npontos: 3\n---', "Notas/Caio.md": '---\ntags: [npc]\ncidade: "[[Outro]]"\nvivo: true\npontos: 15\n---' }
const index = new VaultIndex(Object.keys(texts).map(path => ({ path, mtime: 1000, size: texts[path as keyof typeof texts].length })), texts)
const context = { index, note: index.note("Notas/Ana.md")!, from: "Notas/Porto.md" }
describe("Bases e consultas declarativas", () => {
  it("compara links relativos e listas com a nota que embute a base", () => {
    expect(evaluate('list(note["cidade"]).contains(this)', context)).toBe(true)
    expect(evaluate('list(note["cidade"]).contains(this)', { ...context, note: index.note("Notas/Bia.md")! })).toBe(true)
    expect(evaluate('list(note["cidade"]).contains(this)', { ...context, note: index.note("Notas/Caio.md")! })).toBe(false)
  })
  it("filtra pasta, tag aninhada e booleanos sem confundir strings", () => {
    expect(evaluate('file.inFolder("Notas") && file.hasTag("npc") && vivo', context)).toBe(true)
    expect(evaluate('"a or b" == "a or b" and pontos >= 8', context)).toBe(true)
    expect(evaluate('false && proibido()', context)).toBe(false)
  })
  it("lê visões por nome, fórmulas, nomes de coluna, grupos e resumo", () => {
    const base = parseBase('filters:\n  and:\n    - file.hasTag("npc")\n    - list(cidade).contains(this)\nformulas:\n  dobro: pontos * 2\nproperties:\n  formula.dobro:\n    displayName: Pontuação\nviews:\n  - type: table\n    name: Pessoas\n    order: [file.name, formula.dobro]\n    groupBy: {property: vivo}\n    sort: [{property: pontos, direction: DESC}]\n    summaries: {formula.dobro: Sum}')
    const result = runBase(base, index, "Pessoas", "Notas/Porto.md")
    expect(result.rows.map(r => r.name)).toEqual(["Bia", "Ana"])
    expect(result.labels).toEqual(["name", "Pontuação"])
    expect(result.summaries[1]).toBe("22")
  })
  it("aceita propriedades com espaços no order e preserva o YAML desconhecido ao ler", () => {
    const base = parseBase('custom: sim\nviews:\n - type: cards\n   name: Cartões\n   order: [file.name, Estado Atual]')
    expect(runBase(base, index).type).toBe("cards")
    expect(base.views[0]?.order[1]).toBe("Estado Atual")
  })
  it("recusa fórmula circular e erro de sintaxe", () => {
    const base = parseBase('formulas: {a: formula.b, b: formula.a}\nviews: [{type: table, order: [formula.a]}]')
    expect(() => runBase(base, index)).toThrow(/circular/)
    expect(() => evaluate('file.hasTag(', context)).toThrow()
    expect(() => parseBase('views: [{type: plugin-desconhecido}]')).toThrow(/não suportada/)
  })
  it("não permite executar funções ou atravessar protótipos", () => {
    for (const expression of ['note.constructor("return process")()', 'file["__proto__"]', 'fetch("https://fora")', 'globalThis.process']) {
      if (expression === "globalThis.process") expect(evaluate(expression, context)).toBeUndefined()
      else expect(() => evaluate(expression, context)).toThrow()
    }
  })
  it("gera tabela DQL de NPCs vivos, ordenada e com aliases", () => {
    const result = runDataview('TABLE pontos * 2 AS "Força"\nFROM #npc AND "Notas"\nWHERE vivo = true\nSORT pontos DESC\nLIMIT 1', index)
    expect(result.rows[0]?.name).toBe("Caio")
    expect(result.rows[0]?.cells[1]).toBe(30)
    expect(result.labels).toEqual(["Nota", "Força"])
  })
  it("combina fontes, negação e links, sem quebrar vírgulas de funções", () => {
    const result = runDataview('LIST contains(list(cidade), this)\nFROM (#npc AND -"Fora") OR [[Porto]]\nWHERE pontos >= 3', index, "Notas/Porto.md")
    expect(result.rows).toHaveLength(3)
    expect(runDataview('LIST\nFROM [[Porto]]', index, "Notas/Porto.md").rows.map(r => r.name)).toEqual(["Ana", "Bia"])
  })
  it("avisa sobre comandos e expressões que não implementa", () => {
    expect(() => runDataview('TASK', index)).toThrow(/LIST ou TABLE/)
    expect(() => runDataview('LIST\nFLATTEN cidade', index)).toThrow(/não suportado/)
    expect(() => evaluate('file.name.map(x => x)', context)).toThrow()
  })
  it("compara datas ISO, desloca dias e aceita operadores DQL em maiúsculas", () => {
    expect(evaluate('"2026-01-01" < date("2026-10-15") AND NOT false', context)).toBe(true)
    expect(evaluate('"2026-10-15" = date("2026-10-15")', context)).toBe(true)
    expect(evaluate('date("2026-10-15") + "7 days"', context)).toEqual(new Date("2026-10-22"))
    expect(evaluate('date(today)', context)).toBeInstanceOf(Date)
    expect(() => evaluate('date("2026-10-15") + "1 century"', context)).toThrow(/Duração/)
  })
})
