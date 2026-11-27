import type { PlayerBarVisibility, PlayerState } from "./ipc"
import { FOLLOW_TOKENS_SCENE } from "./player"
import { DEFAULT_CAMERA_RULES, normalizeCameraRules, type CameraRules } from "./player-camera"
import { MAX_PLAYER_SEATS } from "./player-session"

/**
 * Configurações da sala (1.9): o que o mestre escolheu para a transmissão. Cada mesa guarda as da última sessão (um
 * documento `room-settings` em `outros.json`, que o Obsidian não vê) e a sala volta assim ao ser ligada. Dá para
 * salvar com nome (predefinições deste aparelho), exportar e importar como `.json`. Códigos dos assentos e a chave da
 * sala nunca entram: mudam a cada sessão. O link público continua pedindo confirmação (ADR 0032); só fica lembrado.
 */
export interface RoomSettings {
  port: number
  seats: number
  /** `"mestre"`: a cena aberta pelo mestre; `"token"`: a cena do token de cada jogador; senão o id de uma cena. */
  scene: string
  moves: boolean
  audio: boolean
  bars: PlayerBarVisibility
  camera: CameraRules
  shareRuler: boolean
  /** Na última sessão o mestre abriu o link público. */
  publicLink: boolean
}

export const ROOM_SETTINGS_ID = "sala"
export const ROOM_SETTINGS_FORMAT = "runas-codex-sala"
export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  port: 30000, seats: 1, scene: "mestre", moves: true, audio: true, bars: "friendly", camera: { ...DEFAULT_CAMERA_RULES }, shareRuler: true, publicLink: false,
}

const BARS: readonly PlayerBarVisibility[] = ["friendly", "all", "none"]
const record = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {})
const int = (value: unknown, fallback: number, min: number, max: number) => (typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback)
const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback)

export function normalizeRoomSettings(value: unknown): RoomSettings {
  const raw = record(value)
  const scene = typeof raw.scene === "string" && /^(mestre|token|[A-Za-z0-9_-]{1,64})$/.test(raw.scene) ? raw.scene : DEFAULT_ROOM_SETTINGS.scene
  return {
    port: int(raw.port, DEFAULT_ROOM_SETTINGS.port, 1024, 65535),
    seats: int(raw.seats, DEFAULT_ROOM_SETTINGS.seats, 1, MAX_PLAYER_SEATS),
    scene,
    moves: bool(raw.moves, DEFAULT_ROOM_SETTINGS.moves),
    audio: bool(raw.audio, DEFAULT_ROOM_SETTINGS.audio),
    bars: BARS.includes(raw.bars as PlayerBarVisibility) ? raw.bars as PlayerBarVisibility : DEFAULT_ROOM_SETTINGS.bars,
    camera: normalizeCameraRules(raw.camera),
    shareRuler: bool(raw.shareRuler, DEFAULT_ROOM_SETTINGS.shareRuler),
    publicLink: bool(raw.publicLink, DEFAULT_ROOM_SETTINGS.publicLink),
  }
}

/** O que a sala ligada está usando agora, para guardar. */
export function settingsFromState(state: PlayerState, previous: RoomSettings): RoomSettings {
  return normalizeRoomSettings({
    port: state.port,
    seats: state.seats.length || previous.seats,
    scene: state.sceneId === FOLLOW_TOKENS_SCENE ? "token" : state.sceneId ?? "mestre",
    moves: state.moves,
    audio: state.audio,
    bars: state.bars,
    camera: state.camera,
    shareRuler: state.shareRuler,
    publicLink: Boolean(state.publicUrl) || previous.publicLink,
  })
}

/** A cena transmitida para `setScene`: uma cena que não existe mais nesta mesa volta para a do mestre. */
export function sceneForRoom(settings: RoomSettings, sceneIds: readonly string[]): string | null {
  if (settings.scene === "token") return FOLLOW_TOKENS_SCENE
  if (settings.scene === "mestre") return null
  return sceneIds.includes(settings.scene) ? settings.scene : null
}

export function sameRoomSettings(a: RoomSettings, b: RoomSettings): boolean {
  return JSON.stringify(normalizeRoomSettings(a)) === JSON.stringify(normalizeRoomSettings(b))
}

/** Arquivo `.json` para levar a outra mesa ou outro aparelho. */
export function exportRoomSettings(settings: RoomSettings, name: string): string {
  return `${JSON.stringify({ formato: ROOM_SETTINGS_FORMAT, versao: 1, nome: name, ...normalizeRoomSettings(settings) }, null, 2)}\n`
}

/** Lê um arquivo exportado; recusa o que não for configuração de sala do Runas-Codex. */
export function importRoomSettings(text: string): { name: string; settings: RoomSettings } {
  let raw: Record<string, unknown>
  try { raw = record(JSON.parse(text)) } catch { throw new Error("O arquivo não é um JSON válido.") }
  if (raw.formato !== ROOM_SETTINGS_FORMAT) throw new Error("Este arquivo não é uma configuração de sala do Runas-Codex.")
  const name = typeof raw.nome === "string" && raw.nome.trim() ? raw.nome.trim().slice(0, 60) : "Importada"
  return { name, settings: normalizeRoomSettings(raw) }
}

export interface RoomPreset { name: string; settings: RoomSettings }

/** Predefinições salvas neste aparelho: nomes únicos (sem diferenciar maiúsculas), no máximo 30. */
export function normalizePresets(value: unknown): RoomPreset[] {
  const list = Array.isArray(value) ? value : []
  const seen = new Set<string>()
  const presets: RoomPreset[] = []
  for (const entry of list) {
    const raw = record(entry)
    const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 60) : ""
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    presets.push({ name, settings: normalizeRoomSettings(raw.settings) })
  }
  return presets.slice(0, 30)
}

/** Guarda (ou substitui, pelo nome) uma predefinição, no topo da lista. */
export function savePreset(presets: readonly RoomPreset[], name: string, settings: RoomSettings): RoomPreset[] {
  const clean = name.trim().slice(0, 60)
  if (!clean) return [...presets]
  return normalizePresets([{ name: clean, settings }, ...presets.filter((preset) => preset.name.toLowerCase() !== clean.toLowerCase())])
}
