/** Canais entre o preload e o processo principal. */
export const IPC = {
  vaultCurrent: "vault:current",
  vaultChoose: "vault:choose",
  vaultList: "vault:list",
  vaultRead: "vault:read",
  vaultWrite: "vault:write",
} as const

export type { RunasCodexBridge } from "../../../app/src/platform/bridge"
export type { VaultEntry, VaultInfo } from "../../../app/src/platform/platform"
