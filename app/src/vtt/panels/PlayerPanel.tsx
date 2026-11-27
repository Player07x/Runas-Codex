import { DEFAULT_CAMERA_RULES, ZOOM_OUT_LIMITS } from "../shared/player-camera"
import { FOLLOW_TOKENS_SCENE } from "../shared/player"
import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import { Activity, ExternalLink, KeyRound, Minus, MonitorPlay, Plus, Radio, RefreshCw, RotateCw, Square, Target, Trash2, Users, Wifi } from "lucide-react"
import type { LinkTestResult, PlayerState } from "../shared/ipc"
import { MasterRemotePanel, errorMessage } from "./MasterRemotePanel"
import type { DocumentStore } from "../document-store"
import { useDocumentsVersion } from "../document-store"
import { isAndroidRoom, remoteMaster, vtt } from "../api"
import { MAX_PLAYER_SEATS } from "../shared/player-session"
import { linkTestMessage } from "../shared/link-test"
import { DEFAULT_ROOM_SETTINGS, ROOM_SETTINGS_ID, normalizeRoomSettings, sameRoomSettings, sceneForRoom, settingsFromState, type RoomSettings } from "../shared/room-settings"
import { RoomSettingsBar } from "./RoomSettingsBar"

/** 1.9: as últimas configurações usadas em qualquer mesa deste aparelho (uma mesa nova começa com elas). */
const LAST_ROOM_KEY = "runas-codex:sala-ultima"

