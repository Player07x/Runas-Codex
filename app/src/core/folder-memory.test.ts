import { describe, expect, it } from "vitest"
import { collapseFolders, moveFolderMemory, parseFolderMemory, rememberFolder } from "./folder-memory"

describe("pastas lembradas nas Notas (U70)", () => {
  it("lê só pares de pasta e verdadeiro ou falso", () => {
    expect(parseFolderMemory(null)).toEqual({})
    expect(parseFolderMemory(["Notas/A"])).toEqual({})
    expect(parseFolderMemory({ "Notas/A": true, "Notas/B": "sim", "": false, "Notas/C": false })).toEqual({ "Notas/A": true, "Notas/C": false })
  })

  it("guarda a escolha mais recente por último e corta as mais antigas", () => {
    let memory = rememberFolder({}, "Notas/A", true)
    memory = rememberFolder(memory, "Notas/B", false)
    memory = rememberFolder(memory, "Notas/A", false)
    expect(Object.entries(memory)).toEqual([["Notas/B", false], ["Notas/A", false]])
    const many = Object.fromEntries(Array.from({ length: 2100 }, (_, i) => [`P${i}`, true]))
    const cut = rememberFolder(parseFolderMemory(many), "Nova", false)
    expect(Object.keys(cut)).toHaveLength(2000)
    expect(cut.Nova).toBe(false)
    expect(cut.P0).toBeUndefined()
  })

  it("recolher tudo fecha as pastas da lista e as já lembradas", () => {
    expect(collapseFolders({ "Notas/Velha": true }, ["Notas/A", "Notas/A/B"])).toEqual({ "Notas/Velha": false, "Notas/A": false, "Notas/A/B": false })
  })

  it("pasta renomeada leva a escolha dela e das de dentro", () => {
    const memory = { "Notas/Jogos": false, "Notas/Jogos/RPG": true, "Notas/Jogos2": true }
    expect(moveFolderMemory(memory, "Notas/Jogos", "Notas/Diversão")).toEqual({ "Notas/Diversão": false, "Notas/Diversão/RPG": true, "Notas/Jogos2": true })
  })
})
