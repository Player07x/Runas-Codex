/** Canais entre o preload e o processo principal. */
export const IPC = {
  vaultCurrent: "vault:current",
  vaultChoose: "vault:choose",
  vaultCreate: "vault:create",
  vaultSetWritable: "vault:set-writable",
  vaultList: "vault:list",
  vaultRead: "vault:read",
  vaultWrite: "vault:write",
  vaultCreateFolder: "vault:create-folder",
  vaultRename: "vault:rename",
  vaultTrash: "vault:trash",
  vaultBackup: "vault:backup",
  vaultListBackups: "vault:list-backups",
  vaultRevealBackups: "vault:reveal-backups",
  vaultOpenFile: "vault:open-file",
  vaultInstallSnippet: "vault:install-snippet",
  /** Do processo principal para a janela: mudanças feitas fora do app. */
  vaultChanged: "vault:changed",
  agendaSchedule: "agenda:schedule",
  /** Do processo principal para a janela: clicaram num lembrete. */
  agendaOpen: "agenda:open",
  saveFile: "files:save",
  vaultReadBinary: "vault:read-binary",
  vaultWriteBinary: "vault:write-binary",
  saveBytes: "files:save-bytes",
  booksPdf: "books:pdf",
  appVersion: "app:version",
  updatesCheck: "updates:check",
  updatesInstall: "updates:install",
  /** Do processo principal para a janela: andamento do download da atualização. */
  updatesProgress: "updates:progress",
  /** Do processo principal para a janela: o atalho global de captura rápida. */
  quickCapture: "app:quick-capture",
  /** Abre uma nota numa janela extra (segundo monitor). */
  openWindow: "app:open-window",
  vaultListTrash: "vault:list-trash",
  vaultRestoreTrash: "vault:restore-trash",
  trayEnabled: "desktop:tray-enabled",
  vaultTransferList: "vault:transfer-list",
  vaultTransferWrite: "vault:transfer-write",
} as const

export type { RunasCodexBridge } from "../../../app/src/platform/bridge"
export type { BackupInfo, VaultChange, VaultEntry, VaultInfo } from "../../../app/src/platform/platform"
