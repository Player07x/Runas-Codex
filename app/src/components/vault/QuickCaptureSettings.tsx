import { useEffect, useState } from "react"
import { Keyboard, Trash2, Zap } from "lucide-react"
import { useVault } from "../../platform/VaultProvider"
import type { SystemShortcutStatus } from "../../platform/platform"
import { useToast } from "../ui"

function statusText(status: SystemShortcutStatus | null): string {
  if (!status) return "Conferindo o sistema…"
  if (!status.supported) return "O atalho do sistema só existe no GNOME e no KDE do Linux. Neste sistema, Ctrl Alt N funciona com o app aberto ou na bandeja."
  if (status.desktop === "gnome") {
    return status.registered
      ? "Criado: Ctrl Alt N chama o app com --captura, até com ele fechado. Para trocar a tecla, use Configurações do GNOME › Teclado › Atalhos personalizados."
      : "Cria em Configurações do GNOME › Teclado um atalho Ctrl Alt N que chama o app com --captura. Funciona até com o app fechado."
  }
  return status.registered
    ? "Criado: a ação “Captura rápida” está no Runas-Codex do menu de aplicativos. Escolha a tecla em Configurações do sistema › Atalhos › Runas-Codex."
    : "Acrescenta a ação “Captura rápida” ao Runas-Codex do menu de aplicativos. Depois, escolha a tecla em Configurações do sistema › Atalhos."
}

/**
 * Configurações › Editor e atalhos (T3, ADR 0029): a captura rápida e o botão do atalho do sistema. No Wayland o app
 * não ouve teclas fora da janela; o atalho do GNOME ou a ação do KDE chamam `runas-codex --captura`. Nada é criado sem
 * o clique.
 */
export function QuickCaptureSettings() {
  const vault = useVault()
  const toast = useToast()
  const shortcut = vault.platform.systemShortcut
  const [status, setStatus] = useState<SystemShortcutStatus | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    shortcut?.status().then(setStatus, () => setStatus({ supported: false, registered: false, desktop: null }))
  }, [shortcut])
  if (!shortcut) return null

  const change = (create: boolean) => {
    setBusy(true)
    ;(create ? shortcut.create() : shortcut.remove())
      .then((next) => {
        setStatus(next)
        toast(create ? (next.desktop === "kde" ? "Ação criada. Escolha a tecla nas Configurações do sistema." : "Atalho Ctrl Alt N criado no sistema.") : "Atalho do sistema removido.")
      })
      .catch((error: unknown) => toast(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(false))
  }

  return (
    <section className="card quick-capture-settings">
      <span className="section-title row settings-card-head"><Zap size={16} /> Captura rápida</span>
      <p className="tiny faint">
        <kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>N</kbd> abre uma nota nova em Notas mesmo com o app em segundo plano. No Linux
        com Wayland o sistema não deixa o app ouvir as teclas fora da janela: crie um atalho do sistema.
      </p>
      <div className="setting-row">
        <div>
          <span className="small" style={{ fontWeight: 650 }}>Atalho do sistema{status?.desktop ? ` (${status.desktop === "gnome" ? "GNOME" : "KDE"})` : ""}</span>
          <span className="tiny faint" aria-live="polite">{statusText(status)}</span>
        </div>
        {status?.supported && (
          status.registered ? (
            <button className="btn sm ghost" disabled={busy} onClick={() => change(false)}><Trash2 size={14} /> Remover</button>
          ) : (
            <button className="btn sm" disabled={busy} onClick={() => change(true)}><Keyboard size={14} /> Criar atalho</button>
          )
        )}
      </div>
    </section>
  )
}
