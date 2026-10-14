import type { VttApi } from "../vtt/shared/ipc"
import type { BackupInfo, VaultChange, VaultEntry, VaultInfo } from "./platform"

/** Esquema dos anexos do cofre na interface do desktop: `vault-file://cofre/<caminho>`. */
export const VAULT_FILE_SCHEME = "vault-file"

/**
 * O que o preload do desktop expõe em `window.runasCodex` (desktop/src/preload/index.ts).
 * Só tipos: o desktop importa este arquivo para os dois lados concordarem.
 */
export interface RunasCodexBridge {
  readonly platform: "electron"
  readonly vault: {
    current(): Promise<VaultInfo | null>
    choose(): Promise<VaultInfo | null>
    create(): Promise<VaultInfo | null>
    setWritable(writable: boolean): Promise<VaultInfo | null>
    list(prefix?: string): Promise<VaultEntry[]>
    read(paths: string[]): Promise<Record<string, string>>
    write(path: string, content: string, expected?: { mtime: number; size: number } | null): Promise<VaultEntry>
    createFolder(path: string): Promise<void>
    rename(from: string, to: string): Promise<void>
    trash(path: string): Promise<void>
    /** Liga a observação de mudanças externas; devolve a função que desliga. */
    onChange(listener: (changes: VaultChange[]) => void): () => void
    backup(): Promise<BackupInfo>
    listBackups(): Promise<BackupInfo[]>
    revealBackups(): Promise<void>
    /** Abre um anexo (PDF, imagem, áudio, vídeo) no programa padrão do sistema. */
    openFile(path: string): Promise<void>
    /** Grava `.obsidian/snippets/runas-codex.css` (o snippet que faz o Obsidian mostrar o dialeto como o app). */
    installSnippet(css: string): Promise<string>
  }
  /** A mesa (VTT): mesas do cofre, documentos, sala dos jogadores e áudio. */
  readonly vtt: VttApi
}
