import { useState } from "react"
import { CalendarDays, ChevronLeft, Eye, PanelRight, PenLine, Search, Users } from "lucide-react"
import { ARTICLES, CATEGORIES } from "../../data/wiki"
import type { WikiArticle } from "../../data/types"
import { splitFrontmatter } from "../../lib/links"
import { href, navigate } from "../../lib/router"
import { CAMPAIGN_TODAY, ORDEM_X_CAOS, dayNumber, eraOf, formatWorldDate, moonPhase, parseWorldDate, seasonOf, weekday, yearsBetween } from "../../lib/fictional-calendar"
import { Markdown } from "../../components/Markdown"
import { NoteEditor } from "../../components/NoteEditor"
import { NotePanels } from "../../components/NotePanels"
import { MoonIcon } from "../../components/MoonIcon"
import { Segmented } from "../../components/ui"

export function WikiArticleView({ articleId }: { articleId: string }) {
  const article = ARTICLES.find((a) => a.id === articleId)
  const [mode, setMode] = useState<"ver" | "editar">("ver")
  const [players, setPlayers] = useState(false)
  const [showRight, setShowRight] = useState(false)
  if (!article) return <div className="page muted">Artigo não encontrado.</div>
  const { body } = splitFrontmatter(article.markdown)

  return (
    <div className={`workspace ${showRight ? "show-right" : ""}`}>
      <aside className="pane-left">
        <div className="pane-head">
          <a className="row small" href={href("/wiki")} style={{ textDecoration: "none" }}>
            <ChevronLeft size={15} /> Ordem x Caos
          </a>
          <label className="search">
            <Search size={15} />
            <input className="input" placeholder="Buscar na wiki" />
          </label>
        </div>
        <div className="pane-body" style={{ gap: 10 }}>
          {CATEGORIES.map((cat) => {
            const items = ARTICLES.filter((a) => a.category === cat.id)
            if (!items.length) return null
            return (
              <div key={cat.id} className="stack" style={{ gap: 2 }}>
                <span className="eyebrow" style={{ color: cat.color }}>{cat.id}</span>
                <div className="list">
                  {items.map((a) => (
                    <a key={a.id} className={`list-item small ${a.id === article.id ? "active" : ""}`} href={href(`/wiki/artigo/${a.id}`)}>
                      {a.title}
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </aside>

      <section className="pane-center">
        {mode === "editar" ? (
          <>
            <div className="editor-bar">
              <button className="btn sm" onClick={() => setMode("ver")}>
                <Eye size={14} /> Ver artigo
              </button>
            </div>
            <NoteEditor note={article} onShowPanel={() => setShowRight(!showRight)} />
          </>
        ) : (
          <>
            <div className="editor-bar">
              <button className="icon-btn mobile-switch" onClick={() => navigate("/wiki")} aria-label="Voltar">
                <ChevronLeft size={18} />
              </button>
              <Segmented
                label="Modo"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "ver", label: "Ver", icon: <Eye size={14} /> },
                  { value: "editar", label: "Editar", icon: <PenLine size={14} /> },
                ]}
              />
              <button className={`btn sm ${players ? "primary" : ""}`} onClick={() => setPlayers(!players)} title="Esconde os segredos, como na exportação para jogadores">
                <Users size={14} /> {players ? "Versão dos jogadores" : "Versão do mestre"}
              </button>
              <span className="grow" />
              <button className="icon-btn" onClick={() => setShowRight(!showRight)} title="Links e gráfico local">
                <PanelRight size={18} />
              </button>
            </div>
            <article className="article">
              <header className="article-head">
                <span className="chip" style={{ color: CATEGORIES.find((c) => c.id === article.category)?.color }}>{article.category}</span>
                {article.aliases && <span className="muted small">também: {article.aliases.join(", ")}</span>}
              </header>
              <Infobox article={article} />
              <Markdown source={body} space="wiki" showSecrets={!players} />
            </article>
          </>
        )}
      </section>

      <aside className="pane-right">
        <NotePanels note={article} />
      </aside>
    </div>
  )
}

function Infobox({ article }: { article: WikiArticle }) {
  const cal = ORDEM_X_CAOS
  return (
    <aside className="infobox">
      <div className="infobox-portrait" aria-hidden="true">
        {article.title
          .split(" ")
          .filter((w) => w.length > 2)
          .slice(0, 2)
          .map((w) => w[0])
          .join("")}
      </div>
      <strong className="display" style={{ textAlign: "center", fontSize: 17 }}>{article.title}</strong>
      <p className="muted small" style={{ textAlign: "center" }}>{article.summary}</p>
      <dl>
        {article.infobox.map((field) => {
          if (!field.worldDate) {
            return (
              <div key={field.label}>
                <dt>{field.label}</dt>
                <dd>
                  <Markdown source={field.value} space="wiki" className="inline-md" />
                </dd>
              </div>
            )
          }
          const date = parseWorldDate(field.worldDate)
          const years = yearsBetween(date, CAMPAIGN_TODAY)
          const day = dayNumber(cal, date)
          const isBirth = field.label === "Nascimento"
          return (
            <div key={field.label}>
              <dt>{field.label}</dt>
              <dd>
                <span>{formatWorldDate(cal, date)}</span>
                <span className="computed">
                  <CalendarDays size={12} /> {isBirth ? `${years} anos` : `há ${years} anos`} · {weekday(cal, date)} · {seasonOf(cal, date)}
                </span>
                <span className="computed">
                  {cal.moons.map((moon) => {
                    const m = moonPhase(moon, day)
                    return (
                      <span key={moon.name} className="row" style={{ gap: 3 }}>
                        <MoonIcon fraction={m.fraction} color={moon.color} size={12} /> {moon.name} {m.phase}
                      </span>
                    )
                  })}
                </span>
                <span className="computed">{eraOf(cal, date.year)}</span>
              </dd>
            </div>
          )
        })}
      </dl>
      <span className="tiny faint" style={{ textAlign: "center" }}>
        Calculado pelo Calendário de Ordem x Caos em relação a {formatWorldDate(cal, CAMPAIGN_TODAY)}.
      </span>
    </aside>
  )
}
