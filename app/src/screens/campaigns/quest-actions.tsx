import { useState } from "react"
import type { QuestInfo, QuestStatus } from "../../core/campaigns"
import { withTreasureItem } from "../../core/campaign-tools"
import { buildQuestMap, questNoticeBoard } from "../../core/quest-map"
import { ClockDial, Modal, useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import { vtt } from "../../vtt/api"
import type { CampaignData } from "./campaign-state"
import { TREASURY_TOOL, updateToolBlock } from "./tool-notes"

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err))

/**
 * Muda a situação da missão (no ⋯, no arrastar entre colunas e no painel da missão). Concluir uma missão com
 * recompensa oferece, no aviso, mandá-la para o Tesouro do grupo (ideia da revisão das Campanhas); o tesouro é criado
 * se ainda não existe.
 */
export function useQuestStatus(data: CampaignData) {
  const vault = useVault()
  const toast = useToast()
  const sendReward = async (quest: QuestInfo) => {
    try {
      const from = `${data.campaign.root}Ferramentas/${TREASURY_TOOL.title}.md`
      const notes = `Recompensa de [[${vault.index!.linkTarget(quest.path, from)}]]`
      await updateToolBlock(vault, data.campaign.root, TREASURY_TOOL, (content) => withTreasureItem(content, { name: quest.reward!, quantity: 1, holder: "", notes }, crypto.randomUUID()), true)
      toast(`“${quest.reward}” está no Tesouro do grupo.`)
    } catch (err) {
      toast(errorText(err))
    }
  }
  return async (quest: QuestInfo, status: QuestStatus): Promise<boolean> => {
    if (quest.status === status) return true
    if (data.readOnly) {
      toast("Cofre em somente leitura: libere a gravação em Configurações.")
      return false
    }
    try {
      await vault.setProperty(quest.path, "status", status)
    } catch (err) {
      toast(errorText(err))
      return false
    }
    if (status === "concluida" && quest.reward) toast(`“${quest.title}” concluída.`, { label: "Mandar a recompensa para o Tesouro", run: () => sendReward(quest) })
    return true
  }
}

/** O relógio da missão no cartão (o primeiro de ameaça, senão o primeiro), para ver o perigo sem abrir a nota. */
export function QuestClockChip({ quest }: { quest: QuestInfo }) {
  const clock = quest.clocks?.find((c) => c.kind === "ameaca") ?? quest.clocks?.[0]
  if (!clock) return null
  return (
    <span className="campaign-quest-clock tiny" title={`${clock.name}: ${clock.filled} de ${clock.segments}`}>
      <ClockDial segments={clock.segments} filled={clock.filled} color={clock.kind === "ameaca" ? "var(--red)" : "var(--green)"} size={16} />
      <span className="truncate">{clock.name} {clock.filled}/{clock.segments}</span>
    </span>
  )
}

/**
 * Mapa de missões na sala (ideia da revisão das Campanhas): apresenta aos jogadores, como os artigos da Wiki, só as
 * missões que eles conhecem. O mestre confere e pode editar o texto antes.
 */
export function ShowQuestsInRoom({ data, onClose }: { data: CampaignData; onClose(): void }) {
  const [text, setText] = useState(() => questNoticeBoard(buildQuestMap(data.quests), data.campaign.name))
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const present = async () => {
    setBusy(true)
    setMessage("")
    try {
      if (!vtt.collaboration) throw new Error("Esta versão da sala não permite apresentar aos jogadores.")
      const room = await vtt.player.state()
      if (!room.enabled) throw new Error("Abra uma mesa e inicie a sala do VTT para apresentar o quadro.")
      await vtt.collaboration.command({ type: "handout", handout: { title: `Quadro de missões — ${data.campaign.name}`, text } })
      setMessage("Quadro de missões apresentado a todos na sala.")
    } catch (err) {
      setMessage(errorText(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Mostrar as missões pela sala" onClose={() => !busy && onClose()} wide footer={
      <>
        <button className="btn" disabled={busy} onClick={onClose}>Fechar</button>
        <button className="btn" disabled={busy || data.readOnly || !vtt.collaboration} onClick={() => void vtt.collaboration!.command({ type: "handout", handout: null }).then(() => setMessage("Apresentação encerrada."), (err: unknown) => setMessage(errorText(err)))}>Encerrar apresentação</button>
        <button className="btn primary" disabled={busy || data.readOnly || !text.trim()} onClick={() => void present()}>Apresentar na sala</button>
      </>
    }>
      <p className="small">Entram só as missões que os jogadores conhecem: sem as ideias e sem as que ainda esperam outra missão. Confira o texto antes de apresentar.</p>
      <label className="field">
        <span>Texto para os jogadores</span>
        <textarea className="textarea" rows={14} maxLength={50000} value={text} onChange={(e) => setText(e.target.value)} aria-label="Texto para os jogadores" />
      </label>
      <div role="status" className="small">{message}</div>
    </Modal>
  )
}
