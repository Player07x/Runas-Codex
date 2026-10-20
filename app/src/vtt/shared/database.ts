import type { DocumentType, WorldDocument } from "./world"

/** Contrato da autoridade, sem arquivos, React ou APIs do sistema. */
export interface DocumentDatabase {
  get(id: string): WorldDocument | null
  list(type: DocumentType, parentId?: string | null): WorldDocument[]
  put(document: WorldDocument): void
  delete(id: string): void
  descendantIds(id: string): string[]
}
