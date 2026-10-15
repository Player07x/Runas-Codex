import { useEffect, useState } from "react"
import { basename, joinPath } from "../../core/text"
import { useVault } from "../../platform/VaultProvider"
import type { VaultEntry } from "../../platform/platform"
import { Modal, useToast } from "../ui"

export function TrashDialog({ root, onClose }: { root: string; onClose(): void }) {
  const vault = useVault(), toast = useToast()
  const [files, setFiles] = useState<VaultEntry[]>([]), [chosen, setChosen] = useState(""), [target, setTarget] = useState("")
  const [error, setError] = useState(""), [busy, setBusy] = useState(false)
  const refresh = async () => { if (!vault.platform.listTrash) throw new Error("A lixeira ainda não está disponível nesta plataforma."); setFiles(await vault.platform.listTrash()) }
  useEffect(() => { void refresh().catch(e => setError(String(e))) }, [])
  const restore = async () => {
    setBusy(true); setError("")
    try { await vault.restoreTrash(chosen, target); await refresh(); setChosen(""); toast(`Restaurado: ${target}`) } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return <Modal title="Lixeira do cofre" wide onClose={onClose} footer={<><button className="btn" onClick={onClose}>Fechar</button><button className="btn primary" disabled={busy || !chosen || !target.trim() || vault.info?.readOnly} onClick={() => void restore()}>Restaurar arquivo</button></>}>
    <p className="small muted">Escolha o destino no cofre. Um arquivo existente nunca é substituído. Arquivos apagados pelo Obsidian também aparecem aqui.</p>
    {error && <p role="alert" className="query-error">{error}</p>}
    <div className="list" style={{ maxHeight: "40vh", overflow: "auto" }}>{files.map(file => <button key={file.path} className={`list-item ${chosen === file.path ? "active" : ""}`} onClick={() => { setChosen(file.path); setTarget(joinPath(root, basename(file.path))!) }}><span className="grow truncate">{file.path.slice(7)}</span><span className="tiny muted">{new Date(file.mtime).toLocaleDateString("pt-BR")} · {file.size} B</span></button>)}</div>
    {!files.length && !error && <p className="muted">Nenhum arquivo na lixeira.</p>}
    {chosen && <label className="field"><span>Restaurar como (caminho relativo ao cofre)</span><input className="input" aria-label="Destino da restauração" value={target} onChange={e => setTarget(e.target.value)} /></label>}
  </Modal>
}
