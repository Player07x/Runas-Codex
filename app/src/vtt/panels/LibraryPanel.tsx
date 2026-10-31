import { useEffect, useState } from "react"
import { Download, Map as MapIcon, Plus, Trash2, UserRound } from "lucide-react"
import { platform } from "../../platform"
import { library } from "../library"
import { LIBRARY_CHANGED, LIBRARY_DRAG_TYPE, placeScene, placeToken } from "../library-actions"
import { filterLibrary, itemAssets, type LibraryItem, type LibraryKind } from "../shared/library"
import type { SceneData, TokenData } from "../shared/scene"
import type { DocumentStore } from "../document-store"

const KINDS: { value: LibraryKind | "todos"; label: string }[] = [{ value: "todos", label: "Tudo" }, { value: "token", label: "Tokens" }, { value: "scene", label: "Mapas" }]

/** Miniatura do item, lida da própria biblioteca (a imagem pode não estar nesta mesa). */
function Thumb({ item }: { item: LibraryItem }) {
  const [url, setUrl] = useState<string | null>(null)
  const asset = itemAssets(item)[0]
  useEffect(() => {
    if (!asset || !library) return
    let created: string | null = null, live = true
    void library.asset(asset).then((bytes) => {
      if (!live) return
      created = URL.createObjectURL(new Blob([bytes as BlobPart]))
      setUrl(created)
    }, () => undefined)
    return () => { live = false; if (created) URL.revokeObjectURL(created) }
  }, [asset])
  return url ? <img src={url} alt="" /> : <span className="thumb">{item.kind === "token" ? <UserRound size={16} /> : <MapIcon size={16} />}</span>
}

/**
 * Biblioteca (U13): os mapas e tokens guardados no cofre, para qualquer mesa. Arrastar para a cena (ou o botão) põe
 * uma cópia: token novo no ponto solto, mapa como cena nova. “Guardar na biblioteca” fica no token e na cena.
 */
export function LibraryPanel({ store, sceneId, onOpenScene }: { store: DocumentStore; sceneId: string | null; onOpenScene: (id: string) => void }) {
  const [items, setItems] = useState<LibraryItem[] | null>(null)
  const [query, setQuery] = useState("")
  const [kind, setKind] = useState<LibraryKind | "todos">("todos")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const reload = () => { if (library) void library.list().then(setItems, (reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason))) }
  useEffect(() => {
    reload()
    window.addEventListener(LIBRARY_CHANGED, reload)
    return () => window.removeEventListener(LIBRARY_CHANGED, reload)
  }, [])
  const run = (action: () => Promise<string | void>) => {
    setError(""); setMessage("")
    void action().then((done) => { if (done) setMessage(done) }, (reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)))
  }
  if (!library) return <div className="scenes-panel"><p className="hint">A biblioteca fica no cofre do computador da sala; o mestre remoto não a alcança.</p></div>
  const shown = items ? filterLibrary(items, query, kind) : []
  const place = (item: LibraryItem) => run(async () => {
    if (item.kind === "scene") { onOpenScene(await placeScene(store, item)); return `Cena “${item.name}” criada.` }
    const scene = sceneId ? store.get<SceneData>(sceneId) : null
    if (!scene) throw new Error("Abra uma cena para pôr o token.")
    await placeToken(store, item, scene.id, { x: scene.data.width / 2, y: scene.data.height / 2 })
    return `“${item.name}” no centro da cena.`
  })
  return <div className="scenes-panel library-panel">
    <header className="panel-header">
      <div><p className="eyebrow">Biblioteca</p><h2>{items ? `${items.length} ${items.length === 1 ? "item" : "itens"}` : "Lendo…"}</h2></div>
      <div className="panel-actions">
        <button className="ghost" disabled={!items?.length} title="Pacote .runas com a biblioteca; importe em Importar e exportar" onClick={() => run(async () => {
          const saved = await platform.saveBytes("Biblioteca da mesa.runas", await library!.exportPackage(), "application/zip")
          return saved ? `Biblioteca exportada: ${saved}` : undefined
        })}><Download size={15} /> Exportar</button>
      </div>
    </header>
    <input className="library-search" type="search" aria-label="Buscar na biblioteca" placeholder="Buscar mapas e tokens…" value={query} onChange={(event) => setQuery(event.target.value)} />
    <div className="library-kinds" role="group" aria-label="Mostrar">
      {KINDS.map((option) => <button key={option.value} className={kind === option.value ? "active" : ""} aria-pressed={kind === option.value} onClick={() => setKind(option.value)}>{option.label}</button>)}
    </div>
    {message && <p className="hint" role="status">{message}</p>}
    {error && <p className="hint danger" role="alert">{error}</p>}
    {items && !items.length && <p className="hint">Nada guardado ainda. No token, use “Guardar na biblioteca” nas propriedades ou no menu do objeto; no mapa, em Cenas › Guardar mapa na biblioteca. Para trazer a biblioteca de outro cofre, importe o pacote em Importar e exportar.</p>}
    {items && items.length > 0 && !shown.length && <p className="hint">Nada com esse nome.</p>}
    <ul className="scene-list library-list">
      {shown.map((item) => <li key={item.id} draggable onDragStart={(event) => { event.dataTransfer.setData(LIBRARY_DRAG_TYPE, item.id); event.dataTransfer.effectAllowed = "copy" }}>
        <div className="library-item">
          <Thumb item={item} />
          <span><strong>{item.name}</strong><small>{item.kind === "token" ? `Token · ${(item.data as TokenData).size} ${(item.data as TokenData).size === 1 ? "célula" : "células"}` : `Mapa · ${item.children.length} ${item.children.length === 1 ? "objeto" : "objetos"}`}</small></span>
          <button className="icon-toggle" aria-label={item.kind === "token" ? `Pôr ${item.name} na cena` : `Criar cena com ${item.name}`} title={item.kind === "token" ? "Pôr no centro da cena (ou arraste para o mapa)" : "Criar uma cena com este mapa"} onClick={() => place(item)}><Plus size={15} /></button>
          <button className="icon-toggle danger" aria-label={`Tirar ${item.name} da biblioteca`} onClick={() => {
            if (window.confirm(`Tirar “${item.name}” da biblioteca? O item vai para a lixeira do cofre; o que já está nas mesas continua.`)) run(async () => { await library!.remove(item); reload() })
          }}><Trash2 size={15} /></button>
        </div>
      </li>)}
    </ul>
  </div>
}
