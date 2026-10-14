import { useState } from "react"
import { ChevronLeft, Dices, Hand, Image as ImageIcon, LogOut, MessageSquare, Swords, Volume2, X } from "lucide-react"
import { MESAS } from "../../data/mesas"
import { href } from "../../lib/router"
import { useToast } from "../../components/ui"
import { SceneMap } from "./SceneMap"
import { ChatPanel } from "./GmTable"

/** O que a Ana vê ao entrar na sala pelo app (ou pelo navegador). */
export function PlayerView() {
  const toast = useToast()
  const scene = MESAS[0].scenes[0]
  const [sheet, setSheet] = useState(false)
  const [handout, setHandout] = useState(true)
  return (
    <div className="gm-table player">
      <div className="vtt-bar">
        <a className="icon-btn" href={href("/vtt/entrar")} title="Sair da sala">
          <ChevronLeft size={18} />
        </a>
        <strong className="display truncate">As Cinzas de Valdris</strong>
        <span className="chip gold">Ilsa Brasa</span>
        <span className="grow" />
        <span className="your-turn">
          <Swords size={14} /> Sua vez!
        </span>
        <button className="icon-btn" title="Volume">
          <Volume2 size={17} />
        </button>
        <button className="icon-btn" title="Carta X (anônima)" onClick={() => toast("Carta X enviada ao mestre, sem seu nome")}>
          <Hand size={17} />
        </button>
        <button className="icon-btn hide-mobile" title="Sair" onClick={() => toast("Protótipo: saiu da sala")}>
          <LogOut size={17} />
        </button>
      </div>
      <div className="vtt-body">
        <div className="vtt-stage">
          <SceneMap scene={scene} mode="player" playerId="ana" />
          {handout && (
            <div className="handout card">
              <div className="row between">
                <span className="eyebrow row">
                  <ImageIcon size={13} /> O mestre mostrou
                </span>
                <button className="icon-btn sm" onClick={() => setHandout(false)} aria-label="Fechar">
                  <X size={14} />
                </button>
              </div>
              <div className="handout-image">Mapa da Cidade Alta</div>
            </div>
          )}
          <button className="btn primary player-fab mobile-only" onClick={() => setSheet(true)}>
            <Dices size={16} /> Dados e chat
          </button>
        </div>
        <aside className={`vtt-panel ${sheet ? "open" : ""}`}>
          <div className="tabs">
            <button className="active">
              <MessageSquare size={15} /> Chat e dados
            </button>
            <button className="sheet-close" onClick={() => setSheet(false)} aria-label="Fechar painel">
              <X size={16} />
            </button>
          </div>
          <div className="vtt-panel-body">
            <ChatPanel speaker="Ilsa Brasa" />
            <div className="card tight muted small" style={{ marginTop: 10 }}>
              Ficha do personagem: fora de escopo nesta fase (virá com o Runas Tools).
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
