import { readFileSync } from "node:fs"
import { join } from "node:path"
import { convertStatblock, statblockBestiary } from "./statblock"

const fixtures = join(__dirname, "fixtures/cofre")
const blockOf = (note: string, n = 0) => [...readFileSync(join(fixtures, note), "utf8").matchAll(/```statblock\r?\n([\s\S]*?)\r?\n```/g)][n]![1]!
const bestiary = statblockBestiary(readFileSync(join(fixtures, ".obsidian/plugins/obsidian-5e-statblocks/data.json"), "utf8"))
const lookup = (name: string) => bestiary.get(name.toLowerCase())

describe("Fantasy Statblocks → callout [!statblock]", () => {
  it("monta o callout do 5e com rótulos em português e os valores como estão", () => {
    const result = convertStatblock(blockOf("Bestiário/Goblin.md"), lookup)
    expect(result.warnings).toEqual([])
    expect(result.markdown).toBe(
      [
        "> [!statblock] Goblin",
        "> *Small humanoid (goblinoid), neutral evil*",
        ">",
        "> **Classe de Armadura** 15 (leather armor, shield) · **Pontos de Vida** 7 (2d6) · **Deslocamento** 30 ft.",
        ">",
        "> | FOR | DES | CON | INT | SAB | CAR |",
        "> |:---:|:---:|:---:|:---:|:---:|:---:|",
        "> | 8 (−1) | 14 (+2) | 10 (+0) | 10 (+0) | 8 (−1) | 8 (−1) |",
        ">",
        "> **Perícias** Stealth +6 · **Sentidos** darkvision 60 ft., passive Perception 9 · **Idiomas** Common, Goblin · **Nível de Desafio** 1/4",
        ">",
        "> **Nimble Escape.** The goblin can take the Disengage or Hide action as a bonus action on each of its turns.",
        ">",
        "> **Ações**",
        ">",
        "> **Scimitar.** Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.",
        ">",
        "> **Shortbow.** Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
      ].join("\n"),
    )
  })

  it("puxa a criatura do bestiário do plugin e o bloco ganha por cima", () => {
    const result = convertStatblock(blockOf("Bestiário/Capitão Vorn.md"), lookup)
    expect(result.name).toBe("Capitão Vorn")
    expect(result.markdown).toContain("**Pontos de Vida** 52 (6d8 + 12)")
    expect(result.markdown).toContain("**Idiomas** Common, Goblin, Orc")
    expect(result.markdown).toContain("> **Martial Advantage.** Once per turn")
    expect(result.markdown).toContain("> *Fonte: Homebrew*")
  })

  it("criatura do SRD sem outros campos fica como está", () => {
    const result = convertStatblock(blockOf("Bestiário/Capitão Vorn.md", 1), lookup)
    expect(result.markdown).toBeNull()
    expect(result.warnings.join(" ")).toContain("Ancient Red Dragon")
  })

  it("campos desconhecidos e de outros sistemas entram como texto, sem perder nada", () => {
    const result = convertStatblock("name: Bandido\nnivel_de_ameaca: médio\naspects: Rápido, Covarde\nstress: [1, 2]\nmanobras:\n  - name: Rasteira\n    desc: Derruba o alvo.", lookup)
    expect(result.markdown).toBe(
      ["> [!statblock] Bandido", "> **Aspectos** Rápido, Covarde · **Estresse** 1, 2 · **Nivel de ameaca** médio", ">", "> **Manobras**", ">", "> **Rasteira.** Derruba o alvo."].join("\n"),
    )
  })

  it("YAML com erro fica como está", () => {
    expect(convertStatblock("name: [quebrado", lookup).markdown).toBeNull()
  })

  it("descrições com várias linhas continuam dentro do callout", () => {
    const result = convertStatblock("name: A\ntraits:\n  - name: B\n    desc: |\n      linha 1\n      linha 2", lookup)
    expect(result.markdown).toBe("> [!statblock] A\n> **B.** linha 1\n> linha 2")
  })

  it("os campos a mais de um item ficam na mesma linha", () => {
    const result = convertStatblock("name: A\nactions:\n  - name: Sopro\n    desc: Cone de fogo.\n    recarga: 5-6", lookup)
    expect(result.markdown).toBe("> [!statblock] A\n> **Ações**\n>\n> **Sopro.** Cone de fogo. · *Recarga:* 5-6")
  })
})
