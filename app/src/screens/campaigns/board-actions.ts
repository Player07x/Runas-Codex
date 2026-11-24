import { npcAttitude, resolveTarget, reputationOf } from "../../core/campaigns"
import { averageReputation, formatReputation, resolveReputation } from "../../core/reputation"
import type { VaultIndex } from "../../core/vault-index"
import { canvasToSave, emptyCanvasText, parseCanvas, type CanvasDoc } from "../../core/canvas"
import type { RelationMember } from "../../core/relation-map"
import { noteName } from "../../core/text"
import type { VaultState } from "../../platform/VaultProvider"
import type { CampaignData } from "./campaign-state"

export const RELATION_MAP_FILE = "Mapa de relações.canvas"

/**
 * Cria ou atualiza um `.canvas` gerado (mapa de missões, mapa de relações): lê o arquivo atual, deixa o gerador
 * mesclar com o que o mestre acrescentou e grava com a versão lida.
 */
export async function writeGeneratedCanvas(vault: VaultState, file: string, build: (existing?: CanvasDoc) => CanvasDoc): Promise<void> {
  const current = vault.index!.hasFile(file) ? (await vault.platform.readTexts([file]))[file] ?? null : null
  const parsed = current ? parseCanvas(current) : null
  if (parsed && "error" in parsed) throw new Error(`O quadro ${noteName(file)} tem um erro: ${parsed.error}`)
  const doc = build(parsed?.doc)
  if (!current) {
    await vault.createFile(file, canvasToSave(emptyCanvasText(), doc) ?? emptyCanvasText())
    return
  }
  const text = canvasToSave(current, doc)
  if (text) await vault.save(file, text)
}

/**
 * Quem entra no mapa de relações: personagens, NPCs e facções da campanha, com a atitude ou reputação com o grupo. A
 * reputação da facção é a média dos jogadores (24/11); sem o índice, o número antigo do grupo.
 */
export function relationMembers(data: CampaignData, index?: VaultIndex): RelationMember[] {
  const home = data.campaign.home
  const legacy = new Map(data.factions.flatMap((f) => (f.dest && reputationOf(f.extra) !== 0 ? [[f.dest, reputationOf(f.extra)] as const] : [])))
  const rep = index && home ? resolveReputation(data.reputation, (target) => resolveTarget(index, target, home), legacy) : null
  const players = data.players.map((p) => p.path)
  const seen = new Set<string>()
  const members: RelationMember[] = []
  const add = (member: RelationMember) => {
    if (seen.has(member.path)) return
    seen.add(member.path)
    members.push(member)
  }
  for (const p of data.players) add({ path: p.path, title: p.name, kind: "pj" })
  for (const n of data.npcs) {
    const attitude = npcAttitude(n.extra)
    if (n.dest) add({ path: n.dest, title: noteName(n.target), kind: "npc", ...(attitude ? { toParty: attitude } : {}) })
  }
  for (const f of data.factions) {
    const value = f.dest && rep ? averageReputation(rep, players, f.dest) ?? 0 : reputationOf(f.extra)
    if (f.dest) add({ path: f.dest, title: noteName(f.target), kind: "faccao", toParty: `reputação ${formatReputation(value)}` })
  }
  return members
}

/** A wiki da campanha, onde as relações são procuradas. */
export const relationScope = (data: CampaignData) => (data.campaign.wiki ? `Wikis/${data.campaign.wiki}/` : "")
