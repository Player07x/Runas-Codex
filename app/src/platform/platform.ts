import type { Reminder } from "../core/agenda"
import type { UpdateInfo, UpdateInstallResult } from "../core/updates"

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
  /**
   * Um cofre que já existia abre em somente leitura até o usuário liberar a gravação (docs/02, seção 5).
   * Um cofre criado pelo app já nasce gravável.
   */
  readOnly: boolean
}

/** Mudança feita fora do app (Obsidian, sincronização) ou pelo próprio app em outra janela. */
export type VaultChange = { type: "changed"; entry: VaultEntry } | { type: "deleted"; path: string }

export interface BackupInfo {
  id: string
  createdAt: number
  /** Arquivos no backup (0 quando a contagem não está à mão). */
  files: number
  size: number
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
  /** Cria um cofre novo (pastas dos espaços + `.obsidian`) numa pasta escolhida pelo usuário. */
  createVault(): Promise<VaultInfo | null>
  /** Libera (ou volta a bloquear) a gravação no cofre aberto. */
  setWritable(writable: boolean): Promise<VaultInfo | null>
  /** Lista arquivos do cofre de uma vez (o SAF do Android é lento arquivo a arquivo). */
  listVault(prefix?: string): Promise<VaultEntry[]>
  readTexts(paths: string[]): Promise<Record<string, string>>
  /**
   * Grava um texto. `expected` é a versão que o app leu: se o arquivo mudou desde então, recusa. `null` cria e recusa
   * se já existir. Conteúdo igual ao do disco não é regravado.
   */
  writeText(path: string, content: string, expected?: VaultEntry | null): Promise<VaultEntry>
  createFolder(path: string): Promise<void>
  /** Renomeia ou move arquivo ou pasta (os links são atualizados antes, pelo app). */
  rename(from: string, to: string): Promise<void>
  /** Manda para a lixeira do cofre (`.trash`). */
  trash(path: string): Promise<void>
  /** Avisa de mudanças feitas fora do app. Devolve a função que para de observar. */
  watch(listener: (changes: VaultChange[]) => void): () => void
  backup(): Promise<BackupInfo>
  listBackups(): Promise<BackupInfo[]>
  /** Abre a pasta dos backups no gerenciador de arquivos. */
  revealBackups(): Promise<void>
  /** Endereço que a interface carrega para um anexo do cofre (imagem, áudio, vídeo); `null` se não dá para mostrar. */
  fileUrl(path: string): string | null
  /** Abre um anexo (PDF, mídia) no programa padrão do sistema. */
  openFile(path: string): Promise<void>
  /** Instala o snippet `runas-codex.css` no `.obsidian/snippets` do cofre; devolve o caminho gravado. */
  installSnippet(css: string): Promise<string>
  notify(title: string, body: string, at?: Date): Promise<void>
  /** Agenda os lembretes da Agenda (substitui os anteriores). */
  scheduleReminders(reminders: Reminder[]): Promise<void>
  /** Chama `listener` com o caminho da nota quando tocam num lembrete. */
  onReminderOpen(listener: (path: string) => void): () => void
  /** Salva um arquivo onde o usuário escolher (exportar `.ics`); devolve o nome, ou `null` se cancelou. */
  saveFile(name: string, content: string, mime: string): Promise<string | null>
  hostRoom(mesaId: string): Promise<RoomHostInfo>
  stopRoom(): Promise<void>
  /** Abre o diálogo de impressão do documento atual. */
  printDocument?(): void
  /** Lê um arquivo do cofre como bytes (imagem, PDF…). */
  readBinary(path: string): Promise<Uint8Array>
  /** Grava bytes no cofre com as mesmas regras do `writeText` (versão esperada, `null` só cria, nada oculto). */
  writeBinary(path: string, bytes: Uint8Array, expected?: VaultEntry | null): Promise<VaultEntry>
  /** Salva bytes onde o usuário escolher (exportações); devolve o nome, ou `null` se cancelou. */
  saveBytes(name: string, bytes: Uint8Array, mime: string): Promise<string | null>
  /** PDF das páginas prontas da prévia (desktop). */
  exportPdf?(name: string): Promise<string | null>
  /** Versão instalada do app (desktop). */
  appVersion?(): Promise<string>
  /** "Verificar atualizações" (ADR 0017): consulta as releases do GitHub, só quando o usuário clica. */
  checkUpdate?(): Promise<UpdateInfo>
  /** Baixa, confere pelo SHA-256 e instala a versão encontrada na última consulta. */
  installUpdate?(onProgress: (received: number, total: number) => void): Promise<UpdateInstallResult>
  /** Atalho global de captura rápida (desktop): pede uma nota nova, mesmo com o app em segundo plano. */
  onQuickCapture?(listener: () => void): () => void
  /** Abre uma rota de nota (`/notas/<caminho>`) numa janela extra (desktop: segundo monitor). */
  openWindow?(route: string): Promise<void>
  listTrash?(): Promise<VaultEntry[]>
  restoreTrash?(path: string, target: string): Promise<VaultEntry>
}
