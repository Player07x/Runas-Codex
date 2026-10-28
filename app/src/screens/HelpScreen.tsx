Failed to create stream fd: Operation not permitted
Failed to create stream fd: Operation not permitted
Failed to create stream fd: Operation not permitted
import { useEffect, useMemo, useState } from "react"
import { BookOpen, ChevronRight, ListTree, Search } from "lucide-react"
import { HELP_GROUPS, HELP_TOPICS, helpHeadings, helpTopic, searchHelp, type HelpTopic } from "../core/help"
import { FORMATTERS, FORMATTER_GROUPS } from "../core/formatters"
import { FORMATTER_HELP } from "../data/ajuda/formatadores"
import { WIKI_INSERTS } from "./wiki/WikiTools"
import { Markdown } from "../components/Markdown"
import { OnboardingSettings } from "../components/Onboarding"
import { navigate, useRoute } from "../lib/router"
import comecar from "../data/ajuda/comecar.md?raw"
import cofre from "../data/ajuda/cofre.md?raw"
import celular from "../data/ajuda/celular.md?raw"
import editor from "../data/ajuda/editor.md?raw"
import formatadores from "../data/ajuda/formatadores.md?raw"
import fichas from "../data/ajuda/fichas.md?raw"
import blocos from "../data/ajuda/blocos.md?raw"
import notas from "../data/ajuda/notas.md?raw"
import agenda from "../data/ajuda/agenda.md?raw"
import tarefas from "../data/ajuda/tarefas.md?raw"
import wiki from "../data/ajuda/wiki.md?raw"
import wikiTempo from "../data/ajuda/wiki-tempo.md?raw"
import wikiMapas from "../data/ajuda/wiki-mapas.md?raw"
import campanhas from "../data/ajuda/campanhas.md?raw"
import livros from "../data/ajuda/livros.md?raw"
import vtt from "../data/ajuda/vtt.md?raw"
import transferir from "../data/ajuda/transferir.md?raw"
import obsidian from "../data/ajuda/obsidian.md?raw"
import configuracoes from "../data/ajuda/configuracoes.md?raw"
import acessibilidade from "../data/ajuda/acessibilidade.md?raw"
import atalhos from "../data/ajuda/atalhos.md?raw"
import privacidade from "../data/ajuda/privacidade.md?raw"
import "./help.css"

const BODIES: Record<HelpTopic["id"], string> = {
  comecar, cofre, celular, editor, formatadores, fichas, blocos, notas, agenda, tarefas, wiki, "wiki-tempo": wikiTempo,
  "wiki-mapas": wikiMapas, campanhas, livros, vtt, transferir, obsidian, configuracoes, acessibilidade, atalhos, privacidade,
}

function FormatterCatalog() {
  return <section className="help-formatters" aria-labelledby="help-formatters-title">
    <h3 id="help-formatters-title">Catálogo completo</h3>
    <p className="small muted">{FORMATTERS.length + WIKI_INSERTS.length} formatadores disponíveis. A sintaxe abaixo é a mesma que entra pelo menu <code>/</code> ou pela galeria.</p>
    {FORMATTER_GROUPS.map((group) => <div className="help-formatter-group" key={group.title}>
      <h4>{group.title}</h4>
      <div className="table-wrap"><table><thead><tr><th>Formatador</th><th>Sintaxe</th><th>Para que serve</th></tr></thead><tbody>{group.items.map((item) => <tr key={item.label}><th scope="row">{item.label}</th><td><code className="help-syntax">{item.syntax}</code></td><td>{FORMATTER_HELP[item.label]?.texto ?? "Consulte a prévia da galeria."}</td></tr>)}</tbody></table></div>
    </div>)}
    <div className="help-formatter-group"><h4>Wiki</h4><div className="table-wrap"><table><thead><tr><th>Formatador</th><th>Sintaxe</th><th>Para que serve</th></tr></thead><tbody>{WIKI_INSERTS.map(([label, syntax]) => <tr key={label}><th scope="row">{label}</th><td><code className="help-syntax">{syntax}</code></td><td>{FORMATTER_HELP[label]?.texto ?? "Recurso da Wiki."}</td></tr>)}</tbody></table></div></div>
  </section>
}

