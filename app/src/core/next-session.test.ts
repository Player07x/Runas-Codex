import { nextSession, overdueSessions, sessionLinks } from "./next-session"
import { VaultIndex } from "./vault-index"

const vault = (files: Record<string, string>) => new VaultIndex(Object.entries(files).map(([path, text]) => ({ path, size: text.length, mtime: 1 })), files)
const now = new Date("2026-10-21T10:00")
const camp = "Campanhas/Valdris/Valdris.md"

describe("a próxima sessão, de uma fonte só", () => {
  it("o evento da Agenda e a nota da sessão ligados contam uma vez só", () => {
    const index = vault({
      [camp]: "# Valdris\n",
      "Campanhas/Valdris/Sessões/Sessão 13.md": '---\ntipo: sessao\nnumero: 13\nstatus: planejada\ndata: "2026-10-24"\nevento: "[[Agenda/2026-10-24 Sessão 13]]"\n---\n# Sessão 13\n',
      "Agenda/2026-10-24 Sessão 13.md": '---\ntitle: Sessão 13 — Valdris\nallDay: false\ntype: single\ndate: "2026-10-24"\nstartTime: "19:30"\ncategoria: Sessão\nsessao: "[[Campanhas/Valdris/Sessões/Sessão 13]]"\n---\n',
    })
    const next = nextSession(index, now)!
    expect(next.campaign).toBe("Valdris")
    expect(next.session?.number).toBe(13)
    expect(next.event?.event.title).toBe("Sessão 13 — Valdris")
    expect(next.when?.toISOString()).toBe(new Date("2026-10-24T19:30").toISOString())
  })

  it("um evento de sessão sem nota ainda é a próxima sessão, e acha a campanha pelo título", () => {
    const index = vault({
      [camp]: "# Valdris\n",
      "Campanhas/Valdris/Sessões/Sessão 14.md": '---\ntipo: sessao\nstatus: planejada\ndata: "2026-11-07"\n---\n',
      "Agenda/Sessão 13.md": '---\ntitle: Sessão 13 — Valdris\ntype: single\ndate: "2026-10-24"\nstartTime: "19:30"\ncategoria: Sessão\n---\n',
    })
    const next = nextSession(index, now)!
    expect(next.title).toBe("Sessão 13 — Valdris")
    expect(next.campaign).toBe("Valdris")
    expect(next.session).toBeNull()
  })

  it("sessão planejada sem evento entra pela data; a de data passada não", () => {
    const index = vault({
      [camp]: "# Valdris\n",
      "Campanhas/Valdris/Sessões/Sessão 12.md": '---\ntipo: sessao\nstatus: planejada\ndata: "2026-10-17"\n---\n',
      "Campanhas/Valdris/Sessões/Sessão 13.md": '---\ntipo: sessao\nstatus: planejada\ndata: "2026-10-31"\nhora: "20:00"\n---\n',
    })
    expect(nextSession(index, now)!.session?.date).toBe("2026-10-31")
    const links = sessionLinks(index, now)
    expect(overdueSessions(links.sessions.get("Valdris")!, now).map((s) => s.date)).toEqual(["2026-10-17"])
  })

  it("filtra por campanha e ignora sessão realizada ou cancelada", () => {
    const index = vault({
      [camp]: "# Valdris\n",
      "Campanhas/Cripta/Cripta.md": "# Cripta\n",
      "Campanhas/Cripta/Sessões/Sessão 1.md": '---\ntipo: sessao\nstatus: planejada\ndata: "2026-10-22"\n---\n',
      "Campanhas/Valdris/Sessões/Sessão 13.md": '---\ntipo: sessao\nstatus: cancelada\ndata: "2026-10-23"\n---\n',
      "Campanhas/Valdris/Sessões/Sessão 14.md": '---\ntipo: sessao\nstatus: planejada\ndata: "2026-11-01"\n---\n',
    })
    expect(nextSession(index, now)!.campaign).toBe("Cripta")
    expect(nextSession(index, now, "Valdris")!.session?.date).toBe("2026-11-01")
    expect(nextSession(vault({}), now)).toBeNull()
  })
})
