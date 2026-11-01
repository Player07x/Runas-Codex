import { npcAttitude, reputationOf } from "../../core/campaigns"
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

/** Quem entra no mapa de relações: personagens, NPCs e facções da campanha, com a atitude ou reputação com o grupo. */
export function relationMembers(data: CampaignData): RelationMember[] {
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
    const rep = reputationOf(f.extra)
    if (f.dest) add({ path: f.dest, title: noteName(f.target), kind: "faccao", toParty: `reputação ${rep > 0 ? `+${rep}` : rep}` })
  }
  return members
}

/** A wiki da campanha, onde as relações são procuradas. */
export const relationScope = (data: CampaignData) => (data.campaign.wiki ? `Wikis/${data.campaign.wiki}/` : "")
