import { describe, expect, it } from "vitest"
import { changesSince, hasChanges, hasLooseThreads, looseThreads, questOfSecret, secretQuest, withQuestLink } from "./campaign-insights"
import { castRows, listQuests, listSessions, secretsOf, trackedLinks, campaignInfo } from "./campaigns"
import { buildQuestMap, questNoticeBoard } from "./quest-map"
import { VaultIndex } from "./vault-index"

const C = "Campanhas/C/"
const day = (date: string) => new Date(`${date}T12:00:00`).getTime()
const notes: Record<string, { text: string; mtime?: number }> = {
  [`${C}C.md`]: { text: '---\ntipo: campanha\nnpcs: ["[[Yara]] (aliado)", "[[Brites]] (neutro)", "[[Velho]] (neutro)"]\n---\n# C\n\n## Segredos e pistas\n\n- [ ] O selo é falso → [[O Selo]]\n- [x] A carta foi forjada — revelado em [[Sessão 3]]\n- [ ] Pista velha → [[Escolta]]\n\n## Relógios\n\n```runas-relogios\n- { nome: Ameaça, segmentos: 6, preenchidos: 5, tipo: ameaca }\n```\n' },
  [`${C}Missões/O Selo.md`]: { text: "---\ntipo: missao\nstatus: ideia\n---\n# O Selo\n", mtime: day("2026-10-01") },
  [`${C}Missões/Escolta.md`]: { text: "---\ntipo: missao\nstatus: concluida\n---\n# Escolta\n", mtime: day("2026-10-01") },
  [`${C}Missões/Ritual.md`]: { text: "---\ntipo: missao\nstatus: ativa\n---\n# Ritual\n\n```runas-relogios\n- { nome: O ritual se completa, segmentos: 4, preenchidos: 4, tipo: ameaca }\n```\n", mtime: day("2026-10-18") },
  [`${C}Sessões/Sessão 1.md`]: { text: '---\ntipo: sessao\nnumero: 1\nstatus: realizada\ndata: "2026-10-03"\n---\n# Sessão 1\n\nCom [[Velho]].\n' },
  [`${C}Sessões/Sessão 2.md`]: { text: '---\ntipo: sessao\nnumero: 2\nstatus: realizada\ndata: "2026-10-10"\n---\n# Sessão 2\n\nCom [[Yara]].\n' },
  [`${C}Sessões/Sessão 3.md`]: { text: '---\ntipo: sessao\nnumero: 3\nstatus: realizada\ndata: "2026-10-17"\n---\n# Sessão 3\n\nCom [[Brites]] e [[Yara]].\n' },
  [`${C}Sessões/Sessão 4.md`]: { text: '---\ntipo: sessao\nnumero: 4\nstatus: realizada\ndata: "2026-10-24"\n---\n# Sessão 4\n\nNada.\n' },
  "Wikis/M/Yara.md": { text: "# Yara\n" },
  "Wikis/M/Brites.md": { text: "# Brites\n" },
  "Wikis/M/Velho.md": { text: "# Velho\n" },
}
const index = new VaultIndex(
  Object.entries(notes).map(([path, n]) => ({ path, mtime: n.mtime ?? day("2026-09-01"), size: n.text.length })),
  Object.fromEntries(Object.entries(notes).map(([path, n]) => [path, n.text])),
)
const campaign = campaignInfo(index, "C")
const sessions = listSessions(index, campaign, new Date("2026-11-01T12:00:00"))
const quests = listQuests(index, campaign)
const secrets = secretsOf(index.note(`${C}C.md`)!.text)
const rows = castRows(index, trackedLinks(index, campaign, "npcs"), sessions)

describe("pistas que destravam missões", () => {
  it("lê e escreve o link da missão no fim da pista", () => {
    expect(secretQuest("O selo é falso → [[O Selo]]")).toEqual({ text: "O selo é falso", target: "O Selo" })
    expect(secretQuest("Sem missão")).toBeNull()
    expect(withQuestLink(" O selo é falso ", "O Selo")).toBe("O selo é falso → [[O Selo]]")
    expect(questOfSecret(index, secrets[0]!, quests, campaign.home!)?.title).toBe("O Selo")
  })
})

describe("o que mudou desde a última sessão", () => {
  it("junta missões mexidas, pistas reveladas, NPCs novos e relógios perto de encher", () => {
    const last = sessions.find((s) => s.number === 3)!
    const changes = changesSince(index, { quests, secrets, rows, clocks: [{ name: "Ameaça", segments: 6, filled: 5, kind: "ameaca" }], home: campaign.home }, last)
    expect(changes.quests.map((q) => q.title)).toEqual(["Ritual"])
    expect(changes.revealed.map((s) => s.clean)).toEqual(["A carta foi forjada"])
    expect(changes.newNpcs.map((r) => r.name)).toEqual(["Brites"])
    expect(changes.clocks.map((c) => `${c.name}:${c.quest?.title ?? "campanha"}`)).toEqual(["Ameaça:campanha", "O ritual se completa:Ritual"])
    expect(hasChanges(changes)).toBe(true)
  })
})

describe("fios soltos", () => {
  it("acha missões ativas esquecidas, NPCs que sumiram e pistas de missões encerradas", () => {
    const threads = looseThreads(index, { quests, sessions, secrets, rows, home: campaign.home })
    expect(threads.quiet.map((q) => q.title)).toEqual(["Ritual"])
    expect(threads.vanished.map((r) => r.name)).toEqual(["Velho"])
    expect(threads.stale.map((t) => t.quest.title)).toEqual(["Escolta"])
    expect(hasLooseThreads(threads)).toBe(true)
  })

  it("não aponta nada antes de haver sessões suficientes", () => {
    const threads = looseThreads(index, { quests, sessions: sessions.slice(0, 2), secrets: [], rows, home: campaign.home })
    expect(threads.quiet).toEqual([])
    expect(threads.vanished).toEqual([])
  })
})

describe("quadro de missões na sala", () => {
  it("mostra só as missões conhecidas, sem as ideias", () => {
    const text = questNoticeBoard(buildQuestMap(quests), "C")
    expect(text).toContain("Quadro de missões — C")
    expect(text).toContain("Ritual — em andamento")
    expect(text).toContain("Escolta — concluída")
    expect(text).not.toContain("O Selo")
  })
})
