import { describe, expect, it } from "vitest"
import { draftFor, draftRecovery, parseDrafts, withDraft, withoutDraft, type UnsavedDraft } from "./unsaved-drafts"

const draft = (text: string, base = "antes", path = "Notas/A.md"): UnsavedDraft => ({ vault: "/cofre", path, base, text, at: "2026-11-17T10:00:00.000Z" })

describe("texto não gravado guardado no aparelho (U91)", () => {
  it("guarda um por nota, mantém a base do disco e some quando grava", () => {
    let list = withDraft([], draft("um"))
    list = withDraft(list, { ...draft("um dois"), base: "outra" })
    list = withDraft(list, draft("b", "x", "Notas/B.md"))
    expect(list).toHaveLength(2)
    expect(draftFor(list, "/cofre", "Notas/A.md")).toMatchObject({ text: "um dois", base: "antes" })
    expect(draftFor(withoutDraft(list, "/cofre", "Notas/A.md"), "/cofre", "Notas/A.md")).toBeNull()
    expect(draftFor(list, "/outro", "Notas/A.md")).toBeNull()
  })

  it("lê o que estiver salvo e ignora lixo", () => {
    expect(parseDrafts(JSON.stringify([draft("um"), { vault: 1 }]))).toEqual([draft("um")])
    expect(parseDrafts("{")).toEqual([])
    expect(parseDrafts(null)).toEqual([])
  })

  it("ao abrir a nota: recupera se o disco não mudou, pergunta se mudou e descarta se já está gravado", () => {
    expect(draftRecovery(draft("novo"), "antes")).toBe("recuperar")
    expect(draftRecovery(draft("novo"), "mudou no Obsidian")).toBe("perguntar")
    expect(draftRecovery(draft("novo"), "novo")).toBe("descartar")
    expect(draftRecovery(null, "antes")).toBe("nenhum")
  })
})
