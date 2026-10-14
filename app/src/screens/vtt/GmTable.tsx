import { useEffect, useState } from "react"
import QRCode from "qrcode"
import {
  BookOpen, BrickWall, ChevronLeft, CloudRain, Copy, Crosshair, Dices, Eye, EyeOff, Folder, Globe, Lightbulb, MapPin, MessageSquare, Music, MousePointer2, Pause, PenTool,
  Play, Radio, Redo2, Ruler, Send, Shield, SkipForward, Swords, Triangle, Undo2, Users, Volume2, X, Brush, Image as ImageIcon, Clapperboard, Layers,
} from "lucide-react"
import { CHAT, INITIATIVE, MESAS, PLAYLISTS } from "../../data/mesas"
import type { Token } from "../../data/types"
import { roll } from "../../lib/dice"
import { href } from "../../lib/router"
import { Switch, useToast } from "../../components/ui"
import { SceneMap, type Tool } from "./SceneMap"

type Panel = "iniciativa" | "chat" | "audio" | "sala"

const TOOLS: { id: Tool; label: string; icon: React.ReactNode }[] = [
  { id: "selecionar", label: "Selecionar (V)", icon: <MousePointer2 size={18} /> },
  { id: "regua", label: "Régua (R)", icon: <Ruler size={18} /> },
  { id: "template", label: "Template de área", icon: <Triangle size={18} /> },
  { id: "ping", label: "Ping “olhem aqui”", icon: <Crosshair size={18} /> },
  { id: "desenho", label: "Desenho (P)", icon: <PenTool size={18} /> },
  { id: "nevoa", label: "Pincel de névoa", icon: <Brush size={18} /> },
  { id: "paredes", label: "Paredes e portas (B)", icon: <BrickWall size={18} /> },
  { id: "luz", label: "Luzes (L)", icon: <Lightbulb size={18} /> },
  { id: "nota", label: "Pino ligado a nota (N)", icon: <MapPin size={18} /> },
]

