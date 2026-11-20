import { useEffect, useMemo, useState } from "react"
import { Copy, Dices, Save } from "lucide-react"
import { GENERATOR_ARTICLE, GENERATOR_GROUPS, GENERATOR_KINDS, NAMED_KINDS, articleFromResult, generateWorld, type GeneratorKind } from "../../core/wiki-tools"
import { findCodeBlocks } from "../../core/codeblocks"
import { useVault } from "../../platform/VaultProvider"
import { useToast } from "../../components/ui"
import { useWiki } from "./wiki-state"
import { NAME_CULTURES } from "../../core/name-cultures"
import { ChoiceGroup } from "../../components/kit/ChoiceGroup"
import { PageHeader } from "../../components/kit/Layout"
import { href } from "../../lib/router"
import { NewArticleDialog } from "./NewArticleDialog"
import { articleKind } from "../../core/wiki"
import { RelationFixes, useRelationChecks } from "./RelationFixes"
import { PanelTabs, TabPanel } from "../../components/kit/PanelTabs"
import { useRemembered } from "../../lib/remembered"
import { noteRoute } from "../../lib/vault-notes"
import { WIKI_INSERTS } from "./wiki-inserts"
import { parseRollTable, rollTable } from "../../core/wiki-text-tools"

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

type ToolsTab = "geradores" | "tabelas" | "conferir"
const parseToolsTab = (raw: unknown): ToolsTab => (raw === "tabelas" || raw === "conferir" ? raw : "geradores")
const EXAMPLE_TABLE = WIKI_INSERTS.find(([name]) => name === "Tabela rolável")![1]

/** “Vai para Personagens (Personagem)”: a pasta e o tipo do artigo que o resultado vira. */
function destination(id: GeneratorKind): string {
 const target = GENERATOR_ARTICLE[id], kind = articleKind(target.kind)
 if (!kind) return ""
 const field = target.field ? kind.fields.find((f) => f.key === target.field)?.label : undefined
 return `Vai para ${kind.folder} (${kind.label}${field ? `, campo ${field}` : ""}).`
}

/**
 * Ferramentas do mundo (rework F4b, WIK-5; refeita na U118): três abas. Geradores: os 15 em quatro faixas de pílulas
 * (Pessoas, Lugares, Enredo, Mundo), as opções e o “Gerar” na linha do título e os Recentes abertos ao lado. Tabelas da
 * wiki: as `runas-tabela` dos artigos, cada uma num cartão com “Rolar”. Conferir a wiki: as relações a consertar, com
 * a lista inteira na tela. Os resultados ficam até gerar de novo; os recentes, guardados por wiki neste aparelho.
 */
