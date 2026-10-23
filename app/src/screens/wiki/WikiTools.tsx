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
/**
 * Ferramentas do mundo (rework F4b, WIK-5): a lista de geradores à esquerda e o resultado à direita, do tamanho dele.
 * Gerar de novo troca o resultado; ele pode ser editado e guardado como nota da Wiki.
 */
export function WikiTools() {
 const vault=useVault(),toast=useToast(),{wiki}=useWiki(),[kind,setKind]=useState<GeneratorKind>("nome"),[result,setResult]=useState(""),[name,setName]=useState(""),[busy,setBusy]=useState(false)
 const generate=(next:GeneratorKind)=>{setKind(next);setResult(generateWorld(next))}
 const save=()=>{setBusy(true);void vault.createNote(`${wiki!.root}Geradores`,name.trim(),`# ${name.trim()}\n\n${result}\n`).then(()=>toast("Resultado guardado na Wiki.")).catch(e=>toast(String(e))).finally(()=>setBusy(false))}
 return <div className="page wiki-tools">
  <h1 className="page-title">Ferramentas do mundo</h1>
  <p className="muted">Geradores por sorteio, disponíveis sem internet. Revise o resultado antes de guardar.</p>
  <div className="wiki-tools-layout">
   <nav className="wiki-tools-list" aria-label="Geradores">
    {Object.entries(GENERATOR_KINDS).map(([id,label])=><button key={id} type="button" className={`list-item ${kind===id?"active":""}`} aria-current={kind===id?"true":undefined} onClick={()=>generate(id as GeneratorKind)}>{label}</button>)}
   </nav>
   <section className="card stack wiki-tools-result" aria-label={`Resultado: ${GENERATOR_KINDS[kind]}`}>
    <div className="row between"><strong>{GENERATOR_KINDS[kind]}</strong><button className="btn sm primary" onClick={()=>generate(kind)}>{result?"Gerar de novo":"Gerar"}</button></div>
    {result ? <>
     <label className="field"><span>Resultado (dá para editar)</span><textarea className="input" rows={Math.min(16,Math.max(3,result.split("\n").length+1))} value={result} onChange={e=>setResult(e.target.value)}/></label>
     <div className="row-wrap"><label className="field grow"><span>Nome da nota</span><input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Taverna da Raposa"/></label><button className="btn" disabled={busy||vault.info?.readOnly||!name.trim()||!result.trim()} onClick={save}>Guardar como nota</button></div>
     <span className="tiny muted">Vai para {wiki!.root}Geradores/.</span>
    </> : <p className="small muted">Escolha um gerador à esquerda ou clique em Gerar.</p>}
   </section>
  </div>
  <section className="card stack"><h2>Tabelas, idiomas e mídia nos artigos</h2><p>No editor do artigo, digite / ou abra a galeria Formatar (Ctrl+/) na aba Wiki. Tabelas podem encadear outra nota pela chave tabela; o dicionário aceita tradução, pronúncia e regras.</p></section>
 </div>
}
