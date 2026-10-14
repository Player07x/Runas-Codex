/**
 * Formato de uma mesa do Runas-Codex (o código vem do "mundo" do RunasVTT; aqui os nomes internos continuam
 * `World…`). Uma mesa é uma pasta dentro do cofre, que o Obsidian ignora por começar com ponto:
 *
 *   <cofre>/.runas/mesas/<nome>-<id8>/
 *     mesa.json           manifesto legível (este arquivo define o formato)
 *     cenas/<cena>.json   a cena e tudo o que ela contém (tokens, paredes, luzes, névoa…)
 *     outros.json         playlists, faixas, registro e o que não pertence a uma cena
 *     assets/             mapas, tokens e áudio, nomeados pelo hash do conteúdo
 *
 * Só o mestre grava; a gravação é adiada um pouco para juntar mudanças (docs/02, seção 4).
 */

export const WORLD_FORMAT_VERSION = 1
export const WORLD_MANIFEST_FILE = "mesa.json"
export const WORLD_SCENES_DIR = "cenas"
export const WORLD_OTHERS_FILE = "outros.json"
export const WORLD_ASSETS_DIR = "assets"
export const ASSET_KINDS = ["maps", "tokens", "tiles", "audio"] as const

export type AssetKind = (typeof ASSET_KINDS)[number]

export interface WorldManifest {
  formatVersion: number
  id: string
  title: string
  description: string
  createdAt: number
  updatedAt: number
}

export interface WorldSummary extends WorldManifest {
  /** Caminho absoluto da pasta da mesa. */
  path: string
  /** Número de cenas (para os cartões de Criar Sala). */
  scenes?: number
}

export interface NewWorldInput {
  title: string
  description?: string
}

/** Tipos de documento de uma mesa. O formato de `data` de cada tipo está em `scene.ts`, `audio.ts` e `region.ts`. */
export const DOCUMENT_TYPES = [
  "scene",
  "token",
  "tile",
  "drawing",
  "note",
  "wall",
  "light",
  /** Áreas exploradas de uma cena (Fase 6); só o processo principal grava. */
  "fog",
  "region",
  "sound",
  "playlist",
  "track",
  "log-entry",
] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export interface WorldDocument<TData = unknown> {
  id: string
  type: DocumentType
  /** Documento que contém este (por exemplo, o token pertence a uma cena). */
  parentId: string | null
  sort: number
  data: TData
  createdAt: number
  updatedAt: number
}

export const WORLD_TITLE_MAX_LENGTH = 80

export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === "string" && (DOCUMENT_TYPES as readonly string[]).includes(value)
}

export function normalizeWorldTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim().slice(0, WORLD_TITLE_MAX_LENGTH)
}

/**
 * Nome de pasta legível e seguro no Windows, macOS e Linux. O id aleatório no
 * final evita colisões entre mesas de mesmo nome.
 */
export function worldFolderName(title: string, id: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  return `${slug || "mesa"}-${id.slice(0, 8)}`
}

export function createWorldManifest(input: NewWorldInput, id: string, now: number): WorldManifest {
  const title = normalizeWorldTitle(input.title)
  if (!title) throw new Error("A mesa precisa de um nome.")
  return {
    formatVersion: WORLD_FORMAT_VERSION,
    id,
    title,
    description: (input.description ?? "").trim(),
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Lê um manifesto vindo do disco. Um manifesto de versão futura é recusado:
 * abrir uma mesa criada por uma versão mais nova do app poderia corrompê-la.
 */
export function parseWorldManifest(value: unknown): WorldManifest {
  if (!value || typeof value !== "object") throw new Error("Manifesto da mesa inválido.")
  const raw = value as Record<string, unknown>
  const formatVersion = typeof raw.formatVersion === "number" ? raw.formatVersion : NaN
  if (!Number.isInteger(formatVersion) || formatVersion < 1) throw new Error("Versão do formato da mesa inválida.")
  if (formatVersion > WORLD_FORMAT_VERSION) throw new Error(`Esta mesa usa o formato ${formatVersion}, mais novo que o suportado (${WORLD_FORMAT_VERSION}). Atualize o Runas-Codex.`)
  if (typeof raw.id !== "string" || !raw.id) throw new Error("Manifesto da mesa sem id.")
  const title = typeof raw.title === "string" ? normalizeWorldTitle(raw.title) : ""
  const createdAt = typeof raw.createdAt === "number" ? raw.createdAt : 0
  return {
    formatVersion,
    id: raw.id,
    title: title || "Mesa sem nome",
    description: typeof raw.description === "string" ? raw.description : "",
    createdAt,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : createdAt,
  }
}
