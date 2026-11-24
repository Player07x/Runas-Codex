import { describe, expect, it } from "vitest"
import { VaultIndex } from "./vault-index"
import {
  averageReputation, campaignReputation, DEFAULT_SCALE, formatReputation, importablePairs, parseReputation, pipFills, rescale, resolveReputation, setReputation,
  validScale, withScale, withValues, type CampaignReputation,
} from "./reputation"

const NOTE = `---
tipo: campanha
---
# Campanha

## Reputação

Escala: de -3 a +6

- [[Ilsa]] com [[Aldren Vael]]: +2
- [[Sef|Sef, o mago]] com [[Culto de Morr]]: −1
Anotação do mestre: rever depois da sessão 12.

## Relógios
`
const resolve = (target: string) => `W/${target}.md`

describe("reputação por jogador", () => {
  it("lê a escala, os valores (com o menos tipográfico) e guarda as outras linhas", () => {
    const book = parseReputation(NOTE)
    expect(book.scale).toEqual({ min: -3, max: 6 })
    expect(book.entries).toEqual([{ player: "Ilsa", target: "Aldren Vael", value: 2 }, { player: "Sef", target: "Culto de Morr", value: -1 }])
    expect(book.other).toEqual(["Anotação do mestre: rever depois da sessão 12."])
    expect(parseReputation("# Sem seção").scale).toEqual(DEFAULT_SCALE)
  })

  it("grava a seção no lugar, em ordem, sem perder a anotação nem a seção seguinte", () => {
    const book = parseReputation(NOTE)
    const text = setReputation(NOTE, withValues(book, [{ player: "W/Ana.md", target: "W/Aldren Vael.md", value: 4 }], resolve, () => "Ana"))
    expect(text).toContain("Escala: de -3 a +6\n\n- [[Ana]] com [[Aldren Vael]]: +4\n- [[Ilsa]] com [[Aldren Vael]]: +2\n- [[Sef]] com [[Culto de Morr]]: -1\n\nAnotação do mestre")
    expect(text).toContain("## Relógios")
    expect(parseReputation(text).entries).toHaveLength(3)
    // Com pasta no link, o nome curto vai como apelido.
    expect(setReputation("", withValues(book, [{ player: "W/Ana.md", target: "W/Kael.md", value: 1 }], resolve, () => "Campanhas/X/Ana"))).toContain("- [[Campanhas/X/Ana|Ana]] com [[Campanhas/X/Ana|Ana]]: +1")
  })

  it("cria a seção quando a nota não tem", () => {
    const name = (path: string) => path.slice(2, -3)
    const text = setReputation("# Campanha\n", withValues(parseReputation(""), [{ player: "W/Ilsa.md", target: "W/Culto.md", value: -2 }], resolve, name))
    expect(text).toBe("# Campanha\n\n## Reputação\n\nEscala: de -3 a +3\n\n- [[Ilsa]] com [[Culto]]: -2\n")
  })

  it("troca, limita à escala e apaga o 0 sem número antigo", () => {
    const book = parseReputation(NOTE)
    const next = withValues(book, [
      { player: "W/Ilsa.md", target: "W/Aldren Vael.md", value: 99 },
      { player: "W/Sef.md", target: "W/Culto de Morr.md", value: 0 },
    ], resolve, (p) => p)
    expect(next.entries).toEqual([{ player: "Ilsa", target: "Aldren Vael", value: 6 }])
  })

  it("aceita escalas de −10 a 0 e de +1 a +10", () => {
    expect(validScale(-6, 6)).toEqual({ min: -6, max: 6 })
    expect(validScale(0, 10)).toEqual({ min: 0, max: 10 })
    for (const [min, max] of [[1, 3], [-11, 3], [-3, 0], [-3, 11], [-2.5, 3]] as const) expect(validScale(min, max)).toBeNull()
  })

  it("converte de escala pela proporção de cada lado, com o zero neutro", () => {
    expect(rescale(2, { min: -3, max: 3 }, { min: -6, max: 6 })).toBe(4)
    expect(rescale(2, { min: -3, max: 3 }, { min: -3, max: 9 })).toBe(6)
    expect(rescale(-2, { min: -3, max: 3 }, { min: -3, max: 9 })).toBe(-2)
    expect(rescale(1, { min: -6, max: 6 }, { min: -3, max: 3 })).toBe(1)
    expect(rescale(-3, { min: -3, max: 3 }, { min: 0, max: 5 })).toBe(0)
    expect(withScale(parseReputation(NOTE), { min: -6, max: 12 }).entries.map((e) => e.value)).toEqual([4, -2])
  })

  it("faz a média dos jogadores escolhidos com uma casa e usa o número antigo da facção para quem não tem o próprio", () => {
    const rep = resolveReputation(parseReputation(NOTE), resolve, new Map([["W/Culto de Morr.md", 1]]))
    expect(averageReputation(rep, ["W/Ilsa.md", "W/Sef.md", "W/Ana.md"], "W/Aldren Vael.md")).toBe(0.7)
    // Ilsa e Ana sem valor próprio ficam com o +1 do grupo (de −3 a +3), que vira +2 na escala até +6.
    expect(averageReputation(rep, ["W/Ilsa.md", "W/Sef.md", "W/Ana.md"], "W/Culto de Morr.md")).toBe(1)
    expect(averageReputation(rep, ["W/Ilsa.md"], "W/Ilsa.md")).toBeNull()
    expect(formatReputation(1.4)).toBe("+1,4")
    expect(formatReputation(-2)).toBe("−2")
  })

  it("pinta os pontos inteiros e a fração do próximo", () => {
    expect(pipFills(1.4, { min: -3, max: 3 })).toEqual({ neg: [0, 0, 0], pos: [1, 0.4, 0] })
    expect(pipFills(-2, { min: -3, max: 6 }).neg).toEqual([1, 1, 0])
  })

  it("importa só os pares com os dois personagens aqui, incluindo o NPC de lá que virou jogador", () => {
    const source: CampaignReputation = {
      campaign: { name: "Antiga", root: "Campanhas/Antiga/", status: "ativa" }, scale: { min: -6, max: 6 }, players: ["Ilsa", "Bruno"],
      pairs: [
        { player: "Ilsa", target: "Aldren", value: 4 },
        { player: "Ilsa", target: "Ninguém daqui", value: 2 },
        { player: "Bruno", target: "Aldren", value: 6 },
        { player: "Ilsa", target: "Kael", value: -6 },
      ],
    }
    // Kael era NPC lá e é jogador aqui.
    expect(importablePairs(source, ["Ilsa", "Kael"], new Set(["Aldren"]), { min: -3, max: 3 })).toEqual([
      { player: "Ilsa", target: "Aldren", value: 2 },
      { player: "Ilsa", target: "Kael", value: -3 },
    ])
    expect(importablePairs(source, ["Nova"], new Set(["Outro"]), DEFAULT_SCALE)).toEqual([])
  })
})

