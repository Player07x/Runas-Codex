import type { DocumentChange } from "./ipc"
import { LOG_KINDS, type LogKind } from "./log"
import type { LogData, TokenData } from "./scene"
import type { DocumentDatabase } from "./database"
import { deleteDocument, putDocument } from "./world-documents"

export const MAX_LOG_ENTRIES = 500

export interface LogInput {
  kind: LogKind
  title: string
  detail: string
  tokenId: string | null
  /** Texto curto que sobe sobre o token (ex.: "-7 PV"). */
  floatingText: string
}

let sequence = 0
const newId = () => crypto.randomUUID().replaceAll("-", "")
const logSort = () => Date.now() + (sequence++ % 1000) / 1000

/** Acrescenta uma entrada ao Registro da mesa, guardando só as 500 mais recentes. */
export function postLog(database: DocumentDatabase, sceneId: string | null, input: LogInput): DocumentChange[] {
  const token = input.tokenId ? database.get(input.tokenId) : null
  const data: LogData = {
    kind: (LOG_KINDS as readonly string[]).includes(input.kind) ? input.kind : "info",
    title: input.title.slice(0, 160),
    detail: input.detail.slice(0, 2000),
    tokenId: token?.type === "token" ? token.id : null,
    tokenName: token?.type === "token" ? (token.data as TokenData).name : "",
    sceneId: token?.parentId ?? sceneId,
    floatingText: input.floatingText.slice(0, 40),
  }
  const changes = [putDocument(database, { id: newId(), type: "log-entry", parentId: null, sort: logSort(), data }).change]
  const entries = database.list("log-entry", null)
  for (const old of entries.slice(0, Math.max(0, entries.length - MAX_LOG_ENTRIES))) {
    const change = deleteDocument(database, old.id)
    if (change) changes.push(change)
  }
  return changes
}
