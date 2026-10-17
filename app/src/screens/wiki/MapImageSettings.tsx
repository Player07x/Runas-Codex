import { useState } from "react"
import { findCodeBlocks, replaceCodeBlock, setBlockKeys } from "../../core/codeblocks"
import { mapExtrasYaml, type MapExtras, type MapImageLayer } from "../../core/wiki-map-extras"
import { parseMap } from "../../core/wiki"
import { useVault } from "../../platform/VaultProvider"
import { useToast } from "../../components/ui"

export function useMapDecoration(path:string) {
 const vault=useVault()
 return async(extras:MapExtras)=>{const note=vault.index!.note(path)!,block=findCodeBlocks(note.text,"runas-mapa")[0]!;await vault.save(path,replaceCodeBlock(note.text,block,setBlockKeys(block.content,mapExtrasYaml(extras))))}
}
export function MapImageSettings({path}:{path:string}) {
 const vault=useVault(),toast=useToast(),save=useMapDecoration(path),[name,setName]=useState(""),[image,setImage]=useState(""),[from,setFrom]=useState(""),[to,setTo]=useState(""),[secret,setSecret]=useState(false),[opacity,setOpacity]=useState(1),[busy,setBusy]=useState(false)
 const note=vault.index!.note(path),block=note?findCodeBlocks(note.text,"runas-mapa")[0]:undefined
 if(!block||vault.info?.readOnly)return null
 let spec;try{spec=parseMap(block.content)}catch{return null}
 const layer:MapImageLayer={name:name.trim(),image:image.trim().replace(/^\[\[|\]\]$/g,""),opacity,secret,...(from!==""?{from:Number(from)}:{}),...(to!==""?{to:Number(to)}:{})}
 const run=(action:()=>Promise<void>)=>{setBusy(true);void action().catch(e=>toast(String(e))).finally(()=>setBusy(false))}
 return <details className="map-images-settings"><summary>Camadas de imagem e crônicas</summary><form className="row-wrap" onSubmit={e=>{e.preventDefault();if(from!==""&&to!==""&&Number(from)>Number(to)){toast("O início da era deve vir antes do fim.");return}run(async()=>{await save({...spec,images:[...(spec.images??[]),layer]});setName("");setImage("")})}}><label>Nome da camada<input className="input" required value={name} onChange={e=>setName(e.target.value)}/></label><label>Imagem do cofre<input className="input" required value={image} onChange={e=>setImage(e.target.value)}/></label><label>Desde o ano<input className="input" type="number" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Até o ano<input className="input" type="number" value={to} onChange={e=>setTo(e.target.value)}/></label><label>Opacidade<input type="range" min={0} max={1} step={.05} value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/></label><label className="check"><input type="checkbox" checked={secret} onChange={e=>setSecret(e.target.checked)}/>Segredo do mestre</label><button className="btn" disabled={busy}>Acrescentar camada</button></form>{spec.images?.map((layer,i)=><div className="row-wrap" key={i}><span>{layer.name}: {layer.from??"sempre"} → {layer.to??"sempre"}</span><button className="btn" disabled={busy} onClick={()=>run(()=>save({...spec,images:spec.images!.filter((_,n)=>n!==i)}))}>Remover camada {layer.name}</button></div>)}</details>
}
