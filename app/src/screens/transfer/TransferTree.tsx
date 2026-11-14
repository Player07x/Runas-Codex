import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { ChevronDown, ChevronRight, Folder } from "lucide-react"
import type { TransferEntry } from "../../core/transfer/plan"

/**
 * Escolha por notas em árvore (U51): cada pasta tem uma caixa de três estados que marca ou desmarca tudo o que está
 * dentro; o número ao lado diz quantos arquivos estão marcados. Só as pastas abertas desenham seus filhos.
 */
interface TreeFolder { name: string; path: string; folders: Map<string, TreeFolder>; files: TransferEntry[]; all: string[]; size: number }

function buildTree(entries: readonly TransferEntry[]): TreeFolder {
  const root: TreeFolder = { name: "", path: "", folders: new Map(), files: [], all: [], size: 0 }
  for (const entry of entries) {
    const parts = entry.path.split("/")
    let node = root
    node.all.push(entry.path); node.size += entry.size
    for (const part of parts.slice(0, -1)) {
      const path = node.path ? `${node.path}/${part}` : part
      if (!node.folders.has(part)) node.folders.set(part, { name: part, path, folders: new Map(), files: [], all: [], size: 0 })
      node = node.folders.get(part)!
      node.all.push(entry.path); node.size += entry.size
    }
    node.files.push(entry)
  }
  return root
}
const sorted = <T,>(items: Iterable<T>, name: (item: T) => string) => [...items].sort((a, b) => name(a).localeCompare(name(b), "pt-BR"))

function FolderCheck({ folder, selected, disabled, onSet }: { folder: TreeFolder; selected: ReadonlySet<string>; disabled: boolean; onSet: (paths: string[], on: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const count = folder.all.filter(path => selected.has(path)).length
  useEffect(() => { if (ref.current) ref.current.indeterminate = count > 0 && count < folder.all.length }, [count, folder.all.length])
  return <input ref={ref} type="checkbox" disabled={disabled} checked={count === folder.all.length} aria-label={`Pasta ${folder.path}: ${count} de ${folder.all.length} marcados`} onChange={() => onSet(folder.all, count < folder.all.length)} />
}

export function TransferTree({ entries, selected, disabled, sizeLabel, onSet }: { entries: readonly TransferEntry[]; selected: ReadonlySet<string>; disabled: boolean; sizeLabel: (bytes: number) => string; onSet: (paths: string[], on: boolean) => void }) {
  const tree = useMemo(() => buildTree(entries), [entries])
  // Com uma pasta só no primeiro nível (por exemplo, “Notas”), ela já começa aberta.
  const [open, setOpen] = useState<Set<string>>(() => new Set(tree.folders.size === 1 ? [...tree.folders.values()].map(folder => folder.path) : []))
  const toggleOpen = (path: string) => setOpen(current => { const next = new Set(current); if (next.has(path)) next.delete(path); else next.add(path); return next })

  const render = (folder: TreeFolder, depth: number): ReactNode => <ul className="transfer-tree-list">
    {sorted(folder.folders.values(), item => item.name).map(child => {
      const expanded = open.has(child.path), count = child.all.filter(path => selected.has(path)).length
      return <li key={child.path}>
        <div className="transfer-tree-row" style={{ paddingInlineStart: 4 + depth * 16 }}>
          <button type="button" className="icon-btn transfer-tree-toggle" aria-expanded={expanded} aria-label={`${expanded ? "Fechar" : "Abrir"} a pasta ${child.path}`} onClick={() => toggleOpen(child.path)}>{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
          <label className="transfer-tree-label"><FolderCheck folder={child} selected={selected} disabled={disabled} onSet={onSet} /><Folder size={15} aria-hidden="true" /><span>{child.name}</span><small>{count === child.all.length ? child.all.length : `${count} de ${child.all.length}`} · {sizeLabel(child.size)}</small></label>
        </div>
        {expanded && render(child, depth + 1)}
      </li>
    })}
    {sorted(folder.files, entry => entry.path).map(entry => <li key={entry.path}>
      <label className="transfer-tree-row transfer-tree-label transfer-tree-file" style={{ paddingInlineStart: 48 + depth * 16 }}>
        <input type="checkbox" disabled={disabled} checked={selected.has(entry.path)} onChange={event => onSet([entry.path], event.target.checked)} />
        <span title={entry.path}>{entry.path.slice(entry.path.lastIndexOf("/") + 1)}</span><small>{sizeLabel(entry.size)}</small>
      </label>
    </li>)}
  </ul>

  return <div className="transfer-files transfer-tree" data-transfer-tree>{render(tree, 0)}</div>
}
