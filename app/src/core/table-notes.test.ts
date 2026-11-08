import { appendLine, eventLine, sessionFromTableNotes } from "./table-notes"
import { parseNote } from "./parse"

describe("Notas da mesa (U14)", () => {
  it("“Salvar Sessão” cria a sessão realizada com a data entre aspas e o texto em Anotações", () => {
    const note = sessionFromTableNotes({ number: 12, title: " O selo ", date: "2026-10-31", text: "Os jogadores fugiram pela cripta.\nO conde desconfia." })
    expect(note).toContain('data: "2026-10-31"')
    expect(note).toContain("status: realizada")
    expect(note).toContain("# Sessão 12: O selo")
    expect(note).toMatch(/## Anotações\n+Os jogadores fugiram pela cripta\.\nO conde desconfia\./)
    expect(parseNote(note).frontmatter?.data).toMatchObject({ tipo: "sessao", numero: 12, data: "2026-10-31" })
  })

  it("copia um acontecimento como linha, no fim do rascunho", () => {
    const line = eventLine({ title: "Teste de Força", detail: "17", tokenName: "Aldren", at: new Date(2026, 9, 31, 20, 5).getTime() })
    expect(line).toBe("- 20:05 — Aldren: Teste de Força (17)")
    expect(appendLine("Começo", line)).toBe(`Começo\n${line}\n`)
    expect(appendLine("   ", line)).toBe(`${line}\n`)
  })
})
