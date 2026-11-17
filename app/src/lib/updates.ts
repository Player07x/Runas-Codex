import { useSyncExternalStore } from "react"
import type { Platform } from "../platform/platform"
import type { UpdateInfo, UpdateInstallResult } from "../core/updates"
import { dayKey, installable, parseUpdateMemory, rememberCheck, rememberedUpdate, serializeUpdateMemory, shouldAutoCheck } from "../core/update-schedule"
import { flushOpenNotes } from "./vault-notes"

/**
 * Estado único das atualizações (ADR 0017 e 0038): a linha de Configurações e o item “Atualizar para …” da barra
 * lateral usam a mesma consulta e o mesmo download, para um não começar outro por cima. Preferências deste aparelho
 * no `localStorage` (regra 5): `runas-codex:atualizacao-automatica` ("0" desliga) e `runas-codex:atualizacao-consulta`.
 */
export const AUTO_KEY = "runas-codex:atualizacao-automatica"
export const MEMORY_KEY = "runas-codex:atualizacao-consulta"
/** A consulta automática espera o app abrir o cofre e desenhar a tela antes de ir à rede. */
export const AUTO_DELAY_MS = 4000

export type UpdatePlatform = Pick<Platform, "appVersion" | "checkUpdate" | "installUpdate">

export interface UpdateState {
  /** Versão instalada ("" até a plataforma responder). */
  current: string
  /** A última consulta desta sessão. */
  info: UpdateInfo | null
  phase: "parado" | "verificando" | "baixando"
  progress: { received: number; total: number } | null
  error: string
  /** Versão nova com instalador para este sistema: da consulta desta sessão ou lembrada da consulta de hoje. */
  available: string | null
  /** Consultar sozinho uma vez por dia (ligado por padrão). */
  auto: boolean
}

interface StoreOptions {
  storage?: Pick<Storage, "getItem" | "setItem"> | null
  flush?: () => Promise<void>
  now?: () => Date
  schedule?: (run: () => void, ms: number) => void
  online?: () => boolean
}

export function createUpdateStore(options: StoreOptions = {}) {
  const storage = options.storage === undefined ? safeLocalStorage() : options.storage
  const flush = options.flush ?? (async () => {})
  const now = options.now ?? (() => new Date())
  const schedule = options.schedule ?? ((run, ms) => void setTimeout(run, ms))
  const online = options.online ?? (() => typeof navigator === "undefined" || navigator.onLine !== false)
  const listeners = new Set<() => void>()
  const read = (key: string) => {
    try { return storage?.getItem(key) ?? null } catch { return null }
  }
  const write = (key: string, value: string) => {
    try { storage?.setItem(key, value) } catch { /* fica só nesta sessão */ }
  }
  let memory = parseUpdateMemory(read(MEMORY_KEY))
  let state: UpdateState = { current: "", info: null, phase: "parado", progress: null, error: "", available: null, auto: read(AUTO_KEY) !== "0" }
  let started = false
  let versionAsked: Promise<string> | null = null

  const set = (patch: Partial<UpdateState>) => {
    const next = { ...state, ...patch }
    next.available = next.info ? (installable(next.info) ? next.info.latest!.version : null) : rememberedUpdate(memory, next.current)
    state = next
    listeners.forEach((listener) => listener())
  }
  const message = (reason: unknown) => (reason instanceof Error ? reason.message : String(reason))

  const loadVersion = (platform: UpdatePlatform): Promise<string> => {
    versionAsked ??= (platform.appVersion?.() ?? Promise.resolve("")).then(
      (current) => (set({ current }), current),
      () => "",
    )
    return versionAsked
  }

  /** Consulta as versões publicadas. A automática não mostra erro (sem internet, tenta de novo na próxima abertura). */
  const check = async (platform: UpdatePlatform, automatic = false): Promise<UpdateInfo | null> => {
    if (!platform.checkUpdate || state.phase !== "parado") return null
    set({ phase: "verificando", error: automatic ? state.error : "" })
    try {
      const info = await platform.checkUpdate()
      memory = rememberCheck(info, dayKey(now()))
      write(MEMORY_KEY, serializeUpdateMemory(memory))
      set({ info, current: info.current || state.current, phase: "parado" })
      return info
    } catch (reason) {
      set({ phase: "parado", error: automatic ? state.error : message(reason) })
      return null
    }
  }

  /** “Atualizar para …”: consulta de novo se esta sessão ainda não consultou, grava as notas, baixa, confere e instala. */
  const install = async (platform: UpdatePlatform): Promise<UpdateInstallResult | null> => {
    if (!platform.installUpdate || state.phase !== "parado") return null
    const info = installable(state.info) ? state.info : await check(platform)
    if (!info) throw new Error(state.error || "Não foi possível consultar as versões publicadas.")
    if (!installable(info)) {
      const reason = info.newer ? "Esta versão não tem instalador conferível para este sistema." : `Você já está na versão mais nova (${info.current}).`
      set({ error: info.newer ? reason : "" })
      throw new Error(reason)
    }
    set({ phase: "baixando", progress: null, error: "" })
    try {
      await flush()
      const result = await platform.installUpdate((received, total) => set({ progress: { received, total } }))
      set({ phase: "parado" })
      return result
    } catch (reason) {
      set({ phase: "parado", error: message(reason) })
      throw reason
    }
  }

  /** Ao abrir o app: lê a versão e, com a opção ligada, consulta uma vez por dia. Só a primeira chamada vale. */
  const start = (platform: UpdatePlatform) => {
    if (started || !platform.checkUpdate || !platform.installUpdate) return
    started = true
    void loadVersion(platform).then(() => {
      if (!shouldAutoCheck(state.auto, memory, dayKey(now())) || !online()) return
      schedule(() => void check(platform, true), AUTO_DELAY_MS)
    })
  }

  const setAuto = (auto: boolean) => {
    write(AUTO_KEY, auto ? "1" : "0")
    set({ auto })
  }

  return {
    get: () => state,
    subscribe: (listener: () => void) => (listeners.add(listener), () => void listeners.delete(listener)),
    loadVersion,
    check,
    install,
    start,
    setAuto,
  }
}

function safeLocalStorage(): Storage | null {
  try { return typeof localStorage === "undefined" ? null : localStorage } catch { return null }
}

let shared: ReturnType<typeof createUpdateStore> | null = null

/** O estado do app inteiro. As notas abertas gravam antes de instalar (`flushOpenNotes`). */
export function updates() {
  shared ??= createUpdateStore({ flush: flushOpenNotes })
  return shared
}

export function useUpdates(): UpdateState {
  const store = updates()
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

/** O aviso depois de baixar e conferir, igual na barra lateral e em Configurações. */
export function installedMessage(result: UpdateInstallResult): string {
  if (result === "instalador-aberto") return "O instalador abriu. O Runas-Codex vai fechar para ele trocar os arquivos."
  if (result === "reiniciar") return "Atualizado. O Runas-Codex está reiniciando."
  return "O instalador do sistema abriu. Confirme a atualização por lá; cancelar mantém o app atual."
}

/** Porcentagem baixada (0–100), ou `null` enquanto o tamanho não é conhecido. */
export function progressPercent(progress: UpdateState["progress"]): number | null {
  if (!progress || progress.total <= 0) return null
  return Math.min(100, Math.max(0, Math.round((progress.received / progress.total) * 100)))
}
