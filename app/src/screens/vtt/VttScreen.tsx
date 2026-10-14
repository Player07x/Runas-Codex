import { useState } from "react"
import { Camera, Clock, DoorOpen, Dices, HardDrive, ImageUp, Link2, LogIn, Map, Plus, ScrollText, Users, WifiOff, Wifi, Hash, FileUp } from "lucide-react"
import { MESAS } from "../../data/mesas"
import { CAMPAIGNS } from "../../data/campaigns"
import { TODAY } from "../../data/agenda"
import { href, navigate } from "../../lib/router"
import { formatDate, relativeDays } from "../../lib/navigation"
import { Empty, Modal, Segmented, Switch, useToast } from "../../components/ui"
import { GmTable } from "./GmTable"
import { PlayerView } from "./PlayerView"
import "./vtt.css"

export function VttScreen({ route }: { route: string[] }) {
  const [section, id] = route
  if (section === "criar") return <CreateRoom />
  if (section === "entrar") return <JoinRoom />
  if (section === "mesa") return <GmTable mesaId={id} />
  if (section === "jogador") return <PlayerView />
  return <VttHome />
}

/** A tela do VTT tem só duas opções. */
function VttHome() {
  return (
    <div className="page vtt-home">
      <div className="vtt-choices">
        <a className="vtt-choice create" href={href("/vtt/criar")}>
          <DoorOpen size={44} />
          <strong className="display">Criar Sala</strong>
          <span>Abrir uma das suas mesas para os jogadores entrarem.</span>
        </a>
        <a className="vtt-choice join" href={href("/vtt/entrar")}>
          <LogIn size={44} />
          <strong className="display">Entrar Sala</strong>
          <span>Entrar na mesa de outra pessoa com link, código ou QR.</span>
        </a>
      </div>
      <p className="muted small vtt-note">
        <WifiOff size={14} /> Esta é a única parte do Runas-Codex que usa a rede, e só enquanto a sala estiver aberta.
      </p>
    </div>
  )
}

