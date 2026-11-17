import { useEffect, useState } from "react"
import { KEEP_STEP, writeFailure } from "../../core/write-failure"
import { writeSystem } from "../../lib/unsaved-drafts-store"
import { navigate } from "../../lib/router"
import { useVault } from "../../platform/VaultProvider"
import type { WriteCheck } from "../../platform/platform"
import { Notice } from "../kit/Layout"
import { useToast } from "../ui"

const STEP_TEXT = { criar: "criar um arquivo", trocar: "trocar um arquivo pelo novo (como cada gravação faz)", apagar: "apagar o arquivo de teste" }

/** Configurações › Cofre: “Testar gravação” (U91) grava, troca e apaga um arquivo de teste e diz o que falhou. */
export function WriteCheckPanel() {
  const vault = useVault()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<WriteCheck | null>(null)
  const check = vault.platform.checkWrite
  const available = Boolean(check && vault.info && !vault.info.readOnly)
  const run = async () => {
    if (!check) return
    setBusy(true)
    try { setResult(await check()) } catch (error) { setResult({ ok: false, step: "criar", message: error instanceof Error ? error.message : String(error) }) } finally { setBusy(false) }
  }
  const failure = result && !result.ok ? writeFailure(result.message, writeSystem(vault.platform.kind)) : null
  return <>
    <div className="setting-row">
      <div>
        <span className="small" style={{ fontWeight: 650 }}>Testar gravação</span>
        <span className="tiny faint">{!check ? "Ainda não disponível neste sistema." : vault.info?.readOnly ? "Libere a gravação para testar." : "Grava, troca e apaga um arquivo de teste no cofre, como cada gravação faz. Nada fica na pasta."}</span>
      </div>
      <button className="btn sm" onClick={() => void run()} disabled={!available || busy} aria-busy={busy}>{busy ? "Testando…" : "Testar gravação"}</button>
    </div>
    {result?.ok && <Notice tone="ok" title="A gravação funciona nesta pasta." />}
    {result && !result.ok && failure && <Notice tone="danger" title={failure.title} actions={failure.windowsProtection && vault.platform.openSecuritySettings ? <button className="btn sm" onClick={() => void vault.platform.openSecuritySettings!()}>Abrir a proteção do Windows</button> : undefined}>
      <span className="write-failure-steps" role="list">
        <span role="listitem">O sistema não deixou {STEP_TEXT[result.step]}.</span>
        {failure.steps.filter((step) => step !== KEEP_STEP).map((step, i) => <span key={i} role="listitem">{step}</span>)}
      </span>
      <small className="write-failure-detail">Mensagem do sistema: {result.message}</small>
    </Notice>}
  </>
}

/** Ao abrir um cofre com gravação liberada, testa a pasta uma vez e avisa se a segurança do sistema barra (U91). */
export function WriteCheckRuntime() {
  const vault = useVault()
  const toast = useToast()
  const path = vault.info?.path
  const writable = Boolean(vault.info && !vault.info.readOnly)
  useEffect(() => {
    const check = vault.platform.checkWrite
    if (!path || !writable || !check) return
    let live = true
    check().then((result) => {
      if (!live || result.ok) return
      const failure = writeFailure(result.message, writeSystem(vault.platform.kind))
      toast(`${failure.title}: as notas deste cofre podem não ser gravadas.`, { label: "Ver o que fazer", run: () => navigate("/config/cofre") })
    }, () => undefined)
    return () => { live = false }
  }, [path, writable])
  return null
}
