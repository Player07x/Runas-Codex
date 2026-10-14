import { useState } from "react"
import { Building2, CalendarDays, Castle, Crown, Flame, Gem, Languages, MapPin, PawPrint, Plus, Scroll, Search, Shield, Sparkles, Sun, User, Users, Sword, Mountain, BookText } from "lucide-react"
import { ARTICLES, CATEGORIES, WIKI } from "../../data/wiki"
import { brokenLinks } from "../../lib/links"
import { href } from "../../lib/router"
import { relativeDays } from "../../lib/navigation"
import { TODAY } from "../../data/agenda"
import { Modal, useProtoAction } from "../../components/ui"

const ICONS: Record<string, React.ReactNode> = {
  user: <User size={20} />,
  "map-pin": <MapPin size={20} />,
  shield: <Shield size={20} />,
  gem: <Gem size={20} />,
  paw: <PawPrint size={20} />,
  flame: <Flame size={20} />,
  calendar: <CalendarDays size={20} />,
  sun: <Sun size={20} />,
}

const TEMPLATES = [
  { id: "personagem", label: "Personagem", icon: <User size={18} />, questions: ["O que essa pessoa quer mais do que tudo?", "Do que ela tem medo?", "Quem ela deve, e quem deve a ela?", "Quando nasceu? (calcula a idade sozinho)"] },
  { id: "cidade", label: "Cidade", icon: <Castle size={18} />, questions: ["Quem governa de fato?", "Qual é o cheiro da rua principal?", "O que a cidade exporta e o que esconde?"] },
  { id: "organizacao", label: "Organização", icon: <Shield size={18} />, questions: ["Qual é o objetivo público? E o verdadeiro?", "Quem são os rivais?", "Como alguém entra?"] },
  { id: "local", label: "Local", icon: <Mountain size={18} />, questions: ["Por que alguém iria até lá?", "Que perigo mora ali?"] },
  { id: "item", label: "Item", icon: <Gem size={18} />, questions: ["Quem o criou e por quê?", "O que acontece se cair em mãos erradas?"] },
  { id: "criatura", label: "Criatura", icon: <PawPrint size={18} />, questions: ["Onde vive e do que se alimenta?", "Como reconhecer seus rastros?"] },
  { id: "acontecimento", label: "Acontecimento", icon: <Flame size={18} />, questions: ["Quando foi? (data no calendário do mundo)", "Quem ganhou e quem perdeu?"] },
  { id: "religiao", label: "Religião", icon: <Sun size={18} />, questions: ["Qual é o mandamento central?", "O que é heresia?"] },
  { id: "idioma", label: "Idioma", icon: <Languages size={18} />, questions: ["Quem fala?", "Três palavras e sua pronúncia."] },
  { id: "cultura", label: "Cultura", icon: <Users size={18} />, questions: ["Como celebram o nascimento e a morte?"] },
  { id: "pais", label: "País", icon: <Crown size={18} />, questions: ["Quem governa? Que guerra marcou o país?"] },
  { id: "construcao", label: "Construção", icon: <Building2 size={18} />, questions: ["Quem construiu e para quê?"] },
  { id: "guerra", label: "Guerra", icon: <Sword size={18} />, questions: ["Qual foi o estopim?", "Como terminou?"] },
  { id: "magia", label: "Magia", icon: <Sparkles size={18} />, questions: ["Qual é o custo?", "Quem pode usar?"] },
  { id: "documento", label: "Documento", icon: <Scroll size={18} />, questions: ["Quem escreveu e para quem?"] },
  { id: "livre", label: "Em branco", icon: <BookText size={18} />, questions: [] },
]

