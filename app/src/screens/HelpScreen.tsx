import { useEffect, useMemo, useRef, useState } from "react"
import { BookOpen, ChevronLeft, ChevronRight, ListTree, Search } from "lucide-react"
import { HELP_GROUPS, HELP_TOPICS, helpHeadings, helpTopic, searchHelp, type HelpTopic } from "../core/help"
import { FORMATTERS, FORMATTER_GROUPS } from "../core/formatters"
import { FORMATTER_HELP } from "../data/ajuda/formatadores"
import { WIKI_INSERTS } from "./wiki/WikiTools"
import { Markdown } from "../components/Markdown"
import { OnboardingSettings } from "../components/Onboarding"
import { href, navigate, useRoute } from "../lib/router"
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

/** “Notas de exemplo e tour”: não é um texto do manual, mas mora na Ajuda (antes ficava no fim da seção). */
const EXAMPLES = { id: "exemplos", title: "Notas de exemplo e tour", group: "Exemplos", summary: "Rever o tour e pôr ou tirar as notas de exemplo deste cofre." } as const
const fold = (text: string) => text.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim()

function TopicButton({ id, title, summary, selected, onSelect }: { id: string; title: string; summary: string; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <a href={href(`/ajuda/${id}`)} className={`help-topic${selected ? " selected" : ""}`} aria-current={selected ? "page" : undefined} onClick={(event) => { event.preventDefault(); onSelect(id) }}>
      <span className="help-topic-title">{title}<ChevronRight size={14} aria-hidden="true" /></span>
      <span className="help-topic-summary">{summary}</span>
    </a>
  )
}

/**
 * Ajuda com tela própria (U119): rota /ajuda, três painéis que rolam cada um por si — tópicos com a busca, o artigo e
 * “Nesta página” com links para os títulos. No celular, /ajuda é a lista de tópicos e /ajuda/<tópico> o artigo, com
 * “‹ Tópicos” para voltar. As rotas antigas /config/ajuda/… levam para cá (SettingsScreen).
 */
