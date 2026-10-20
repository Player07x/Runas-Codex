import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { Activity, ExternalLink, KeyRound, MonitorPlay, Radio, RefreshCw, RotateCw, Smartphone, Square, Target, Trash2, Unplug, Users, Wifi } from "lucide-react"
import type { LinkTestResult, PlayerState } from "../shared/ipc"
import { masterLink, type MasterState } from "../shared/master"
import type { DocumentStore } from "../document-store"
import { useDocumentsVersion } from "../document-store"
import { remoteMaster, vtt } from "../api"

/** O Electron embrulha o erro do processo principal ("Error invoking remote method 'x': Error: …"); o mestre só precisa do motivo. */
export function errorMessage(reason: unknown): string {
  const text = reason instanceof Error ? reason.message : String(reason)
  return text.replace(/^Error invoking remote method '[^']*':\s*/, "").replace(/^Error:\s*/, "")
}

export function PlayerPanel({ store, sceneId }: { store: DocumentStore; sceneId: string | null }) {
  useDocumentsVersion(store)
  const [state, setState] = useState<PlayerState | null>(null)
  const [port, setPort] = useState("30000")
  const [seatCount, setSeatCount] = useState("1")
  const [qr, setQr] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [tunneling, setTunneling] = useState(false)
  // Sistema do computador do mestre, para a dica de firewall.
  const platform = /linux/i.test(navigator.userAgent) ? "linux" : /mac/i.test(navigator.userAgent) ? "darwin" : "win32"
  const [linkTest, setLinkTest] = useState<LinkTestResult | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    let mounted = true
    void vtt.player.state().then((value) => { if (mounted) { setState(value); setPort(String(value.port)) } }).catch((reason) => { if (mounted) setError(errorMessage(reason)) })
    const unsubscribe = vtt.player.onState((value) => {
      if (!mounted) return
      setState((previous) => previous && value.sessionId === previous.sessionId
        ? { ...value, seats: value.seats.map((seat) => ({ ...seat, code: seat.code ?? previous.seats.find((candidate) => candidate.slotId === seat.slotId)?.code })) }
        : value)
    })
    return () => { mounted = false; unsubscribe() }
  }, [])

  // Um resultado é do link em que foi medido.
  useEffect(() => { setLinkTest(null) }, [state?.publicUrl])

  useEffect(() => {
    const url = state?.publicUrl ?? state?.localUrl
    if (!url) { setQr(""); return }
    void QRCode.toDataURL(url, { width: 220, margin: 1, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(""))
  }, [state?.localUrl, state?.publicUrl])

  async function run(action: () => Promise<unknown>) {
    setError("")
    setBusy(true)
    try { await action() } catch (reason) { setError(errorMessage(reason)) } finally { setBusy(false) }
  }

  const scenes = store.scenes()
  const link = state?.publicUrl ?? state?.localUrl ?? ""
  const listenPort = state?.port ?? 30000
  const lanHint = platform === "linux"
    ? `Se outro aparelho da rede não abrir o link, o firewall pode estar barrando a porta: sudo ufw allow ${listenPort}/tcp. Wi-Fis com "isolamento de clientes" também impedem aparelho de falar com aparelho.`
    : platform === "darwin"
      ? "O macOS pode pedir permissão para aceitar conexões de entrada na primeira vez. Todos na mesma rede abrem este link."
      : "O Windows pode pedir permissão de firewall na primeira vez. Todos na mesma rede abrem este link."

  return <section className="player-panel">
    <header className="panel-header">
      <div><p className="eyebrow">Jogadores</p><h2>Sala</h2></div>
      <Radio size={20} className={state?.enabled ? "player-live" : "muted"} />
    </header>
    <p className="muted">A sala começa com assentos individuais. Cada código identifica um jogador, que passa a mover o token atribuído a ele (campo “Controlado por” do token). Quem entra sem código assiste como espectador.</p>

    {remoteMaster && <p className="hint">Você está controlando a mesa pelo celular: ligar, desligar e o link público da sala ficam no computador.</p>}
    {!remoteMaster && <div className="player-controls">
      <label className="field"><span>Porta local</span><input inputMode="numeric" value={port} disabled={Boolean(state?.enabled) || busy} onChange={(event) => setPort(event.target.value.replace(/\D/g, "").slice(0, 5))} /></label>
      <label className="field"><span>Jogadores</span><input inputMode="numeric" min="1" max="12" value={seatCount} disabled={Boolean(state?.enabled) || busy} onChange={(event) => setSeatCount(event.target.value.replace(/\D/g, "").slice(0, 2))} /></label>
      {!state?.enabled
        ? <button className="primary" disabled={busy || !port || !seatCount} onClick={() => void run(async () => { const next = await vtt.player.start(Number(port), Number(seatCount)); setState(next) })}><Wifi size={15} /> Ligar transmissão</button>
        : <button className="ghost danger" disabled={busy} onClick={() => void run(() => vtt.player.stop())}><Square size={14} /> Desligar</button>}
    </div>}

    {state?.enabled && <>
      <div className="player-link-card">
        <div className="player-link-heading"><strong>Link para os jogadores</strong><span><Users size={14} /> {state.players} jogadores · {state.spectators} {state.spectators === 1 ? "espectador" : "espectadores"}</span></div>
        <div className="player-link-row"><input readOnly value={link} aria-label="Link da sala" /><button className="ghost small" onClick={() => { void navigator.clipboard?.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }}>{copied ? "Copiado" : "Copiar"}</button></div>
        {qr && <img className="player-qr" src={qr} alt="QR code do link para os jogadores" />}
        <small className="hint">{state.publicUrl ? "Link público pela internet: qualquer pessoa com ele assiste à cena. Desligue a transmissão para encerrá-lo." : lanHint}</small>
        {state.publicUrl && state.tunnel && <small className="hint">Túnel conectado{state.tunnel.location ? ` via ${state.tunnel.location.toUpperCase()}` : ""}{state.tunnel.protocol ? ` (${state.tunnel.protocol})` : ""}.</small>}
        {state.tunnelLost && <p className="error" role="alert">O link público caiu: o cloudflared encerrou. Gere um novo link; o endereço muda a cada vez e os jogadores precisam do novo.</p>}
      </div>
      <div className="player-seats">
        <div className="player-link-heading"><strong>Assentos da sessão</strong><span><KeyRound size={14} /> {state.seats.length} {state.seats.length === 1 ? "jogador" : "jogadores"}</span></div>
        <p className="hint">Entregue um código a cada jogador. Regenerar invalida o código anterior; limpar desconecta quem está no assento.</p>
        <div className="table-scroll"><table><thead><tr><th>Assento</th><th>Código</th><th>Estado</th><th>Ações</th></tr></thead><tbody>{state.seats.map((seat) => <tr key={seat.slotId}><td>{seat.label}</td><td><code>{seat.code ?? "••••••••"}</code>{seat.code && <button className="ghost small" aria-label={`Copiar código de ${seat.label}`} onClick={() => { void navigator.clipboard?.writeText(seat.code ?? "") }}>Copiar</button>}</td><td>{seat.status === "attached" ? "Ficha anexada" : seat.status === "connected" ? "Conectado" : "Disponível"}</td><td><button className="ghost small" disabled={busy} onClick={() => void run(async () => { const next = await vtt.player.rotateSeatCode(seat.slotId); setState(next) })}><RotateCw size={13} /> Regenerar</button><button className="ghost small danger" disabled={busy || (!seat.tokenId && seat.status === "available")} onClick={() => { if (window.confirm(`Limpar a ficha de ${seat.label}?`)) void run(async () => { const next = await vtt.player.clearSeat(seat.slotId); setState(next) }) }}><Trash2 size={13} /> Limpar</button></td></tr>)}</tbody></table></div>
      </div>
      {!remoteMaster && vtt.master && <MasterRemotePanel roomUrl={state.publicUrl ?? state.localUrl} />}
      {!remoteMaster && <div className="player-actions"><button className="ghost" onClick={() => void run(() => vtt.player.openWindow())}><MonitorPlay size={15} /> Abrir janela local</button><button className="ghost" disabled={busy} onClick={() => { if (window.confirm("Baixar o cloudflared do release oficial da Cloudflare, verificar o SHA-256 e abrir um túnel público?")) void run(async () => { setTunneling(true); try { await vtt.player.publicLink() } finally { setTunneling(false) } }) }}><ExternalLink size={15} /> {tunneling ? "Conectando à Cloudflare…" : state.publicUrl ? "Gerar novo link público" : "Gerar link público"}</button>{state.publicUrl && <button className="ghost" disabled={busy || testing} onClick={() => { setTesting(true); setLinkTest(null); void vtt.player.testPublicLink().then(setLinkTest).catch((reason) => setLinkTest({ ok: false, ms: 0, error: reason instanceof Error ? reason.message : String(reason) })).finally(() => setTesting(false)) }}><Activity size={15} /> {testing ? "Testando…" : "Testar link"}</button>}</div>}
      {linkTest && <p className={linkTest.ok ? "hint" : "error"} role="status">{linkTest.ok ? `O link responde: ${linkTest.ms} ms do seu computador até a mesa, passando pela Cloudflare. Se um jogador ainda não abrir, o bloqueio está na rede dele: alguns provedores, DNS de filtro e antivírus barram trycloudflare.com. Peça para testar em dados móveis ou com o DNS 1.1.1.1.` : `O link não respondeu: ${linkTest.error ?? "erro desconhecido"}.`}</p>}
      {tunneling && <p className="hint" role="status">Conectando à Cloudflare. Leva alguns segundos e, se a rede bloquear a porta 7844, o app desiste em até 60 s e explica o motivo.</p>}
      <p className="hint">O link público usa um túnel Cloudflare Quick Tunnel opcional e só é iniciado após sua confirmação.</p>
      <div className="player-config">
        <label className="field"><span>Cena transmitida</span><select value={state.sceneId ?? ""} onChange={(event) => void run(() => vtt.player.setScene(event.target.value || null))}><option value="">Cena aberta pelo mestre</option>{scenes.map((scene) => <option key={scene.id} value={scene.id}>{scene.data.name}</option>)}</select></label>
        <button className="ghost" onClick={() => void run(() => vtt.player.pullCamera())}><Target size={15} /> Puxar a câmera para o ponto do mestre</button>
        <small className="hint">Cada jogador move a própria câmera. Mover a sua não mexe na deles; este botão leva todos ao que você está vendo agora.</small>
        <label className="check"><input type="checkbox" checked={state.moves} onChange={(event) => void run(() => vtt.player.setMoves(event.target.checked))} /> Jogadores podem mover os tokens marcados como Jogador</label>
        <label className="check"><input type="checkbox" checked={state.audio} onChange={(event) => void run(() => vtt.player.setAudio(event.target.checked))} /> Tocar o áudio também para os jogadores</label>
        <label className="field"><span>Mostrar barras aos jogadores</span><select value={state.bars} onChange={(event) => void run(() => vtt.player.setBars(event.target.value as PlayerState["bars"]))}><option value="friendly">Só em Jogador e Aliado</option><option value="all">Todos os tokens</option><option value="none">Nenhuma</option></select></label>
      </div>
    </>}
    {!state?.enabled && <div className="player-offline"><RefreshCw size={16} /><span>Ligue a transmissão quando quiser compartilhar a cena. A chave de acesso muda a cada sessão.</span></div>}
    {error && <button className="scene-error" onClick={() => setError("")} role="alert">{error} ✕</button>}
    {sceneId && state?.enabled && <small className="hint">A cena aberta atualmente é usada por padrão; você pode fixar outra acima.</small>}
  </section>
}

