import { parse as parseYaml } from "yaml"

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
