import {
  appendToSection, campaignJournal, campaignStats, flattenLinks, clocksOf, compareOrder, listCampaigns, listPlayers, listQuests, listSessions, newCampaignNote, newQuestNote, newSessionNote, nextSessionNumber,
  nextCampaignSession, npcSightings, PREP_STEPS, prepItems, previousSession, reputationOf, secretsOf, sectionText, setClocks, setPrepDetail, setSecretRevealed, setSectionText, setTaskLine,
  trackedLinks, uniqueNoteName, upcomingSession, withoutPosition, withTrackedLink,
} from "./campaigns"
import { parseFrontmatter } from "./parse"
import { VaultIndex } from "./vault-index"

const C = "Campanhas/Cinzas/"
const HOME = `${C}Cinzas.md`
const files: Record<string, string> = {
  [HOME]: `---
tipo: campanha
status: ativa
resumo: "Lobos de brasa em Valdris."
wiki: "[[Wikis/Mundo/Mundo]]"
mesa: cinzas-1a2b
npcs: ["[[Wikis/Mundo/Personagens/Aldren|Aldren]] (aliado)", "[[Conde]] (hostil)", "[[Fantasma]]"]
faccoes: ["[[Ordem]] (+2)"]
linhas: [crianças em perigo]
veus: [tortura]
---
# As Cinzas

## Segredos e pistas

- [x] Os lobos vêm do alquimista. — revelado em [[Sessão 11]]
- [ ] O Conde deve à Ordem.

## Relógios

\`\`\`runas-relogios
- { nome: Ritual, segmentos: 8, preenchidos: 5, tipo: ameaca }
- { nome: Confiança de Aldren, segmentos: 4, preenchidos: 3, tipo: progresso }
\`\`\`
`,
  [`${C}Sessões/Sessão 11.md`]: `---
tipo: sessao
numero: 11
status: realizada
data: "2026-10-10"
data_mundo: "4031-07-15"
presentes: ["[[Ilsa]]", "[[Torvak]]"]
avaliacao: 9
---
# Sessão 11 — Os esgotos

Encontramos [[Aldren]] no covil.

## O que aconteceu

O grupo achou o covil dos lobos.
`,
  // Criada pela Agenda: sem tipo nem número, só data e o evento.
  [`${C}Sessões/Sessão 12.md`]: `---
data: "2026-10-17"
evento: "[[Agenda/2026-10-17 Sessão 12]]"
---
# Sessão 12

## Preparação

- [x] **Recapitulação** — Os esgotos.
- [ ] **Início forte**

## O que aconteceu
`,
  [`${C}Sessões/Sessão 10.md`]: `---
tipo: sessao
numero: 10
data: "2026-10-03"
presentes: ["[[Ilsa]]"]
---
# Sessão 10
`,
  "Agenda/2026-10-17 Sessão 12.md": `---
title: Sessão 12
allDay: false
startTime: "19:30"
endTime: "23:30"
type: single
date: "2026-10-17"
sessao: "[[Campanhas/Cinzas/Sessões/Sessão 12]]"
---
`,
  "Agenda/2026-10-03 Sessão 10.md": `---
title: Sessão 10
allDay: false
startTime: "20:00"
endTime: "23:00"
type: single
date: "2026-10-03"
sessao: "[[Campanhas/Cinzas/Sessões/Sessão 10]]"
---
`,
  [`${C}Missões/Lobos.md`]: "---\ntipo: missao\nstatus: ativa\nordem: \"1\"\ncontratante: \"[[Conde]]\"\nrecompensa: 200 moedas\n---\n# Descobrir quem solta os lobos\n",
  [`${C}Missões/Grimório.md`]: "---\nstatus: ideia\nordem: \"1.1\"\n---\n# Grimório de Sef\n",
  [`${C}Missões/Caravana.md`]: "---\nstatus: concluída\nordem: \"0.5\"\n---\n",
  [`${C}Personagens/Ilsa.md`]: "---\ntipo: personagem-jogador\njogador: Ana\nconceito: Ladina\n---\n# Ilsa Brasa\n",
  [`${C}Personagens/Torvak.md`]: "---\njogador: Bruno\n---\n",
  [`${C}Quadro.canvas`]: '{"nodes":[],"edges":[]}',
  "Campanhas/Outra/Nota solta.md": "texto",
  "Wikis/Mundo/Mundo.md": "# Mundo",
  "Wikis/Mundo/Personagens/Aldren.md": "# Aldren",
  "Wikis/Mundo/Personagens/Conde.md": "# Conde",
  "Wikis/Mundo/Organizações/Ordem.md": "# Ordem",
}
const index = new VaultIndex(Object.keys(files).map((path) => ({ path, size: 1, mtime: 1 })), files)
const TODAY = new Date("2026-10-14T10:00:00")
const cinzas = () => listCampaigns(index).find((c) => c.name === "Cinzas")!

