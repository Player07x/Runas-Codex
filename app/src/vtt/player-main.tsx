import { RoomAppearance } from "../components/Appearance"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "../styles/tokens.css"
import "../styles/base.css"
import { PlayerView } from "./PlayerView"
import "./vtt.css"

/** Página que o computador do mestre serve a quem entra na sala (navegador do jogador ou janela do app). */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RoomAppearance />
    <div className="vtt-root" style={{ height: "100dvh" }}>
      <PlayerView />
    </div>
  </StrictMode>,
)
