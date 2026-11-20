import { useState } from "react"
import { Markdown } from "../../components/Markdown"
import { findCodeBlocks } from "../../core/codeblocks"
import { parseDictionary, parseRollTable, rollTable } from "../../core/wiki-text-tools"
import { useNoteSet } from "../../lib/note-set"

export function RollTableBlock({code}:{code:string}) {
 const set=useNoteSet(),[result,setResult]=useState<string[]>([]),[error,setError]=useState("")
 let table;try{table=parseRollTable(code)}catch(e){return <p role="alert">{String(e)}</p>}
 return <section className="card wiki-table"><strong>{table.name}</strong><button className="btn" onClick={()=>{try{setResult(rollTable(table,target=>{const resolved=set.resolve?.(target.replace(/^\[\[|\]\]$/g,""),"wiki"),text=resolved?set.readNote?.(resolved.path):undefined;const block=text?findCodeBlocks(text,"runas-tabela")[0]:undefined;return block?parseRollTable(block.content):undefined}));setError("")}catch(e){setError(String(e))}}}>Rolar tabela</button>{result.map((text,i)=><Markdown key={i} source={text} />)}{error&&<p role="alert">{error}</p>}<details><summary>Resultados possíveis</summary><ul>{table.entries.map((entry,i)=><li key={i}>{entry.text} · peso {entry.weight}{entry.table&&` → ${entry.table}`}</li>)}</ul></details></section>
}
export function DictionaryBlock({code}:{code:string}) {
 const [query,setQuery]=useState("")
 let dictionary;try{dictionary=parseDictionary(code)}catch(e){return <p role="alert">{String(e)}</p>}
 const words=dictionary.words.filter(w=>`${w.word} ${w.translation} ${w.pronunciation}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))
 return <section className="card wiki-dictionary"><h3>{dictionary.name}</h3><Markdown source={dictionary.rules}/><label>Buscar no dicionário<input className="input" value={query} onChange={e=>setQuery(e.target.value)}/></label><p className="small">{words.length} palavras</p><div className="table-wrap"><table><thead><tr><th>Palavra</th><th>Tradução</th><th>Pronúncia</th></tr></thead><tbody>{words.slice(0,200).map((word,i)=><tr key={i}><td>{word.word}</td><td>{word.translation}</td><td>{word.pronunciation}</td></tr>)}</tbody></table></div></section>
}
