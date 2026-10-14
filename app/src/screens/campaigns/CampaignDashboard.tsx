import { useState } from "react"
import { ArrowRight, BarChart3, Clock, Dices, Eye, EyeOff, Hand, MonitorPlay, ShieldCheck, Sparkles } from "lucide-react"
import type { Campaign } from "../../data/types"
import { TODAY } from "../../data/agenda"
import { vaultRoute } from "../../lib/vault-notes"
import { href } from "../../lib/router"
import { formatDate, formatTime, relativeDays } from "../../lib/navigation"
import { ClockDial, Modal, useToast } from "../../components/ui"
import { CAMPAIGN_TODAY, ORDEM_X_CAOS, dayNumber, moonPhase } from "../../lib/fictional-calendar"

export function CampaignDashboard({ campaign }: { campaign: Campaign }) {
  const [screen, setScreen] = useState(false)
  const next = campaign.sessions.find((s) => s.status === "planejada")
  const done = campaign.sessions.filter((s) => s.status === "realizada")
  const active = campaign.quests.filter((q) => q.status === "ativa")

  return (
    <div className="page">
      <div className="campaign-top">
        {next ? (
          <section className="card next-session">
            <div className="card-head">
              <span className="eyebrow" style={{ color: "var(--red)" }}>Próxima sessão</span>
              <span className="chip red">
                <Clock size={13} /> {relativeDays(next.date, TODAY)}
              </span>
            </div>
            <h2 className="display" style={{ fontSize: 20 }}>
              Sessão {next.number} — {next.title}
            </h2>
            <span className="muted small">
              {formatDate(next.date, { weekday: "long", day: "2-digit", month: "long" })} às {formatTime(next.date)} · no mundo: 16 de Cinzas de 4031 C.E.
            </span>
            <div className="row-wrap">
              {campaign.players.map((p) => (
                <span key={p.id} className={`chip ${next.attendance[p.id] ? "green" : "red"}`}>
                  {next.attendance[p.id] ? "✓" : "✗"} {p.name}
                </span>
              ))}
            </div>
            <div className="row-wrap">
              <a className="btn primary" href={href(`/campanhas/${campaign.id}/sessao/${next.id}`)}>
                Preparar <ArrowRight size={15} />
              </a>
              <button className="btn" onClick={() => setScreen(true)}>
                <MonitorPlay size={15} /> Tela do Mestre
              </button>
              <a className="btn" href={href(`/vtt/mesa/${campaign.mesaId}`)}>
                <Dices size={15} /> Abrir mesa
              </a>
            </div>
          </section>
        ) : (
          <section className="card">Nenhuma sessão marcada.</section>
        )}

        <section className="card stack">
          <span className="section-title row">
            <BarChart3 size={15} /> Estatísticas
          </span>
          <div className="stats">
            <div>
              <strong>{done.length + 8}</strong>
              <span>sessões</span>
            </div>
            <div>
              <strong>44 h</strong>
              <span>jogadas</span>
            </div>
            <div>
              <strong>93%</strong>
              <span>presença</span>
            </div>
            <div>
              <strong>8,9</strong>
              <span>nota média</span>
            </div>
          </div>
          <span className="tiny faint">Nota média = avaliação anônima dos jogadores ao fim de cada sessão.</span>
        </section>
      </div>

      <div className="dash-grid">
        <section className="card stack">
          <span className="section-title">Relógios</span>
          <div className="clocks">
            {campaign.clocks.map((c) => (
              <div key={c.id} className="clock">
                <ClockDial segments={c.segments} filled={c.filled} color={c.kind === "ameaca" ? "var(--red)" : "var(--green)"} />
                <span className="small">{c.title}</span>
                <span className="tiny faint">
                  {c.filled}/{c.segments} · {c.kind === "ameaca" ? "ameaça" : "progresso"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card stack">
          <div className="row between">
            <span className="section-title">Missões ativas</span>
            <a className="btn ghost sm" href={href(`/campanhas/${campaign.id}/missoes`)}>Quadro</a>
          </div>
          {active.map((q) => (
            <div key={q.id} className="row card tight">
              <span className="mono small faint">{q.order}</span>
              <span className="grow">{q.title}</span>
              {q.reward && <span className="chip gold">{q.reward}</span>}
            </div>
          ))}
        </section>

        <section className="card stack">
          <span className="section-title">NPCs</span>
          <table className="mini-table">
            <thead>
              <tr>
                <th>NPC</th>
                <th>Atitude</th>
                <th>Visto</th>
              </tr>
            </thead>
            <tbody>
              {campaign.npcs.map((n) => (
                <tr key={n.name}>
                  <td>
                    <a className="wikilink cross" href={href(n.name === "Aldren Vael" ? "/wiki/artigo/aldren-vael" : n.name === "Conde Ormund" ? "/wiki/artigo/conde-ormund" : "/wiki")}>
                      {n.name}
                    </a>
                    <div className="tiny faint">sabe: {n.knows}</div>
                  </td>
                  <td>
                    <span className={`chip ${n.attitude === "aliado" ? "green" : n.attitude === "hostil" ? "red" : ""}`}>{n.attitude}</span>
                  </td>
                  <td className="small muted">{n.lastSeen}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="tiny faint">Os NPCs moram na wiki; a campanha só guarda a atitude deles com o grupo.</span>
        </section>

        <Secrets campaign={campaign} />

        <section className="card stack">
          <span className="section-title">Jogadores</span>
          {campaign.players.map((p) => (
            <div key={p.id} className="row">
              <span className="avatar" style={{ background: p.color }}>{p.character[0]}</span>
              <span className="grow">
                <strong className="small">{p.character}</strong>
                <span className="tiny faint" style={{ display: "block" }}>
                  {p.name} · {p.concept}
                </span>
              </span>
            </div>
          ))}
          <span className="tiny faint">Perfil sem ficha (fichas ficam para depois).</span>
        </section>

        <section className="card stack">
          <span className="section-title row">
            <ShieldCheck size={15} /> Segurança à mesa
          </span>
          <div className="small">
            <strong>Linhas</strong> <span className="muted">— violência contra crianças</span>
          </div>
          <div className="small">
            <strong>Véus</strong> <span className="muted">— tortura, aranhas gigantes</span>
          </div>
          <span className="tiny faint row">
            <Hand size={13} /> Carta X ativa: jogadores podem tocar nela pela sala, anonimamente.
          </span>
        </section>
      </div>

      {screen && <StorytellerScreen onClose={() => setScreen(false)} />}
    </div>
  )
}

function Secrets({ campaign }: { campaign: Campaign }) {
  const [show, setShow] = useState(false)
  return (
    <section className="card stack">
      <div className="row between">
        <span className="section-title">Segredos e pistas</span>
        <button className="icon-btn sm" onClick={() => setShow(!show)} title="Mostrar/ocultar">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {campaign.secrets.map((s, i) => (
        <div key={i} className="row small" style={{ alignItems: "flex-start" }}>
          <span className={`chip ${s.revealedIn ? "green" : "violet"}`} style={{ minWidth: 92, justifyContent: "center" }}>
            {s.revealedIn ? `revelado S${s.revealedIn}` : "guardado"}
          </span>
          <span style={{ filter: show ? "none" : "blur(5px)" }}>{s.text}</span>
        </div>
      ))}
    </section>
  )
}

const TABLES: Record<string, string[]> = {
  "Nome (brasileiro)": ["Joaquim Ferraz", "Benedita Couto", "Tião Brasa", "Marta Fuligem", "Severino Lago", "Iracema Cinza", "Firmino Corvo", "Zuleide Prado"],
  "Gancho": ["Uma criança some no Portão do Lago.", "Um baú chega à taverna sem dono.", "Os sinos tocam sozinhos à meia-noite.", "Um lobo de brasa aparece manso."],
  "Clima em Cinzas": ["Chuva de cinzas leve", "Névoa densa até o meio-dia", "Vento frio do lago", "Céu limpo e lua vermelha"],
}

function daysToFullMorr(): number {
  const morr = ORDEM_X_CAOS.moons[1]
  const { fraction } = moonPhase(morr, dayNumber(ORDEM_X_CAOS, CAMPAIGN_TODAY))
  return Math.round((1 - fraction) * morr.cycle) % morr.cycle
}

function StorytellerScreen({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [results, setResults] = useState<Record<string, string>>({})
  const roll = (table: string) => {
    const options = TABLES[table]
    const value = options[Math.floor(Math.random() * options.length)]
    setResults({ ...results, [table]: value })
    toast(`${table}: ${value}`)
  }
  return (
    <Modal wide title={<span className="row"><MonitorPlay size={16} /> Tela do Mestre — Sessão 12</span>} onClose={onClose}>
      <div className="dash-grid">
        <section className="card tight stack">
          <span className="eyebrow">Notas fixadas</span>
          <a className="list-item small" href={href("/wiki/artigo/aldren-vael")}>Aldren Vael</a>
          <a className="list-item small" href={href("/wiki/artigo/valdris")}>Valdris · ganchos</a>
          <a className="list-item small" href={href(vaultRoute("Notas/Regras da casa.md"))}>Regras da casa</a>
        </section>
        <section className="card tight stack">
          <span className="eyebrow row">
            <Sparkles size={13} /> Geradores e tabelas (offline)
          </span>
          {Object.keys(TABLES).map((t) => (
            <div key={t} className="row">
              <button className="btn sm" onClick={() => roll(t)}>
                <Dices size={14} /> {t}
              </button>
              <span className="small muted truncate">{results[t] ?? "—"}</span>
            </div>
          ))}
        </section>
        <section className="card tight stack">
          <span className="eyebrow">Referência rápida</span>
          <span className="small">Crítico: dano máximo + rolagem extra</span>
          <span className="small">Lobo de Cinzas: Defesa 13 · Vida 22</span>
          <span className="small">Morr fica cheia em {daysToFullMorr()} dias (no mundo)</span>
        </section>
      </div>
    </Modal>
  )
}
