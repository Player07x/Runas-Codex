import { describe, expect, it } from "vitest"
import type { PlayerState } from "./ipc"
import { FOLLOW_TOKENS_SCENE } from "./player"
import { DEFAULT_ROOM_SETTINGS, exportRoomSettings, importRoomSettings, normalizePresets, normalizeRoomSettings, sameRoomSettings, savePreset, sceneForRoom, settingsFromState } from "./room-settings"

const state = (patch: Partial<PlayerState>): PlayerState => ({
  enabled: true, port: 30500, key: "k", localUrl: null, publicUrl: null, tunnel: null, tunnelLost: false, drop: null, sceneId: null,
  audio: false, moves: true, bars: "all", spectators: 0, players: 0, sessionId: "s", seats: [], camera: { lockToToken: true, maxZoomOut: 10 }, shareRuler: false, ...patch,
})

describe("configurações da sala", () => {
  it("normaliza o que vem gravado, com limites de porta e de jogadores", () => {
    expect(normalizeRoomSettings(undefined)).toEqual(DEFAULT_ROOM_SETTINGS)
    const settings = normalizeRoomSettings({ port: 80, seats: 40, scene: "../x", bars: "talvez", camera: { lockToToken: true, maxZoomOut: 1 } })
    expect(settings).toMatchObject({ port: 1024, seats: 12, scene: "mestre", bars: "friendly", camera: { lockToToken: true, maxZoomOut: 4 } })
  })

  it("guarda o que a sala ligada usa, sem códigos nem chave", () => {
    const seats = [{ slotId: "player-1" }, { slotId: "player-2" }, { slotId: "player-3" }] as PlayerState["seats"]
    const saved = settingsFromState(state({ seats, sceneId: FOLLOW_TOKENS_SCENE, publicUrl: "https://exemplo.trycloudflare.com" }), DEFAULT_ROOM_SETTINGS)
    expect(saved).toEqual({ port: 30500, seats: 3, scene: "token", moves: true, audio: false, bars: "all", camera: { lockToToken: true, maxZoomOut: 10 }, shareRuler: false, publicLink: true })
    expect(JSON.stringify(saved)).not.toContain("\"key\"")
  })

  it("volta a cena transmitida, e uma cena que sumiu vira a do mestre", () => {
    expect(sceneForRoom({ ...DEFAULT_ROOM_SETTINGS, scene: "token" }, [])).toBe(FOLLOW_TOKENS_SCENE)
    expect(sceneForRoom({ ...DEFAULT_ROOM_SETTINGS, scene: "cena-1" }, ["cena-1"])).toBe("cena-1")
    expect(sceneForRoom({ ...DEFAULT_ROOM_SETTINGS, scene: "apagada" }, ["cena-1"])).toBeNull()
  })

  it("exporta e importa com nome, e recusa outro tipo de arquivo", () => {
    const settings = { ...DEFAULT_ROOM_SETTINGS, seats: 4, camera: { lockToToken: true, maxZoomOut: 12 } }
    const imported = importRoomSettings(exportRoomSettings(settings, "Mega dungeon"))
    expect(imported.name).toBe("Mega dungeon")
    expect(sameRoomSettings(imported.settings, settings)).toBe(true)
    expect(() => importRoomSettings("{\"port\": 1}")).toThrow("não é uma configuração de sala")
    expect(() => importRoomSettings("não é json")).toThrow("JSON válido")
  })

  it("salva predefinições por nome, substituindo a de mesmo nome", () => {
    const first = savePreset([], "Mega dungeon", DEFAULT_ROOM_SETTINGS)
    const second = savePreset(first, "Cidade", { ...DEFAULT_ROOM_SETTINGS, seats: 5 })
    const replaced = savePreset(second, "mega DUNGEON", { ...DEFAULT_ROOM_SETTINGS, seats: 3 })
    expect(replaced.map((preset) => [preset.name, preset.settings.seats])).toEqual([["mega DUNGEON", 3], ["Cidade", 5]])
    expect(normalizePresets([{ name: "" }, { name: "A" }, { name: "a" }, "x"])).toHaveLength(1)
  })
})