function readLastRoom(): RoomSettings {
  try { return normalizeRoomSettings(JSON.parse(localStorage.getItem(LAST_ROOM_KEY) ?? "null")) } catch { return { ...DEFAULT_ROOM_SETTINGS } }
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
  // 1.9: a mesa guarda as configurações da última sessão (documento `sala`); sem ele, as últimas deste aparelho.
  const savedDocument = store.get(ROOM_SETTINGS_ID)
  const saved = savedDocument?.type === "room-settings" ? normalizeRoomSettings(savedDocument.data) : readLastRoom()
  const savedRef = useRef(saved)
  // Enquanto a sala liga e recebe a configuração guardada, o estado intermediário não é gravado por cima dela.
  const applying = useRef(false)
  savedRef.current = saved
  function persist(settings: RoomSettings) {
    try { localStorage.setItem(LAST_ROOM_KEY, JSON.stringify(settings)) } catch { /* preferência opcional */ }
    if (savedDocument?.type === "room-settings" && sameRoomSettings(saved, settings)) return
    void store.put({ id: ROOM_SETTINGS_ID, type: "room-settings", parentId: null, data: settings }).catch((reason: unknown) => setError(errorMessage(reason)))
  }
  /** Aplica na sala ligada o que dá para mudar com ela aberta (porta e jogadores valem ao ligar). */
  async function applyLive(settings: RoomSettings) {
    await vtt.player.setScene(sceneForRoom(settings, store.scenes().map((scene) => scene.id)))
    await vtt.player.setMoves(settings.moves)
    await vtt.player.setAudio(settings.audio)
    await vtt.player.setBars(settings.bars)
    await vtt.player.setCamera(settings.camera)
    await vtt.player.setShareRuler(settings.shareRuler)
  }

  useEffect(() => {
    let mounted = true
    void vtt.player.state().then((value) => {
      if (!mounted) return
      setState(value)
      // Desligada, a sala começa como na última sessão desta mesa.
      setPort(String(value.enabled ? value.port : savedRef.current.port))
      if (!value.enabled) setSeatCount(String(savedRef.current.seats))
    }).catch((reason) => { if (mounted) setError(errorMessage(reason)) })
    const unsubscribe = vtt.player.onState((value) => {
      if (!mounted) return
      setState((previous) => previous && value.sessionId === previous.sessionId
        ? { ...value, seats: value.seats.map((seat) => ({ ...seat, code: seat.code ?? previous.seats.find((candidate) => candidate.slotId === seat.slotId)?.code })) }
        : value)
    })
    return () => { mounted = false; unsubscribe() }
  }, [])

  // Com a sala ligada, cada mudança vira a configuração guardada da mesa.
  useEffect(() => {
    if (state?.enabled && state.sessionId && !applying.current) persist(settingsFromState(state, savedRef.current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

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
  const camera = state?.camera ?? DEFAULT_CAMERA_RULES
  const link = state?.publicUrl ?? state?.localUrl ?? ""
  const listenPort = state?.port ?? 30000
  const lanHint = isAndroidRoom
    ? "Todos devem estar na mesma rede Wi-Fi ou no ponto de acesso do celular. A notificação mantém a sala aberta e permite encerrá-la. Ao trocar de rede, desligue e ligue a transmissão para gerar o link atualizado."
    : platform === "linux"
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

    {remoteMaster && <p className="hint">Você está controlando a mesa pelo navegador. Ligar, desligar e compartilhar a sala ficam no aparelho que a hospeda.</p>}
    {!remoteMaster && <div className="player-controls">
      <label className="field"><span>Porta local</span><input inputMode="numeric" value={port} disabled={Boolean(state?.enabled) || busy} onChange={(event) => setPort(event.target.value.replace(/\D/g, "").slice(0, 5))} /></label>
      <label className="field"><span>Jogadores</span><input inputMode="numeric" min="1" max="12" value={seatCount} disabled={Boolean(state?.enabled) || busy} onChange={(event) => setSeatCount(event.target.value.replace(/\D/g, "").slice(0, 2))} /></label>
      {!state?.enabled
        ? <button className="primary" disabled={busy || !port || !seatCount} onClick={() => void run(async () => { applying.current = true; try { const next = await vtt.player.start(Number(port), Number(seatCount)); await applyLive(saved); setState(await vtt.player.state().catch(() => next)) } finally { applying.current = false } })}><Wifi size={15} /> Ligar transmissão</button>
        : <button className="ghost danger" disabled={busy} onClick={() => void run(() => vtt.player.stop())}><Square size={14} /> Desligar</button>}
    </div>}
    {!state?.enabled && saved.publicLink && !remoteMaster && <p className="hint">Na última sessão desta mesa você usou o link público. Depois de ligar a transmissão, gere o link de novo (ele muda a cada vez e pede sua confirmação).</p>}
    <RoomSettingsBar current={state?.enabled ? settingsFromState(state, saved) : { ...saved, port: Number(port) || saved.port, seats: Number(seatCount) || saved.seats }} onApply={async (settings) => {
      setPort(String(state?.enabled ? state.port : settings.port))
      if (!state?.enabled) { setSeatCount(String(settings.seats)); persist(settings); return }
      await applyLive(settings)
    }} />

    {state?.enabled && <>
      <div className="player-link-card">
        <div className="player-link-heading"><strong>Link para os jogadores</strong><span><Users size={14} /> {state.players} jogadores · {state.spectators} {state.spectators === 1 ? "espectador" : "espectadores"}</span></div>
        <div className="player-link-row"><input readOnly value={link} aria-label="Link da sala" /><button className="ghost small" onClick={() => { void navigator.clipboard?.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }}>{copied ? "Copiado" : "Copiar"}</button></div>
        {qr && <img className="player-qr" src={qr} alt="QR code do link para os jogadores" />}
        <small className="hint">{state.publicUrl ? "Link público pela internet: qualquer pessoa com ele assiste à cena. Desligue a transmissão para encerrá-lo." : lanHint}</small>
        {state.publicUrl && state.tunnel && <small className="hint">Túnel conectado{state.tunnel.location ? ` via ${state.tunnel.location.toUpperCase()}` : ""}{state.tunnel.protocol ? ` (${state.tunnel.protocol})` : ""}.</small>}
        {state.tunnelLost && <p className="error" role="alert">{state.drop?.kind === "tunnel" && state.drop.status === "reconnecting" ? "O link público caiu. O app está abrindo outro túnel; o endereço muda e os jogadores precisam do novo." : "O link público caiu e não foi reaberto. Gere um novo link; o endereço muda a cada vez e os jogadores precisam do novo."}</p>}
      </div>
      <div className="player-seats">
        <div className="player-link-heading"><strong>Assentos da sessão</strong><span><KeyRound size={14} /> {state.seats.length} {state.seats.length === 1 ? "jogador" : "jogadores"}</span></div>
        <p className="hint">Entregue um código a cada jogador. Regenerar invalida o código anterior; limpar desconecta quem está no assento. Dá para acrescentar ou tirar assentos com a sala aberta; eles saem do fim da lista.</p>
        <div className="table-scroll"><table><thead><tr><th>Assento</th><th>Código</th><th>Estado</th><th>Ações</th></tr></thead><tbody>{state.seats.map((seat) => <tr key={seat.slotId}><td>{seat.label}</td><td><code>{seat.code ?? "••••••••"}</code>{seat.code && <button className="ghost small" aria-label={`Copiar código de ${seat.label}`} onClick={() => { void navigator.clipboard?.writeText(seat.code ?? "") }}>Copiar</button>}</td><td>{seat.status === "attached" ? "Ficha anexada" : seat.status === "connected" ? "Conectado" : "Disponível"}{(seat.tokens ?? 0) > 1 && <small className="seat-duplicate" role="note"> · controla {seat.tokens} tokens: confira o “Controlado por”</small>}</td><td><button className="ghost small" disabled={busy} onClick={() => void run(async () => { const next = await vtt.player.rotateSeatCode(seat.slotId); setState(next) })}><RotateCw size={13} /> Regenerar</button><button className="ghost small danger" disabled={busy || (!seat.tokenId && seat.status === "available")} onClick={() => { if (window.confirm(`Limpar a ficha de ${seat.label}?`)) void run(async () => { const next = await vtt.player.clearSeat(seat.slotId); setState(next) }) }}><Trash2 size={13} /> Limpar</button></td></tr>)}</tbody></table></div>
        <div className="player-seats-actions">
          <button className="ghost small" disabled={busy || state.seats.length >= MAX_PLAYER_SEATS} onClick={() => void run(async () => { const next = await vtt.player.addSeat(); setState(next) })}><Plus size={13} /> Assento</button>
          <button className="ghost small danger" disabled={busy || state.seats.length <= 1} onClick={() => {
            const last = state.seats.at(-1)
            if (!last) return
            // Decisão 8: assento ocupado pede confirmação e desconecta só aquele jogador.
            const busySeat = last.status !== "available" || Boolean(last.tokenId)
            if (busySeat && !window.confirm(`Remover ${last.label}? Quem está nesse assento é desconectado; os outros jogadores continuam.`)) return
            void run(async () => { const next = await vtt.player.removeSeat(); setState(next) })
          }}><Minus size={13} /> Remover {state.seats.at(-1)?.label ?? "assento"}</button>
          {state.seats.length >= MAX_PLAYER_SEATS && <small className="hint">A sala aceita até {MAX_PLAYER_SEATS} jogadores.</small>}
        </div>
      </div>
      {!remoteMaster && vtt.master && <MasterRemotePanel api={vtt.master} roomUrl={state.publicUrl ?? state.localUrl} android={isAndroidRoom} />}
      {!remoteMaster && <div className="player-actions">{!isAndroidRoom && <button className="ghost" onClick={() => void run(() => vtt.player.openWindow())}><MonitorPlay size={15} /> Abrir janela local</button>}<button className="ghost" disabled={busy} onClick={() => { if (window.confirm(isAndroidRoom ? "Abrir um túnel público pela Cloudflare? Quem tiver o link assiste à cena pela internet até você desligar a transmissão." : "Baixar o cloudflared do release oficial da Cloudflare, verificar o SHA-256 e abrir um túnel público?")) void run(async () => { setTunneling(true); try { await vtt.player.publicLink() } finally { setTunneling(false) } }) }}><ExternalLink size={15} /> {tunneling ? "Conectando à Cloudflare…" : state.publicUrl ? "Gerar novo link público" : "Gerar link público"}</button>{state.publicUrl && <button className="ghost" disabled={busy || testing} onClick={() => { setTesting(true); setLinkTest(null); void vtt.player.testPublicLink().then(setLinkTest).catch((reason) => setLinkTest({ ok: false, ms: 0, error: reason instanceof Error ? reason.message : String(reason) })).finally(() => setTesting(false)) }}><Activity size={15} /> {testing ? "Testando…" : "Testar link"}</button>}</div>}
      {linkTest && <p className={linkTest.ok ? "hint" : "error"} role="status">{linkTestMessage(linkTest)}</p>}
      {tunneling && <p className="hint" role="status">Conectando à Cloudflare. Leva alguns segundos e, se a rede bloquear a porta 7844, o app desiste em até 60 s e explica o motivo.</p>}
        {isAndroidRoom
          ? <p className="hint">O link público usa um túnel Cloudflare Quick Tunnel, que já vem no app e só abre quando você confirma. Ele usa a internet do celular (Wi-Fi ou dados móveis) enquanto a sala estiver aberta, inclusive com a tela apagada; encerrar o aplicativo encerra a sala e o link.</p>
          : <p className="hint">O link público usa um túnel Cloudflare Quick Tunnel opcional e só é iniciado após sua confirmação.</p>}
      <div className="player-config">
        <label className="field"><span>Cena transmitida</span><select value={state.sceneId ?? ""} onChange={(event) => void run(() => vtt.player.setScene(event.target.value || null))}><option value="">Cena aberta pelo mestre</option><option value={FOLLOW_TOKENS_SCENE}>Cena do token de cada jogador</option>{scenes.map((scene) => <option key={scene.id} value={scene.id}>{scene.data.name}</option>)}</select></label>
        {state.sceneId === FOLLOW_TOKENS_SCENE && <small className="hint">Cada jogador vê a cena onde está o token dele (com tokens em mais de uma cena, a do último que mudou). Quem não tem token na mesa vê a cena aberta por você.</small>}
        <button className="ghost" onClick={() => void run(() => vtt.player.pullCamera())}><Target size={15} /> Puxar a câmera para o ponto do mestre</button>
        <small className="hint">Cada jogador move a própria câmera. Mover a sua não mexe na deles; este botão leva todos ao que você está vendo agora.</small>
        <div className="player-camera" role="group" aria-labelledby="player-camera-title">
          <strong id="player-camera-title">Câmera dos jogadores</strong>
          <label className="check"><input type="checkbox" checked={camera.lockToToken} onChange={(event) => void run(() => vtt.player.setCamera({ ...camera, lockToToken: event.target.checked }))} /> Câmera sempre no token (quem tem token na cena não arrasta o mapa)</label>
          {camera.lockToToken && <label className="field"><span>Afastamento máximo: {camera.maxZoomOut} vezes o tamanho do token</span><input type="range" min={ZOOM_OUT_LIMITS.min} max={ZOOM_OUT_LIMITS.max} step={1} value={camera.maxZoomOut} onChange={(event) => void run(() => vtt.player.setCamera({ ...camera, maxZoomOut: Number(event.target.value) }))} /></label>}
          <small className="hint">Ao entrar numa cena, cada jogador começa perto do próprio token. Todos os tokens revelados continuam aparecendo; a trava só evita passear pelo mapa sem mover o token. Com ela ligada, “Puxar a câmera” só move quem não tem token na cena.</small>
        </div>
        <label className="check"><input type="checkbox" checked={state.moves} onChange={(event) => void run(() => vtt.player.setMoves(event.target.checked))} /> Jogadores podem mover os tokens marcados como Jogador</label>
        <label className="check"><input type="checkbox" checked={state.shareRuler ?? true} onChange={(event) => void run(() => vtt.player.setShareRuler(event.target.checked))} /> Mostrar a minha régua a jogadores e espectadores</label>
        <label className="check"><input type="checkbox" checked={state.audio} onChange={(event) => void run(() => vtt.player.setAudio(event.target.checked))} /> Tocar o áudio também para os jogadores</label>
        <label className="field"><span>Mostrar barras aos jogadores</span><select value={state.bars} onChange={(event) => void run(() => vtt.player.setBars(event.target.value as PlayerState["bars"]))}><option value="friendly">Só em Jogador e Aliado</option><option value="all">Todos os tokens</option><option value="none">Nenhuma</option></select></label>
      </div>
    </>}
    {!state?.enabled && <div className="player-offline"><RefreshCw size={16} /><span>Ligue a transmissão quando quiser compartilhar a cena. A chave de acesso muda a cada sessão.</span></div>}
    {error && <button className="scene-error" onClick={() => setError("")} role="alert">{error} ✕</button>}
    {sceneId && state?.enabled && state.sceneId !== FOLLOW_TOKENS_SCENE && <small className="hint">A cena aberta atualmente é usada por padrão; você pode fixar outra acima.</small>}
  </section>
}
