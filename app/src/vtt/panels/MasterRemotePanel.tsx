import { useEffect, useId, useRef, useState } from "react"
import QRCode from "qrcode"
import { Copy, RotateCw, Smartphone, Unplug } from "lucide-react"
import type { VttApi } from "../shared/ipc"
import { masterLink, type MasterState } from "../shared/master"

/** O mestre só precisa do motivo, sem o invólucro de erro do Electron. */
export function errorMessage(reason: unknown): string {
  const text = reason instanceof Error ? reason.message : String(reason)
  return text.replace(/^Error invoking remote method '[^']*':\s*/, "").replace(/^Error:\s*/, "")
}

/**
 * Administra a sessão pela VttApi do hospedeiro, sem gravar dados na tela. O pai monta este bloco só com a sala ligada
 * e a capacidade `master` disponível. Chave/link ausentes desabilitam o controle; consulta, erro e operação têm estados
 * próprios. Link e QR só existem após revelar e voltam a ficar ocultos quando a chave ou o endereço mudam.
 */
export function MasterRemotePanel({ api, roomUrl, android }: {
  api: NonNullable<VttApi["master"]>
  roomUrl: string | null
  android: boolean
}) {
  const id = useId()
  const [master, setMaster] = useState<MasterState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<"rotate" | "disconnect" | "copy" | null>(null)
  const [revealedLink, setRevealedLink] = useState("")
  const [qr, setQr] = useState<{ link: string; image: string } | null>(null)
  const [qrError, setQrError] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const mounted = useRef(false), request = useRef(0), inFlight = useRef(false)
  const revealButton = useRef<HTMLButtonElement>(null), input = useRef<HTMLInputElement>(null)
  const focusPending = useRef(false)
  const link = master?.key && roomUrl ? masterLink(roomUrl, master.key) : ""
  const shown = Boolean(link && revealedLink === link)

  async function load() {
    const current = ++request.current
    setLoading(true); setError("")
    try {
      const value = await api.state()
      if (mounted.current && current === request.current) setMaster(value)
    } catch (reason) {
      if (mounted.current && current === request.current) setError(errorMessage(reason))
    } finally {
      if (mounted.current && current === request.current) setLoading(false)
    }
  }

  useEffect(() => {
    mounted.current = true
    void load()
    const unsubscribe = api.onState((value) => {
      if (!mounted.current) return
      ++request.current // Um evento novo prevalece sobre uma consulta iniciada antes dele.
      setMaster(value); setLoading(false)
    })
    return () => { mounted.current = false; ++request.current; unsubscribe() }
  }, [api])

  useEffect(() => {
    let active = true
    setQr(null); setQrError(false)
    if (shown) void QRCode.toDataURL(link, { width: 220, margin: 1, errorCorrectionLevel: "M" })
      .then((image) => { if (active) setQr({ link, image }) })
      .catch(() => { if (active) setQrError(true) })
    return () => { active = false }
  }, [shown, link])

  useEffect(() => {
    if (focusPending.current && !loading && !busy && link) {
      focusPending.current = false
      revealButton.current?.focus()
    }
  }, [loading, busy, link])

  async function act(action: "rotate" | "disconnect") {
    if (inFlight.current) return
    inFlight.current = true; setBusy(action); setError(""); setNotice("")
    try {
      const value = await api[action]()
      if (mounted.current) {
        setMaster(value)
        if (action === "rotate") setRevealedLink("")
        setNotice(action === "rotate" ? "Chave trocada. O link anterior foi invalidado." : "Aparelho desconectado. O link continua válido para uma nova entrada.")
        focusPending.current = true
      }
    } catch (reason) {
      if (mounted.current) setError(errorMessage(reason))
    } finally {
      inFlight.current = false
      if (mounted.current) setBusy(null)
    }
  }

  async function copy() {
    if (inFlight.current) return
    inFlight.current = true; setBusy("copy"); setError(""); setNotice("")
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Cópia indisponível.")
      await navigator.clipboard.writeText(link)
      if (mounted.current) setNotice("Link do mestre copiado.")
    } catch {
      if (mounted.current) {
        setError("Não foi possível copiar. Selecione e copie o link no campo acima.")
        input.current?.focus(); input.current?.select()
      }
    } finally {
      inFlight.current = false
      if (mounted.current) setBusy(null)
    }
  }

  const status = loading ? "Consultando conexão…" : !master ? "Conexão não consultada" : !link ? "Controle indisponível" : master.connected ? "Aparelho conectado" : "Nenhum aparelho conectado"
  return <section className="player-link-card master-remote-card" data-master-remote aria-labelledby={`${id}-title`}>
    <div className="player-link-heading">
      <h3 id={`${id}-title`}>Controlar por outro aparelho</h3>
      <span role="status"><Smartphone size={14} aria-hidden="true" />{status}</span>
    </div>
    <p className="hint">{android
      ? "Abra este link no navegador de um tablet ou notebook na mesma rede Wi-Fi ou no ponto de acesso do celular. A mesa continua hospedada e gravada neste celular."
      : "Abra este link no navegador de outro aparelho, na mesma rede ou pelo link público. A mesa continua hospedada e gravada neste computador."}</p>
    <p className="hint" id={`${id}-warning`}><strong>Quem tem este link controla a mesa inteira. Não compartilhe com os jogadores.</strong> Um aparelho de mestre por vez.</p>
    <button ref={revealButton} type="button" className="ghost" disabled={loading || Boolean(busy) || !link} aria-expanded={shown} aria-controls={`${id}-link`} aria-describedby={`${id}-warning`} onClick={() => { setRevealedLink(shown ? "" : link); setNotice("") }}>
      <Smartphone size={15} aria-hidden="true" />{shown ? "Esconder link e QR" : "Mostrar link e QR do mestre"}
    </button>
    <div id={`${id}-link`} hidden={!shown} className="master-remote-link">
      {shown && <>
        <label className="field" htmlFor={`${id}-address`}><span>Link da mesa do mestre</span></label>
        <div className="player-link-row">
          <input ref={input} id={`${id}-address`} readOnly value={link} aria-describedby={`${id}-warning`} onFocus={(event) => event.currentTarget.select()} />
          <button type="button" className="ghost" disabled={Boolean(busy)} onClick={() => void copy()}><Copy size={15} aria-hidden="true" />{busy === "copy" ? "Copiando…" : "Copiar link"}</button>
        </div>
        {qr?.link === link ? <img className="player-qr" src={qr.image} alt="QR code do link da mesa do mestre; o mesmo endereço está no campo acima" />
          : <p className="hint" role="status">{qrError ? "Não foi possível gerar o QR. Use o link acima." : "Gerando QR…"}</p>}
      </>}
    </div>
    <div className="player-actions">
      <button type="button" className="ghost" disabled={loading || Boolean(busy) || !master?.connected} onClick={() => void act("disconnect")}><Unplug size={15} aria-hidden="true" />{busy === "disconnect" ? "Desconectando…" : "Desconectar"}</button>
      <button type="button" className="ghost" disabled={loading || Boolean(busy) || !link} onClick={() => void act("rotate")}><RotateCw size={15} aria-hidden="true" />{busy === "rotate" ? "Trocando chave…" : "Trocar chave"}</button>
    </div>
    <p className="hint">Desconectar encerra o controle atual. Trocar a chave também invalida o link anterior e esconde o novo link e QR.</p>
    <p className="hint" role="status">{notice}</p>
    {error && <div className="master-remote-error"><p className="error" role="alert">{error}</p>{!master && <button type="button" className="ghost" disabled={loading} onClick={() => { focusPending.current = true; void load() }}>Tentar novamente</button>}</div>}
  </section>
}
