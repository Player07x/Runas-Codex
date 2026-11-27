import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Copy, Download, ExternalLink, MessageSquareWarning } from "lucide-react"
import { buildReport, issueUrl, reportRoute, reportTitle } from "../core/error-report"
import { closeReport, installErrorLog, openReport, reportOpen, sessionErrors, subscribeErrorLog } from "../lib/error-log"
import { useOptionalVault } from "../platform/VaultProvider"
import { Modal, useToast } from "./ui"

const SYSTEMS: Record<string, string> = { electron: "Computador", capacitor: "Android", memory: "Navegador (prévia)" }

function systemName(kind: string | undefined): string {
  const agent = navigator.userAgent
  const os = /Windows/i.test(agent) ? "Windows" : /Android/i.test(agent) ? "Android" : /Linux/i.test(agent) ? "Linux" : /Mac/i.test(agent) ? "macOS" : "outro"
  return `${SYSTEMS[kind ?? ""] ?? "App"} · ${os}`
}

/** Botão que abre o relatório; vai na Ajuda e em Configurações. */
export function ReportButton({ className = "btn sm" }: { className?: string }) {
  return <button type="button" className={className} onClick={openReport}><MessageSquareWarning size={15} aria-hidden="true" /> Enviar relatório…</button>
}

/**
 * Enviar relatório (1.9, ADR 0039): escuta os erros da sessão, avisa quando algo dá errado (com o atalho para o
 * relatório) e mostra a janela do relatório. Nada sai do aparelho sem a pessoa ver o texto e escolher para onde vai.
 */
export function ErrorReportRuntime() {
  const open = useSyncExternalStore(subscribeErrorLog, reportOpen)
  const count = useSyncExternalStore(subscribeErrorLog, () => sessionErrors().length)
  const toast = useToast()
  const shown = useRef(0)
  useEffect(() => { installErrorLog() }, [])
  // Um aviso por erro novo (no máximo um a cada 20 s), com o caminho para o relatório.
  useEffect(() => {
    if (!count || Date.now() - shown.current < 20_000) return
    shown.current = Date.now()
    toast("Algo deu errado no app.", { label: "Enviar relatório", run: openReport })
  }, [count, toast])
  return open ? <ReportDialog onClose={closeReport} /> : null
}

function ReportDialog({ onClose }: { onClose: () => void }) {
  const vault = useOptionalVault()
  const platform = vault?.platform
  const [version, setVersion] = useState("versão desconhecida")
  const [description, setDescription] = useState("")
  const errors = sessionErrors()
  const context = { version, system: systemName(platform?.kind), screen: `${window.screen.width}×${window.screen.height} (janela ${window.innerWidth}×${window.innerHeight})`, route: reportRoute(location.hash), errors }
  const generated = buildReport(context, description, vault?.info?.path)
  // O texto é da pessoa: depois de mexer nele, não é mais gerado de novo.
  const [edited, setEdited] = useState<string | null>(null)
  const body = edited ?? generated
  const [status, setStatus] = useState("")
  useEffect(() => { void platform?.appVersion?.().then((value) => setVersion(value || "versão desconhecida")).catch(() => undefined) }, [platform])
  const link = issueUrl(reportTitle(description, errors, vault?.info?.path), body)

  async function copy() {
    try { await navigator.clipboard.writeText(body); setStatus("Relatório copiado. Cole onde quiser mandar.") } catch { setStatus("Não deu para copiar: selecione o texto do relatório e copie à mão.") }
  }

  return <Modal title="Enviar relatório" onClose={onClose} wide footer={<>
    <button type="button" className="btn" onClick={() => void copy()}><Copy size={15} aria-hidden="true" /> Copiar</button>
    {platform && <button type="button" className="btn" onClick={() => void platform.saveFile("relatorio-runas-codex.md", body, "text/markdown").then((saved) => { if (saved) setStatus(`Salvo em ${saved}.`) }, (reason: unknown) => setStatus(reason instanceof Error ? reason.message : String(reason)))}><Download size={15} aria-hidden="true" /> Salvar como arquivo</button>}
    <a className="btn primary" href={link.url} target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden="true" /> Enviar pelo GitHub</a>
  </>}>
    <div className="report-dialog">
      <p className="small muted">Nada é enviado sozinho. Confira o texto abaixo: “Enviar pelo GitHub” abre no navegador a página de novo problema do Runas-Codex já preenchida, e você envia por lá (precisa de uma conta no GitHub). Sem conta, use Copiar ou Salvar como arquivo e mande por onde preferir.</p>
      <label className="field"><span>O que aconteceu?</span>
        <textarea className="input" rows={3} value={description} placeholder="O que você fazia, o que esperava e o que aconteceu." onChange={(event) => { setDescription(event.target.value); setEdited(null) }} />
      </label>
      <label className="field"><span>Relatório ({errors.length} {errors.length === 1 ? "erro" : "erros"} desta sessão) — dá para editar</span>
        <textarea className="input mono report-text" rows={12} value={body} onChange={(event) => setEdited(event.target.value)} />
      </label>
      <p className="small muted">Vão a versão do app, o sistema, o tamanho da tela, a tela aberta e os últimos erros desde que o app abriu. Não vão notas nem a pasta do cofre (vira &lt;cofre&gt;); nomes de notas citados nos erros viram &lt;nota&gt;, e da tela aberta vai só o módulo (Notas, Wiki…).{link.truncated ? " O relatório é longo: no GitHub ele chega cortado; o texto inteiro está em Copiar." : ""}</p>
      {status && <p className="small" role="status">{status}</p>}
    </div>
  </Modal>
}
