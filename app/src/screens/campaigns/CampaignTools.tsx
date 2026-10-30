import { useState } from "react"
import { stringify } from "yaml"
import { findCodeBlocks, replaceCodeBlock } from "../../core/codeblocks"
import { advanceInitiative, initiativeFromEncounter, initiativeYaml, parseInitiative, parseTreasury, treasuryYaml, type Initiative, type Treasury } from "../../core/campaign-tools"
import { generateWorld } from "../../core/wiki-tools"
import { noteBody } from "../../core/sections"
import { Markdown } from "../../components/Markdown"
import { useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import type { CampaignData } from "./campaign-state"
import { CampaignRoomTools } from "./CampaignRoomTools"

const TOOLS = [
 { id: "tesouro", label: "Tesouro do grupo" },
 { id: "iniciativa", label: "Iniciativa presencial" },
 { id: "aventura", label: "Gerador de aventuras" },
 { id: "sala", label: "Atividades pela sala" },
] as const
type ToolId = (typeof TOOLS)[number]["id"]
const TOOL_KEY = "runas-codex:campanha:ferramenta"
/** Ferramentas da campanha (rework F4c, CAM-6): a lista à esquerda e só a escolhida à direita; a última fica lembrada. */
export function CampaignTools({data}:{data:CampaignData}) {
 const [tool,setTool]=useState<ToolId>(()=>{try{const saved=localStorage.getItem(TOOL_KEY);return TOOLS.some(t=>t.id===saved)?saved as ToolId:"tesouro"}catch{return "tesouro"}})
 const choose=(id:ToolId)=>{setTool(id);try{localStorage.setItem(TOOL_KEY,id)}catch{/* só não é lembrada */}}
 return <div className="page campaign-tools"><h1 className="page-title">Ferramentas da campanha</h1>
  <div className="campaign-tools-layout">
   <nav className="campaign-tools-list" aria-label="Ferramentas">{TOOLS.map(t=><button key={t.id} type="button" className={`list-item ${tool===t.id?"active":""}`} aria-current={tool===t.id?"true":undefined} onClick={()=>choose(t.id)}>{t.label}</button>)}</nav>
   <div className="campaign-tools-current">
    {tool==="tesouro"&&<TreasuryPanel data={data}/>}
    {tool==="iniciativa"&&<InitiativePanel data={data}/>}
    {tool==="aventura"&&<AdventurePanel data={data}/>}
    {tool==="sala"&&<CampaignRoomTools campaign={data.campaign.name} root={data.campaign.root} readOnly={data.readOnly}/>}
   </div>
  </div>
 </div>
}
function useToolNote(data:CampaignData,kind:string,language:string,title:string,initial:string) {
 const vault=useVault(),toast=useToast(),[busy,setBusy]=useState(false)
 const note=vault.index!.notesIn(data.campaign.root).find(n=>n.meta.frontmatter?.data?.tipo===kind)
 const block=note?findCodeBlocks(note.text,language)[0]:undefined
 const run=(task:()=>Promise<void>)=>{setBusy(true);void task().catch(e=>toast(String(e))).finally(()=>setBusy(false))}
 const create=()=>run(async()=>{const folder=`${data.campaign.root}Ferramentas`;let name=title;for(let i=2;vault.index!.note(`${folder}/${name}.md`);i++)name=`${title} ${i}`;await vault.createNote(folder,name,`---\ntipo: ${kind}\n---\n# ${title}\n\n~~~${language}\n${initial}\n~~~\n`)})
 const save=async(content:string)=>{if(!note||!block)throw new Error("Crie a ferramenta antes de salvar.");if(vault.index!.note(note.path)?.text!==note.text)throw new Error("A nota mudou. Confira a versão atual antes de salvar.");await vault.save(note.path,replaceCodeBlock(note.text,block,content))}
 return {note,block,busy,run,create,save}
}
function TreasuryPanel({data}:{data:CampaignData}) {
 const tool=useToolNote(data,"tesouro","runas-tesouro","Tesouro do grupo",treasuryYaml({coins:"",items:[]})),[removing,setRemoving]=useState<string|null>(null),[name,setName]=useState(""),[quantity,setQuantity]=useState(1),[holder,setHolder]=useState(""),[notes,setNotes]=useState("")
 let state:Treasury={coins:"",items:[]},error="";try{if(tool.block)state=parseTreasury(tool.block.content)}catch(e){error=String(e)}
 return <section className="card stack"><h2>Tesouro do grupo</h2>{!tool.note?<button className="btn" disabled={data.readOnly||tool.busy} onClick={tool.create}>Criar tesouro do grupo</button>:error||!tool.block?<p role="alert">{error||"O bloco runas-tesouro não foi encontrado. Corrija a nota antes de editar."}</p>:<><form className="row-wrap" onSubmit={e=>{e.preventDefault();const value=(e.currentTarget.elements.namedItem("coins") as HTMLInputElement).value;tool.run(()=>tool.save(treasuryYaml({...state,coins:value})))}}><label>Moedas (sem regras de sistema)<input className="input" name="coins" key={state.coins} defaultValue={state.coins} disabled={data.readOnly}/></label><button className="btn" disabled={data.readOnly||tool.busy}>Salvar moedas</button></form><div className="table-wrap"><table><thead><tr><th>Item</th><th>Quantidade</th><th>Portador</th><th>Notas</th><th>Ação</th></tr></thead><tbody>{state.items.map(item=><tr key={item.id}><td>{item.name}</td><td><span className="row" style={{gap:4}}><button className="icon-btn sm" disabled={data.readOnly||tool.busy||item.quantity<=0} aria-label={`Diminuir ${item.name}`} onClick={()=>tool.run(()=>tool.save(treasuryYaml({...state,items:state.items.map(i=>i.id===item.id?{...i,quantity:Math.max(0,i.quantity-1)}:i)})))}>−</button><span className="mono">{item.quantity}</span><button className="icon-btn sm" disabled={data.readOnly||tool.busy} aria-label={`Aumentar ${item.name}`} onClick={()=>tool.run(()=>tool.save(treasuryYaml({...state,items:state.items.map(i=>i.id===item.id?{...i,quantity:i.quantity+1}:i)})))}>+</button></span></td><td>{item.holder||"Grupo"}</td><td>{item.notes}</td><td>{removing===item.id?<button className="btn danger" autoFocus onBlur={()=>setRemoving(null)} disabled={data.readOnly||tool.busy} onClick={()=>{setRemoving(null);tool.run(()=>tool.save(treasuryYaml({...state,items:state.items.filter(i=>i.id!==item.id)})))}}>Confirmar: remover {item.name}</button>:<button className="btn" disabled={data.readOnly||tool.busy} onClick={()=>setRemoving(item.id)}>Remover {item.name}</button>}</td></tr>)}</tbody></table></div><form className="row-wrap" onSubmit={e=>{e.preventDefault();tool.run(async()=>{await tool.save(treasuryYaml({...state,items:[...state.items,{id:crypto.randomUUID(),name:name.trim(),quantity,holder:holder.trim(),notes:notes.trim()}]}));setName("");setNotes("")})}}><label>Item<input className="input" required value={name} onChange={e=>setName(e.target.value)}/></label><label>Quantidade<input className="input" type="number" min={0} step="any" value={quantity} onChange={e=>setQuantity(Math.max(0,Number(e.target.value)||0))}/></label><label>Portador<input className="input" value={holder} onChange={e=>setHolder(e.target.value)}/></label><label>Notas do item<input className="input" value={notes} onChange={e=>setNotes(e.target.value)}/></label><button className="btn" disabled={data.readOnly||tool.busy}>Acrescentar item</button></form></>}</section>
}
/** Também aparece na coluna Agora da Tela do Mestre (rework F4c, CAM-8), um nível de título abaixo. */
export function InitiativePanel({data,level=2}:{data:CampaignData;level?:2|3}) {
 const vault=useVault(),tool=useToolNote(data,"iniciativa","runas-iniciativa","Iniciativa presencial",initiativeYaml({round:1,active:null,participants:[]})),[name,setName]=useState(""),[value,setValue]=useState(0),[hidden,setHidden]=useState(false),[encounter,setEncounter]=useState("")
 let state:Initiative={round:1,active:null,participants:[]},error="";try{if(tool.block)state=parseInitiative(tool.block.content)}catch(e){error=String(e)}
 const encounters=vault.index!.notesIn(data.campaign.root).flatMap(n=>findCodeBlocks(n.text,"runas-encontro").map((b,i)=>({key:n.path+":"+i,title:n.name,code:b.content})))
 const Title=level===3?"h3":"h2"
 return <section className="card stack"><Title>Iniciativa presencial</Title>{!tool.note?<button className="btn" disabled={data.readOnly||tool.busy} onClick={tool.create}>Criar iniciativa presencial</button>:error||!tool.block?<p role="alert">{error||"O bloco runas-iniciativa não foi encontrado."}</p>:<><p>Rodada {state.round} · Turno: <strong>{state.participants.find(p=>p.id===state.active)?.name??"nenhum"}</strong></p><div className="row-wrap"><button className="btn" disabled={data.readOnly||tool.busy||!state.active} onClick={()=>tool.run(()=>tool.save(initiativeYaml(advanceInitiative(state,-1))))}>Turno anterior</button><button className="btn primary" disabled={data.readOnly||tool.busy||!state.active} onClick={()=>tool.run(()=>tool.save(initiativeYaml(advanceInitiative(state))))}>Próximo turno</button><button className="btn" disabled={data.readOnly||tool.busy} onClick={()=>tool.run(()=>tool.save(initiativeYaml({...state,round:1,active:state.participants[0]?.id??null})))}>Reiniciar rodadas</button></div><ol className="initiative-list">{state.participants.map(p=><li key={p.id} aria-current={p.id===state.active?"step":undefined}><strong>{p.value} · {p.name}</strong>{p.hidden&&" · oculto"}<button className="btn" disabled={data.readOnly||tool.busy} onClick={()=>tool.run(()=>{const participants=state.participants.filter(i=>i.id!==p.id);return tool.save(initiativeYaml({...state,participants,active:state.active===p.id?participants[0]?.id??null:state.active}))})}>Remover {p.name}</button></li>)}</ol><form className="row-wrap" onSubmit={e=>{e.preventDefault();tool.run(async()=>{const participants=[...state.participants,{id:crypto.randomUUID(),name:name.trim(),value,hidden,note:""}].sort((a,b)=>b.value-a.value);await tool.save(initiativeYaml({...state,participants,active:state.active??participants[0]?.id??null}));setName("")})}}><label>Participante<input className="input" required value={name} onChange={e=>setName(e.target.value)}/></label><label>Iniciativa<input className="input" type="number" value={value} onChange={e=>setValue(Number(e.target.value)||0)}/></label><label className="check"><input type="checkbox" checked={hidden} onChange={e=>setHidden(e.target.checked)}/>Oculto</label><button className="btn" disabled={data.readOnly||tool.busy}>Acrescentar participante</button></form>{encounters.length>0&&<div className="row-wrap"><label>Encontro<select className="input" value={encounter} onChange={e=>setEncounter(e.target.value)}><option value="">Escolha um encontro…</option>{encounters.map(e=><option key={e.key} value={e.key}>{e.title}</option>)}</select></label><button className="btn" disabled={data.readOnly||tool.busy||!encounter} onClick={()=>tool.run(()=>tool.save(initiativeYaml(initiativeFromEncounter(encounters.find(e=>e.key===encounter)!.code))))}>Substituir pelos participantes do encontro</button><p className="small">Rola 1d20 mais o modificador informado. Quantidades em dados entram como um participante; acrescente os demais após rolar a quantidade.</p></div>}</>}</section>
}
function AdventurePanel({data}:{data:CampaignData}) {
 const vault=useVault(),toast=useToast(),[result,setResult]=useState(""),[name,setName]=useState(""),[busy,setBusy]=useState(false)
 return <section className="card stack"><h2>Gerador de aventuras</h2><button className="btn" onClick={()=>setResult(generateWorld("aventura"))}>Gerar aventura</button><label>Aventura<textarea className="input" rows={10} value={result} onChange={e=>setResult(e.target.value)}/></label><label>Título da aventura<input className="input" value={name} onChange={e=>setName(e.target.value)}/></label><button className="btn" disabled={data.readOnly||busy||!name.trim()||!result.trim()} onClick={()=>{setBusy(true);void vault.createNote(`${data.campaign.root}Aventuras`,name.trim(),`---\n${stringify({tipo:"aventura"})}---\n# ${name.trim()}\n\n${result}`).then(()=>toast("Aventura guardada.")).catch(e=>toast(String(e))).finally(()=>setBusy(false))}}>Guardar aventura</button><details><summary>Diário dos jogadores no cofre</summary>{vault.index!.notesIn(data.campaign.root).filter(n=>n.meta.frontmatter?.data?.tipo==="diario-jogador").map(n=><article className="card" key={n.path}><h3>{n.name}</h3><Markdown source={noteBody(n.text)}/></article>)}</details></section>
}