export function WikiTools() {
 const vault = useVault(), toast = useToast(), { wiki } = useWiki()
 const root = wiki!.root
 const [tab, setTab] = useRemembered(`runas-codex:wiki-ferramentas-aba:${root}`, parseToolsTab)
 const [tool, setTool] = useState<Tool>({ kind: "gerador", id: "nome" })
 const [prefs, setPrefs] = useState(readPrefs)
 const [results, setResults] = useState<string[]>([])
 const [draft, setDraft] = useState(""), [name, setName] = useState(""), [error, setError] = useState("")
 const [articleOpen, setArticleOpen] = useState(false)
 const [recent, setRecent] = useState<{ label: string; text: string }[]>([])
 const checks = useRelationChecks(root)
 useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(`runas-codex:wiki-ferramentas-recentes:${root}`) ?? "[]"); if (Array.isArray(saved)) setRecent(saved.filter((item): item is { label: string; text: string } => Boolean(item && typeof item.label === "string" && typeof item.text === "string")).slice(0, 12)) } catch { /* preferência opcional */ } }, [root])
 useEffect(() => { try { localStorage.setItem(`runas-codex:wiki-ferramentas-recentes:${root}`, JSON.stringify(recent.slice(0, 12))) } catch { /* preferência opcional */ } }, [recent, root])
 // As tabelas `runas-tabela` dos artigos desta wiki, para rolar sem abrir o artigo.
 const tables = useMemo(() => vault.index!.notesIn(root).flatMap((note) => findCodeBlocks(note.text, "runas-tabela").flatMap((block, index) => {
  try { return [{ path: note.path, index, note: note.name, table: parseRollTable(block.content) }] } catch { return [] }
 })), [vault.index, vault.version, root])
 const culture = NAME_CULTURES.find((c) => c.id === prefs.culture) ?? NAME_CULTURES[0]!
 const setPref = (key: keyof typeof prefs, value: string) => setPrefs((current) => { const next = { ...current, [key]: value }; try { localStorage.setItem(PREFS, JSON.stringify(next)) } catch { /* só não fica lembrado */ } return next })
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
 const copy = (text: string) => void navigator.clipboard?.writeText(text).then(() => toast("Copiado."), () => toast.error("Não deu para copiar; selecione o texto."))
 const choose = (next: Tool) => { setTool(next); setResults([]); setDraft(""); setName(""); setError("") }
 const isCurrent = (t: Tool) => tool.kind === t.kind && (t.kind === "gerador" ? tool.kind === "gerador" && tool.id === t.id : tool.kind === "tabela" && tool.path === t.path && tool.index === t.index)
 // Ao trocar de aba, o resultado mostrado é o da ferramenta daquela aba.
 const changeTab = (next: ToolsTab) => {
  setTab(next)
  if (next === "geradores" && tool.kind !== "gerador") choose({ kind: "gerador", id: "nome" })
  if (next === "tabelas" && tool.kind !== "tabela") { const first = tables[0]; if (first) choose({ kind: "tabela", path: first.path, index: first.index }); else choose(tool) }
 }
 const result = <ToolResult tool={tool} tables={tables} prefs={prefs} culture={culture} setPref={setPref} results={results} draft={draft} name={name} error={error}
  onRoll={() => roll()} onUse={use} onCopy={copy} onDraft={setDraft} onName={setName} onSave={() => setArticleOpen(true)} />
 return <div className="page wiki-tools">
  <PageHeader eyebrow="Wiki · funciona sem internet" title="Ferramentas do mundo" meta={<span className="muted small">{Object.keys(GENERATOR_KINDS).length} geradores, nomes de {NAME_CULTURES.length} culturas{tables.length ? ` e ${tables.length} ${tables.length === 1 ? "tabela" : "tabelas"} da wiki` : ""}</span>} />
  <PanelTabs label="Ferramentas" idPrefix="ferramentas" value={tab} onChange={changeTab} tabs={[
   { value: "geradores", label: "Geradores", count: Object.keys(GENERATOR_KINDS).length },
   { value: "tabelas", label: "Tabelas da wiki", count: tables.length },
   { value: "conferir", label: "Conferir a wiki", count: checks.total },
  ]} />
  <TabPanel idPrefix="ferramentas" value={tab}>
   {tab === "geradores" && <div className="wiki-tools-layout">
    <div className="wiki-tools-main">
     <label className="field wiki-tools-pick"><span>Gerador</span>
      <select className="select" value={tool.kind === "gerador" ? tool.id : ""} onChange={(e) => choose({ kind: "gerador", id: e.target.value as GeneratorKind })}>
       {GENERATOR_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.kinds.map((id) => <option key={id} value={id}>{GENERATOR_KINDS[id]} ({group.label})</option>)}</optgroup>)}
      </select>
     </label>
     <div className="card wiki-tools-picker">
      {GENERATOR_GROUPS.map((group) => <div key={group.label} className="wiki-tools-pick-row" role="group" aria-labelledby={`ferramentas-${group.label}`}>
       <span id={`ferramentas-${group.label}`}>{group.label}</span>
       <div className="row-wrap">{group.kinds.map((id) => {
        const on = isCurrent({ kind: "gerador", id })
        return <button key={id} type="button" className={`wiki-tools-pill${on ? " on" : ""}`} aria-pressed={on} title={GENERATOR_HINTS[id]} onClick={() => choose({ kind: "gerador", id })}>{GENERATOR_KINDS[id]}</button>
       })}</div>
      </div>)}
     </div>
     {result}
    </div>
    <section className="card wiki-tools-recent" aria-labelledby="ferramentas-recentes">
     <h2 id="ferramentas-recentes" className="wiki-tools-recent-title">Recentes · {recent.length}</h2>
     {recent.length ? <>
      <ul>{recent.map((r, i) => <li key={i}><button type="button" className="wiki-tools-recent-item" onClick={() => use(r.text)}><strong>{r.label}:</strong> {r.text.replace(/\n+/g, " ").slice(0, 140)}</button></li>)}</ul>
      <span className="tiny muted">Clique para usar de novo.</span>
     </> : <span className="small muted">O que você gerar aparece aqui, guardado neste aparelho.</span>}
    </section>
   </div>}
   {tab === "tabelas" && <div className="wiki-tools-tables">
    {tables.length ? <>
     <ul className="wiki-tools-table-cards">{tables.map((t) => {
      const value: Tool = { kind: "tabela", path: t.path, index: t.index }, on = isCurrent(value)
      return <li key={`${t.path}#${t.index}`} className={`card wiki-tools-table-card${on ? " on" : ""}`}>
       <strong>{t.table.name}</strong>
       <span className="tiny muted">{t.table.entries.length} resultados · <a href={href(noteRoute(t.path))}>{t.note}</a></span>
       <button type="button" className={`btn sm${on ? " primary" : ""}`} onClick={() => roll(value)}><Dices size={14} aria-hidden="true" /> Rolar</button>
      </li>
     })}</ul>
     {tool.kind === "tabela" && result}
    </> : <section className="card stack wiki-tools-empty-tables">
     <h2 className="wiki-tools-title">Nenhuma tabela rolável nesta wiki</h2>
     <p className="small muted">Num artigo, abra o menu / do editor e escolha “Tabela rolável”. Ela aparece aqui para rolar sem abrir o artigo. Um exemplo:</p>
     <pre className="wiki-tools-example">{EXAMPLE_TABLE}</pre>
     <a href={href("/config/ajuda/wiki")} className="small">Como usar na Ajuda</a>
    </section>}
   </div>}
   {tab === "conferir" && <RelationFixes checks={checks} />}
  </TabPanel>
  {articleOpen && (() => {
   // Resultado de gerador: o tipo e o campo da ficha certos (U26); de tabela: só o texto, o tipo fica a escolher.
   const article = tool.kind === "gerador" ? articleFromResult(tool.id, draft.trim()) : null
   return <NewArticleDialog initialName={name.trim()} {...(article ? { initialKind: article.kind, initialValues: article.values } : {})} initialBody={article ? article.body : draft.trim()} onClose={() => setArticleOpen(false)} />
  })()}
  <p className="tiny muted">Tabelas roláveis, dicionários de idiomas e galerias entram nos artigos pelo menu / do editor. <a href={href("/config/ajuda/wiki")}>Como usar na Ajuda</a>.</p>
 </div>
}

