import { ChevronLeft } from "lucide-react"
import { noteName } from "../../core/text"
import { useVault } from "../../platform/VaultProvider"
import { Empty } from "../ui"
import { CanvasBoard } from "./CanvasBoard"

/** Rota `/quadro/<caminho>`: qualquer `.canvas` do cofre, fora das campanhas. */
export function CanvasScreen({ path }: { path?: string }) {
  const vault = useVault()
  if (vault.loading && !vault.index) return <div className="page"><p className="muted">Abrindo o cofre…</p></div>
  if (!vault.index || !path) return <div className="page"><Empty title="Nenhum quadro aberto">Abra um quadro pela campanha ou por um link para um arquivo .canvas.</Empty></div>
  return (
    <div className="canvas-page">
      <div className="canvas-page-head">
        <button className="icon-btn" onClick={() => history.back()} aria-label="Voltar">
          <ChevronLeft size={18} />
        </button>
        <strong className="truncate">{noteName(path).replace(/\.canvas$/, "")}</strong>
        <span className="tiny faint truncate">{path}</span>
      </div>
      <CanvasBoard path={path} />
    </div>
  )
}
