import { parse as parseYaml, stringify } from "yaml"
import { parseEncounter } from "./encounters"
export interface Treasury { coins:string; items:{id:string;name:string;quantity:number;holder:string;notes:string}[] }
export interface Initiative { round:number; active:string|null; participants:{id:string;name:string;value:number;hidden:boolean;note:string}[] }
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{}
export function parseTreasury(code:string):Treasury {
 const d=object(parseYaml(code))
 return {coins:typeof d.moedas==="string"?d.moedas:String(d.moedas??""),items:(Array.isArray(d.itens)?d.itens:[]).map((value,i)=>{const row=object(value),quantity=Number(row.quantidade??1);if(typeof row.nome!=="string"||!Number.isFinite(quantity)||quantity<0)throw new Error("Item de tesouro inválido.");return {id:typeof row.id==="string"?row.id:String(i),name:row.nome,quantity,holder:typeof row.portador==="string"?row.portador:"",notes:typeof row.notas==="string"?row.notas:""}})}
}
export function treasuryYaml(data:Treasury):string {return stringify({moedas:data.coins,itens:data.items.map(i=>({id:i.id,nome:i.name,quantidade:i.quantity,portador:i.holder,notas:i.notes}))})}
export function parseInitiative(code:string):Initiative {
 const d=object(parseYaml(code)),participants=(Array.isArray(d.participantes)?d.participantes:[]).map((value,i)=>{const row=object(value),valueNumber=Number(row.iniciativa??0);if(typeof row.nome!=="string"||!Number.isFinite(valueNumber))throw new Error("Participante inválido.");return {id:typeof row.id==="string"?row.id:String(i),name:row.nome,value:valueNumber,hidden:row.oculto===true,note:typeof row.nota==="string"?row.nota:""}}).sort((a,b)=>b.value-a.value)
 if(new Set(participants.map(p=>p.id)).size!==participants.length)throw new Error("Participantes com identificadores repetidos.")
 return {round:typeof d.rodada==="number"&&Number.isSafeInteger(d.rodada)&&d.rodada>0?d.rodada:1,active:typeof d.ativo==="string"&&participants.some(p=>p.id===d.ativo)?d.ativo:participants[0]?.id??null,participants}
}
export function initiativeYaml(data:Initiative):string {return stringify({rodada:data.round,ativo:data.active,participantes:data.participants.map(p=>({id:p.id,nome:p.name,iniciativa:p.value,oculto:p.hidden,nota:p.note}))})}
export function advanceInitiative(data:Initiative,direction:1|-1=1):Initiative {
 if(!data.participants.length)return {...data,active:null}
 const current=Math.max(0,data.participants.findIndex(p=>p.id===data.active)),next=(current+direction+data.participants.length)%data.participants.length
 return {...data,active:data.participants[next]!.id,round:Math.max(1,data.round+(direction===1&&next===0?1:direction===-1&&current===0?-1:0))}
}
export function initiativeFromEncounter(code:string,random=Math.random):Initiative {
 const encounter=parseEncounter(code)
 const participants=encounter.combatants.flatMap((c,i)=>{
  const count=typeof c.count==="number"?Math.min(100,Math.max(1,Math.floor(c.count))):1
  return Array.from({length:count},(_,n)=>({id:`c${i}-${n}`,name:`${c.display??c.name}${count>1?` ${n+1}`:""}`,value:1+Math.min(19,Math.max(0,Math.floor(random()*20)))+(c.initiative??0),hidden:c.hidden,note:c.note??""}))
 }).slice(0,200).sort((a,b)=>b.value-a.value)
 return {round:1,active:participants[0]?.id??null,participants}
}
