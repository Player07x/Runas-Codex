import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, LogIn, Power } from "lucide-react"
import { vtt } from "./api"
import { navigate, useRoute } from "../lib/router"
import { useToast } from "../components/ui"
import { OverflowMenu } from "../components/kit/OverflowMenu"
import { ConfirmDialog } from "../components/vault/dialogs"

const backToTable = () => {
  try { const id = sessionStorage.getItem("runas-codex:mesa-aberta"); navigate(id ? `/vtt/mesa/${id}` : "/vtt/criar") } catch { navigate("/vtt/criar") }
}

/**
 * Sala do VTT ligada fora da mesa: um selo pequeno na barra de cima (“● Sala aberta”), com Voltar à mesa e
 * Encerrar sala num menu. O aviso grande cobria a tela no celular e no PC. A Carta X continua flutuando em qualquer
 * rota até o mestre confirmar a pausa (é um pedido de parar, não pode ficar escondido num menu).
 */
export function ActiveRoom() {
  const route = useRoute(), inTable = route[0] === "vtt" && route[1] === "mesa" && Boolean(route[2])
  const [safety, setSafety] = useState(0)
  const [enabled, setEnabled] = useState(false), toast = useToast()
  const [closing, setClosing] = useState(false)
  // A barra de cima é do Shell; o selo entra nela por portal (sem mexer no Shell, arquivo compartilhado).
  const [slot, setSlot] = useState<Element | null>(null)
  useEffect(() => { let active = true; void vtt.player.state().then(s => active && setEnabled(s.enabled)); const stop = vtt.player.onState(s => setEnabled(s.enabled)); return () => { active = false; stop() } }, [])
  useEffect(() => { if (!enabled) return; let active = true; const load = () => void vtt.collaboration?.state().then(s => active && setSafety(s.safetySignals)).catch(() => undefined); load(); const timer = setInterval(load, 2000); return () => { active = false; clearInterval(timer) } }, [enabled])
  useEffect(() => { if (enabled) setSlot(document.querySelector(".topbar .top-actions")) }, [enabled, route[0]])
  if (!enabled) return null
  return <>
    {safety > 0 && <aside className="active-room" role="alert" aria-label="Carta X acionada"><span>Carta X acionada — pause a sessão</span><button className="btn" onClick={() => void vtt.collaboration?.command({ type: "ack-safety" }).then(() => setSafety(0)).catch(e => toast(String(e)))}>Confirmar pausa</button>{!inTable && <button className="btn" onClick={backToTable}>Voltar à mesa</button>}</aside>}
    {/* Na própria mesa, o painel Sala já tem os controles. */}
    {!inTable && slot && createPortal(<OverflowMenu label="Sala do VTT aberta" heading="Sala do VTT" triggerClassName="room-chip"
      trigger={<><span className="room-dot" aria-hidden="true" /><span className="room-chip-label">Sala aberta</span><ChevronDown size={14} aria-hidden="true" /></>}
      items={[
        { label: "Voltar à mesa", icon: <LogIn size={16} />, onSelect: backToTable },
        { label: "Encerrar sala…", icon: <Power size={16} />, danger: true, onSelect: () => setClosing(true) },
      ]} />, slot)}
    {closing && <ConfirmDialog title="Encerrar a sala?" confirmLabel="Encerrar sala" danger onClose={() => setClosing(false)} onConfirm={async () => { await vtt.player.stop(); toast("Sala encerrada") }}>
      Os jogadores conectados saem da mesa. Dá para abrir a sala de novo pela própria mesa.
    </ConfirmDialog>}
  </>
}
