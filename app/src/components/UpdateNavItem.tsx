import { Download } from "lucide-react"
import { useEffect } from "react"
import { useVault } from "../platform/VaultProvider"
import { installedMessage, progressPercent, updates, useUpdates } from "../lib/updates"
import { useToast } from "./ui"
import "./update-nav.css"

/**
 * “Atualizar para 1.x” (U90, ADR 0038), no fim da barra lateral e no “Mais” do celular. Aparece só quando a consulta
 * (a de hoje ou a de Configurações) achou versão nova com instalador conferível; um clique grava as notas, baixa,
 * confere o SHA-256 e instala, com o progresso no próprio item. A barra lateral também dispara a consulta diária.
 */
export function UpdateNavItem() {
  const platform = useVault().platform
  const toast = useToast()
  const state = useUpdates()
  useEffect(() => updates().start(platform), [platform])
  if (!platform.installUpdate || !state.available) return null
  const busy = state.phase !== "parado"
  const percent = progressPercent(state.progress)
  const label =
    state.phase === "baixando"
      ? percent === 100 ? "Instalando…" : percent !== null ? `Baixando ${percent} %` : "Baixando…"
      : state.phase === "verificando" ? "Conferindo a versão…" : `Atualizar para ${state.available}`
  const description = state.phase === "baixando" ? `${label} a versão ${state.available}` : busy ? label : `Atualizar para a versão ${state.available}: baixa, confere e instala`
  const run = () => {
    if (busy) return
    updates().install(platform).then(
      (result) => result && toast(installedMessage(result)),
      (reason: unknown) => toast(reason instanceof Error ? reason.message : String(reason)),
    )
  }
  return (
    <button type="button" className={`nav-link update-link${busy ? " busy" : ""}`} onClick={run} aria-disabled={busy || undefined} aria-label={description} title={state.error || description} data-update-item>
      <Download size={18} aria-hidden="true" />
      <span>{label}</span>
      {state.phase === "baixando" && <progress className="update-progress" max={100} value={percent ?? undefined} aria-hidden="true" />}
    </button>
  )
}

/** Ponto no botão “Mais” do celular, para o aviso não ficar escondido dentro do menu. */
export function UpdateBadge() {
  const platform = useVault().platform
  const state = useUpdates()
  if (!platform.installUpdate || !state.available) return null
  return (
    <>
      <i className="update-dot" aria-hidden="true" />
      <span className="sr-only">, atualização disponível</span>
    </>
  )
}
