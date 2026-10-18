import { Capacitor } from "@capacitor/core"
import type { RunasCodexBridge } from "./bridge"
import { createCapacitorPlatform } from "./capacitor-platform"
import { createElectronPlatform } from "./electron-platform"
import { createMemoryPlatform } from "./memory-platform"
import type { Platform } from "./platform"

declare global {
  interface Window {
    /** Só existe dentro do app desktop (desktop/src/preload/index.ts). */
    runasCodex?: RunasCodexBridge
  }
}

/** A plataforma em que o app está rodando: Electron se a ponte existir; Android pelo Capacitor; senão, o exemplo em memória. */
export const platform: Platform = window.runasCodex
  ? createElectronPlatform(window.runasCodex)
  : Capacitor.isNativePlatform()
    ? createCapacitorPlatform()
    : createMemoryPlatform((title, body) => window.dispatchEvent(new CustomEvent("runas-codex:aviso", { detail: { title, body } })))
