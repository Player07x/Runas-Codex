import { parse as parseYaml } from "yaml"
import { dayNumber, parseWorldDate, dateProblem, type Calendar, type WorldDate } from "./calendar"
export interface RollEntry { text: string; weight: number; table?: string }
export interface RollTable { name: string; entries: RollEntry[] }
const object = (v:unknown):Record<string,unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string,unknown> : {}
export function parseRollTable(code:string): RollTable {
  const d=object(parseYaml(code)), raw=Array.isArray(d.resultados)?d.resultados:[]
  if (!raw.length || raw.length>1000) throw new Error("A tabela precisa de 1 a 1.000 resultados.")
  const entries=raw.map(value=>{
    const row=typeof value === "string"?{texto:value}:object(value)
    const weight=row.peso === undefined?1:Number(row.peso)
    if (!Number.isSafeInteger(weight)||weight<1||weight>1000000||typeof row.texto!=="string"||!row.texto.trim()) throw new Error("Cada resultado precisa de texto e peso inteiro positivo.")
    return {text:row.texto.slice(0,4000),weight,...(typeof row.tabela==="string"?{table:row.tabela}:{})}
  })
  return {name:typeof d.nome==="string"?d.nome:"Tabela aleatória",entries}
}
export function rollTable(table:RollTable, lookup:(target:string)=>RollTable|undefined, random= Math.random, seen:RollTable[]=[]):string[] {
  if (seen.length>=10 || seen.includes(table)) throw new Error("A cadeia de tabelas tem um ciclo ou ultrapassa dez tabelas.")
  const total=table.entries.reduce((sum,e)=>sum+e.weight,0)
  let value=Math.max(0,Math.min(.999999999,random()))*total
  const entry=table.entries.find(e=>(value-=e.weight)<0) ?? table.entries.at(-1)!
  if (!entry.table) return [entry.text]
  const next=lookup(entry.table)
  if(!next) throw new Error(`Tabela não encontrada: ${entry.table}`)
  return [entry.text,...rollTable(next,lookup,random,[...seen,table])]
}
export interface Dictionary { name:string; rules:string; words:{word:string;translation:string;pronunciation:string}[] }
export function parseDictionary(code:string):Dictionary {
  const d=object(parseYaml(code))
  if(!Array.isArray(d.palavras)||d.palavras.length>10000) throw new Error("O dicionário precisa da lista palavras (até 10 mil entradas).")
  return {name:typeof d.nome==="string"?d.nome:"Idioma",rules:typeof d.regras==="string"?d.regras:"",words:d.palavras.map(value=>{
    const row=object(value)
    if(typeof row.palavra!=="string" || typeof row.traducao!=="string") throw new Error("Informe palavra e traducao em cada entrada.")
    return {word:row.palavra,translation:row.traducao,pronunciation:typeof row.pronuncia==="string"?row.pronuncia:""}
  })}
}
export const GENERATOR_KINDS = {nome:"Nome lusófono",npc:"NPC",taverna:"Taverna",tesouro:"Tesouro",clima:"Clima",gancho:"Gancho",aventura:"Aventura"} as const
export type GeneratorKind=keyof typeof GENERATOR_KINDS
export function generateWorld(kind:GeneratorKind, random=Math.random):string {
  const pick=<T,>(values:readonly T[])=>values[Math.max(0,Math.min(values.length-1,Math.floor(random()*values.length)))]!
  const name=()=>`${pick(["Ana","João","Beatriz","Caio","Luísa","Miguel","Yara","Dandara","Afonso","Inês","Tiago","Lúcio","Rui","Conceição","Bento","Catarina"])} ${pick(["das Neves","de Almeida","Ferreira","da Mata","Bragança","do Vale","Moura","Pereira","dos Reis","Barbosa"])} ` .trim()
  const npc=()=>`${name()}, ${pick(["cartógrafo","curandeira","mensageiro","artesã","guarda","barqueira"])}. Quer ${pick(["resgatar um familiar","pagar uma dívida","encontrar um lugar perdido","proteger uma promessa"])}; esconde ${pick(["um mapa incompleto","uma aliança perigosa","uma identidade antiga","uma chave roubada"])}.`
  const hook=()=>`${pick(["Uma ponte desaparece","Um sino toca sozinho","Um emissário não chega","A água do poço muda de cor"])}. ${pick(["A aldeia pede ajuda","Uma facção oferece recompensa","As pistas levam às ruínas","O fenômeno se repete a cada lua"])}.`
  if(kind==="nome") return name()
  if(kind==="npc") return npc()
  if(kind==="taverna") return `A ${pick(["Raposa","Lua","Runa","Chama"])} ${pick(["Dourada","Partida","Silenciosa","Errante"])}. Serve ${pick(["ensopado de raízes","pão de mel e hidromel","peixe defumado","caldo de cogumelos"])}. Rumor: ${hook()}`
  if(kind==="tesouro") return `${pick([12,25,50,100])} moedas, ${pick(["um broche com brasão","uma bússola sem norte","um anel de cobre","uma carta lacrada"])} e ${pick(["uma dívida anotada","um mapa de contrabandistas","o nome de um herdeiro","uma pista para outro esconderijo"])}.`
  if(kind==="clima") return pick(["Manhã fria, neblina e vento fraco.","Chuva contínua; estradas enlameadas.","Céu aberto, calor e vento do oeste.","Tempestade se aproximando pelo litoral.","Noite seca e muito fria."])
  if(kind==="gancho") return hook()
  return `## Gancho\n${hook()}\n\n## NPC\n${npc()}\n\n## Encontro\n${pick(["Negociar uma passagem vigiada","Atravessar ruínas antes da cheia","Resolver uma disputa entre dois aliados","Escoltar alguém que esconde o destino"])}\n\n## Reviravolta\n${pick(["O contratante omitiu uma dívida.","O suposto inimigo quer negociar.","A relíquia é uma cópia; o original já partiu."])}\n\n## Recompensa\n${generateWorld("tesouro",random)}`
}
/** Recorrência no calendário escolhido; não usa meses/dias do calendário real. */
export function worldEventOn(data:Record<string,unknown>, cal:Calendar, date:WorldDate):boolean {
  const start=typeof data.data_mundo==="string"?parseWorldDate(data.data_mundo):null
  if(!start || dateProblem(cal,start)||dateProblem(cal,date)) return false
  const day=dayNumber(cal,date), first=dayNumber(cal,start)
  if(day<first) return false
  const until=typeof data.fim_recorrencia_mundo==="string"?parseWorldDate(data.fim_recorrencia_mundo):null
  if(until && !dateProblem(cal,until) && day>dayNumber(cal,until)) return false
  const interval=typeof data.intervalo_mundo==="number" && Number.isSafeInteger(data.intervalo_mundo) && data.intervalo_mundo>0?data.intervalo_mundo:1
  if(data.recorrencia_mundo==="dias") return (day-first)%interval===0
  if(data.recorrencia_mundo==="meses") return date.day===start.day && ((date.year-start.year)*cal.months.length+date.month-start.month)%interval===0
  if(data.recorrencia_mundo==="anos") return date.day===start.day && date.month===start.month && (date.year-start.year)%interval===0
  return day===first
}
