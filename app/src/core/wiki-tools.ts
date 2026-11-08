import { parse as parseYaml } from "yaml"
import { dayNumber, parseWorldDate, dateProblem, type Calendar, type WorldDate } from "./calendar"
import * as T from "./generator-tables"
import { cultureName, type NameCulture } from "./name-cultures"
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
export const GENERATOR_KINDS = {nome:"Nome",npc:"NPC",taverna:"Taverna",tesouro:"Tesouro",clima:"Clima",gancho:"Gancho",rumor:"Rumor",lugar:"Nome de lugar",item:"Item mágico",faccao:"Facção",divindade:"Divindade",masmorra:"Sala de masmorra",lenda:"Lenda",mercador:"Mercador",aventura:"Aventura"} as const
export type GeneratorKind=keyof typeof GENERATOR_KINDS
/** Grupos da tela de Ferramentas: cada gerador aparece em um só. */
export const GENERATOR_GROUPS:{label:string;kinds:GeneratorKind[]}[]=[
  {label:"Pessoas",kinds:["nome","npc","mercador"]},
  {label:"Lugares",kinds:["lugar","taverna","masmorra","clima"]},
  {label:"Enredo",kinds:["gancho","rumor","lenda","aventura"]},
  {label:"Mundo",kinds:["faccao","divindade","item","tesouro"]},
]
/** Geradores que sorteiam nomes de pessoas e por isso aceitam cultura e gênero. */
export const NAMED_KINDS:readonly GeneratorKind[]=["nome","npc","mercador","aventura"]
export interface GeneratorOptions { culture?: NameCulture; gender?: "f" | "m" }
/** Sorteio dos geradores; as listas ficam em `generator-tables.ts`. `random` fixo deixa o resultado previsível nos testes. */
export function generateWorld(kind:GeneratorKind, random=Math.random, options:GeneratorOptions={}):string {
  return drawGenerator(kind, random, options).text
}
/** Partes de um sorteio: o texto inteiro e, quando o gerador tem, o pedaço que vai para um campo da ficha. */
interface GeneratorDraw { text: string; field?: string }
function drawGenerator(kind:GeneratorKind, random:()=>number, options:GeneratorOptions):GeneratorDraw {
  const pick=<T,>(values:readonly T[])=>values[Math.max(0,Math.min(values.length-1,Math.floor(random()*values.length)))]!
  const person=()=>{const gender=options.gender??pick(["f","m"] as const),name=options.culture?cultureName(options.culture,gender,random):`${pick(gender==="f"?T.FEMALE_NAMES:T.MALE_NAMES)} ${pick(T.SURNAMES)}`;return {gender,name,job:pick(T.PROFESSIONS)[gender==="f"?1:0]}}
  const name=()=>person().name
  const npc=()=>{const p=person();return `${p.name}, ${p.job}. Aparência: ${pick(T.LOOKS)}. Jeito: ${pick(T.TRAITS)}. Quer ${pick(T.DESIRES)}; esconde ${pick(T.SECRETS)}.`}
  const hook=()=>`${pick(T.HOOK_EVENTS)}. ${pick(T.HOOK_TURNS)}.`
  const treasure=()=>`${pick(T.COIN_AMOUNTS)} ${pick(T.COIN_KINDS)}, ${pick(T.TRINKETS)} e ${pick(T.TREASURE_EXTRAS)}.`
  const place=()=>`${pick(T.PLACE_HEADS)} ${pick(T.PLACE_TAILS)}`
  if(kind==="nome") return {text:name()}
  if(kind==="npc") return {text:npc()}
  if(kind==="taverna") {const [noun,gender]=pick(T.TAVERN_NOUNS),adjective=pick(T.TAVERN_ADJECTIVES)[gender==="f"?1:0];return {text:`${gender==="f"?"A":"O"} ${noun} ${adjective}. Serve ${pick(T.DISHES)} e ${pick(T.DRINKS)}. Chama atenção: ${pick(T.TAVERN_DETAILS)}. Rumor: ${pick(T.RUMORS)}`}}
  if(kind==="tesouro") return {text:treasure()}
  if(kind==="clima") {const season=pick(Object.keys(T.WEATHER));return {text:`${season}: ${pick(T.WEATHER[season]!)}`}}
  if(kind==="gancho") return {text:hook()}
  if(kind==="rumor") return {text:pick(T.RUMORS)}
  if(kind==="lugar") return {text:place()}
  if(kind==="item") return {text:`${pick(T.MAGIC_ITEMS)} ${pick(T.MAGIC_POWERS)}. ${pick(T.MAGIC_QUIRKS)}`}
  if(kind==="faccao") return {text:`${pick(T.FACTION_NOUNS)} ${pick(T.FACTION_EMBLEMS)}. Quer ${pick(T.FACTION_GOALS)}; age por meio de ${pick(T.FACTION_METHODS)}.`}
  if(kind==="divindade") {const syllables=Array.from({length:2+Math.floor(random()*2)},()=>pick(T.DEITY_SYLLABLES)).join(""),deity=syllables.charAt(0).toLocaleUpperCase("pt-BR")+syllables.slice(1);const domain=pick(T.DEITY_DOMAINS),symbol=pick(T.DEITY_SYMBOLS),tenet=pick(T.DEITY_TENETS);return {text:`${deity}, divindade ${domain}. Símbolo: ${symbol}. Mandamento: ${tenet}`,field:tenet}}
  if(kind==="masmorra") return {text:`${pick(T.DUNGEON_ROOMS)}. ${pick(T.DUNGEON_FEATURES)} Perigo: ${pick(T.DUNGEON_DANGERS)}.`}
  if(kind==="lenda") {const subject=pick(T.LEGEND_SUBJECTS),truth=pick(T.LEGEND_TRUTHS);return {text:`${subject}. ${truth}`,field:truth}}
  if(kind==="mercador") {const p=person();return {text:`${p.name} vende ${pick(T.MERCHANT_WARES)} e ${pick(T.MERCHANT_QUIRKS)}.`}}
  return {text:`## Gancho\n${hook()}\n\n## Onde\n${place()}\n\n## NPC\n${npc()}\n\n## Encontro\n${pick(T.ENCOUNTERS)}\n\n## Reviravolta\n${pick(T.TWISTS)}\n\n## Recompensa\n${treasure()}`}
}

