import { useState } from "react"
import { GENERATOR_KINDS, generateWorld, parseDictionary, parseRollTable, rollTable, type GeneratorKind } from "../../core/wiki-tools"
import { findCodeBlocks } from "../../core/codeblocks"
import { useNoteSet } from "../../lib/note-set"
import { useVault } from "../../platform/VaultProvider"
import { Markdown } from "../../components/Markdown"
import { useToast } from "../../components/ui"
import { useWiki } from "./wiki-state"

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
export const WIKI_INSERTS=[
 ["Segredo de jogador",'> [!segredo|Jogador 1] Informação reservada\n> Só o destinatário indicado recebe este trecho pela sala.'],
 ["Spoiler",'<details class="spoiler"><summary>Revelar spoiler</summary>Texto oculto até abrir.</details>'],
 ["Galeria",'![[Anexos/imagem-1.png]]\n\n![[Anexos/imagem-2.png]]'],
 ["Áudio",'![[Anexos/trilha.mp3]]'],
 ["Tabela rolável",'```runas-tabela\nnome: Rumores\nresultados:\n  - texto: Uma caravana desapareceu.\n    peso: 2\n  - texto: Um visitante traz novidades.\n    tabela: "[[Outra tabela]]"\n```'],
 ["Dicionário",'```runas-idioma\nnome: Élfico\nregras: As vogais são longas.\npalavras:\n  - palavra: aelin\n    traducao: lago\n    pronuncia: áe-lin\n```'],
] as const
export function WikiTools() {
 const vault=useVault(),toast=useToast(),{wiki}=useWiki(),[kind,setKind]=useState<GeneratorKind>("nome"),[result,setResult]=useState(""),[name,setName]=useState(""),[busy,setBusy]=useState(false)
 return <div className="page wiki-tools"><h1>Ferramentas do mundo</h1><p className="muted">Geradores por sorteio, disponíveis sem internet. Revise o resultado antes de guardar.</p><section className="card stack"><label>Gerador<select className="input" value={kind} onChange={e=>setKind(e.target.value as GeneratorKind)}>{Object.entries(GENERATOR_KINDS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><button className="btn primary" onClick={()=>setResult(generateWorld(kind))}>Gerar</button><label>Resultado<textarea className="input" rows={10} value={result} onChange={e=>setResult(e.target.value)}/></label><label>Nome da nota<input className="input" value={name} onChange={e=>setName(e.target.value)}/></label><button className="btn" disabled={busy||vault.info?.readOnly||!name.trim()||!result.trim()} onClick={()=>{setBusy(true);void vault.createNote(`${wiki!.root}Geradores`,name.trim(),`# ${name.trim()}\n\n${result}\n`).then(()=>toast("Resultado guardado na Wiki.")).catch(e=>toast(String(e))).finally(()=>setBusy(false))}}>Guardar resultado como nota</button></section><section className="card stack"><h2>Tabelas, idiomas e mídia nos artigos</h2><p>No editor do artigo, digite / ou abra a galeria Formatar (Ctrl+/) na aba Wiki. Tabelas podem encadear outra nota pela chave tabela; o dicionário aceita tradução, pronúncia e regras.</p></section></div>
}
