import { useEffect, useState } from "react"
import { Modal } from "../ui"
import { DocumentExport } from "./DocumentExport"
import { useVault } from "../../platform/VaultProvider"

export interface ExportRequest { paths: string[]; title?: string; players?: boolean; journal?: string }
export function openDocumentExport(request: ExportRequest): void {
  window.dispatchEvent(new CustomEvent<ExportRequest>("runas-codex:exportar-documento", { detail: request }))
}
export function ExportDialog() {
  const vault = useVault()
  const [request, setRequest] = useState<ExportRequest | null>(null)
  useEffect(() => {
    const listener = (event: Event) => setRequest((event as CustomEvent<ExportRequest>).detail)
    window.addEventListener("runas-codex:exportar-documento", listener)
    return () => window.removeEventListener("runas-codex:exportar-documento", listener)
  }, [])
  useEffect(() => setRequest(null), [vault.info?.path])
  return request && <Modal title="Exportar…" wide onClose={() => setRequest(null)}><DocumentExport key={JSON.stringify(request)} paths={request.paths} initialTitle={request.title} initialPlayers={request.players} journal={request.journal} selectable /></Modal>
}
