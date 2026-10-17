import { useMemo, useState } from "react"
import { Image as ImageIcon } from "lucide-react"
import { DEFAULT_IMAGE_FOLDER, imageRenameTarget, linkedImages, planImageMoves } from "../../core/images"
import { basename, dirname, extname } from "../../core/text"
import { planRename, renameProblem } from "../../core/rename"
import { flushOpenNotes } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { Modal, useToast } from "../ui"

export function NoteImages({ path, text, onRename }: { path: string; text: string; onRename(path: string): void }) {
  const vault = useVault(), [open, setOpen] = useState(false)
  const images = useMemo(() => vault.index ? linkedImages(vault.index, path, text) : [], [vault.index, vault.version, path, text])
  return <><button className="icon-btn" aria-label="Imagens vinculadas à nota" title="Renomear imagens pelos links desta nota" disabled={vault.info?.readOnly || !images.length} onClick={() => setOpen(true)}><ImageIcon size={17}/></button>
    {open && <Modal title="Imagens vinculadas à nota" onClose={() => setOpen(false)}><p className="small muted">Escolha o link da imagem. Renomear atualiza todas as referências resolvidas no cofre, inclusive outras notas e cartões de quadro.</p>
      {images.map(image => <button className="list-item" key={image} onClick={() => { setOpen(false); onRename(image) }}><ImageIcon size={16}/><span>{image}</span></button>)}
    </Modal>}</>
}
export function ImageRenameDialog({ path, onClose }: { path: string; onClose(): void }) {
  const vault = useVault(), index = vault.index!, toast = useToast()
  const ext = extname(path), [name, setName] = useState(basename(path).slice(0, -ext.length)), [folder, setFolder] = useState(dirname(path))
  const [busy, setBusy] = useState(false), [error, setError] = useState("")
  const to = imageRenameTarget(path, name, folder), problem = renameProblem(index, path, to)
  const count = problem ? 0 : planRename(index, path, to).edits.length
  const run = async () => {
    setBusy(true); setError("")
    try {
      await flushOpenNotes()
      const plan = await vault.rename(path, to)
      toast(`Imagem renomeada. Links atualizados em ${plan.edits.length} arquivos.`); onClose()
    } catch (error) { setError(error instanceof Error ? error.message : String(error)) } finally { setBusy(false) }
  }
  return <Modal title="Renomear ou mover imagem" onClose={() => { if (!busy) onClose() }} footer={<><button className="btn" disabled={busy} onClick={onClose}>Cancelar</button><button className="btn primary" form="rename-image" disabled={busy || Boolean(problem)}>{busy ? "Renomeando…" : "Renomear imagem"}</button></>}>
    <form id="rename-image" className="stack" onSubmit={event => { event.preventDefault(); if (!busy && !problem) void run() }}>
      <p className="small muted">{path}</p><label className="field"><span>Novo nome (extensão {ext} preservada)</span><input className="input" autoFocus aria-label="Novo nome da imagem" value={name} onChange={event => setName(event.target.value)}/></label>
      <label className="field"><span>Pasta no cofre</span><input className="input" aria-label="Pasta da imagem" value={folder} onChange={event => setFolder(event.target.value)} list="image-folders"/></label>
      <datalist id="image-folders">{[...new Set(["",DEFAULT_IMAGE_FOLDER,...index.allFiles().map(file => dirname(file.path))])].map(folder => <option key={folder} value={folder}/>)}</datalist>
      <p className="small muted">{problem ?? `Atualiza referências em ${count} notas; referências nos quadros também serão atualizadas. Tamanhos e legendas dos links são preservados.`}</p>
      {error && <p role="alert" className="query-error">{error}</p>}
    </form>
  </Modal>
}
export function ImageFolderSettings() {
  const vault = useVault(), toast = useToast(), [busy, setBusy] = useState(false)
  const moves = vault.index ? planImageMoves(vault.index) : []
  const moveAll = async () => {
    setBusy(true)
    try {
      await flushOpenNotes(); await vault.createFolder(DEFAULT_IMAGE_FOLDER)
      let count = 0
      for (const move of moves) { await vault.rename(move.from, move.to); count++ }
      toast(`${count} ${count === 1 ? "imagem reunida" : "imagens reunidas"} na pasta padrão, com referências atualizadas.`)
    } catch (error) { toast(String(error)) } finally { setBusy(false) }
  }
  return <section className="card stack"><h2 className="section-title row"><ImageIcon size={16}/> Imagens do cofre</h2><p className="small muted">Todas as novas imagens, incluindo as importadas em livros e os recortes do quadro, são guardadas em <strong>{DEFAULT_IMAGE_FOLDER}</strong>. Nomes repetidos recebem um número.</p>
    <button className="btn" disabled={!vault.info || vault.info.readOnly || busy} onClick={() => { setBusy(true); void vault.createFolder(DEFAULT_IMAGE_FOLDER).then(() => toast(`Pasta ${DEFAULT_IMAGE_FOLDER} pronta.`), error => toast(String(error))).finally(() => setBusy(false)) }}>Criar pasta padrão de imagens</button>
    <details><summary>Reunir imagens existentes ({moves.length})</summary><p className="small muted">Os arquivos abaixo serão movidos; links em notas e quadros serão atualizados. Não apaga imagens.</p><ul className="image-moves">{moves.map(move => <li key={move.from}>{move.from} → {move.to}</li>)}</ul><button className="btn" disabled={busy || !moves.length || vault.info?.readOnly} onClick={() => void moveAll()}>Mover {moves.length} {moves.length === 1 ? "imagem" : "imagens"} para a pasta padrão</button></details>
    <p className="tiny muted">Para renomear ou mover uma imagem existente, use o menu do link no código, o botão direito na imagem ou Imagens vinculadas à nota na barra do editor.</p>
  </section>
}
