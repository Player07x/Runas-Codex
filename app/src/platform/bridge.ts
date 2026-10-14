import type { VaultEntry, VaultInfo } from "./platform"

/**
 * O que o preload do desktop expõe em `window.runasCodex` (desktop/src/preload/index.ts).
 * Só tipos: o desktop importa este arquivo para os dois lados concordarem.
 */
export interface RunasCodexBridge {
  readonly platform: "electron"
  readonly vault: {
    current(): Promise<VaultInfo | null>
    choose(): Promise<VaultInfo | null>
    list(prefix?: string): Promise<VaultEntry[]>
    read(paths: string[]): Promise<Record<string, string>>
    write(path: string, content: string, expectedMtime?: number): Promise<VaultEntry>
  }
}
