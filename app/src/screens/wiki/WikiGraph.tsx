import { GraphPage } from "../../components/vault/GraphPage"
import { useVault } from "../../platform/VaultProvider"
import { useWiki } from "./wiki-state"
import { NewArticleDialog } from "./WikiHome"
import { useState } from "react"

/** O gráfico da wiki: o mesmo do módulo Notas, só com os artigos desta wiki (outros espaços viram portais). */
export function WikiGraph() {
  const vault = useVault()
  const { wiki } = useWiki()
  const [create, setCreate] = useState<string | null>(null)
  return (
    <div className="wiki-graph">
      <h1 className="sr-only">Gráfico de {wiki!.name}</h1>
      <GraphPage index={vault.index!} root={wiki!.root} version={vault.version} onBroken={(target) => setCreate(target)} />
      {create !== null && <NewArticleDialog initialName={create} onClose={() => setCreate(null)} />}
    </div>
  )
}
