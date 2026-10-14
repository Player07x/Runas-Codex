import { useState } from "react"
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, Dices, Feather, FileText, Library, Plus, ScrollText, Users } from "lucide-react"
import { href } from "../lib/router"
import { ALL_NOTES } from "../lib/links"
import { formatDate, formatTime, routeOfNote } from "../lib/navigation"
import { CAMPAIGNS, PREP_STEPS } from "../data/campaigns"
import { EVENTS, TODAY } from "../data/agenda"
import { NOTES } from "../data/notes"
import { ARTICLES } from "../data/wiki"
import { BOOKS } from "../data/books"
import { MESAS } from "../data/mesas"
import type { Design } from "./PrototypeBar"

const campaign = CAMPAIGNS[0]
const session = campaign.sessions.find(s => s.status === "planejada")!
const sessionPath = `/campanhas/${campaign.id}/sessao/${session.id}`
const recent = [...ALL_NOTES].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 4)
const upcoming = EVENTS.filter(e => new Date(e.start) >= TODAY).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 3)
const spaces = [
  { title: "Notas", sub: "Capture suas ideias", count: NOTES.length, unit: "notas", icon: Feather, path: "/notas" },
  { title: "Agenda", sub: "Dê tempo às histórias", count: EVENTS.length, unit: "eventos", icon: CalendarDays, path: "/agenda" },
  { title: "Wiki", sub: "Construa seu universo", count: ARTICLES.length, unit: "artigos", icon: Library, path: "/wiki" },
  { title: "Campanhas", sub: "Conecte os capítulos", count: CAMPAIGNS.length, unit: "campanhas", icon: ScrollText, path: "/campanhas" },
  { title: "Livros", sub: "Escreva a próxima página", count: BOOKS.length, unit: "livros", icon: BookOpen, path: "/livros" },
  { title: "VTT", sub: "Reúna seu grupo", count: MESAS.length, unit: "mesas", icon: Dices, path: "/vtt" },
]

function Capture() {
  const [text, setText] = useState("")
  const [drafts, setDrafts] = useState<string[]>([])
  return <section className="design-capture">
    <form onSubmit={e => { e.preventDefault(); if (text.trim()) { setDrafts(d => [text.trim(), ...d]); setText("") } }}>
      <Feather size={19} />
      <input aria-label="Captura rápida" placeholder="Uma ideia antes que ela escape…" value={text} onChange={e => setText(e.target.value)} />
      <button className="btn primary" disabled={!text.trim()}><Plus size={16} /> Capturar</button>
    </form>
    <small>Rascunhos temporários · disponíveis enquanto esta tela estiver aberta</small>
    {drafts.length > 0 && <ul aria-live="polite">{drafts.map((draft, i) => <li key={i}><Check size={14} />{draft}</li>)}</ul>}
  </section>
}

function Agenda() {
  return <section className="design-agenda">
    <div className="design-section-head"><h2>No horizonte</h2><a href={href("/agenda")}>Agenda <ArrowUpRight size={15} /></a></div>
    {upcoming.map(e => <a className="design-event" key={e.id} href={href("/agenda")}>
      <div className="date-stamp"><strong>{new Date(e.start).getDate()}</strong><span>{formatDate(e.start, { month: "short" })}</span></div>
      <div><small>{e.category}</small><h3>{e.title}</h3><span>{e.allDay ? "Dia inteiro" : formatTime(e.start)}</span></div>
      <ArrowUpRight size={17} />
    </a>)}
  </section>
}

function Recent() {
  return <section className="design-recent">
    <div className="design-section-head"><h2>Retome o fio</h2><span>Últimas edições</span></div>
    {recent.map(n => <a className="design-note" key={n.id} href={href(routeOfNote(n))}>
      <FileText size={19} /><div><h3>{n.title}</h3><small>{n.space === "wiki" ? "Wiki" : n.space === "campanhas" ? "Campanhas" : "Notas"} · {formatDate(n.updated, { day: "numeric", month: "short" })}</small></div><ArrowUpRight size={16} />
    </a>)}
  </section>
}

function Spaces() {
  return <section className="design-spaces" aria-label="Seus espaços">{spaces.map((s, i) => <a href={href(s.path)} key={s.path}>
    <div className="space-top"><s.icon size={23} /><span>0{i + 1}</span></div>
    <h3>{s.title}</h3><p>{s.sub}</p><footer><span>{s.count} {s.unit}</span><ArrowUpRight size={18} /></footer>
  </a>)}</section>
}

