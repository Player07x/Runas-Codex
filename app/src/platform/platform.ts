/**
 * Fronteira entre o app (igual nas três plataformas) e a casca nativa.
 * Electron (Windows/Linux) implementa esta interface em `electron-platform.ts`; o Capacitor (Android) vem num
 * próximo bloco da etapa 2. No navegador, o app usa a versão em memória de `memory-platform.ts`.
 *
 * Regra do projeto: toda lógica fica em TypeScript; a casca só faz E/S de arquivos em lote,
 * sockets e integração com o sistema.
 */
export interface VaultEntry {
  /** Caminho relativo à pasta do cofre, sempre com `/`, como o Obsidian vê. */
  path: string
  size: number
  mtime: number
}

export interface VaultInfo {
  name: string
  /** Pasta no disco (ou um rótulo, na plataforma em memória). */
  path: string
  /** A primeira abertura de um cofre existente nunca grava (docs/02, seção 5). */
  readOnly: boolean
}

export interface RoomHostInfo {
  lanUrl: string
  internetUrl?: string
  code: string
}

export interface Platform {
  readonly kind: "electron" | "capacitor" | "memory"
  /** Cofre aberto agora, ou `null` se nenhum foi escolhido. */
  vault(): Promise<VaultInfo | null>
  /** Pede ao usuário uma pasta de cofre; devolve o cofre aberto depois da escolha (o anterior, se cancelar). */
  chooseVault(): Promise<VaultInfo | null>
  /** Lista arquivos do cofre de uma vez (o SAF do Android é lento arquivo a arquivo). */
  listVault(prefix?: string): Promise<VaultEntry[]>
  readTexts(paths: string[]): Promise<Record<string, string>>
  writeText(path: string, content: string, expectedMtime?: number): Promise<VaultEntry>
  notify(title: string, body: string, at?: Date): Promise<void>
  hostRoom(mesaId: string): Promise<RoomHostInfo>
  stopRoom(): Promise<void>
}
