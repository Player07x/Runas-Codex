/**
 * Fronteira entre o app (igual nas três plataformas) e a casca nativa.
 * Electron (Windows/Linux) e Capacitor (Android) implementam esta interface na etapa 2;
 * o protótipo usa a versão em memória de `memory-platform.ts`.
 *
 * Regra do projeto: toda lógica fica em TypeScript; a casca só faz E/S de arquivos em lote,
 * sockets e integração com o sistema.
 */
export interface VaultEntry {
  path: string
  size: number
  mtime: number
}

export interface RoomHostInfo {
  lanUrl: string
  internetUrl?: string
  code: string
}

export interface Platform {
  readonly kind: "electron" | "capacitor" | "memory"
  readonly vaultName: string
  /** Lista arquivos do cofre de uma vez (o SAF do Android é lento arquivo a arquivo). */
  listVault(prefix?: string): Promise<VaultEntry[]>
  readTexts(paths: string[]): Promise<Record<string, string>>
  writeText(path: string, content: string, expectedMtime?: number): Promise<VaultEntry>
  notify(title: string, body: string, at?: Date): Promise<void>
  hostRoom(mesaId: string): Promise<RoomHostInfo>
  stopRoom(): Promise<void>
}