/**
 * Controlar pelo celular (ADR 0016): QR e link da mesa do mestre, com a chave desta sessão. Fica escondido até o mestre
 * pedir, porque quem abre o link controla a mesa inteira (a tela pode estar espelhada na TV dos jogadores).
 */
function MasterRemotePanel({ roomUrl }: { roomUrl: string | null }) {
  const [master, setMaster] = useState<MasterState | null>(null)
  const [shown, setShown] = useState(false)
  const [qr, setQr] = useState("")
  const [error, setError] = useState("")
  const api = vtt.master!
  useEffect(() => {
    let mounted = true
    void api.state().then((value) => mounted && setMaster(value))
    const unsubscribe = api.onState((value) => mounted && setMaster(value))
    return () => { mounted = false; unsubscribe() }
  }, [api])
  const link = master?.key && roomUrl ? masterLink(roomUrl, master.key) : ""
  useEffect(() => {
    if (!shown || !link) { setQr(""); return }
    void QRCode.toDataURL(link, { width: 220, margin: 1, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(""))
  }, [shown, link])
  const act = (action: () => Promise<MasterState>) => { setError(""); void action().then(setMaster, (reason: unknown) => setError(errorMessage(reason))) }
  return <div className="player-link-card" data-master-remote>
    <div className="player-link-heading"><strong>Controlar pelo celular</strong><span><Smartphone size={14} /> {master?.connected ? "Celular conectado" : "Nenhum aparelho conectado"}</span></div>
    <small className="hint">Abra a mesa do mestre no celular ou no tablet (pelo navegador, na mesma rede ou pelo link público) e controle por toque; a mesa continua gravada neste computador. <strong>Quem abrir este link controla a mesa inteira: não mostre aos jogadores.</strong></small>
    {!shown
      ? <button className="ghost" disabled={!link} onClick={() => setShown(true)}><Smartphone size={15} /> Mostrar QR do mestre</button>
      : <>
        <div className="player-link-row"><input readOnly value={link} aria-label="Link da mesa do mestre" /><button className="ghost small" onClick={() => setShown(false)}>Esconder</button></div>
        {qr && <img className="player-qr" src={qr} alt="QR code da mesa do mestre" />}
      </>}
    <div className="player-actions">
      {master?.connected && <button className="ghost" onClick={() => act(api.disconnect)}><Unplug size={15} /> Desconectar</button>}
      <button className="ghost" disabled={!master?.key} onClick={() => act(api.rotate)}><RotateCw size={15} /> Trocar chave</button>
    </div>
    <small className="hint">Trocar a chave derruba o aparelho conectado e invalida o link anterior. Um aparelho por vez.</small>
    {error && <p className="error" role="alert">{error}</p>}
  </div>
}
