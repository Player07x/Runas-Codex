export type SpaceId = "notas" | "agenda" | "wiki" | "campanhas" | "livros" | "mesas"

/** Uma nota `.md` do cofre. Tudo que é texto no Runas-Codex é uma nota. */
export interface Note {
  id: string
  title: string
  space: SpaceId
  /** Caminho no cofre, como o Obsidian vê. */
  path: string
  markdown: string
  tags: string[]
  aliases?: string[]
  updated: string
  pinned?: boolean
  color?: "red" | "gold" | "cyan" | "violet" | "green"
}

export type ArticleKind =
  | "personagem" | "local" | "cidade" | "organizacao" | "item" | "criatura" | "acontecimento" | "calendario" | "era"

export interface InfoField {
  label: string
  value: string
  /** Data no calendário fictício; o app calcula idade/tempo decorrido. */
  worldDate?: string
}

export interface WikiArticle extends Note {
  kind: ArticleKind
  category: string
  summary: string
  infobox: InfoField[]
  /** Chave `data_mundo` do frontmatter. */
  worldDate?: string
  portrait?: string
}

export interface AgendaEvent {
  id: string
  title: string
  start: string
  end?: string
  allDay?: boolean
  color: "red" | "gold" | "cyan" | "violet" | "green"
  category: string
  location?: string
  recurrence?: string
  reminder?: string
  campaignId?: string
  sessionId?: string
}

export type QuestStatus = "ideia" | "ativa" | "pausada" | "concluida" | "falhou"

export interface Quest {
  id: string
  title: string
  status: QuestStatus
  giver?: string
  reward?: string
  order: string
  tags: string[]
}

export interface Session {
  id: string
  number: number
  title: string
  date: string
  status: "planejada" | "realizada" | "cancelada"
  summary?: string
  attendance: Record<string, boolean>
  worldDate?: string
}

export interface Player {
  id: string
  name: string
  character: string
  concept: string
  color: string
}

export interface Clock {
  id: string
  title: string
  segments: number
  filled: number
  kind: "ameaca" | "progresso"
}

export interface Campaign {
  id: string
  title: string
  status: "ativa" | "pausada" | "concluida"
  wikiId: string
  mesaId?: string
  summary: string
  accent: string
  players: Player[]
  sessions: Session[]
  quests: Quest[]
  clocks: Clock[]
  npcs: { name: string; attitude: "aliado" | "neutro" | "hostil"; lastSeen: string; knows: string }[]
  secrets: { text: string; revealedIn?: number }[]
}

export interface BookChapter {
  id: string
  title: string
  part: string
  words: number
  status: "rascunho" | "revisão" | "pronto"
  markdown: string
}

export interface Book {
  id: string
  title: string
  subtitle: string
  theme: string
  page: "A4" | "Carta" | "A5"
  goal: number
  chapters: BookChapter[]
}

export interface Token {
  id: string
  name: string
  x: number
  y: number
  size: number
  color: string
  kind: "jogador" | "aliado" | "neutro" | "hostil"
  hp?: [number, number]
  conditions?: string[]
  hidden?: boolean
  owner?: string
}

export interface Scene {
  id: string
  name: string
  folder: string
  grid: "quadrada" | "hex" | "nenhuma"
  cols: number
  rows: number
  tokens: Token[]
}

export interface Mesa {
  id: string
  title: string
  campaignId?: string
  lastSession: string
  scenes: Scene[]
  players: number
  sizeMb: number
  palette: [string, string]
}