type Table = { path: string; index: number; note: string; table: ReturnType<typeof parseRollTable> }
type Prefs = ReturnType<typeof readPrefs>

/** O gerador ou a tabela escolhida: título e opções na mesma linha, os resultados e o que guardar. */
function ToolResult({ tool, tables, prefs, culture, setPref, results, draft, name, error, onRoll, onUse, onCopy, onDraft, onName, onSave }: {
 tool: Tool; tables: Table[]; prefs: Prefs; culture: (typeof NAME_CULTURES)[number]; setPref(key: keyof Prefs, value: string): void
 results: string[]; draft: string; name: string; error: string
 onRoll(): void; onUse(text: string): void; onCopy(text: string): void; onDraft(text: string): void; onName(text: string): void; onSave(): void
}) {
 const vault = useVault()
 const readOnly = vault.info?.readOnly ?? true
 const current = tool.kind === "tabela" ? tables.find((t) => t.path === tool.path && t.index === tool.index) : undefined
 const label = tool.kind === "gerador" ? GENERATOR_KINDS[tool.id] : current?.table.name ?? "Tabela"
 const many = tool.kind === "tabela" || tool.id !== "aventura"
 const count = many ? Number(prefs.count) : 1
 const named = tool.kind === "gerador" && NAMED_KINDS.includes(tool.id)
 return <section className="card stack wiki-tools-result" aria-labelledby="ferramenta-atual">
  <div className="wiki-tools-result-head">
   <div className="stack" style={{ gap: 2, minWidth: 0 }}>
    <h2 id="ferramenta-atual" className="wiki-tools-title">{label}</h2>
    <span className="small muted">{tool.kind === "gerador" ? `${GENERATOR_HINTS[tool.id]} ${destination(tool.id)}` : `Do artigo ${current?.note ?? ""}; resultados que apontam outra tabela rolam a outra também.`}</span>
   </div>
   <div className="wiki-tools-options">
    {named && <>
     <label className="field"><span>Cultura dos nomes</span>
      <select className="select" value={culture.id} onChange={(e) => setPref("culture", e.target.value)}>{NAME_CULTURES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
     </label>
     <div className="field"><span id="ferramenta-genero">Gênero</span><ChoiceGroup labelledBy="ferramenta-genero" value={prefs.gender} options={GENDERS} onChange={(value) => setPref("gender", value)} /></div>
    </>}
    {many && <div className="field"><span id="ferramenta-quantos">Quantos</span><ChoiceGroup labelledBy="ferramenta-quantos" value={prefs.count as (typeof COUNTS)[number]} options={COUNTS.map((value) => ({ value, label: value }))} onChange={(value) => setPref("count", value)} /></div>}
    <button className="btn primary wiki-tools-roll" onClick={onRoll}><Dices size={16} aria-hidden="true" /> {results.length ? "Gerar de novo" : count > 1 ? `Gerar ${count}` : "Gerar"}</button>
   </div>
  </div>
  {named && <span className="tiny muted">{culture.hint}.</span>}
  {error && <p role="alert" className="small" style={{ color: "var(--red)" }}>{error}</p>}
  {results.length > 1 && <ol className="wiki-tools-results" aria-label="Resultados">
   {results.map((text, i) => <li key={i}>
    <span className="grow">{text}</span>
    <span className="row" style={{ gap: 4 }}>
     <button className="icon-btn sm" onClick={() => onCopy(text)} aria-label={`Copiar ${suggestName(text) || `resultado ${i + 1}`}`} title="Copiar"><Copy size={14} /></button>
     <button className="btn sm" onClick={() => onUse(text)} aria-pressed={draft === text}>{draft === text ? "Escolhido" : "Usar"}</button>
    </span>
   </li>)}
  </ol>}
  {draft ? <div className="stack wiki-tools-save">
   <label className="field"><span>Resultado (dá para editar)</span><textarea className="input" rows={Math.min(16, Math.max(3, draft.split("\n").reduce((rows, line) => rows + Math.ceil((line.length + 1) / 80), 1)))} value={draft} onChange={(e) => onDraft(e.target.value)} /></label>
   <div className="row-wrap">
    <label className="field grow"><span>Nome da nota</span><input className="input" value={name} onChange={(e) => onName(e.target.value)} placeholder="Ex.: Taverna da Raposa" /></label>
    <button className="btn" onClick={() => onCopy(draft)}><Copy size={15} /> Copiar</button>
    <button className="btn primary" disabled={readOnly || !draft.trim()} onClick={onSave}><Save size={15} /> Guardar na wiki…</button>
   </div>
   <span className="tiny muted">{readOnly ? "Cofre em somente leitura: libere a gravação em Configurações para guardar." : "Abre o Novo artigo com o resultado; lá você confere o tipo, a pasta e a ficha."}</span>
  </div> : !results.length && !error && <p className="small muted">Escolha as opções e clique em Gerar. {many ? "Com 5 ou 10, escolha o resultado que quiser guardar." : ""}</p>}
 </section>
}
