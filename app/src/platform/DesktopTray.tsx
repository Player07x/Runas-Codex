import { useEffect, useState } from "react"
import { useVault } from "./VaultProvider"
import { Switch } from "../components/ui"
const KEY="runas-codex:bandeja"
function saved(){try{return localStorage.getItem(KEY)==="true"}catch{return false}}
export function DesktopTrayRuntime(){const {platform}=useVault();useEffect(()=>{if(platform.setTrayEnabled)void platform.setTrayEnabled(saved()).catch(()=>undefined)},[platform]);return null}
/** Linha do cartão Agenda e lembretes; some fora do desktop. */
export function DesktopTraySettings(){const {platform}=useVault(),[enabled,setEnabled]=useState(saved),[message,setMessage]=useState("");if(!platform.setTrayEnabled)return null;return <div className="setting-row"><div><strong className="small">Continuar na bandeja ao fechar a janela</strong><span className="tiny muted">{message||"Mantém os lembretes ativos. Use “Sair do Runas-Codex” no menu da bandeja para encerrar."}</span></div><Switch label="Continuar na bandeja ao fechar a janela" on={enabled} onChange={next=>{void platform.setTrayEnabled!(next).then(value=>{setEnabled(value);try{localStorage.setItem(KEY,String(value))}catch{}setMessage(value?"Ao fechar a janela, o app continua na bandeja com os lembretes ativos.":"Ao fechar a janela, o app será encerrado.")}).catch(e=>setMessage(String(e)))}}/></div>}
