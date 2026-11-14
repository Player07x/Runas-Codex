import { describe, expect, it } from "vitest"
import { orgStructureOf } from "./relation-layout"
import { addRelationWrites, completeWrites, invertedRelations, invertWrites, linkTo, oneSidedRelations, relationSentence, relationSides, removeRelationWrites } from "./relation-sides"
import { VaultIndex } from "./vault-index"
import { orgChart, relationEdges, relationsOf } from "./wiki"

const W = "Wikis/Porto/"
const make = (files: Record<string, string>) => new VaultIndex(Object.keys(files).map((path) => ({ path, size: 1, mtime: 1 })), files)
const person = (extra = "") => `---\ntipo: personagem\n${extra}---\n`
const org = (extra = "") => `---\ntipo: organizacao\n${extra}---\n`

describe("relações cruzadas (U73)", () => {
  it("o membro escrito na organização entra no organograma, igual ao escrito no membro", () => {
    const index = make({
      [`${W}Guilda.md`]: org(`membros:\n  - "[[Aurora]] (tesoureira)"\nliderado_por:\n  - "[[Odete]]"\n`),
      [`${W}Aurora.md`]: person(),
      [`${W}Odete.md`]: person(),
      [`${W}Bento.md`]: person(`membro_de:\n  - "[[Guilda]]"\n`),
    })
    const chart = orgChart(index, `${W}Guilda.md`, W)
    expect(chart.children.map((child) => child.path)).toEqual([`${W}Odete.md`, `${W}Aurora.md`, `${W}Bento.md`])
    const structure = orgStructureOf(index, `${W}Guilda.md`, W)
    expect(structure.members).toBe(3)
    expect(structure.people.find((p) => p.path === `${W}Aurora.md`)?.role).toBe("tesoureira")
    // Do lado de Aurora, a ligação aparece como “Membro de”, escrita na outra nota.
    const aurora = relationsOf(index, `${W}Aurora.md`, W)
    expect(aurora.map((r) => [r.type.label, r.other, r.inverse])).toEqual([["Membro de", `${W}Guilda.md`, true]])
  })

  it("escrita dos dois lados, a ligação conta uma vez", () => {
    const index = make({
      [`${W}Guilda.md`]: org(`membros:\n  - "[[Aurora]]"\n`),
      [`${W}Aurora.md`]: person(`membro_de:\n  - "[[Guilda]]"\n`),
    })
    expect(relationEdges(index, W)).toHaveLength(1)
    expect(relationsOf(index, `${W}Guilda.md`, W)).toHaveLength(1)
    expect(relationsOf(index, `${W}Aurora.md`, W)).toHaveLength(1)
  })

  it("explica a escolha numa frase", () => {
    expect(relationSentence("mentor", "Bento", "Odete")).toBe("Odete é mentor de Bento")
    expect(relationSentence("membros", "Guilda", "Aurora")).toBe("Aurora é membro de Guilda")
    expect(relationSentence("aliados", "A", "B")).toBe("A e B são aliados")
  })
})

describe("gravar dos dois lados (U74)", () => {
  const files = { [`${W}Bento.md`]: person(), [`${W}Odete.md`]: person(`discipulos:\n  - "[[Carla]]"\n`), [`${W}Carla.md`]: person() }

  it("grava a relação e a ligação de volta, com o mesmo texto", () => {
    const index = make(files)
    expect(addRelationWrites(index, `${W}Bento.md`, "mentor", `${W}Odete.md`, { note: "desde menino", both: true })).toEqual([
      { path: `${W}Bento.md`, key: "mentor", value: ["[[Odete]] (desde menino)"] },
      { path: `${W}Odete.md`, key: "discipulos", value: ["[[Carla]]", "[[Bento]] (desde menino)"] },
    ])
    expect(addRelationWrites(index, `${W}Bento.md`, "aliados", `${W}Carla.md`, { both: true }).map((w) => w.key)).toEqual(["aliados", "aliados"])
    expect(addRelationWrites(index, `${W}Bento.md`, "mentor", `${W}Odete.md`, { both: false })).toHaveLength(1)
  })

  it("não repete o que já está escrito do outro lado", () => {
    const index = make(files)
    expect(addRelationWrites(index, `${W}Carla.md`, "mentor", `${W}Odete.md`, { both: true })).toEqual([{ path: `${W}Carla.md`, key: "mentor", value: ["[[Odete]]"] }])
  })

  it("remove de um lado ou dos dois", () => {
    const index = make({ ...files, [`${W}Carla.md`]: person(`mentor:\n  - "[[Odete]]"\n`) })
    expect(relationSides(index, `${W}Carla.md`, "mentor", `${W}Odete.md`)).toEqual({ here: true, there: true })
    expect(removeRelationWrites(index, `${W}Carla.md`, "mentor", `${W}Odete.md`, { here: true, there: true })).toEqual([
      { path: `${W}Carla.md`, key: "mentor", value: [] },
      { path: `${W}Odete.md`, key: "discipulos", value: [] },
    ])
  })

  it("usa o caminho no link quando há outra nota com o mesmo nome", () => {
    const index = make({ ...files, "Outro/Odete.md": "# Outra\n" })
    expect(linkTo(index, `${W}Odete.md`, `${W}Bento.md`)).toMatch(/^\[\[/)
    expect(linkTo(index, "Outro/Odete.md", `${W}Bento.md`)).toBe("[[Outro/Odete]]")
  })
})

describe("consertar o que existe (U75)", () => {
  it("acha as relações de um lado só e completa o outro", () => {
    const index = make({ [`${W}Bento.md`]: person(`mentor:\n  - "[[Odete]]"\naliados:\n  - "[[Carla]]"\n`), [`${W}Odete.md`]: person(), [`${W}Carla.md`]: person(`aliados:\n  - "[[Bento]]"\n`) })
    const found = oneSidedRelations(index, W)
    expect(found).toEqual([{ from: `${W}Bento.md`, to: `${W}Odete.md`, key: "mentor", inverse: "discipulos", note: "" }])
    expect(completeWrites(index, found)).toEqual([{ path: `${W}Odete.md`, key: "discipulos", value: ["[[Bento]]"] }])
  })

  it("acha a organização “membro de” personagem e inverte para `membros`", () => {
    const index = make({ [`${W}Guilda.md`]: org(`membro_de:\n  - "[[Aurora]] (tesoureira)"\n  - "[[Liga]]"\n`), [`${W}Aurora.md`]: person(), [`${W}Liga.md`]: org() })
    const found = invertedRelations(index, W)
    expect(found.map((item) => [item.person, item.mirror])).toEqual([[`${W}Aurora.md`, "membros"]])
    expect(invertWrites(index, found)).toEqual([
      { path: `${W}Guilda.md`, key: "membro_de", value: ["[[Liga]]"] },
      { path: `${W}Guilda.md`, key: "membros", value: ["[[Aurora]] (tesoureira)"] },
    ])
  })
})
