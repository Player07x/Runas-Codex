import type { UpdateInfo, UpdateInstallResult } from "../core/updates"
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
    readBinary(path: string): Promise<Uint8Array>
    writeBinary(path: string, bytes: Uint8Array, expected?: { mtime: number; size: number } | null): Promise<VaultEntry>
  }
  /** Lembretes da Agenda (notificações do sistema, agendadas no processo principal). */
  readonly agenda: {
    schedule(reminders: { id: string; at: number; title: string; body: string; path: string }[]): Promise<number>
    /** Clique numa notificação de lembrete: o caminho da nota do evento. */
    onOpen(listener: (path: string) => void): () => void
  }
  /** Salva um arquivo onde o usuário escolher (exportações). Devolve o caminho, ou `null` se cancelou. */
  saveFile(name: string, content: string): Promise<string | null>
  /** A mesa (VTT): mesas do cofre, documentos, sala dos jogadores e áudio. */
  readonly vtt: VttApi
  /** Salva bytes onde o usuário escolher (exportações). Devolve o caminho, ou `null` se cancelou. */
  saveBytes(name: string, bytes: Uint8Array): Promise<string | null>
  /** PDF das páginas prontas da prévia do livro (`printToPDF`); devolve o caminho, ou `null` se cancelou. */
  exportPdf(name: string): Promise<string | null>
  /** Versão instalada e "Verificar atualizações" (ADR 0017). */
  readonly updates: {
    version(): Promise<string>
    check(): Promise<UpdateInfo>
    install(): Promise<UpdateInstallResult>
    onProgress(listener: (progress: { received: number; total: number }) => void): () => void
  }
  /** Atalho global de captura rápida (Ctrl+Alt+N), mesmo com o app em segundo plano. */
  onQuickCapture(listener: () => void): () => void
}
