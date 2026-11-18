import { useEffect, useState } from "react"
import { Copy, RefreshCw, TriangleAlert, X } from "lucide-react"
import type { PlayerState } from "./shared/ipc"
import { dropNotice, playersNotice } from "./shared/room-drop"
import { remoteMaster, vtt } from "./api"

/**
 * U89: faixa no topo da mesa quando a sala cai (túnel, endereço da rede ou servidor). Diz o que aconteceu, dá o link
 * novo com “Copiar aviso para os jogadores” e, quando o app não consegue sozinho, “Reconectar”.
 */
export function RoomDropBanner() {
  const [state, setState] = useState<PlayerState | null>(null)
  const [dismissed, setDismissed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let mounted = true
    void vtt.player.state().then((value) => { if (mounted) setState(value) }).catch(() => undefined)
    const unsubscribe = vtt.player.onState((value) => { if (mounted) setState(value) })
    return () => { mounted = false; unsubscribe() }
  }, [])

  const notice = state ? dropNotice(state) : null
  if (!state?.drop || !notice || dismissed === state.drop.at) return null
  const failed = state.drop.status === "failed"

  const reconnect = () => {
    setBusy(true)
    setError("")
    void vtt.player.reconnect().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason))).finally(() => setBusy(false))
  }
  const copy = (link: string) => {
    void navigator.clipboard?.writeText(playersNotice(link))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return <div className={`room-drop${failed ? " failed" : ""}`} role={failed ? "alert" : "status"}>
    {failed ? <TriangleAlert size={16} aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" className={state.drop.status === "reconnecting" ? "room-drop-spin" : ""} />}
    <p>{notice.message}{error && <><br /><span className="room-drop-error">{error}</span></>}</p>
    <div className="room-drop-actions">
      {notice.link && <button className="ghost small" onClick={() => copy(notice.link!)}><Copy size={14} /> {copied ? "Aviso copiado" : "Copiar aviso para os jogadores"}</button>}
      {notice.reconnect && !remoteMaster && <button className="primary small" disabled={busy} onClick={reconnect}><RefreshCw size={14} /> {busy ? "Reconectando…" : "Reconectar"}</button>}
      <button className="icon small" aria-label="Fechar o aviso" onClick={() => setDismissed(state.drop!.at)}><X size={14} /></button>
    </div>
  </div>
}
