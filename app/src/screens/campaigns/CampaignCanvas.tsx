import { useState } from "react"
import { Plus, Shapes } from "lucide-react"
import { emptyCanvasText } from "../../core/canvas"
import { basename } from "../../core/text"
import { href, navigate } from "../../lib/router"
import { CanvasBoard } from "../../components/canvas/CanvasBoard"
import { NameDialog } from "../../components/vault/dialogs"
import { Empty, useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import { campaignRoute, type CampaignData } from "./campaign-state"

const boardName = (path: string) => basename(path).replace(/\.canvas$/i, "")

/** Aba Quadro: os `.canvas` da pasta da campanha (abre direto o primeiro). */
export function BoardsView({ data, path }: { data: CampaignData; path?: string }) {
  const vault = useVault()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const current = path ?? data.boards[0]
  const create = async (name: string) => {
    const file = `${data.campaign.root}${name}.canvas`
    await vault.createFile(file, emptyCanvasText())
    navigate(campaignRoute(data.campaign.name, "quadro", file))
  }
  const newButton = (
    <button className="btn sm" onClick={() => (data.readOnly ? toast("Libere a gravação em Configurações para criar quadros.") : setCreating(true))}>
      <Plus size={14} /> Novo quadro
    </button>
  )
  return (
    <div className="campaign-boards">
      <h1 className="sr-only">{current ? boardName(current) : "Quadros"}</h1>
      <nav className="campaign-boards-bar" aria-label="Quadros da campanha">
        <Shapes size={15} color="var(--accent, var(--violet))" aria-hidden="true" />
        {data.boards.map((b) => (
          <a key={b} className={`chip ${b === current ? "violet" : ""}`} aria-current={b === current ? "page" : undefined} href={href(campaignRoute(data.campaign.name, "quadro", b))}>
            {boardName(b)}
          </a>
        ))}
        <span className="grow" />
        {newButton}
      </nav>
      {current ? (
        <CanvasBoard key={current} path={current} />
      ) : (
        <div className="page">
          <Empty title="Nenhum quadro nesta campanha" action={newButton}>
            Um quadro é um arquivo .canvas (o mesmo formato do Obsidian): cartões de texto, notas da wiki e da campanha, imagens e grupos ligados por setas.
          </Empty>
        </div>
      )}
      {creating && <NameDialog title="Novo quadro" label="Nome do quadro" initial="Quadro" confirmLabel="Criar" hint={`Cria ${data.campaign.root}<nome>.canvas`} onClose={() => setCreating(false)} onConfirm={create} />}
    </div>
  )
}