export function GmTable({ mesaId }: { mesaId: string }) {
  const toast = useToast()
  const mesa = MESAS.find((m) => m.id === mesaId) ?? MESAS[0]
  const [sceneId, setSceneId] = useState(mesa.scenes[0].id)
  const scene = mesa.scenes.find((s) => s.id === sceneId)!
  const [tool, setTool] = useState<Tool>("selecionar")
  const [panel, setPanel] = useState<Panel>("iniciativa")
  const [sheet, setSheet] = useState(false)
  const [scenesOpen, setScenesOpen] = useState(true)
  const [selected, setSelected] = useState<Token | null>(null)
  const [turn, setTurn] = useState(0)
  const [round, setRound] = useState(3)
  const active = INITIATIVE[turn]?.tokenId

  const showPanel = (p: Panel) => {
    setPanel(p)
    setSheet(true)
  }

  return (
    <div className="gm-table">
      <div className="vtt-bar">
        <a className="icon-btn" href={href("/vtt/criar")} title="Voltar para as mesas">
          <ChevronLeft size={18} />
        </a>
        <strong className="display truncate">{mesa.title}</strong>
        <span className="chip truncate">{scene.name}</span>
        <span className="grow" />
        <button className="room-status" onClick={() => showPanel("sala")}>
          <Radio size={14} /> Sala aberta · 3/4
        </button>
        <button className="icon-btn hide-mobile" title="Desfazer" onClick={() => toast("Desfeito")}>
          <Undo2 size={17} />
        </button>
        <button className="icon-btn hide-mobile" title="Refazer">
          <Redo2 size={17} />
        </button>
      </div>

      <div className="vtt-body">
        <div className="vtt-tools" role="toolbar" aria-label="Ferramentas">
          {TOOLS.map((t) => (
            <button key={t.id} className={`icon-btn ${tool === t.id ? "active" : ""}`} title={t.label} onClick={() => setTool(t.id)}>
              {t.icon}
            </button>
          ))}
          <span className="tools-sep" />
          <button className={`icon-btn ${scenesOpen ? "active" : ""} hide-mobile`} title="Cenas" onClick={() => setScenesOpen(!scenesOpen)}>
            <Layers size={18} />
          </button>
          <button className="icon-btn" title="Clima e partículas" onClick={() => toast("Protótipo: chuva de cinzas ligada")}>
            <CloudRain size={18} />
          </button>
          <button className="icon-btn" title="Handout para os jogadores" onClick={() => toast("Handout enviado: Mapa da Cidade Alta")}>
            <ImageIcon size={18} />
          </button>
          {/* No celular, os painéis viram folhas inferiores. */}
          <button className="icon-btn mobile-only" title="Iniciativa" onClick={() => showPanel("iniciativa")}>
            <Swords size={18} />
          </button>
          <button className="icon-btn mobile-only" title="Chat e dados" onClick={() => showPanel("chat")}>
            <Dices size={18} />
          </button>
          <button className="icon-btn mobile-only" title="Áudio" onClick={() => showPanel("audio")}>
            <Music size={18} />
          </button>
        </div>

        {scenesOpen && (
          <aside className="vtt-scenes hide-mobile">
            <span className="eyebrow">Cenas</span>
            {[...new Set(mesa.scenes.map((s) => s.folder))].map((folder) => (
              <div key={folder} className="stack" style={{ gap: 2 }}>
                {folder && (
                  <span className="tiny faint row">
                    <Folder size={12} /> {folder}
                  </span>
                )}
                {mesa.scenes
                  .filter((s) => s.folder === folder)
                  .map((s) => (
                    <button key={s.id} className={`scene-item ${s.id === sceneId ? "active" : ""}`} onClick={() => setSceneId(s.id)}>
                      <span className="scene-thumb">{s.grid === "nenhuma" ? <Clapperboard size={14} /> : s.grid === "hex" ? "⬡" : "▦"}</span>
                      <span className="truncate small">{s.name}</span>
                    </button>
                  ))}
              </div>
            ))}
            <button className="btn sm" onClick={() => toast("Protótipo: nova cena ou importar .dd2vtt")}>+ Cena</button>
          </aside>
        )}

        <div className="vtt-stage">
          {scene.tokens.length ? (
            <SceneMap scene={scene} mode="gm" selected={selected?.id} active={active} onSelect={setSelected} tool={tool} />
          ) : (
            <div className="empty-scene">
              <Clapperboard size={34} />
              <span>Cena vazia no protótipo — a cena “Esgotos de Brasa” tem o mapa de exemplo.</span>
            </div>
          )}
          {selected && <TokenInspector token={selected} onClose={() => setSelected(null)} />}
        </div>

        <aside className={`vtt-panel ${sheet ? "open" : ""}`}>
          <div className="tabs">
            <button className={panel === "iniciativa" ? "active" : ""} onClick={() => setPanel("iniciativa")}>
              <Swords size={15} /> Iniciativa
            </button>
            <button className={panel === "chat" ? "active" : ""} onClick={() => setPanel("chat")}>
              <MessageSquare size={15} /> Chat
            </button>
            <button className={panel === "audio" ? "active" : ""} onClick={() => setPanel("audio")}>
              <Music size={15} />
            </button>
            <button className={panel === "sala" ? "active" : ""} onClick={() => setPanel("sala")}>
              <Users size={15} />
            </button>
            <button className="sheet-close" onClick={() => setSheet(false)} aria-label="Fechar painel">
              <X size={16} />
            </button>
          </div>
          <div className="vtt-panel-body">
            {panel === "iniciativa" && (
              <InitiativePanel
                scene={scene.tokens}
                turn={turn}
                round={round}
                onNext={() => {
                  if (turn + 1 >= INITIATIVE.length) {
                    setTurn(0)
                    setRound(round + 1)
                  } else setTurn(turn + 1)
                }}
              />
            )}
            {panel === "chat" && <ChatPanel speaker="Mestre" />}
            {panel === "audio" && <AudioPanel />}
            {panel === "sala" && <RoomPanel />}
          </div>
        </aside>
      </div>
    </div>
  )
}