export function WikiHome() {
  const proto = useProtoAction()
  const [creating, setCreating] = useState(false)
  const [template, setTemplate] = useState(TEMPLATES[0])
  const toWrite = brokenLinks("wiki")
  const recent = [...ARTICLES].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 6)

  return (
    <div className="page">
      <section className="wiki-cover card">
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow" style={{ color: "var(--violet)" }}>Wiki · {WIKI.path}/</span>
          <h1 className="page-title">{WIKI.title}</h1>
          <p className="muted">{WIKI.description}</p>
          <div className="row-wrap">
            <span className="chip">{ARTICLES.length} artigos</span>
            <span className="chip red">{toWrite.length} a escrever</span>
            <span className="chip violet">2 segredos</span>
          </div>
        </div>
        <div className="row-wrap">
          <label className="search" style={{ minWidth: 220 }}>
            <Search size={15} />
            <input className="input" placeholder="Buscar só nesta wiki" />
          </label>
          <button className="btn primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Novo artigo
          </button>
        </div>
      </section>

      <div className="stack">
        <div className="row between">
          <span className="section-title">Categorias</span>
          <button className="btn ghost sm" onClick={proto("criar categoria")}>
            <Plus size={14} /> Categoria
          </button>
        </div>
        <div className="category-grid">
          {CATEGORIES.map((cat) => {
            const items = ARTICLES.filter((a) => a.category === cat.id)
            return (
              <div key={cat.id} className="card category-card" style={{ ["--cat" as string]: cat.color }}>
                <div className="row">
                  <span className="cat-icon">{ICONS[cat.icon]}</span>
                  <strong className="grow">{cat.id}</strong>
                  <span className="chip">{items.length}</span>
                </div>
                <div className="list">
                  {items.slice(0, 3).map((a) => (
                    <a key={a.id} className="list-item small" href={href(`/wiki/artigo/${a.id}`)}>
                      {a.title}
                    </a>
                  ))}
                  {items.length === 0 && <span className="muted small" style={{ padding: "6px 10px" }}>Vazia — comece por um modelo.</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="home-grid">
        <section className="card">
          <div className="card-head">
            <span className="section-title">Editados recentemente</span>
          </div>
          <div className="list">
            {recent.map((a) => (
              <a key={a.id} className="list-item" href={href(`/wiki/artigo/${a.id}`)}>
                <span className="grow" style={{ minWidth: 0 }}>
                  <strong className="truncate" style={{ display: "block" }}>{a.title}</strong>
                  <span className="muted small truncate" style={{ display: "block" }}>{a.summary}</span>
                </span>
                <span className="meta">{relativeDays(a.updated, TODAY)}</span>
              </a>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="card-head">
            <span className="section-title">A escrever</span>
          </div>
          <div className="list">
            {toWrite.map((item) => (
              <button key={item.target} className="list-item" onClick={() => { setTemplate(TEMPLATES[0]); setCreating(true) }}>
                <span className="wikilink broken grow">{item.target}</span>
                <span className="meta">{item.from.length}× citado</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {creating && (
        <Modal
          wide
          title="Novo artigo"
          onClose={() => setCreating(false)}
          footer={
            <>
              <button className="btn" onClick={() => setCreating(false)}>Cancelar</button>
              <button className="btn primary" onClick={() => setCreating(false)}>Criar em {WIKI.path}/</button>
            </>
          }
        >
          <div className="template-grid">
            {TEMPLATES.map((t) => (
              <button key={t.id} className={`card tight link template ${template.id === t.id ? "picked" : ""}`} onClick={() => setTemplate(t)}>
                {t.icon}
                <span className="small">{t.label}</span>
              </button>
            ))}
          </div>
          <label className="field">
            <span>Título</span>
            <input className="input" defaultValue={toWrite[0]?.target ?? ""} />
          </label>
          {template.questions.length > 0 && (
            <div className="stack">
              <span className="eyebrow">Perguntas-guia do modelo “{template.label}”</span>
              {template.questions.map((q) => (
                <label key={q} className="field">
                  <span>{q}</span>
                  <input className="input" placeholder="Responder depois também vale" />
                </label>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
