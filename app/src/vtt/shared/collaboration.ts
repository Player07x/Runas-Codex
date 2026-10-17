export interface RoomPrompt {id:string;kind:"diario"|"avaliacao"|"enquete";title:string;options:string[]}
export interface DiaryMessage {id:string;author:string;title:string;text:string}
export interface RoomCollaboration {safetySignals:number;closed:boolean;prompt:RoomPrompt|null;handout:{id?:string;title:string;text:string;recipients?:string[]}|null;diaries:DiaryMessage[];ratings:{score:number;text:string}[];votes:number[];responses:number}
export type CollaborationCommand={type:"prompt";prompt:RoomPrompt|null}|{type:"handout";handout:{id?:string;title:string;text:string;recipients?:string[]}|null}|{type:"consume-diary";id:string}|{type:"ack-safety"}
export type CollaborationReply={type:"safety"}|{type:"reply";promptId:string;title?:string;text?:string;score?:number;choices?:number[]}
export interface PublicCollaboration {prompt:RoomPrompt|null;handout:{id?:string;title:string;text:string}|null;safetySignals:number}
const object=(v:unknown):Record<string,unknown>|null=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:null
const text=(v:unknown,max:number)=>typeof v==="string"?v.slice(0,max).trim():""
export function normalizeCollaborationCommand(value:unknown):CollaborationCommand|null {
 const d=object(value);if(!d)return null
 if(d.type==="prompt") {if(d.prompt===null)return {type:"prompt",prompt:null};const p=object(d.prompt);if(!p||!["diario","avaliacao","enquete"].includes(String(p.kind))||!text(p.id,100)||!text(p.title,200))return null;const options=Array.isArray(p.options)?p.options.filter((v):v is string=>typeof v==="string").map(v=>v.slice(0,100)).slice(0,20):[];if(p.kind==="enquete"&&options.length<2)return null;return {type:"prompt",prompt:{id:text(p.id,100),title:text(p.title,200),kind:p.kind as RoomPrompt["kind"],options}}}
 if(d.type==="handout"){if(d.handout===null)return {type:"handout",handout:null};const h=object(d.handout);if(!h||!text(h.title,200)||!text(h.text,50000))return null;return {type:"handout",handout:{title:text(h.title,200),text:text(h.text,50000),...(Array.isArray(h.recipients)?{recipients:h.recipients.filter((v):v is string=>typeof v==="string"&&/^[A-Za-z0-9_-]{1,100}$/.test(v)).slice(0,12)}:{})}}}
 if(d.type==="ack-safety")return {type:"ack-safety"}
 if(d.type==="consume-diary"&&text(d.id,100))return {type:"consume-diary",id:text(d.id,100)}
 return null
}
export class CollaborationRoom {
 private state:RoomCollaboration={safetySignals:0,closed:true,prompt:null,handout:null,diaries:[],ratings:[],votes:[],responses:0}
 private replies=new Set<string>()
 private serial=0
 snapshot():RoomCollaboration{return structuredClone(this.state)}
 publicSnapshot(slotId?:string):PublicCollaboration {
  const h=this.state.handout
  return structuredClone({prompt:this.state.closed?null:this.state.prompt,handout:h && (!h.recipients || (slotId && h.recipients.includes(slotId)))?{id:h.id,title:h.title,text:h.text}:null,safetySignals:this.state.safetySignals})
 }
 reset():void{this.state={safetySignals:0,closed:true,prompt:null,handout:null,diaries:[],ratings:[],votes:[],responses:0};this.replies.clear()}
 command(raw:unknown):RoomCollaboration {
  const command=normalizeCollaborationCommand(raw);if(!command)throw new Error("Comando de colaboração inválido.")
  if(command.type==="prompt"){if(!command.prompt){this.state.closed=true;return this.snapshot()}this.state.closed=false;this.state.prompt=command.prompt;this.state.ratings=[];this.state.votes=(command.prompt?.options??[]).map(()=>0);this.state.responses=0;this.replies.clear()}
  else if(command.type==="handout")this.state.handout=command.handout?{...command.handout,id:`artigo-${++this.serial}`}:null
  else if(command.type==="ack-safety")this.state.safetySignals=0
  else this.state.diaries=this.state.diaries.filter(d=>d.id!==command.id)
  return this.snapshot()
 }
 reply(raw:unknown,seat:{slotId:string;label:string}|null,id:string):void {
  if(!seat)throw new Error("Entre com um código de jogador para responder.")
  const d=object(raw),p=this.state.prompt
  if(d?.type==="safety"){this.state.safetySignals++;return}
  if(!d||d.type!=="reply"||!p||this.state.closed||d.promptId!==p.id)throw new Error("Esta atividade foi encerrada.")
  if(this.replies.has(seat.slotId))throw new Error("Você já respondeu a esta atividade.")
  if(p.kind==="diario") {const body=text(d.text,3000);if(!body||this.state.diaries.length>=100)throw new Error("Diário vazio ou caixa de entrada cheia.");this.state.diaries.push({id,author:seat.label,title:text(d.title,150)||"Diário do jogador",text:body})}
  else if(p.kind==="avaliacao"){if(typeof d.score!=="number"||!Number.isInteger(d.score)||d.score<0||d.score>10)throw new Error("A nota deve estar entre 0 e 10.");this.state.ratings.push({score:d.score,text:text(d.text,3000)})}
  else {if(!Array.isArray(d.choices)||!d.choices.length||d.choices.some(v=>!Number.isInteger(v)||Number(v)<0||Number(v)>=p.options.length))throw new Error("Escolha pelo menos uma data válida.");for(const choice of new Set(d.choices as number[]))this.state.votes[choice]!++}
  this.replies.add(seat.slotId);this.state.responses++
 }
}
