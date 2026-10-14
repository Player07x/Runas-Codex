import type { SessionInfo } from "../../core/campaigns"
import { useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import type { CampaignData } from "./campaign-state"

/** Ações na nota da campanha (sempre pelo `useVault()`, com a versão lida). */
export function useCampaignEdits(data: CampaignData) {
  const vault = useVault()
  const toast = useToast()
  const guard = () => {
    if (data.readOnly) {
      toast("Cofre em somente leitura: libere a gravação em Configurações.")
      return false
    }
    if (!data.campaign.home) {
      toast(`Falta a nota ${data.campaign.root}${data.campaign.name}.md da campanha.`)
      return false
    }
    return true
  }
  const run = async (action: () => Promise<void>) => {
    try {
      await action()
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err))
    }
  }
  return {
    editHome: (change: (text: string) => string) => {
      if (guard()) void run(() => vault.save(data.campaign.home!, change(vault.index!.note(data.campaign.home!)!.text)))
    },
    setHome: (key: string, value: string[] | string | undefined) => {
      if (guard()) void run(() => vault.setProperty(data.campaign.home!, key, value))
    },
  }
}

/** Sessão em que um segredo revelado agora fica registrado: a de hoje ou a última jogada. */
export function revealSession(data: CampaignData): SessionInfo | undefined {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const played = data.sessions.filter((s) => s.date && s.date <= today && s.status !== "cancelada")
  return played[played.length - 1] ?? data.upcoming
}