function TokenInspector({ token, onClose }: { token: Token; onClose: () => void }) {
  return (
    <div className="token-inspector card">
      <div className="row between">
        <strong>{token.name}</strong>
        <button className="icon-btn sm" onClick={onClose} aria-label="Fechar">
          <X size={15} />
        </button>
      </div>
      <div className="row-wrap">
        <span className={`chip ${token.kind === "hostil" ? "red" : token.kind === "aliado" ? "green" : "cyan"}`}>{token.kind}</span>
        {token.hidden && (
          <span className="chip violet">
            <EyeOff size={12} /> oculto dos jogadores
          </span>
        )}
      </div>
      {token.hp && (
        <label className="field">
          <span>Vida</span>
          <div className="row">
            <input className="input mono" defaultValue={token.hp[0]} style={{ width: 70 }} />
            <span className="muted">/ {token.hp[1]}</span>
          </div>
        </label>
      )}
      <div className="stack">
        <span className="eyebrow">Condições</span>
        <div className="row-wrap">
          {["caído", "atordoado", "envenenado", "invisível", "abençoada", "agarrado"].map((c) => (
            <span key={c} className={`chip ${token.conditions?.includes(c) ? "gold" : ""}`}>{c}</span>
          ))}
        </div>
      </div>
      <div className="row-wrap">
        <button className="btn sm">
          <Eye size={14} /> Visão
        </button>
        <button className="btn sm">
          <Shield size={14} /> Aura
        </button>
        <a className="btn sm" href={href(token.name === "Aldren Vael" ? "/wiki/artigo/aldren-vael" : "/wiki/artigo/lobo-de-cinzas")}>
          <BookOpen size={14} /> Nota na wiki
        </a>
      </div>
    </div>
  )
}

function InitiativePanel({ scene, turn, round, onNext }: { scene: Token[]; turn: number; round: number; onNext: () => void }) {
  return (
    <div className="stack">
      <div className="row between">
        <span className="section-title">Rodada {round}</span>
        <button className="btn sm primary" onClick={onNext}>
          <SkipForward size={14} /> Próximo turno
        </button>
      </div>
      {INITIATIVE.map((entry, i) => {
        const t = scene.find((x) => x.id === entry.tokenId)
        if (!t) return null
        return (
          <div key={entry.tokenId} className={`init-row ${i === turn ? "active" : ""}`}>
            <span className="init-value mono">{entry.value}</span>
            <span className="init-token" style={{ background: t.color }}>{t.name[0]}</span>
            <span className="grow">
              <strong className="small">{t.name}</strong>
              {t.hp && (
                <span className="tiny faint" style={{ display: "block" }}>
                  {t.kind === "hostil" ? "vida oculta dos jogadores" : `${t.hp[0]}/${t.hp[1]}`} {t.conditions?.length ? `· ${t.conditions.join(", ")}` : ""}
                </span>
              )}
            </span>
          </div>
        )
      })}
      <span className="tiny faint">Genérico (sem ficha): ordem, rodadas e condições.</span>
    </div>
  )
}

