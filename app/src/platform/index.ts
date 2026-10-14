import type { RunasCodexBridge } from "./bridge"
import { createElectronPlatform } from "./electron-platform"
import { createMemoryPlatform } from "./memory-platform"
import type { Platform } from "./platform"

declare global {
  interface Window {
    /** Só existe dentro do app desktop (desktop/src/preload/index.ts). */
    runasCodex?: RunasCodexBridge
  }
}

/** A plataforma em que o app está rodando: Electron se a ponte existir; senão, o exemplo em memória. */
export const platform: Platform = window.runasCodex
  ? createElectronPlatform(window.runasCodex)
  : createMemoryPlatform((title, body) => window.dispatchEvent(new CustomEvent("runas-codex:aviso", { detail: { title, body } })))