/** O tipo de artigo e o campo da ficha de cada gerador (U26): “Guardar na wiki…” abre o Novo artigo assim. */
export const GENERATOR_ARTICLE: Record<GeneratorKind, { kind: string; field?: string }> = {
  nome: { kind: "personagem" }, npc: { kind: "personagem" }, mercador: { kind: "personagem" },
  lugar: { kind: "local" }, taverna: { kind: "construcao" }, masmorra: { kind: "local" }, clima: { kind: "local", field: "clima" },
  gancho: { kind: "evento" }, rumor: { kind: "mito" }, lenda: { kind: "mito", field: "verdade" }, aventura: { kind: "evento" },
  faccao: { kind: "organizacao" }, divindade: { kind: "religiao", field: "dogma" }, item: { kind: "item" }, tesouro: { kind: "item" },
}
export interface GeneratedArticle { text: string; kind: string; values: Record<string, string>; body: string }
/** Um sorteio pronto para virar artigo: o mesmo sorteio de `generateWorld` (mesma ordem), o tipo e o campo da ficha. */
export function generateDetailed(kind: GeneratorKind, random = Math.random, options: GeneratorOptions = {}): GeneratedArticle {
  return generatedArticle(kind, drawGenerator(kind, random, options))
}
function generatedArticle(kind: GeneratorKind, draw: GeneratorDraw): GeneratedArticle {
  const target = GENERATOR_ARTICLE[kind]
  // Clima é o campo inteiro; lenda e divindade levam só a verdade e o mandamento para a ficha, o resto vai no texto.
  const value = target.field ? (kind === "clima" ? draw.text : draw.field) : undefined
  return { text: draw.text, kind: target.kind, values: target.field && value ? { [target.field]: value } : {}, body: kind === "clima" ? "" : draw.text }
}
/** O mesmo, a partir de um texto já sorteado (o resultado escolhido entre 5 ou 10). */
export function articleFromResult(kind: GeneratorKind, text: string): GeneratedArticle {
  const field = kind === "lenda" ? text.slice(text.indexOf(". ") + 2) : kind === "divindade" ? text.split("Mandamento: ").at(-1) : undefined
  return generatedArticle(kind, { text, ...(field ? { field } : {}) })
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