function TopicButton({ topic, selected, onSelect, snippet }: { topic: HelpTopic; selected: boolean; onSelect: () => void; snippet?: string }) {
  return (
    <button className={`help-topic${selected ? " selected" : ""}`} aria-current={selected ? "page" : undefined} onClick={onSelect}>
      <span className="help-topic-title">{topic.title}<ChevronRight size={14} aria-hidden="true" /></span>
      <span className="help-topic-summary">{snippet ?? topic.summary}</span>
    </button>
  )
}

export function HelpScreen() {
  const route = useRoute()
  const requested = helpTopic(route[2])
  const [selectedId, setSelectedId] = useState(requested?.id ?? HELP_TOPICS[0]!.id)
  const [query, setQuery] = useState("")
  useEffect(() => {
    if (requested) setSelectedId(requested.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [requested?.id])
  const selected = helpTopic(selectedId) ?? HELP_TOPICS[0]!
  const body = BODIES[selected.id]
  const hits = useMemo(() => searchHelp(query, BODIES), [query])
  const headings = useMemo(() => helpHeadings(body), [body])
  const choose = (id: string) => {
    setSelectedId(id)
    navigate(`/config/ajuda/${id}`)
  }
  const showSearch = query.trim().length > 0

  return (
    <div className="help-screen">
      <div className="help-intro">
        <span className="eyebrow row"><BookOpen size={15} aria-hidden="true" /> Manual offline</span>
        <h2>Como usar o Runas-Codex</h2>
        <p className="muted">22 tópicos sobre notas, Wiki, Campanhas, Livros, Agenda, VTT, arquivos e todas as formatações.</p>
        <label className="help-search">
          <Search size={17} aria-hidden="true" />
          <input type="search" className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na documentação…" aria-label="Buscar na documentação" />
        </label>
      </div>
      <div className="help-layout">
        <aside className="help-index" aria-label="Índice da documentação">
          {showSearch ? (
            <div className="help-group">
              <span className="eyebrow">{hits.length} resultado{hits.length === 1 ? "" : "s"}</span>
              {hits.length ? hits.map((hit) => <TopicButton key={hit.topic.id} topic={hit.topic} selected={selected.id === hit.topic.id} snippet={hit.snippet} onSelect={() => choose(hit.topic.id)} />) : <p className="small muted">Nenhum tópico contém todas as palavras buscadas.</p>}
            </div>
          ) : HELP_GROUPS.map((group) => {
            const topics = HELP_TOPICS.filter((topic) => topic.group === group)
            return <div className="help-group" key={group}><span className="eyebrow">{group}</span>{topics.map((topic) => <TopicButton key={topic.id} topic={topic} selected={selected.id === topic.id} onSelect={() => choose(topic.id)} />)}</div>
          })}
        </aside>
        <article className="help-article card" aria-labelledby="help-topic-title">
          <header className="help-article-head">
            <span className="eyebrow">{selected.group}</span>
            <h2 id="help-topic-title">{selected.title}</h2>
            <p className="muted">{selected.summary}</p>
            {headings.length > 1 && <details className="help-toc"><summary><ListTree size={15} aria-hidden="true" /> Nesta página</summary><ul>{headings.map((heading) => <li key={heading}>{heading}</li>)}</ul></details>}
          </header>
          <Markdown source={body} className="help-markdown" />
          {selected.id === "formatadores" && <FormatterCatalog />}
          <nav className="help-next" aria-label="Navegar pela documentação">
            {(() => {
              const index = HELP_TOPICS.findIndex((topic) => topic.id === selected.id)
              const next = HELP_TOPICS[(index + 1) % HELP_TOPICS.length]!
              return <button className="btn ghost" onClick={() => choose(next.id)}>Próximo: {next.title} <ChevronRight size={15} aria-hidden="true" /></button>
            })()}
          </nav>
        </article>
      </div>
      <div className="help-onboarding">
        <OnboardingSettings />
      </div>
    </div>
  )
}