function Session({ immersive = false }: { immersive?: boolean }) {
  const confirmed = Object.values(session.attendance).filter(Boolean).length
  return <section className={`design-session ${immersive ? "immersive" : ""}`}>
    <div className="session-copy"><span className="design-kicker"><span className="status-dot" /> Campanha em andamento</span>
      <p className="session-world">{campaign.title}</p>
      <h2>{immersive ? <>Toda história<br />pede uma próxima<br /><em>sessão.</em></> : session.title}</h2>
      <p className="session-description">{immersive ? `Sessão ${session.number} · ${session.title}` : `Sessão ${session.number} · A próxima página de Valdris começa aqui.`}</p>
      <div className="session-meta"><span><CalendarDays size={16} />{formatDate(session.date, { day: "numeric", month: "long" })} · {formatTime(session.date)}</span><span><Users size={16} />{confirmed}/{campaign.players.length} confirmados</span></div>
      <div className="session-buttons"><a className="btn primary lg" href={href(sessionPath)}>Preparar sessão <ArrowRight size={17} /></a><a className="btn lg" href={href(`/vtt/mesa/${campaign.mesaId}`)}><Dices size={17} /> Abrir mesa</a></div>
    </div>
    {immersive ? <div className="orbital-art" aria-hidden="true"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-ring ring-three" /><span className="orbit-center">ᚱ</span><span className="orbit-star">✦</span><span className="orbit-caption">VALDRIS / CAPÍTULO XII</span></div> : <div className="session-seal" aria-hidden="true"><span>XII</span><small>O SELO NA CARTA</small><Feather size={32} /></div>}
  </section>
}

export function PrototypeHome({ design }: { design: Exclude<Design, "original"> }) {
  const [steps, setSteps] = useState(() => PREP_STEPS.map(s => s.done))
  const done = steps.filter(Boolean).length
  if (design === "atlas") return <div className="design-home atlas-home">
    <header className="design-heading"><div><span className="design-kicker">SEU ATELIÊ DE HISTÓRIAS / 13 OUT 2026</span><h1>Espaço para imaginar.</h1><p>Bom dia, João. Vamos dar forma à próxima ideia?</p></div><a className="btn primary" href={href("/notas/nova")}><Plus size={16} /> Nova nota</a></header>
    <Capture />
    <div className="atlas-columns"><div className="atlas-primary"><div className="design-section-head"><h2>À mesa</h2><span>01 campanha ativa</span></div><Session /><Recent /></div><aside><Agenda /><section className="design-prep"><div className="design-section-head"><h2>Antes da sessão</h2><span aria-live="polite">{done}/{steps.length}</span></div><progress value={done} max={steps.length} aria-label="Preparação da sessão" />{PREP_STEPS.map((s, i) => <label key={s.id}><input type="checkbox" checked={steps[i]} onChange={() => setSteps(old => old.map((v, j) => j === i ? !v : v))} /><span>{s.title}</span></label>)}<small>Checklist de demonstração · alterações temporárias</small></section></aside></div>
    <div className="design-section-head"><h2>Uma casa para cada ideia</h2><span>Seus espaços conectados</span></div><Spaces />
    <footer className="design-footer">RUNAS-CODEX <span>Seu universo, no seu ritmo.</span><span>Atlas / Protótipo 01</span></footer>
  </div>
  return <div className="design-home orbita-home">
    <header className="design-heading"><div><span className="design-kicker">MESA DO JOÃO / PAINEL DO MESTRE</span><h1>Seu próximo capítulo.</h1></div><span className="orbita-date">Terça-feira<br /><strong>13 outubro, 2026</strong></span></header>
    <Session immersive />
    <div className="design-section-head"><h2>Explore seu universo</h2><span>06 espaços · infinitas histórias</span></div><Spaces />
    <div className="orbita-columns"><Recent /><Agenda /><div className="orbita-quick"><span className="design-kicker">CENTELHAS</span><h2>Grandes mundos.<br /><em>Pequenas ideias.</em></h2><p>Guarde aquele personagem, lugar ou reviravolta que acabou de surgir.</p><Capture /><a href={href("/wiki")} className="quick-link">Explorar Ordem x Caos <ArrowUpRight size={17} /></a></div></div>
    <footer className="design-footer">RUNAS-CODEX <span>A aventura começa com uma ideia.</span><span>Órbita / Protótipo 02</span></footer>
  </div>
}
