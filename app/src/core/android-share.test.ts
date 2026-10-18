import { describe, expect, it } from "vitest"
import { parseEvent, expandEvents } from "./agenda"
import { sharedNoteText, sharedNoteTitle, widgetItems } from "./android-share"

const NOW = new Date(2026, 9, 18, 9, 5)

describe("compartilhar com (Android)", () => {
  it("título do assunto, da primeira linha ou da hora, sem caracteres proibidos", () => {
    expect(sharedNoteTitle("Receita: bolo / fubá", undefined, NOW)).toBe("Receita bolo fubá")
    expect(sharedNoteTitle(undefined, "https://www.exemplo.com/a?b\nmais", NOW)).toBe("exemplo.com a b")
    expect(sharedNoteTitle(undefined, undefined, NOW)).toBe("Compartilhado 2026-10-18 09h05")
  })

  it("corpo com o texto e as imagens, e a data em propriedade", () => {
    expect(sharedNoteText("Assunto", "Texto", ["![[Imagem.png]]"], NOW)).toBe('---\ncompartilhado: "2026-10-18"\n---\n\n# Assunto\n\nTexto\n\n![[Imagem.png]]\n')
  })
})

describe("widget da Agenda", () => {
  it("os próximos quatro eventos, com dia e hora", () => {
    const events = [1, 2, 3, 4, 5].map((d) => parseEvent(`Agenda/e${d}.md`, `---\ntitle: E${d}\ndate: "2026-10-${18 + d}"\nstartTime: "19:30"\n---\n`)!)
    const items = widgetItems(expandEvents(events, NOW, new Date(2026, 10, 18)), NOW)
    expect(items).toHaveLength(4)
    expect(items[0]!.title).toBe("E1")
    expect(items[0]!.when).toMatch(/19\/10 19:30$/)
  })
})