describe("campanhas", () => {
  it("lista as campanhas pelas pastas, com a nota inicial e as propriedades", () => {
    const list = listCampaigns(index)
    expect(list.map((c) => c.name)).toEqual(["Cinzas", "Outra"])
    expect(list[0]).toMatchObject({ root: C, home: HOME, status: "ativa", summary: "Lobos de brasa em Valdris.", wiki: "Mundo", mesa: "cinzas-1a2b" })
    expect(list[1]).toMatchObject({ status: "ativa" })
    expect(list[1]!.home).toBeUndefined()
  })

  it("sessões pelo tipo ou pela pasta, com número, status pela data e horário do evento da Agenda", () => {
    const sessions = listSessions(index, cinzas(), TODAY)
    expect(sessions.map((s) => [s.name, s.number, s.status])).toEqual([
      ["Sessão 10", 10, "realizada"],
      ["Sessão 11", 11, "realizada"],
      ["Sessão 12", 12, "planejada"],
    ])
    const s12 = sessions[2]!
    expect(s12).toMatchObject({ date: "2026-10-17", time: "19:30", endTime: "23:30", event: "Agenda/2026-10-17 Sessão 12.md", title: "Sessão 12" })
    const s11 = sessions[1]!
    expect(s11).toMatchObject({ title: "Sessão 11 — Os esgotos", worldDate: "4031-07-15", rating: 9, summary: "O grupo achou o covil dos lobos." })
    expect(s11.present).toEqual([`${C}Personagens/Ilsa.md`, `${C}Personagens/Torvak.md`])
    expect(upcomingSession(sessions, TODAY)?.name).toBe("Sessão 12")
    expect(previousSession(sessions, s12)?.name).toBe("Sessão 11")
    // Sem `evento` na nota: o horário vem do evento da Agenda que aponta para a sessão.
    expect(sessions[0]).toMatchObject({ event: "Agenda/2026-10-03 Sessão 10.md", time: "20:00", endTime: "23:00" })
    expect(nextSessionNumber(sessions)).toBe(13)
  })

  it("tela inicial: a sessão do próximo evento da Agenda, ou a próxima planejada de qualquer campanha", () => {
    const viaAgenda = nextCampaignSession(index, TODAY, { session: "Campanhas/Cinzas/Sessões/Sessão 12", from: "Agenda/2026-10-17 Sessão 12.md" })
    expect(viaAgenda).toMatchObject({ campaign: { name: "Cinzas" }, session: { name: "Sessão 12", time: "19:30" } })
    expect(viaAgenda!.players).toHaveLength(2)
    expect(nextCampaignSession(index, TODAY)?.session.name).toBe("Sessão 12")
    expect(nextCampaignSession(index, new Date("2027-01-01T10:00:00"))).toBeNull()
  })

  it("preparação guiada: passos com nome em negrito, texto editável e marca preservada", () => {
    const text = files[`${C}Sessões/Sessão 12.md`]!
    const items = prepItems(text)
    expect(items.map((i) => [i.label, i.detail, i.done])).toEqual([
      ["Recapitulação", "Os esgotos.", true],
      ["Início forte", "", false],
    ])
    const edited = setPrepDetail(text, items[1]!, "A guarda bate\nà porta.")
    expect(prepItems(edited)[1]).toMatchObject({ label: "Início forte", detail: "A guarda bate à porta.", done: false })
    expect(edited.replace("- [ ] **Início forte** — A guarda bate à porta.", "- [ ] **Início forte**")).toBe(text)
    expect(setTaskLine(edited, items[1]!.line, { done: true })).toContain("- [x] **Início forte** — A guarda bate à porta.")
  })

  it("seções: lê, troca e acrescenta sem mexer no resto (inclusive CRLF)", () => {
    const text = "# S\r\n\r\n## Anotações\r\n\r\n- antes\r\n\r\n## O que aconteceu\r\n"
    expect(sectionText(text, "Anotações")).toBe("- antes")
    const appended = appendToSection(text, "Anotações", "- depois")
    expect(appended).toBe("# S\r\n\r\n## Anotações\r\n\r\n- antes\r\n- depois\r\n\r\n## O que aconteceu\r\n")
    const summary = setSectionText(appended, "O que aconteceu", "Tudo deu certo.")
    expect(summary).toBe("# S\r\n\r\n## Anotações\r\n\r\n- antes\r\n- depois\r\n\r\n## O que aconteceu\r\n\r\nTudo deu certo.\r\n")
    expect(setSectionText("# S\n", "Resumo", "Novo")).toBe("# S\n\n## Resumo\n\nNovo\n")
    // Título dentro de código não é seção.
    expect(sectionText("```\n## Anotações\n```\n", "Anotações")).toBeNull()
  })

  it("missões: status com apelidos, ordem narrativa e contratante resolvido", () => {
    const quests = listQuests(index, cinzas())
    expect(quests.map((q) => [q.title, q.status, q.order])).toEqual([
      ["Caravana", "concluida", "0.5"],
      ["Descobrir quem solta os lobos", "ativa", "1"],
      ["Grimório de Sef", "ideia", "1.1"],
    ])
    expect(quests[1]).toMatchObject({ reward: "200 moedas", giver: { target: "Conde", dest: "Wikis/Mundo/Personagens/Conde.md" } })
    expect(["10", "2", "1.1", "1"].sort(compareOrder)).toEqual(["1", "1.1", "2", "10"])
  })

  it("personagens dos jogadores e estatísticas (presença, nota e horas)", () => {
    const players = listPlayers(index, cinzas())
    expect(players.map((p) => [p.name, p.player ?? null])).toEqual([
      ["Ilsa Brasa", "Ana"],
      ["Torvak", "Bruno"],
    ])
    const stats = campaignStats(listSessions(index, cinzas(), TODAY), players)
    expect(stats).toMatchObject({ sessionsDone: 2, sessionsPlanned: 1, rating: 9, hours: 3 })
    expect(stats.attendance).toBeCloseTo(0.75)
  })

  it("NPCs com atitude e onde apareceram; facções com reputação", () => {
    const npcs = trackedLinks(index, cinzas(), "npcs")
    expect(npcs.map((n) => [n.target, n.dest, n.extra])).toEqual([
      ["Wikis/Mundo/Personagens/Aldren", "Wikis/Mundo/Personagens/Aldren.md", "aliado"],
      ["Conde", "Wikis/Mundo/Personagens/Conde.md", "hostil"],
      ["Fantasma", null, ""],
    ])
    const sessions = listSessions(index, cinzas(), TODAY)
    expect(npcSightings(index, npcs[0]!.dest, sessions)).toMatchObject({ mentions: 1, lastSeen: { name: "Sessão 11" } })
    expect(npcSightings(index, null, sessions)).toEqual({ mentions: 0 })
    const factions = trackedLinks(index, cinzas(), "faccoes")
    expect(reputationOf(factions[0]!.extra)).toBe(2)
    expect(reputationOf("-7")).toBe(-3)
    const data = parseFrontmatter(files[HOME]!)!.data!
    expect(withTrackedLink(data.npcs, 1, "Conde", "neutro")[1]).toBe("[[Conde]] (neutro)")
    expect(withTrackedLink(data.npcs, -1, "Wikis/Mundo/Organizações/Ordem", "")).toHaveLength(4)
    expect(withoutPosition(data.npcs, 2)).toHaveLength(2)
  })

  it("segredos: revelar grava a sessão; guardar de novo tira a marca", () => {
    const text = files[HOME]!
    const secrets = secretsOf(text)
    expect(secrets.map((s) => [s.clean, s.done, s.revealedIn ?? null])).toEqual([
      ["Os lobos vêm do alquimista.", true, "Sessão 11"],
      ["O Conde deve à Ordem.", false, null],
    ])
    const revealed = setSecretRevealed(text, secrets[1]!, true, "Campanhas/Cinzas/Sessões/Sessão 12")
    expect(revealed).toContain("- [x] O Conde deve à Ordem. — revelado em [[Campanhas/Cinzas/Sessões/Sessão 12]]")
    expect(setSecretRevealed(revealed, secretsOf(revealed)[1]!, false)).toBe(text)
  })

  it("relógios: lê o bloco, grava só o bloco e cria a seção se faltar", () => {
    const text = files[HOME]!
    const clocks = clocksOf(text)
    expect(clocks).toEqual([
      { name: "Ritual", segments: 8, filled: 5, kind: "ameaca" },
      { name: "Confiança de Aldren", segments: 4, filled: 3, kind: "progresso" },
    ])
    if ("error" in clocks) throw new Error()
    const next = setClocks(text, [{ ...clocks[0]!, filled: 6 }, clocks[1]!])
    expect(next.replace("preenchidos: 6", "preenchidos: 5")).toBe(text)
    expect(clocksOf(setClocks("# Nova\n", [{ name: "Ameaça", segments: 6, filled: 1, kind: "ameaca" }]))).toEqual([{ name: "Ameaça", segments: 6, filled: 1, kind: "ameaca" }])
    expect(clocksOf("```runas-relogios\nnome: x\n```")).toHaveProperty("error")
  })

  it("notas novas: campanha, sessão (com evento e roteiro de preparação), missão e nome livre", () => {
    const campaign = newCampaignNote("Coroa", { wiki: "Mundo", summary: "Intriga: palácio" })
    expect(parseFrontmatter(campaign)!.data).toMatchObject({ tipo: "campanha", status: "ativa", resumo: "Intriga: palácio", wiki: "Mundo", npcs: [] })
    expect(clocksOf(campaign)).toHaveLength(1)
    const session = newSessionNote({ number: 13, title: "O baile", date: "2026-10-24", time: "19:30", endTime: "23:00", event: "Agenda/2026-10-24 Sessão 13", worldDate: "4031-07-20", present: ["Campanhas/Cinzas/Personagens/Ilsa"] })
    expect(parseFrontmatter(session)!.data).toEqual({ tipo: "sessao", numero: 13, status: "planejada", data: "2026-10-24", hora: "19:30", hora_fim: "23:00", evento: "[[Agenda/2026-10-24 Sessão 13]]", data_mundo: "4031-07-20", presentes: ["[[Campanhas/Cinzas/Personagens/Ilsa]]"] })
    expect(prepItems(session).map((p) => p.label)).toEqual([...PREP_STEPS])
    expect(session).toContain("# Sessão 13 — O baile")
    expect(parseFrontmatter(newQuestNote("Ponte", { status: "ideia", order: "2", giver: "Conde", reward: "favor" }))!.data).toEqual({ tipo: "missao", status: "ideia", ordem: "2", contratante: "[[Conde]]", recompensa: "favor" })
    expect(uniqueNoteName(index, `${C}Sessões`, "Sessão 11")).toBe("Sessão 11 2")
    expect(uniqueNoteName(index, `${C}Sessões`, "Sessão 13")).toBe("Sessão 13")
  })
})

describe("exportar", () => {
  it("diário: só as sessões realizadas, com datas e os links virando texto", () => {
    const campaign = listCampaigns(index)[0]!
    const journal = campaignJournal(campaign, listSessions(index, campaign, TODAY), (d) => `dia ${d}`)
    expect(journal.startsWith("# Diário — Cinzas\n\nLobos de brasa em Valdris.\n\n## Sessão 10")).toBe(true)
    expect(journal).toContain("## Sessão 11 — Os esgotos\n\n*10/10/2026 · no mundo: dia 4031-07-15*\n\nO grupo achou o covil dos lobos.")
    expect(journal).not.toContain("Sessão 12")
    expect(journal.endsWith("\n")).toBe(true)
    expect(flattenLinks("Com [[Wikis/Mundo/Aldren Vael|Aldren]], [[Wikis/Mundo/Valdris#Distritos]] e ![[mapa.png]].")).toBe("Com Aldren, Valdris e mapa.png.")
  })
})
