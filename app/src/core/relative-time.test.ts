import { displayTitle, editedAgo, spaceOf } from "./relative-time"

describe("quando a nota foi editada", () => {
  const now = new Date("2026-10-22T15:00").getTime()
  const at = (iso: string) => new Date(iso).getTime()
  it("fala em minutos, horas, ontem, dias e data", () => {
    expect(editedAgo(now - 10_000, now)).toBe("editada agora")
    expect(editedAgo(at("2026-10-22T14:55"), now)).toBe("editada há 5 min")
    expect(editedAgo(at("2026-10-22T09:00"), now)).toBe("editada há 6 h")
    expect(editedAgo(at("2026-10-21T23:00"), now)).toBe("editada ontem")
    expect(editedAgo(at("2026-10-19T10:00"), now)).toBe("editada há 3 dias")
    expect(editedAgo(at("2026-10-01T10:00"), now)).toBe("editada em 1 de out.")
  })
  it("diz o espaço pelo caminho", () => {
    expect(spaceOf("Wikis/Mundo/x.md")).toBe("Wiki")
    expect(spaceOf("Campanhas/V/S.md")).toBe("Campanhas")
    expect(spaceOf("solta.md")).toBe("Cofre")
  })
})

describe("título para mostrar", () => {
  const note = (name: string, extra: { title?: string; h1?: string } = {}) => ({ name, meta: { headings: extra.h1 ? [{ level: 1, text: extra.h1 }] : [], frontmatter: extra.title ? { data: { title: extra.title } } : null } })
  it("usa o título do evento, depois o # título, depois o nome sem a data", () => {
    expect(displayTitle(note("2026-10-03 Sessão 10", { title: "Sessão 10 — Valdris", h1: "Outro" }))).toBe("Sessão 10 — Valdris")
    expect(displayTitle(note("x", { h1: "Revisar o plano" }))).toBe("Revisar o plano")
    expect(displayTitle(note("2026-10-03 Sessão 10"))).toBe("Sessão 10")
    expect(displayTitle(note("2026-10-03"))).toBe("2026-10-03")
  })
})