function CreateRoom() {
  const [empty, setEmpty] = useState(false)
  const [creating, setCreating] = useState(false)
  const mesas = empty ? [] : MESAS
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">VTT</span>
          <h1 className="page-title">Criar Sala</h1>
        </div>
        <label className="proto-note">
          <input type="checkbox" checked={empty} onChange={(e) => setEmpty(e.target.checked)} /> Protótipo: ver como fica sem nenhuma mesa
        </label>
      </div>

      {mesas.length === 0 ? (
        <Empty
          title="Você ainda não criou nenhuma mesa"
          action={
            <button className="btn primary lg" onClick={() => setCreating(true)}>
              <Plus size={18} /> Criar Nova
            </button>
          }
        >
          Uma mesa guarda cenas, tokens, mapas e músicas. Depois de criada, ela aparece aqui para você abrir a sala.
        </Empty>
      ) : (
        <div className="mesa-grid">
          <button className="mesa-card new" onClick={() => setCreating(true)}>
            <Plus size={34} />
            <strong>Criar Nova</strong>
            <span className="muted small">Mesa em branco, de uma campanha ou importada</span>
          </button>
          {mesas.map((mesa) => {
            const campaign = CAMPAIGNS.find((c) => c.id === mesa.campaignId)
            return (
              <button key={mesa.id} className="mesa-card" onClick={() => navigate(`/vtt/mesa/${mesa.id}`)}>
                <div className="mesa-thumb" style={{ background: `radial-gradient(circle at 30% 30%, ${mesa.palette[0]}, ${mesa.palette[1]})` }}>
                  <svg viewBox="0 0 120 70" aria-hidden="true">
                    <rect x="8" y="30" width="40" height="28" fill="rgb(255 255 255 / 12%)" />
                    <rect x="52" y="12" width="44" height="36" fill="rgb(255 255 255 / 12%)" />
                    <rect x="48" y="40" width="8" height="6" fill="rgb(255 255 255 / 12%)" />
                    <circle cx="24" cy="44" r="4" fill="#82aaa6" />
                    <circle cx="70" cy="28" r="4" fill="#c76561" />
                  </svg>
                  <span className="chip">{mesa.scenes.length} {mesa.scenes.length === 1 ? "cena" : "cenas"}</span>
                </div>
                <div className="stack" style={{ gap: 4, padding: 12 }}>
                  <strong className="display" style={{ fontSize: 16 }}>{mesa.title}</strong>
                  {campaign && (
                    <span className="small row" style={{ color: "var(--red)" }}>
                      <ScrollText size={13} /> {campaign.title}
                    </span>
                  )}
                  <span className="muted small row">
                    <Clock size={13} /> Última sessão {relativeDays(mesa.lastSession, TODAY)} ({formatDate(mesa.lastSession, { day: "2-digit", month: "2-digit", year: "numeric" })})
                  </span>
                  <span className="muted small row">
                    <Users size={13} /> {mesa.players} jogadores · <HardDrive size={13} /> {mesa.sizeMb} MB
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {creating && <NewMesaModal onClose={() => setCreating(false)} />}
    </div>
  )
}

function NewMesaModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [origin, setOrigin] = useState("branco")
  return (
    <Modal
      title="Criar Nova mesa"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button
            className="btn primary"
            onClick={() => {
              onClose()
              toast("Protótipo: mesa criada em .runas/mesas/")
            }}
          >
            Criar mesa
          </button>
        </>
      }
    >
      <label className="field">
        <span>Nome</span>
        <input className="input" placeholder="Ex.: A Cripta do Lobo" autoFocus />
      </label>
      <label className="field">
        <span>Ligar a uma campanha (opcional)</span>
        <select className="select">
          <option>Nenhuma</option>
          {CAMPAIGNS.map((c) => (
            <option key={c.id}>{c.title}</option>
          ))}
        </select>
      </label>
      <div className="stack">
        <span className="eyebrow">Primeira cena</span>
        <div className="origin-grid">
          {[
            { id: "branco", icon: <Map size={20} />, label: "Em branco" },
            { id: "imagem", icon: <ImageUp size={20} />, label: "Imagem de mapa" },
            { id: "uvtt", icon: <FileUp size={20} />, label: "Universal VTT (.dd2vtt)" },
            { id: "pacote", icon: <HardDrive size={20} />, label: "Pacote de mesa" },
          ].map((o) => (
            <button key={o.id} className={`card tight link template ${origin === o.id ? "picked" : ""}`} onClick={() => setOrigin(o.id)}>
              {o.icon}
              <span className="small">{o.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid-cards" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <label className="field">
          <span>Grade</span>
          <select className="select">
            <option>Quadrada</option>
            <option>Hexagonal</option>
            <option>Sem grade (cinemático)</option>
          </select>
        </label>
        <label className="field">
          <span>Distância por célula</span>
          <input className="input" defaultValue="1,5 m" />
        </label>
      </div>
    </Modal>
  )
}

function JoinRoom() {
  const toast = useToast()
  const [how, setHow] = useState<"link" | "codigo" | "qr">("link")
  return (
    <div className="page join">
      <div className="page-head">
        <div>
          <span className="eyebrow">VTT</span>
          <h1 className="page-title">Entrar Sala</h1>
        </div>
      </div>
      <div className="join-layout">
        <section className="card stack-lg">
          <Segmented
            label="Como entrar"
            value={how}
            onChange={setHow}
            options={[
              { value: "link", label: "Link", icon: <Link2 size={14} /> },
              { value: "codigo", label: "Código", icon: <Hash size={14} /> },
              { value: "qr", label: "QR", icon: <Camera size={14} /> },
            ]}
          />
          {how === "link" && (
            <label className="field">
              <span>Link que o mestre mandou</span>
              <input className="input mono" placeholder="https://… ou http://192.168.0.12:30000/?k=…" defaultValue="http://192.168.0.12:30000/?k=8f2c9a71" />
            </label>
          )}
          {how === "codigo" && (
            <div className="stack">
              <label className="field">
                <span>Endereço da sala</span>
                <input className="input mono" defaultValue="192.168.0.12:30000" />
              </label>
              <label className="field">
                <span>Código do seu assento</span>
                <input className="input mono seat-code" defaultValue="K7QM-2XPA" />
              </label>
            </div>
          )}
          {how === "qr" && (
            <div className="qr-camera">
              <Camera size={40} />
              <span className="muted small">A câmera abre aqui (no celular). Aponte para o QR na tela do mestre.</span>
            </div>
          )}
          <label className="field">
            <span>Seu nome na mesa</span>
            <input className="input" defaultValue="Ana" />
          </label>
          <button
            className="btn primary lg"
            onClick={() => {
              toast("Conectado à sala “As Cinzas de Valdris”")
              navigate("/vtt/jogador")
            }}
          >
            <LogIn size={18} /> Entrar
          </button>
        </section>
        <aside className="stack-lg">
          <section className="card stack">
            <span className="section-title">Salas recentes</span>
            <button className="list-item" onClick={() => navigate("/vtt/jogador")}>
              <Dices size={16} />
              <span className="grow">
                <strong className="small">As Cinzas de Valdris</strong>
                <span className="tiny faint" style={{ display: "block" }}>Mesa do Bruno · rede local</span>
              </span>
              <span className="meta">sáb</span>
            </button>
            <button className="list-item" onClick={() => toast("Protótipo: sala fechada no momento")}>
              <Dices size={16} />
              <span className="grow">
                <strong className="small">Noite de terror</strong>
                <span className="tiny faint" style={{ display: "block" }}>trycloudflare.com · internet</span>
              </span>
              <span className="meta">set</span>
            </button>
          </section>
          <section className="card stack small">
            <span className="row">
              <Wifi size={15} color="var(--green)" /> Mesma rede (Wi-Fi): conexão direta, sem internet.
            </span>
            <span className="row muted">
              <Link2 size={15} /> Fora de casa: o mestre liga o túnel e manda um link https.
            </span>
            <span className="row muted">
              <Switch on label="Lembrar" /> Lembrar desta sala neste aparelho
            </span>
          </section>
        </aside>
      </div>
    </div>
  )
}
