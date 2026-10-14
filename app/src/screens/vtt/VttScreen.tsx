import { useEffect, useState } from "react"
import { Camera, Clock, DoorOpen, Dices, Link2, LogIn, Map, Plus, WifiOff, Wifi, Hash } from "lucide-react"
import { href, navigate } from "../../lib/router"
import { relativeDays } from "../../lib/navigation"
import { Empty, Modal } from "../../components/ui"
import { MesaTable } from "../../vtt/MesaTable"
import { isBrowserPreview, vtt } from "../../vtt/api"
import type { WorldSummary } from "../../vtt/shared/world"
import "./vtt.css"

export function VttScreen({ route }: { route: string[] }) {
  const [section, id] = route
  if (section === "criar") return <CreateRoom />
  if (section === "entrar") return <JoinRoom />
  if (section === "mesa" && id) return <MesaTable id={id} />
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

const RECENT_KEY = "runas-codex:salas-recentes"

interface RecentRoom {
  url: string
  at: number
}

function readRecent(): RecentRoom[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as RecentRoom[]
    return Array.isArray(value) ? value.filter((r) => typeof r.url === "string").slice(0, 8) : []
  } catch {
    return []
  }
}

/** Link da sala: `http(s)://endereço/?k=chave`. Aceita também só o endereço com a chave colada à parte. */
function roomUrl(link: string): string {
  let text = link.trim()
  if (!/^https?:\/\//i.test(text)) text = `http://${text}`
  const url = new URL(text)
  if (!url.searchParams.get("k")) throw new Error("O link precisa ter a chave da sala (a parte ?k=…). Peça ao mestre o link completo.")
  return url.href
}

/** Entrar Sala: abre a página da sala de outra pessoa. O código do assento é pedido dentro da própria sala. */
function JoinRoom() {
  const [link, setLink] = useState("")
  const [error, setError] = useState<string>()
  const [recent, setRecent] = useState(readRecent)
  const join = async (value: string) => {
    setError(undefined)
    try {
      const url = roomUrl(value)
      await vtt.player.join(url)
      const next = [{ url, at: Date.now() }, ...recent.filter((r) => r.url !== url)].slice(0, 8)
      setRecent(next)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        /* só não é lembrada */
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }
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
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault()
              void join(link)
            }}
          >
            <label className="field">
              <span>Link que o mestre mandou</span>
              <input className="input mono" placeholder="http://192.168.0.12:30000/?k=… ou https://….trycloudflare.com/?k=…" value={link} onChange={(event) => setLink(event.target.value)} aria-label="Link da sala" autoFocus />
            </label>
            {error && <span className="small" style={{ color: "var(--red)" }}>{error}</span>}
            <button className="btn primary lg" disabled={!link.trim()}>
              <LogIn size={18} /> Entrar
            </button>
          </form>
          <span className="small muted row">
            <Hash size={14} /> Se o mestre te deu um código de assento, ele é pedido dentro da sala.
          </span>
          <span className="small muted row">
            <Camera size={14} /> No celular, ler o QR com a câmera abre a sala no navegador.
          </span>
        </section>
        <aside className="stack-lg">
          <section className="card stack">
            <span className="section-title">Salas recentes</span>
            {recent.length === 0 && <span className="muted small">As salas em que você entrar aparecem aqui.</span>}
            {recent.map((room) => (
              <button key={room.url} className="list-item" onClick={() => void join(room.url)}>
                <Dices size={16} />
                <span className="grow" style={{ minWidth: 0 }}>
                  <strong className="small truncate" style={{ display: "block" }}>{new URL(room.url).host}</strong>
                  <span className="tiny faint" style={{ display: "block" }}>{new URL(room.url).protocol === "https:" ? "internet (túnel)" : "rede local"}</span>
                </span>
                <span className="meta">{relativeDays(new Date(room.at).toISOString(), new Date())}</span>
              </button>
            ))}
          </section>
          <section className="card stack small">
            <span className="row">
              <Wifi size={15} color="var(--green)" /> Mesma rede (Wi-Fi): conexão direta, sem internet.
            </span>
            <span className="row muted">
              <Link2 size={15} /> Fora de casa: o mestre liga o link público e manda um endereço https.
            </span>
          </section>
        </aside>
      </div>
    </div>
  )
}
