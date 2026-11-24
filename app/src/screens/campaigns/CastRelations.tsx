import { useMemo } from "react"
import { buildRelationMap, PARTY, relationMapCanvas } from "../../core/relation-map"
import { href, navigate } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import { useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import { campaignRoute, type CampaignData } from "./campaign-state"
import { RELATION_MAP_FILE, relationMembers, relationScope, writeGeneratedCanvas } from "./board-actions"

const SHOWN = 30

/**
 * Relações do Elenco (ideia da revisão das Campanhas): quem é aliado, inimigo ou membro de quem, lido das notas da
 * wiki. A lista (aba Relações e painel de detalhes) é a alternativa acessível ao mapa; `generate` desenha o mesmo como
 * `.canvas` no Quadro (U115: no ⋯ da tela).
 */
export function useCastRelations(data: CampaignData) {
  const vault = useVault()
  const toast = useToast()
  const members = useMemo(() => relationMembers(data, vault.index ?? undefined), [data, vault.index])
  const map = useMemo(() => buildRelationMap(vault.index!, members, relationScope(data)), [vault.index, vault.version, members, data])
  const titles = new Map(members.map((m) => [m.path, m.title]))
  const edges = map.edges.filter((e) => e.from !== PARTY)
  const generate = async () => {
    if (data.readOnly) return toast("Libere a gravação em Configurações para gerar o quadro.")
    const file = `${data.campaign.root}${RELATION_MAP_FILE}`
    try {
      await writeGeneratedCanvas(vault, file, (existing) => relationMapCanvas(map, existing))
      navigate(campaignRoute(data.campaign.name, "quadro", file))
    } catch (err) {
      toast.error(err)
    }
  }
  return { edges, members, title: (path: string) => titles.get(path) ?? path, generate, file: `${data.campaign.root}${RELATION_MAP_FILE}` }
}

/** A aba Relações: a lista inteira (as primeiras 30, o resto no Quadro). */
export function CastRelations({ relations }: { relations: ReturnType<typeof useCastRelations> }) {
  const { edges, title } = relations
  const link = (path: string) => <a href={href(noteRoute(path))}>{title(path)}</a>
  if (!relations.members.length) return <span className="muted small">O elenco está vazio: as relações aparecem quando houver personagens, NPCs ou facções.</span>
  return (
    <div className="stack">
      {edges.length === 0 ? (
        <span className="muted small">Nenhuma relação entre o elenco. Elas vêm dos artigos da wiki (Aliados, Inimigos, Membro de…); o quadro também mostra a atitude de cada um com o grupo.</span>
      ) : (
        <ul className="campaign-relations">
          {edges.slice(0, SHOWN).map((e) => (
            <li key={`${e.from}>${e.to}>${e.label}`} className="small">{link(e.from)} <span className="faint">— {e.label} —</span> {link(e.to)}</li>
          ))}
        </ul>
      )}
      {edges.length > SHOWN && <span className="tiny faint">E mais {edges.length - SHOWN} no quadro (⋯ › Gerar relações no Quadro).</span>}
    </div>
  )
}