export function HelpScreen() {
  const route = useRoute()
  const asked = route[1]
  const examples = asked === EXAMPLES.id
  const topic = examples ? undefined : helpTopic(asked) ?? HELP_TOPICS[0]!
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const article = useRef<HTMLDivElement>(null)
  const body = topic ? BODIES[topic.id] : ""
  const hits = useMemo(() => searchHelp(query, BODIES), [query])
  const headings = useMemo(() => (topic ? helpHeadings(body) : []), [body, topic])
  const choose = (id: string) => navigate(`/ajuda/${id}`)
  const showSearch = query.trim().length > 0
  const index = topic ? HELP_TOPICS.findIndex((t) => t.id === topic.id) : HELP_TOPICS.length
  const previous = index > 0 ? HELP_TOPICS[index - 1] : undefined
  const next = index < HELP_TOPICS.length - 1 ? HELP_TOPICS[index + 1] : index === HELP_TOPICS.length - 1 ? EXAMPLES : undefined
  const title = topic?.title ?? EXAMPLES.title

  // Trocar de tópico volta o artigo ao topo.
  useEffect(() => { if (article.current) article.current.scrollTop = 0; setActive(0) }, [asked])
  // “Nesta página” marca o título que está no alto do artigo.
  const headingElements = () => [...(article.current?.querySelectorAll<HTMLElement>(".help-markdown h3") ?? [])]
  // Depois de um clique em “Nesta página”, o título escolhido fica marcado enquanto a rolagem anda.
  const clicked = useRef(0)
  const onScroll = () => {
    const box = article.current
    if (!box || Date.now() - clicked.current < 900) return
    const top = box.getBoundingClientRect().top + 24
    let current = 0
    headingElements().forEach((el, i) => { if (el.getBoundingClientRect().top <= top) current = i })
    setActive(current)
  }
  const goTo = (i: number) => {
    const wanted = fold(headings[i] ?? "")
    const el = headingElements().find((h) => fold(h.textContent ?? "") === wanted) ?? headingElements()[i]
    if (!el) return
    el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1")
    el.focus({ preventScroll: true })
    clicked.current = Date.now()
    setActive(i)
  }
  const toc = headings.length > 1 && <ul>{headings.map((heading, i) => <li key={heading}>
    <a href={href(`/ajuda/${topic!.id}`)} aria-current={i === active ? "location" : undefined} onClick={(event) => { event.preventDefault(); goTo(i) }}>{heading}</a>
  </li>)}</ul>

  return (
    <div className={`help-screen${asked ? " has-topic" : ""}`}>
      <nav className="help-pane help-index" aria-label="Tópicos da Ajuda">
        <div className="help-index-head">
          <span className="eyebrow row"><BookOpen size={15} aria-hidden="true" /> Manual offline</span>
          <label className="help-search">
            <Search size={17} aria-hidden="true" />
            <input type="search" className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na Ajuda" aria-label={`Buscar na Ajuda (${HELP_TOPICS.length} tópicos)`} />
          </label>
        </div>
        {showSearch ? (
          <div className="help-group">
            <span className="eyebrow" role="status">{hits.length} resultado{hits.length === 1 ? "" : "s"}</span>
            {hits.length ? hits.map((hit) => <TopicButton key={hit.topic.id} id={hit.topic.id} title={hit.topic.title} summary={hit.snippet} selected={topic?.id === hit.topic.id} onSelect={choose} />) : <p className="small muted">Nenhum tópico contém todas as palavras buscadas.</p>}
          </div>
        ) : <>
          {HELP_GROUPS.map((group) => <div className="help-group" key={group}>
            <span className="eyebrow">{group}</span>
            {HELP_TOPICS.filter((t) => t.group === group).map((t) => <TopicButton key={t.id} id={t.id} title={t.title} summary={t.summary} selected={Boolean(asked) && topic?.id === t.id || (!asked && t === HELP_TOPICS[0])} onSelect={choose} />)}
          </div>)}
          <div className="help-group">
            <span className="eyebrow">{EXAMPLES.group}</span>
            <TopicButton id={EXAMPLES.id} title={EXAMPLES.title} summary={EXAMPLES.summary} selected={examples} onSelect={choose} />
          </div>
        </>}
      </nav>
      <div ref={article} className="help-pane help-article-pane" onScroll={onScroll}>
        <article className="help-article" aria-labelledby="help-topic-title">
          <a href={href("/ajuda")} className="btn ghost help-back" onClick={(event) => { event.preventDefault(); navigate("/ajuda") }}><ChevronLeft size={16} aria-hidden="true" /> Tópicos</a>
          <header className="help-article-head">
            <span className="eyebrow">{topic?.group ?? EXAMPLES.group}</span>
            <h1 id="help-topic-title" className="page-title" tabIndex={-1}>{title}</h1>
            <p className="muted">{topic?.summary ?? EXAMPLES.summary}</p>
            {toc && <details className="help-toc-inline"><summary><ListTree size={15} aria-hidden="true" /> Nesta página</summary>{toc}</details>}
          </header>
          {topic ? <>
            <Markdown source={body} className="help-markdown" />
            {topic.id === "formatadores" && <FormatterCatalog />}
          </> : <OnboardingSettings />}
          <nav className="help-next" aria-label="Navegar pela Ajuda">
            {previous ? <a href={href(`/ajuda/${previous.id}`)} className="btn ghost" onClick={(event) => { event.preventDefault(); choose(previous.id) }}><ChevronLeft size={15} aria-hidden="true" /> {previous.title}</a> : <span />}
            {next && <a href={href(`/ajuda/${next.id}`)} className="btn" onClick={(event) => { event.preventDefault(); choose(next.id) }}>{next.title} <ChevronRight size={15} aria-hidden="true" /></a>}
          </nav>
        </article>
      </div>
      <aside className="help-pane help-toc" aria-labelledby="help-toc-title">
        <span id="help-toc-title" className="eyebrow">Nesta página</span>
        {toc || <span className="small muted">Este tópico tem uma parte só.</span>}
      </aside>
    </div>
  )
}
