import { useMemo } from "react"
import { Shapes } from "lucide-react"
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
 * wiki. A lista é a alternativa acessível ao mapa; “Gerar no Quadro” desenha o mesmo como `.canvas`.
 */
export function CastRelations({ data }: { data: CampaignData }) {
  const vault = useVault()
  const toast = useToast()
  const members = useMemo(() => relationMembers(data), [data])
  const map = useMemo(() => buildRelationMap(vault.index!, members, relationScope(data)), [vault.index, vault.version, members, data])
  const titles = new Map(members.map((m) => [m.path, m.title]))
  const edges = map.edges.filter((e) => e.from !== PARTY)
  const link = (path: string) => <a href={href(noteRoute(path))}>{titles.get(path) ?? path}</a>
  const generate = async () => {
    if (data.readOnly) return toast("Libere a gravação em Configurações para gerar o quadro.")
    const file = `${data.campaign.root}${RELATION_MAP_FILE}`
    try {
      await writeGeneratedCanvas(vault, file, (existing) => relationMapCanvas(map, existing))
      navigate(campaignRoute(data.campaign.name, "quadro", file))
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err))
    }
  }
  if (!members.length) return null
  return (
    <section className="card stack">
      <div className="row between">
        <h2 className="section-title">Relações</h2>
        <button className="btn sm" onClick={() => void generate()} title={`Cria ou atualiza ${data.campaign.root}${RELATION_MAP_FILE}; o que você acrescentar no quadro continua`}>
          <Shapes size={14} /> Gerar no Quadro
        </button>
      </div>
      {edges.length === 0 ? (
        <span className="muted small">Nenhuma relação entre o elenco. Elas vêm dos artigos da wiki (Aliados, Inimigos, Membro de…); o quadro também mostra a atitude de cada um com o grupo.</span>
      ) : (
        <ul className="campaign-relations">
          {edges.slice(0, SHOWN).map((e) => (
            <li key={`${e.from}>${e.to}>${e.label}`} className="small">{link(e.from)} <span className="faint">— {e.label} —</span> {link(e.to)}</li>
          ))}
        </ul>
      )}
      {edges.length > SHOWN && <span className="tiny faint">E mais {edges.length - SHOWN} no quadro.</span>}
    </section>
  )
}
