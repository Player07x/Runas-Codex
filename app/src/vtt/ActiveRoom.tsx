import { useEffect, useState } from "react"
import { vtt } from "./api"
import { navigate } from "../lib/router"
import { useToast } from "../components/ui"
export function ActiveRoom() {
 const [safety,setSafety]=useState(0)
 const [enabled,setEnabled]=useState(false),toast=useToast()
 useEffect(()=>{let active=true;void vtt.player.state().then(s=>active&&setEnabled(s.enabled));const stop=vtt.player.onState(s=>setEnabled(s.enabled));return()=>{active=false;stop()}},[])
 useEffect(()=>{if(!enabled)return;let active=true;const load=()=>void vtt.collaboration?.state().then(s=>active&&setSafety(s.safetySignals)).catch(()=>undefined);load();const timer=setInterval(load,2000);return()=>{active=false;clearInterval(timer)}},[enabled])
 if(!enabled)return null
 return <aside className="active-room" aria-label="Sala em andamento"><span>{safety>0?"Carta X acionada — pause a sessão":"Sala do VTT aberta"}</span>{safety>0&&<button className="btn" onClick={()=>void vtt.collaboration?.command({type:"ack-safety"}).then(()=>setSafety(0)).catch(e=>toast(String(e)))}>Confirmar pausa</button>}<button className="btn" onClick={()=>{try{const id=sessionStorage.getItem("runas-codex:mesa-aberta");navigate(id?`/vtt/mesa/${id}`:"/vtt/criar")}catch{navigate("/vtt/criar")}}}>Voltar à mesa</button><button className="btn" onClick={()=>void vtt.player.stop().catch(e=>toast(String(e)))}>Encerrar sala</button></aside>
}
