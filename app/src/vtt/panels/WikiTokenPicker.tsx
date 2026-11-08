import { useState } from "react"
import { Search } from "lucide-react"
import { Modal } from "../../components/ui"
import { NoteCrest } from "../../components/kit/Emblem"
import type { WikiTokenSource } from "../wiki-tokens"

/**
 * “Trocar nota…” e “Ligar a uma nota…” do token (U22): escolhe uma nota da wiki com imagem de token ou retrato. Ao
 * escolher, o token passa a ser dessa nota (nome, imagem, tamanho, disposição e barras; o valor das barras de mesmo
 * nome fica).
 */
export function WikiTokenPicker({ sources, current, onPick, onClose }: { sources: WikiTokenSource[]; current?: string; onPick(source: WikiTokenSource): void; onClose(): void }) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLocaleLowerCase("pt-BR")
  const shown = sources.filter((source) => !q || source.name.toLocaleLowerCase("pt-BR").includes(q)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
  return <Modal title="Ligar o token a uma nota" onClose={onClose} footer={<button className="btn ghost" onClick={onClose}>Cancelar</button>}>
    <div className="stack">
      {sources.length > 0 && <label className="search"><Search size={15} /><input className="input" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nota da wiki" aria-label="Buscar nota da wiki" /></label>}
      {sources.length === 0 && <p className="small muted">Nenhuma nota da wiki tem imagem de token ou retrato.</p>}
      {sources.length > 0 && shown.length === 0 && <p className="small muted" role="status">Nenhuma nota com “{query}”.</p>}
      {shown.length > 0 && <ul className="stack wiki-token-picker" aria-label="Notas da wiki">
        {shown.map((source) => <li key={source.notePath}>
          <button type="button" className="btn wiki-token-choice" aria-current={source.notePath === current ? "true" : undefined} onClick={() => onPick(source)}>
            <NoteCrest path={source.notePath} name={source.name} size={28} />
            <span className="grow" style={{ minWidth: 0, textAlign: "start" }}><strong className="truncate" style={{ display: "block" }}>{source.name}</strong><span className="small muted">{source.meta}{source.notePath === current ? " · ligada agora" : ""}</span></span>
          </button>
        </li>)}
      </ul>}
    </div>
  </Modal>
}
