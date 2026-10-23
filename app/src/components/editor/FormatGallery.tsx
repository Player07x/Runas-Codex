import "./editor.css"
import { Bold, Italic, Underline } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { FORMATTERS, FORMATTER_GROUPS, searchFormatters, type FormatterEntry } from "../../core/formatters"
import { PanelTabs, TabPanel } from "../kit/PanelTabs"
import { Modal } from "../ui"

const GROUP_KEY = "runas-codex:formatar:grupo"

/** Desenho pequeno do resultado de cada formatador; o nome sempre vem escrito ao lado. */
function Sample({ item }: { item: FormatterEntry }) {
  const columns = /Colunas automáticas: (\d)/.exec(item.label)?.[1]
  if (columns) return <span className="format-columns" style={{ gridTemplateColumns: `repeat(${columns},1fr)` }}>{Array.from({ length: Number(columns) }, (_, i) => <span key={i} />)}</span>
  if (item.label === "Negrito") return <Bold size={18} />
  if (item.label === "Itálico") return <Italic size={18} />
  if (item.label === "Sublinhado") return <Underline size={18} />
  if (item.label.startsWith("Título H")) return <b>{item.label.slice(-2)}</b>
  if (item.label === "Tachado") return <s>Aa</s>
  if (item.label === "Destaque") return <mark>Aa</mark>
  if (item.label.includes("Tabela")) return <>▦</>
  if (item.label.includes("Imagem")) return <>▧</>
  if (item.label.includes("Quebra")) return <>↵</>
  if (item.label.includes("Lista")) return <>☷</>
  if (item.label.includes("Callout") || item.label.includes("Citação")) return <>»</>
  return <>Aa</>
}

/**
 * Galeria Formatar (rework F3): o catálogo inteiro de formatadores, sob demanda. Abre por Ctrl+/, pelo “Mais” da barra
 * da seleção, pelo menu `/` e pelo Aa do celular; fecha sozinha ao inserir. A busca ignora acento; sem busca, as abas
 * mostram um grupo por vez e o último grupo usado fica lembrado neste aparelho. No Código, cada cartão mostra a
 * sintaxe que vai entrar.
 */
export function FormatGallery({ code, extra = [], onInsert, onClose }: { code: boolean; extra?: readonly FormatterEntry[]; onInsert(syntax: string): void; onClose(): void }) {
  const all = [...extra, ...FORMATTERS]
  const groups = [...new Set(extra.map((f) => f.group)), ...FORMATTER_GROUPS.map((g) => g.title)]
  const [query, setQuery] = useState("")
  // A busca recebe o foco ao abrir (o diálogo põe o foco no primeiro botão, o Fechar).
  const search = useRef<HTMLInputElement>(null)
  useEffect(() => { search.current?.focus() }, [])
  const [group, setGroup] = useState(() => {
    try { const saved = localStorage.getItem(GROUP_KEY); return saved && groups.includes(saved) ? saved : "Texto" } catch { return "Texto" }
  })
  useEffect(() => { try { localStorage.setItem(GROUP_KEY, group) } catch { /* só não é lembrado */ } }, [group])
  const items = query.trim() ? searchFormatters(query, all) : all.filter((item) => item.group === group)
  const insert = (item: FormatterEntry | undefined) => { if (!item) return; onClose(); onInsert(item.syntax) }
  const grid = <div className="format-grid">
    {items.map((item) => (
      <button key={item.label} type="button" className="format-card" onClick={() => insert(item)} title={item.syntax}>
        <span className="format-sample" aria-hidden="true"><Sample item={item} /></span>
        <span className="format-label">{item.label}</span>
        {code && <code className="format-syntax">{item.syntax.split("\n")[0]}</code>}
      </button>
    ))}
  </div>
  return <Modal title="Formatar" wide onClose={onClose}>
    <input ref={search} type="search" className="input" aria-label="Buscar formatação" placeholder="Buscar formatação… (Enter insere a primeira)" value={query}
      onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); insert(items[0]) } }} />
    {query.trim() ? <>
      <p className="small muted" role="status">{items.length ? `${items.length} ${items.length === 1 ? "formatador" : "formatadores"}` : "Nenhum formatador com esse nome."}</p>
      {grid}
    </> : <>
      <PanelTabs label="Grupos de formatação" idPrefix="formatar" value={group} onChange={setGroup} tabs={groups.map((title) => ({ value: title, label: title, count: all.filter((item) => item.group === title).length }))} />
      <TabPanel idPrefix="formatar" value={group}>{grid}</TabPanel>
    </>}
  </Modal>
}
