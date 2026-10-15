import { StrictMode, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "../styles/tokens.css"
import "../styles/base.css"
import { remoteMaster } from "./api"
import { RemoteMesa } from "./MesaTable"
import type { WorldSummary } from "./shared/world"
import "./vtt.css"

/**
 * Página que a sala do computador serve ao celular do mestre (`/master?m=<chave>`, ADR 0016): a mesa aberta lá,
 * controlada daqui. Sem a chave certa (ou com outro aparelho conectado) não abre.
 */
function MasterApp() {
  const [world, setWorld] = useState<WorldSummary | null>(null)
  const [problem, setProblem] = useState<string>()
  useEffect(() => {
    if (!remoteMaster) {
      setProblem("Abra esta página pelo QR code “Controlar pelo celular”, no painel Sala do computador.")
      return
    }
    const stop = remoteMaster.onLost((reason) => {
      setWorld(null)
      setProblem(reason)
    })
    remoteMaster.connect().then(setWorld, (reason: unknown) => setProblem(reason instanceof Error ? reason.message : String(reason)))
    return stop
  }, [])
  if (problem) {
    return (
      <div className="page" style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
        <h1 className="page-title">Mesa do mestre</h1>
        <p role="alert">{problem}</p>
        <button className="btn" onClick={() => window.location.reload()}>
          Tentar de novo
        </button>
      </div>
    )
  }
  if (!world) return <p className="muted" style={{ padding: 24 }}>Conectando ao computador da sala…</p>
  return <RemoteMesa world={world} />
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div style={{ height: "100dvh" }}>
      <MasterApp />
    </div>
  </StrictMode>,
)
