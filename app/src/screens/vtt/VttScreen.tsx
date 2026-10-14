import { useEffect, useState } from "react"
import { Camera, Clock, DoorOpen, Dices, Link2, LogIn, Map, Plus, WifiOff, Wifi, Hash } from "lucide-react"
import { href, navigate } from "../../lib/router"
import { relativeDays } from "../../lib/navigation"
import { Empty, Modal, Segmented, Switch, useToast } from "../../components/ui"
import { MesaTable } from "../../vtt/MesaTable"
import { isBrowserPreview, vtt } from "../../vtt/api"
import type { WorldSummary } from "../../vtt/shared/world"
import { PlayerView } from "./PlayerView"
import "./vtt.css"

export function VttScreen({ route }: { route: string[] }) {
  const [section, id] = route
  if (section === "criar") return <CreateRoom />
  if (section === "entrar") return <JoinRoom />
  if (section === "mesa" && id) return <MesaTable id={id} />
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

/** Criar Sala: as mesas do cofre (`.runas/mesas/`) e "Criar Nova". */
function CreateRoom() {
  const [mesas, setMesas] = useState<WorldSummary[] | null>(null)
  const [error, setError] = useState<string>()
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    vtt.listWorlds().then(setMesas, (reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)))
  }, [])
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">VTT</span>
          <h1 className="page-title">Criar Sala</h1>
        </div>
        {isBrowserPreview && <span className="proto-note">Prévia no navegador: as mesas ficam só na memória desta aba.</span>}
      </div>

      {error ? (
        <Empty title="Não deu para ler as mesas" action={<a className="btn" href={href("/config")}>Abrir Configurações</a>}>
          {error}
        </Empty>
      ) : !mesas ? (
        <p className="muted">Lendo as mesas…</p>
      ) : mesas.length === 0 ? (
        <Empty
          title="Você ainda não criou nenhuma mesa"
          action={
            <button className="btn primary lg" onClick={() => setCreating(true)}>
              <Plus size={18} /> Criar Nova
            </button>
          }
        >
          Uma mesa guarda cenas, tokens, mapas e músicas, dentro do cofre (em <code>.runas/mesas</code>). Depois de criada,
          ela aparece aqui para você abrir a sala.
        </Empty>
      ) : (
        <div className="mesa-grid">
          <button className="mesa-card new" onClick={() => setCreating(true)}>
            <Plus size={34} />
            <strong>Criar Nova</strong>
            <span className="muted small">Mesa em branco</span>
          </button>
          {mesas.map((mesa) => (
            <button key={mesa.id} className="mesa-card" onClick={() => navigate(`/vtt/mesa/${mesa.id}`)} data-mesa={mesa.title}>
              <div className="mesa-thumb" style={{ background: "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--cyan) 30%, var(--panel-2)), var(--bg-deep))" }}>
                <Map size={34} style={{ color: "var(--cyan)", opacity: 0.6 }} />
                <span className="chip">
                  {mesa.scenes ?? 0} {mesa.scenes === 1 ? "cena" : "cenas"}
                </span>
              </div>
              <div className="stack" style={{ gap: 4, padding: 12 }}>
                <strong className="display" style={{ fontSize: 16 }}>{mesa.title}</strong>
                {mesa.description && <span className="muted small">{mesa.description}</span>}
                <span className="muted small row">
                  <Clock size={13} /> Aberta {relativeDays(new Date(mesa.updatedAt).toISOString(), new Date())}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {creating && <NewMesaModal onClose={() => setCreating(false)} />}
    </div>
  )
}

function NewMesaModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const create = async () => {
    setBusy(true)
    setError(undefined)
    try {
      const mesa = await vtt.createWorld({ title, description })
      navigate(`/vtt/mesa/${mesa.id}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      setBusy(false)
    }
  }
  return (
    <Modal
      title="Criar Nova mesa"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn primary" onClick={() => void create()} disabled={busy || !title.trim()} aria-label="Confirmar criar mesa">
            Criar mesa
          </button>
        </>
      }
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          if (title.trim() && !busy) void create()
        }}
      >
        <label className="field">
          <span>Nome</span>
          <input className="input" placeholder="Ex.: A Cripta do Lobo" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Nome da mesa" />
        </label>
        <label className="field">
          <span>Descrição (opcional)</span>
          <input className="input" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <span className="small muted">A primeira cena (mapa, grade) é criada dentro da mesa, no painel Cenas.</span>
      </form>
      {error && <p className="small" style={{ color: "var(--red)" }}>{error}</p>}
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
