import { listCampaigns, listSessions, sessionFileName, uniqueNoteName } from "../core/campaigns"
import { sessionFromTableNotes } from "../core/table-notes"
import type { VaultIndex } from "../core/vault-index"
import type { SessionInput, SessionTargets } from "./shared/host-services"

/** As campanhas do cofre e o próximo número de sessão de cada uma (“Salvar Sessão” das notas da mesa). */
export function sessionTargets(index: VaultIndex | null, readOnly: boolean, today = new Date()): SessionTargets {
  const campaigns = index ? listCampaigns(index).map((campaign) => ({
    name: campaign.name,
    next: Math.max(0, ...listSessions(index, campaign, today).map((session) => session.number ?? 0)) + 1,
  })) : []
  return { campaigns, readOnly }
}

/** Cria a sessão em `<campanha>/Sessões/` pelo `createNote` do cofre; devolve a pasta, para o aviso. */
export async function saveTableSession(
  vault: { index: VaultIndex | null; readOnly: boolean; createNote(folder: string, name: string, text: string): Promise<string> },
  input: SessionInput,
): Promise<string> {
  if (vault.readOnly) throw new Error("Cofre em somente leitura: libere a gravação em Configurações.")
  const campaign = vault.index ? listCampaigns(vault.index).find((entry) => entry.name === input.campaign) : undefined
  if (!campaign || !vault.index) throw new Error("Campanha não encontrada no cofre.")
  const folder = `${campaign.root}Sessões`
  const name = uniqueNoteName(vault.index, folder, sessionFileName(input.number))
  await vault.createNote(folder, name, sessionFromTableNotes({ number: input.number, title: input.title, date: input.date, text: input.text }))
  return folder
}