describe("importar reputação entre campanhas do cofre", () => {
  const W = "Wikis/Mundo/Personagens/"
  const texts: Record<string, string> = {
    // Antiga: Ilsa e Bruno jogavam; Kael era NPC; a facção tinha o número antigo do grupo.
    "Campanhas/Antiga/Antiga.md": `---
tipo: campanha
personagens: ["[[${W}Ilsa]]", "[[${W}Bruno]]"]
npcs: ["[[${W}Kael]] (aliado)", "[[${W}Aldren]]"]
faccoes: ["[[Wikis/Mundo/Organizações/Ordem]] (+3)"]
---
# Antiga

## Reputação

Escala: de -6 a +6

- [[${W}Ilsa|Ilsa]] com [[${W}Kael|Kael]]: -6
- [[${W}Ilsa|Ilsa]] com [[${W}Aldren|Aldren]]: +4
- [[${W}Bruno|Bruno]] com [[${W}Aldren|Aldren]]: +6
`,
    "Campanhas/Nova/Nova.md": `---
tipo: campanha
personagens: ["[[${W}Ilsa]]", "[[${W}Kael]]"]
npcs: ["[[${W}Aldren]]"]
faccoes: ["[[Wikis/Mundo/Organizações/Ordem]]"]
---
# Nova
`,
    "Campanhas/Vazia/Vazia.md": "---\ntipo: campanha\npersonagens: [\"[[" + W + "Outro]]\"]\n---\n# Vazia\n",
    [`${W}Ilsa.md`]: "---\ntipo: personagem\n---\n", [`${W}Bruno.md`]: "---\ntipo: personagem\n---\n", [`${W}Kael.md`]: "---\ntipo: personagem\n---\n",
    [`${W}Aldren.md`]: "---\ntipo: personagem\n---\n", [`${W}Outro.md`]: "---\ntipo: personagem\n---\n", "Wikis/Mundo/Organizações/Ordem.md": "---\ntipo: organizacao\n---\n",
  }
  const index = new VaultIndex(Object.keys(texts).map((path) => ({ path, size: 1, mtime: 1 })), texts)
  const here = new Set([`${W}Aldren.md`, "Wikis/Mundo/Organizações/Ordem.md", `${W}Ilsa.md`, `${W}Kael.md`])

  it("leva os pares em comum, na proporção da escala nova, com o número antigo da facção e o NPC que virou jogador", () => {
    const source = campaignReputation(index, "Antiga")
    const pairs = importablePairs(source, [`${W}Ilsa.md`, `${W}Kael.md`], here, DEFAULT_SCALE)
    expect(pairs).toEqual(expect.arrayContaining([
      { player: `${W}Ilsa.md`, target: `${W}Aldren.md`, value: 2 },
      { player: `${W}Ilsa.md`, target: `${W}Kael.md`, value: -3 },
      // O +3 do grupo (de −3 a +3) vale para a Ilsa, que não tinha valor próprio com a Ordem.
      { player: `${W}Ilsa.md`, target: "Wikis/Mundo/Organizações/Ordem.md", value: 3 },
    ]))
    // Bruno não está na campanha nova.
    expect(pairs).toHaveLength(3)
  })

  it("não acha nada quando os personagens são todos novos", () => {
    expect(importablePairs(campaignReputation(index, "Antiga"), [`${W}Outro.md`], new Set(), DEFAULT_SCALE)).toEqual([])
  })
})
