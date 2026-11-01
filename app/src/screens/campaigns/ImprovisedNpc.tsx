import { useState } from "react"
import { BookPlus, Dices } from "lucide-react"
import { npcExtra, uniqueNoteName, withTrackedLink } from "../../core/campaigns"
import { improvisedNpc, improvisedNpcNote, type ImprovisedNpc } from "../../core/improvised-npc"
import { NAME_CULTURES } from "../../core/name-cultures"
import { articleKind, newArticleNote } from "../../core/wiki"
import { useRemembered } from "../../lib/remembered"
import { useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import type { CampaignData } from "./campaign-state"

const parseCulture = (raw: unknown) => (typeof raw === "string" && NAME_CULTURES.some((c) => c.id === raw) ? raw : "")

/**
 * NPC improvisado na Tela do Mestre (ideia da revisão das Campanhas): sorteia na hora e, se o NPC ficar, guarda o
 * artigo na wiki da campanha e já o acompanha no Elenco, marcado como “apareceu”. A cultura fica lembrada por campanha.
 */
export function ImprovisedNpcCard({ data }: { data: CampaignData }) {
  const vault = useVault()
  const toast = useToast()
  const [cultureId, setCultureId] = useRemembered(`runas-codex:campanha:npc-cultura:${data.campaign.root}`, parseCulture)
  const culture = NAME_CULTURES.find((c) => c.id === cultureId)
  const [npc, setNpc] = useState<ImprovisedNpc | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const draw = () => {
    setNpc(improvisedNpc(Math.random, culture))
    setSaved(false)
  }
  const wiki = data.campaign.wiki
  const save = async () => {
    if (!npc || !wiki) return
    if (data.readOnly) return toast("Libere a gravação em Configurações para guardar o NPC.")
    const kind = articleKind("personagem")!
    const folder = `Wikis/${wiki}/${kind.folder}`
    setBusy(true)
    try {
      const path = await vault.createNote(folder, uniqueNoteName(vault.index!, folder, npc.name), improvisedNpcNote(newArticleNote(kind, npc.name), npc))
      const home = data.campaign.home
      if (home) await vault.setProperty(home, "npcs", withTrackedLink(data.data.npcs, -1, vault.index!.linkTarget(path, home), npcExtra("neutro", true)))
      setSaved(true)
      toast(`${npc.name} está na wiki${home ? " e no Elenco" : ""}.`)
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="card tight stack" aria-labelledby="npc-improvisado">
      <span id="npc-improvisado" className="eyebrow">NPC improvisado</span>
      <div className="row-wrap">
        <select className="select" value={cultureId} onChange={(e) => setCultureId(e.target.value)} aria-label="Cultura dos nomes">
          <option value="">Nomes gerais</option>
          {NAME_CULTURES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <button type="button" className="btn sm" onClick={draw}><Dices size={13} /> {npc ? "Sortear outro" : "Sortear NPC"}</button>
      </div>
      <div role="status" className="stack" style={{ gap: 2 }}>
        {npc && (
          <>
            <strong className="small">{npc.name}</strong>
            <span className="tiny muted">{npc.job} · {npc.look}</span>
            <span className="small">Jeito: {npc.trait}</span>
            <span className="small">Quer {npc.desire}</span>
            <span className="small faint">Esconde {npc.secret}</span>
          </>
        )}
      </div>
      {npc && (wiki ? (
        <button type="button" className="btn sm ghost" style={{ justifySelf: "start" }} disabled={busy || saved || data.readOnly} onClick={() => void save()}>
          <BookPlus size={13} /> {saved ? "Guardado na wiki" : "Guardar na wiki"}
        </button>
      ) : (
        <span className="tiny faint">Ligue a campanha a uma wiki (propriedade wiki da nota da campanha) para guardar o NPC.</span>
      ))}
    </section>
  )
}
