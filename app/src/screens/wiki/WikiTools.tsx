import { useMemo, useState } from "react"
import { Copy, Dices, Save } from "lucide-react"
import { GENERATOR_GROUPS, GENERATOR_KINDS, NAMED_KINDS, generateWorld, parseDictionary, parseRollTable, rollTable, type GeneratorKind } from "../../core/wiki-tools"
import { findCodeBlocks } from "../../core/codeblocks"
import { useNoteSet } from "../../lib/note-set"
import { useVault } from "../../platform/VaultProvider"
import { Markdown } from "../../components/Markdown"
import { useToast } from "../../components/ui"
import { useWiki } from "./wiki-state"
import { NAME_CULTURES } from "../../core/name-cultures"
import { ChoiceGroup } from "../../components/kit/ChoiceGroup"
import { PageHeader } from "../../components/kit/Layout"
import { href } from "../../lib/router"

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
type Tool = { kind: "gerador"; id: GeneratorKind } | { kind: "tabela"; path: string; index: number }
const GENERATOR_HINTS: Record<GeneratorKind, string> = {
 nome: "Nome e sobrenome, na cultura escolhida.", npc: "Nome, ofício, aparência, jeito, desejo e segredo.", mercador: "Quem vende, o que vende e a mania de negociar.",
 lugar: "Nome de vila, ruína ou acidente geográfico.", taverna: "Nome, prato, bebida, um detalhe e um rumor.", masmorra: "Uma sala, o que chama atenção e o perigo.", clima: "O tempo do dia, pela estação.",
 gancho: "Um acontecimento e o que puxa o grupo para ele.", rumor: "O que se diz nas tavernas.", lenda: "Uma lenda e o quanto dela é verdade.", aventura: "Gancho, lugar, NPC, encontro, reviravolta e recompensa.",
 faccao: "Nome, objetivo e método de um grupo.", divindade: "Nome, domínio, símbolo e mandamento.", item: "Um objeto, o poder e a mania dele.", tesouro: "Moedas, um objeto e uma pista.",
}
const COUNTS = ["1", "5", "10"] as const
const GENDERS = [{ value: "", label: "Qualquer" }, { value: "f", label: "Feminino" }, { value: "m", label: "Masculino" }] as const
const PREFS = "runas-codex:wiki-ferramentas"
/** Nome sugerido para a nota: o nome da pessoa (antes da vírgula) ou a primeira frase, curto e sem caracteres proibidos. */
const suggestName = (text: string) => (text.replace(/^##[^\n]*\n/, "").split(/[,.\n]/)[0] ?? "").replace(/[[\]#^|\\/:*?"<>]/g, "").trim().slice(0, 60)
function readPrefs(): { culture: string; gender: string; count: string } {
 try { const saved = JSON.parse(localStorage.getItem(PREFS) ?? "{}") as Record<string, unknown>; return { culture: String(saved.culture ?? "lusofona"), gender: String(saved.gender ?? ""), count: String(saved.count ?? "1") } } catch { return { culture: "lusofona", gender: "", count: "1" } }
}

/**
 * Ferramentas do mundo (rework F4b, WIK-5; refeita na beta.22): os geradores em quatro grupos e as tabelas roláveis da
 * própria wiki, à esquerda; à direita, as opções (cultura, gênero, quantos), os resultados e o que guardar. Os
 * resultados ficam na tela até gerar de novo; os recentes, até sair da Wiki.
 */
export function WikiTools() {
 const vault = useVault(), toast = useToast(), { wiki } = useWiki()
 const [tool, setTool] = useState<Tool>({ kind: "gerador", id: "nome" })
 const [prefs, setPrefs] = useState(readPrefs)
 const [results, setResults] = useState<string[]>([])
 const [draft, setDraft] = useState(""), [name, setName] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("")
 const [recent, setRecent] = useState<{ label: string; text: string }[]>([])
 const root = wiki!.root
 // As tabelas `runas-tabela` dos artigos desta wiki, para rolar sem abrir o artigo.
 const tables = useMemo(() => vault.index!.notesIn(root).flatMap((note) => findCodeBlocks(note.text, "runas-tabela").flatMap((block, index) => {
  try { return [{ path: note.path, index, note: note.name, table: parseRollTable(block.content) }] } catch { return [] }
 })), [vault.index, vault.version, root])
 const culture = NAME_CULTURES.find((c) => c.id === prefs.culture) ?? NAME_CULTURES[0]!
 const setPref = (key: keyof typeof prefs, value: string) => setPrefs((current) => { const next = { ...current, [key]: value }; try { localStorage.setItem(PREFS, JSON.stringify(next)) } catch { /* só não fica lembrado */ } return next })
 const current = tool.kind === "tabela" ? tables.find((t) => t.path === tool.path && t.index === tool.index) : undefined
 const label = tool.kind === "gerador" ? GENERATOR_KINDS[tool.id] : current?.table.name ?? "Tabela"
 const many = tool.kind === "tabela" || tool.id !== "aventura"
 const count = many ? Number(prefs.count) : 1
 const lookup = (target: string) => {
  const wanted = target.replace(/^\[\[|\]\]$/g, "").split("|")[0]!.trim().toLocaleLowerCase("pt-BR")
  return tables.find((t) => t.note.toLocaleLowerCase("pt-BR") === wanted || t.table.name.toLocaleLowerCase("pt-BR") === wanted)?.table
 }
 const roll = (next: Tool = tool) => {
  setTool(next); setError("")
  try {
   const table = next.kind === "tabela" ? tables.find((t) => t.path === next.path && t.index === next.index)?.table : undefined
   const one = () => next.kind === "gerador" ? generateWorld(next.id, Math.random, { culture, ...(prefs.gender ? { gender: prefs.gender as "f" | "m" } : {}) }) : rollTable(table!, lookup).join(" → ")
   const list = Array.from({ length: next.kind === "gerador" && next.id === "aventura" ? 1 : Number(prefs.count) }, one)
   setResults(list); setDraft(list.length === 1 ? list[0]! : ""); setName(list.length === 1 ? suggestName(list[0]!) : "")
   const title = next.kind === "gerador" ? GENERATOR_KINDS[next.id] : table?.name ?? "Tabela"
   setRecent((items) => [...list.map((text) => ({ label: title, text })), ...items].slice(0, 12))
  } catch (e) { setResults([]); setError(e instanceof Error ? e.message : String(e)) }
 }
 const use = (text: string) => { setDraft(text); setName(suggestName(text)) }
 const copy = (text: string) => void navigator.clipboard?.writeText(text).then(() => toast("Copiado."), () => toast("Não deu para copiar; selecione o texto."))
 const save = () => { setBusy(true); void vault.createNote(`${root}Geradores`, name.trim(), `# ${name.trim()}\n\n${draft.trim()}\n`).then(() => toast(`“${name.trim()}” guardado em ${root}Geradores/.`)).catch((e: unknown) => toast(e instanceof Error ? e.message : String(e))).finally(() => setBusy(false)) }
 const choose = (next: Tool) => { setTool(next); setResults([]); setDraft(""); setName(""); setError("") }
 const isCurrent = (t: Tool) => tool.kind === t.kind && (t.kind === "gerador" ? tool.kind === "gerador" && tool.id === t.id : tool.kind === "tabela" && tool.path === t.path && tool.index === t.index)
 const item = (t: Tool, text: string, hint?: string) => <button key={t.kind === "gerador" ? t.id : `${t.path}#${t.index}`} type="button" className={`list-item ${isCurrent(t) ? "active" : ""}`} aria-current={isCurrent(t) ? "true" : undefined} onClick={() => choose(t)} title={hint}>{text}</button>
 const readOnly = vault.info?.readOnly ?? true
 return <div className="page wiki-tools">
  <PageHeader eyebrow="Wiki · funciona sem internet" title="Ferramentas do mundo" meta={<span className="muted small">{Object.keys(GENERATOR_KINDS).length} geradores, nomes de {NAME_CULTURES.length} culturas{tables.length ? ` e ${tables.length} ${tables.length === 1 ? "tabela" : "tabelas"} da wiki` : ""}</span>} />
  <div className="wiki-tools-layout">
   <label className="field wiki-tools-pick"><span>Ferramenta</span>
    <select className="select" value={tool.kind === "gerador" ? tool.id : `tabela:${tool.path}#${tool.index}`} onChange={(e) => { const value = e.target.value, table = tables.find((t) => `tabela:${t.path}#${t.index}` === value); choose(table ? { kind: "tabela", path: table.path, index: table.index } : { kind: "gerador", id: value as GeneratorKind }) }}>
     {GENERATOR_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.kinds.map((id) => <option key={id} value={id}>{GENERATOR_KINDS[id]}</option>)}</optgroup>)}
     {tables.length > 0 && <optgroup label="Tabelas da wiki">{tables.map((t) => <option key={`${t.path}#${t.index}`} value={`tabela:${t.path}#${t.index}`}>{t.table.name}</option>)}</optgroup>}
    </select>
   </label>
   <nav className="wiki-tools-list" aria-label="Ferramentas">
    {GENERATOR_GROUPS.map((group) => <div key={group.label} className="wiki-tools-group" role="group" aria-labelledby={`ferramentas-${group.label}`}>
     <span id={`ferramentas-${group.label}`} className="eyebrow">{group.label}</span>
     {group.kinds.map((id) => item({ kind: "gerador", id }, GENERATOR_KINDS[id], GENERATOR_HINTS[id]))}
    </div>)}
    <div className="wiki-tools-group" role="group" aria-labelledby="ferramentas-tabelas">
     <span id="ferramentas-tabelas" className="eyebrow">Tabelas da wiki</span>
     {tables.length ? tables.map((t) => item({ kind: "tabela", path: t.path, index: t.index }, t.table.name, t.note)) : <span className="tiny muted wiki-tools-empty">Nenhuma ainda. Insira uma “Tabela rolável” num artigo (menu / do editor).</span>}
    </div>
   </nav>
   <section className="card stack wiki-tools-result" aria-labelledby="ferramenta-atual">
    <div className="stack" style={{ gap: 2 }}>
     <h2 id="ferramenta-atual" className="wiki-tools-title">{label}</h2>
     <span className="small muted">{tool.kind === "gerador" ? GENERATOR_HINTS[tool.id] : `Do artigo ${current?.note ?? ""}; resultados que apontam outra tabela rolam a outra também.`}</span>
    </div>
    <div className="wiki-tools-options">
     {tool.kind === "gerador" && NAMED_KINDS.includes(tool.id) && <>
      <label className="field"><span>Cultura dos nomes</span>
       <select className="select" value={culture.id} onChange={(e) => setPref("culture", e.target.value)}>{NAME_CULTURES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
      </label>
      <div className="field"><span id="ferramenta-genero">Gênero</span><ChoiceGroup labelledBy="ferramenta-genero" value={prefs.gender} options={GENDERS} onChange={(value) => setPref("gender", value)} /></div>
     </>}
     {many && <div className="field"><span id="ferramenta-quantos">Quantos</span><ChoiceGroup labelledBy="ferramenta-quantos" value={prefs.count as (typeof COUNTS)[number]} options={COUNTS.map((value) => ({ value, label: value }))} onChange={(value) => setPref("count", value)} /></div>}
     <button className="btn primary wiki-tools-roll" onClick={() => roll()}><Dices size={16} /> {results.length ? "Gerar de novo" : count > 1 ? `Gerar ${count}` : "Gerar"}</button>
    </div>
    {tool.kind === "gerador" && NAMED_KINDS.includes(tool.id) && <span className="tiny muted">{culture.hint}.</span>}
    {error && <p role="alert" className="small" style={{ color: "var(--red)" }}>{error}</p>}
    {results.length > 1 && <ol className="wiki-tools-results" aria-label="Resultados">
     {results.map((text, i) => <li key={i}>
      <span className="grow">{text}</span>
      <span className="row" style={{ gap: 4 }}>
       <button className="icon-btn sm" onClick={() => copy(text)} aria-label={`Copiar ${suggestName(text) || `resultado ${i + 1}`}`} title="Copiar"><Copy size={14} /></button>
       <button className="btn sm" onClick={() => use(text)} aria-pressed={draft === text}>{draft === text ? "Escolhido" : "Usar"}</button>
      </span>
     </li>)}
    </ol>}
    {draft ? <div className="stack wiki-tools-save">
     <label className="field"><span>Resultado (dá para editar)</span><textarea className="input" rows={Math.min(16, Math.max(3, draft.split("\n").reduce((rows, line) => rows + Math.ceil((line.length + 1) / 80), 1)))} value={draft} onChange={(e) => setDraft(e.target.value)} /></label>
     <div className="row-wrap">
      <label className="field grow"><span>Nome da nota</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Taverna da Raposa" /></label>
      <button className="btn" onClick={() => copy(draft)}><Copy size={15} /> Copiar</button>
      <button className="btn" disabled={busy || readOnly || !name.trim() || !draft.trim()} onClick={save}><Save size={15} /> Guardar na wiki</button>
     </div>
     <span className="tiny muted">{readOnly ? "Cofre em somente leitura: libere a gravação em Configurações para guardar." : `Vira uma nota em ${root}Geradores/.`}</span>
    </div> : !results.length && !error && <p className="small muted">Escolha as opções e clique em Gerar. {many ? "Com 5 ou 10, escolha o resultado que quiser guardar." : ""}</p>}
   </section>
  </div>
  {recent.length > 0 && <details className="card wiki-tools-recent">
   <summary className="section-title">Recentes ({recent.length})</summary>
   <ul>{recent.map((r, i) => <li key={i}><button type="button" className="wiki-tools-recent-item" onClick={() => use(r.text)}><strong>{r.label}:</strong> {r.text.replace(/\n+/g, " ").slice(0, 140)}</button></li>)}</ul>
  </details>}
  <p className="tiny muted">Tabelas roláveis, dicionários de idiomas e galerias entram nos artigos pelo menu / do editor. <a href={href("/config/ajuda/wiki")}>Como usar na Ajuda</a>.</p>
 </div>
}