export function ChatPanel({ speaker }: { speaker: string }) {
  const [messages, setMessages] = useState(CHAT)
  const [text, setText] = useState("")
  const [error, setError] = useState("")
  const send = (raw: string) => {
    const value = raw.trim()
    if (!value) return
    const notation = value.startsWith("/r ") ? value.slice(3) : /^[\d+\-dkhlF%!\s]+$/i.test(value) && /d/i.test(value) ? value : null
    if (notation) {
      try {
        const r = roll(notation)
        setMessages([...messages, { who: speaker, roll: r.notation, result: r.total, detail: r.detail, kind: "rolagem" as const }])
        setError("")
      } catch (e) {
        setError((e as Error).message)
        return
      }
    } else setMessages([...messages, { who: speaker, text: value, kind: "fala" as const }])
    setText("")
  }
  return (
    <div className="chat">
      <div className="chat-log">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.kind}`}>
            <span className="tiny faint">{m.who}</span>
            {"roll" in m && m.roll ? (
              <div className="roll-card">
                <span className="mono small muted">{m.roll}</span>
                <strong className="roll-total">{m.result}</strong>
                <span className="mono tiny faint">{m.detail}</span>
              </div>
            ) : (
              <p className="small">{"text" in m ? m.text : ""}</p>
            )}
          </div>
        ))}
      </div>
      <div className="dice-row">
        {["d4", "d6", "d8", "d10", "d12", "d20", "d%"].map((d) => (
          <button key={d} className="btn sm" onClick={() => send(`1${d}`)}>
            {d}
          </button>
        ))}
      </div>
      {error && <span className="tiny" style={{ color: "var(--red)" }}>{error}</span>}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          send(text)
        }}
      >
        <input className="input" placeholder="Mensagem ou rolagem (ex.: 4d6kh3, /r 1d20+5)" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="icon-btn active" type="submit" aria-label="Enviar">
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}

function AudioPanel() {
  const [playing, setPlaying] = useState(PLAYLISTS.map((p) => p.playing))
  return (
    <div className="stack">
      {["Música", "Ambiente", "Efeitos"].map((channel) => (
        <label key={channel} className="row small">
          <Volume2 size={15} /> <span style={{ width: 70 }}>{channel}</span>
          <input type="range" defaultValue={channel === "Efeitos" ? 90 : 60} className="grow" style={{ accentColor: "var(--cyan)" }} />
        </label>
      ))}
      <div className="divider" />
      {PLAYLISTS.map((p, i) => (
        <div key={p.name} className="row card tight">
          <button className="icon-btn sm" onClick={() => setPlaying(playing.map((v, j) => (j === i ? !v : v)))} aria-label={playing[i] ? "Pausar" : "Tocar"}>
            {playing[i] ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <span className="grow">
            <strong className="small">{p.name}</strong>
            <span className="tiny faint" style={{ display: "block" }}>
              {p.channel} · {p.tracks.join(", ")}
            </span>
          </span>
        </div>
      ))}
      <span className="tiny faint">Trilha por cena: trocar de cena troca a playlist. Quem entra atrasado ouve do mesmo ponto.</span>
    </div>
  )
}

function RoomPanel() {
  const toast = useToast()
  const [internet, setInternet] = useState(false)
  const [qr, setQr] = useState("")
  const url = internet ? "https://brasa-lobo-cinza.trycloudflare.com/?k=8f2c9a71" : "http://192.168.0.12:30000/?k=8f2c9a71"
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: "#0d0b0c", light: "#f3ece8" } }).then(setQr)
  }, [url])
  const seats = [
    { name: "Ana", character: "Ilsa Brasa", code: "K7QM-2XPA", online: true },
    { name: "Bruno", character: "Torvak", code: "R4TB-9ZLE", online: true },
    { name: "Carla", character: "Mirela", code: "W2HN-6CQS", online: true },
    { name: "Diego", character: "Sef", code: "P8VD-3MRY", online: false },
  ]
  return (
    <div className="stack">
      <div className="row between">
        <span className="section-title row">
          <Radio size={15} color="var(--green)" /> Sala aberta
        </span>
        <button className="btn sm danger" onClick={() => toast("Protótipo: sala encerrada")}>Encerrar</button>
      </div>
      {qr && <img className="room-qr" src={qr} alt="QR code do link da sala" />}
      <div className="row">
        <input className="input mono tiny" readOnly value={url} />
        <button className="icon-btn" onClick={() => toast("Link copiado")} aria-label="Copiar link">
          <Copy size={15} />
        </button>
      </div>
      <div className="row between small">
        <span className="row">
          <Globe size={15} /> Acesso pela internet (túnel)
        </span>
        <Switch on={internet} onChange={setInternet} label="Internet" />
      </div>
      <span className="tiny faint">{internet ? "Túnel Cloudflare ativo. Funciona fora da sua rede." : "Só quem está no mesmo Wi-Fi consegue entrar."}</span>
      <div className="divider" />
      <span className="eyebrow">Assentos</span>
      {seats.map((s) => (
        <div key={s.code} className="row small">
          <span className="dot" style={{ background: s.online ? "var(--green)" : "var(--faint)" }} />
          <span className="grow">
            {s.name} <span className="faint">· {s.character}</span>
          </span>
          <span className="mono tiny muted">{s.code}</span>
        </div>
      ))}
    </div>
  )
}
