import type { Campaign, Note } from "./types"

const players = [
  { id: "ana", name: "Ana", character: "Ilsa Brasa", concept: "Ladina de rua", color: "#c76561" },
  { id: "bruno", name: "Bruno", character: "Torvak", concept: "Guerreiro do norte", color: "#82aaa6" },
  { id: "carla", name: "Carla", character: "Mirela", concept: "Sacerdotisa de Selene", color: "#b99b65" },
  { id: "diego", name: "Diego", character: "Sef", concept: "Aprendiz de mago", color: "#927f9c" },
]

const all = (value: boolean) => Object.fromEntries(players.map((pl) => [pl.id, value]))

export const CAMPAIGNS: Campaign[] = [
  {
    id: "cinzas-de-valdris",
    title: "As Cinzas de Valdris",
    status: "ativa",
    wikiId: "ordem-x-caos",
    mesaId: "cinzas",
    summary: "Os personagens investigam lobos de brasa nos esgotos de Valdris e acabam no meio da disputa entre o Conde e a Ordem.",
    accent: "#c76561",
    players,
    sessions: [
      { id: "s12", number: 12, title: "O selo na carta", date: "2026-10-17T19:30:00", status: "planejada", attendance: { ...all(true), diego: false }, worldDate: "4031-07-16" },
      { id: "s11", number: 11, title: "Os esgotos de brasa", date: "2026-10-10T19:30:00", status: "realizada", summary: "O grupo encontrou o covil dos lobos e Aldren apareceu para salvar Ilsa.", attendance: all(true), worldDate: "4031-07-15" },
      { id: "s10", number: 10, title: "Mercado das Brasas", date: "2026-10-03T19:30:00", status: "realizada", summary: "Negociação com Marta Fuligem; Sef perdeu o grimório.", attendance: { ...all(true), carla: false }, worldDate: "4031-07-11" },
      { id: "s9", number: 9, title: "Chegada a Valdris", date: "2026-09-26T19:30:00", status: "realizada", summary: "Entrada na cidade e audiência com o Conde.", attendance: all(true), worldDate: "4031-07-08" },
    ],
    quests: [
      { id: "q1", title: "Descobrir quem solta os lobos", status: "ativa", giver: "Guarda de Valdris", reward: "200 moedas", order: "1", tags: ["principal"] },
      { id: "q2", title: "Recuperar o grimório de Sef", status: "ativa", giver: "Sef", order: "1.1", tags: ["pessoal"] },
      { id: "q3", title: "Entregar a carta selada", status: "pausada", giver: "Aldren Vael", order: "2", tags: ["ordem"] },
      { id: "q4", title: "Culto do reflexo", status: "ideia", order: "3", tags: ["gancho"] },
      { id: "q5", title: "A torre de Vesper", status: "ideia", order: "4", tags: ["gancho"] },
      { id: "q6", title: "Escoltar a caravana de sal", status: "concluida", giver: "Marta Fuligem", reward: "Favor", order: "0.5", tags: [] },
      { id: "q7", title: "Salvar o ferreiro", status: "falhou", order: "0.7", tags: [] },
    ],
    clocks: [
      { id: "c1", title: "Ritual da Chama Cinzenta", segments: 8, filled: 5, kind: "ameaca" },
      { id: "c2", title: "Paciência do Conde", segments: 6, filled: 2, kind: "ameaca" },
      { id: "c3", title: "Confiança de Aldren", segments: 4, filled: 3, kind: "progresso" },
    ],
    npcs: [
      { name: "Aldren Vael", attitude: "aliado", lastSeen: "Sessão 11", knows: "Quem solta os lobos" },
      { name: "Conde Ormund", attitude: "hostil", lastSeen: "Sessão 9", knows: "A dívida com a Ordem" },
      { name: "Marta Fuligem", attitude: "neutro", lastSeen: "Sessão 10", knows: "Rotas de contrabando" },
    ],
    secrets: [
      { text: "Os lobos são criados por um alquimista da Ordem.", revealedIn: 11 },
      { text: "O Conde deve 10 mil moedas à Ordem." },
      { text: "Aldren é filho bastardo do Conde." },
      { text: "A carta pede a execução de Aldren." },
    ],
  },
  {
    id: "coroa-partida",
    title: "Coroa Partida",
    status: "pausada",
    wikiId: "ordem-x-caos",
    mesaId: "coroa",
    summary: "Intriga palaciana na Era das Migrações. Pausada até janeiro.",
    accent: "#b99b65",
    players: players.slice(0, 3),
    sessions: [
      { id: "cp3", number: 3, title: "O herdeiro falso", date: "2026-08-22T20:00:00", status: "realizada", attendance: all(true) },
    ],
    quests: [],
    clocks: [],
    npcs: [],
    secrets: [],
  },
  {
    id: "cripta",
    title: "One-shot: A Cripta",
    status: "concluida",
    wikiId: "ordem-x-caos",
    mesaId: "cripta",
    summary: "Aventura de uma noite para novos jogadores.",
    accent: "#927f9c",
    players: players.slice(1, 4),
    sessions: [
      { id: "cr1", number: 1, title: "A Cripta", date: "2026-07-04T19:00:00", status: "realizada", attendance: all(true) },
    ],
    quests: [],
    clocks: [],
    npcs: [],
    secrets: [],
  },
]

/** As notas de campanha do exemplo agora vêm de `campaign-demo.ts` (formato da etapa 7). */
export const CAMPAIGN_NOTES: Note[] = []
