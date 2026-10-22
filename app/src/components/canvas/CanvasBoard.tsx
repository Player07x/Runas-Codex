import { pinchCanvas, selectCanvasBox, type CanvasPoint } from "../../core/canvas-tools"
import { CanvasImageCrop, CanvasImagePicker } from "./CanvasImageTools"
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react"
import { Cable, FileText, FoldVertical, Group, Link2, Maximize, Minus, Palette, Plus, StickyNote, Trash, Type } from "lucide-react"
import {
  addEdge, addNode, anchorPoint, canvasBounds, canvasToSave, colorCss, CANVAS_COLORS, moveNodes, nodesInside, parseCanvas, removeEdge, removeNodes, updateEdge, updateNode,
  type CanvasDoc, type CanvasNode, type CanvasSide, type NodeInput,
} from "../../core/canvas"
import { noteBody } from "../../core/sections"
import { extname, noteName } from "../../core/text"
import { NoteSetContext } from "../../lib/note-set"
import { noteRoute, vaultNoteSet } from "../../lib/vault-notes"
import { navigate } from "../../lib/router"
import { useVault } from "../../platform/VaultProvider"
import { Markdown } from "../Markdown"
import { LinkPicker } from "../vault/dialogs"
import { Modal, useToast } from "../ui"
import "./canvas.css"

/**
 * Editor de quadros `.canvas` (JSON Canvas 1.0, o do Obsidian). Arrastar move (grupos levam o que está dentro),
 * o canto redimensiona, duplo clique edita o texto ou cria um cartão, "Ligar" une dois cartões. A gravação é adiada
 * e vai pelo `useVault()` com a versão lida: se o arquivo mudou fora do app, o quadro recarrega em vez de sobrescrever.
 */

type Drag =
  | {kind:"select";startX:number;startY:number;from:CanvasPoint;to:CanvasPoint}
  | { kind: "pan"; startX: number; startY: number; panX: number; panY: number }
  | { kind: "move"; ids: string[]; startX: number; startY: number; dx: number; dy: number }
  | { kind: "resize"; id: string; startX: number; startY: number; width: number; height: number }

const SAVE_DELAY = 600
/** Até onde um cartão cresce sozinho depois de editado (rework F4c, CAM-7); “Ajustar altura” mostra o texto todo. */
const GROW_LIMIT = 520
const IMAGE = /\.(png|jpe?g|gif|webp|svg|avif)$/i

export function CanvasBoard({ path }: { path: string }) {
  const vault = useVault()
  const toast = useToast()
  const index = vault.index!
  const readOnly = vault.info?.readOnly ?? true
  const entry = index.allFiles().find((f) => f.path === path)
  const [original, setOriginal] = useState<string | null>(null)
  const [doc, setDoc] = useState<CanvasDoc | null>(null)
  const [error, setError] = useState<string>()
  const [selectedIds,setSelectedIds]=useState<string[]>([])
  const [multi,setMulti]=useState(false)
  const [imagePicker,setImagePicker]=useState(false)
  const fingers=useRef(new Map<number,CanvasPoint>())
  const pinch=useRef<{first:CanvasPoint;second:CanvasPoint;view:{x:number;y:number;zoom:number}}|null>(null)
  const suppressed=useRef(false)
  const touchBase=useRef<CanvasDoc|null>(null)
  const currentDoc=useRef<CanvasDoc|null>(null)
  currentDoc.current=doc
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [linking, setLinking] = useState<string | null>(null)
  const [picker, setPicker] = useState(false)
  const [askLink, setAskLink] = useState(false)
  const [view, setView] = useState({ x: 40, y: 40, zoom: 1 })
  const [drag, setDrag] = useState<Drag | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const pending = useRef<CanvasDoc | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const lastSeen = useRef<string>("")
  const [reload, setReload] = useState(0)
  // Cartões cujo texto não cabe: id → altura que mostraria tudo. O tamanho gravado só muda por ação de quem edita.
  const [overflowing, setOverflowing] = useState<Record<string, number>>({})
  const autoFit = useRef<string | null>(null)
  const hintId = useId()

  // Lê o arquivo (e relê quando ele muda fora do app, se não houver edição esperando para gravar).
  const stamp = entry ? `${entry.mtime}:${entry.size}` : ""
  useEffect(() => {
    if (!entry || stamp === lastSeen.current || pending.current) return
    let cancelled = false
    vault.platform.readTexts([path]).then((texts) => {
      if (cancelled) return
      const text = texts[path] ?? ""
      const parsed = parseCanvas(text)
      lastSeen.current = stamp
      setOriginal(text)
      if ("error" in parsed) {
        setError(parsed.error)
        setDoc(null)
      } else {
        setError(undefined)
        setDoc(parsed.doc)
      }
    })
    return () => {
      cancelled = true
    }
  }, [path, stamp, entry, vault.platform, reload])

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current)
    const next = pending.current
    if (!next || original === null) return
    const text = canvasToSave(original, next)
    pending.current = null
    if (text === null) return
    // Mudou fora do app (Obsidian, sincronização) depois que o quadro foi lido: não grava por cima.
    const now = vault.index?.allFiles().find((f) => f.path === path)
    if (now && `${now.mtime}:${now.size}` !== lastSeen.current) {
      toast("O quadro mudou fora do app; abri a versão do disco (a última mudança daqui não foi gravada).")
      lastSeen.current = ""
      setReload((n) => n + 1)
      return
    }
    try {
      await vault.save(path, text)
      setOriginal(text)
      const saved = vault.index?.allFiles().find((f) => f.path === path)
      if (saved) lastSeen.current = `${saved.mtime}:${saved.size}`
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err))
      lastSeen.current = ""
    }
  }, [original, path, toast, vault])

  // Grava o que faltar ao sair do quadro.
  useEffect(() => () => void flush(), [flush])

  const change = useCallback(
    (next: CanvasDoc) => {
      setDoc(next)
      if (readOnly) return
      pending.current = next
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void flush(), SAVE_DELAY)
    },
    [readOnly, flush],
  )

  // Enquadra o quadro na primeira leitura.
  const framed = useRef(false)
  useEffect(() => {
    if (!doc || framed.current || !boardRef.current) return
    framed.current = true
    fit(doc)
  })

  const fit = (d: CanvasDoc | null = doc) => {
    const board = boardRef.current
    if (!d || !board) return
    const b = canvasBounds(d)
    const zoom = Math.min(1.2, Math.max(0.25, Math.min(board.clientWidth / (b.width + 80), board.clientHeight / (b.height + 80))))
    setView({ zoom, x: (board.clientWidth - b.width * zoom) / 2 - b.x * zoom, y: (board.clientHeight - b.height * zoom) / 2 - b.y * zoom })
  }

  const toWorld = (clientX: number, clientY: number) => {
    const rect = boardRef.current!.getBoundingClientRect()
    return { x: (clientX - rect.left - view.x) / view.zoom, y: (clientY - rect.top - view.y) / view.zoom }
  }

  const centerOfView = () => {
    const board = boardRef.current!
    return toWorld(board.getBoundingClientRect().left + board.clientWidth / 2, board.getBoundingClientRect().top + board.clientHeight / 2)
  }

  const create = (node: Omit<NodeInput, "x" | "y"> & { x?: number; y?: number }) => {
    if (!doc || readOnly) return
    const c = centerOfView()
    const { doc: next, id } = addNode(doc, { ...node, x: node.x ?? c.x - node.width / 2, y: node.y ?? c.y - node.height / 2 })
    change(next)
    setSelected(id);setSelectedIds([id])
    if (node.type === "text") setEditing(id)
  }

  const zoomBy = (factor: number, clientX?: number, clientY?: number) => {
    const board = boardRef.current!
    const rect = board.getBoundingClientRect()
    const px = (clientX ?? rect.left + board.clientWidth / 2) - rect.left
    const py = (clientY ?? rect.top + board.clientHeight / 2) - rect.top
    setView((v) => {
      const zoom = Math.min(2.5, Math.max(0.15, v.zoom * factor))
      return { zoom, x: px - ((px - v.x) / v.zoom) * zoom, y: py - ((py - v.y) / v.zoom) * zoom }
    })
  }

  // ---------- Ponteiro ----------

  // Tira o foco do texto em edição antes de mudar o estado: o `blur` grava o texto (se o campo sumir antes, perde).
  const commitEditing = () => {
    if (editing) (document.activeElement as HTMLElement | null)?.blur()
  }

  const onTouchDown=(event:ReactPointerEvent)=>{
    if(event.pointerType!=="touch")return
    const rect=boardRef.current!.getBoundingClientRect()
    fingers.current.set(event.pointerId,{x:event.clientX-rect.left,y:event.clientY-rect.top})
    if(fingers.current.size===1){touchBase.current=doc;suppressed.current=false}
    if(fingers.current.size===2){const [first,second]=[...fingers.current.values()];pinch.current={first:first!,second:second!,view};suppressed.current=true;if(drag?.kind==="resize"&&touchBase.current)setDoc(touchBase.current);setDrag(null);boardRef.current!.setPointerCapture(event.pointerId)}
  }
  const onBoardDown = (event: ReactPointerEvent) => {
    if(suppressed.current)return
    if (event.target !== event.currentTarget && !(event.target as HTMLElement).classList.contains("canvas-world")) return
    commitEditing()
    setSelected(null);setSelectedIds([])
    setSelectedEdge(null)
    setEditing(null)
    setLinking(null)
    boardRef.current!.setPointerCapture(event.pointerId)
    if(multi||event.shiftKey){const from=toWorld(event.clientX,event.clientY);setDrag({kind:"select",startX:event.clientX,startY:event.clientY,from,to:from});return}
    setDrag({ kind: "pan", startX: event.clientX, startY: event.clientY, panX: view.x, panY: view.y })
  }

  const onNodeDown = (event: ReactPointerEvent, node: CanvasNode) => {
    event.stopPropagation()
    if(suppressed.current)return
    if (editing === node.id) return
    commitEditing()
    if (linking && linking !== node.id && doc) {
      const result = addEdge(doc, linking, node.id)
      if (result) change(result.doc)
      else toast("Esses cartões já estão ligados.")
      setLinking(null)
      setSelected(node.id)
      return
    }
    const ids=multi||event.shiftKey ? selectedIds.includes(node.id)?selectedIds.filter(id=>id!==node.id):[...selectedIds,node.id] : selectedIds.includes(node.id)?selectedIds:[node.id]
    setSelectedIds(ids);setSelected(ids.at(-1)??null)
    setSelectedEdge(null)
    if(!ids.includes(node.id))return
    if (readOnly) return
    boardRef.current!.setPointerCapture(event.pointerId)
    setDrag({ kind: "move", ids: ids, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0 })
  }

  const onResizeDown = (event: ReactPointerEvent, node: CanvasNode) => {
    event.stopPropagation()
    if(suppressed.current)return
    touchBase.current=doc
    if (readOnly) return
    boardRef.current!.setPointerCapture(event.pointerId)
    setSelected(node.id)
    setDrag({ kind: "resize", id: node.id, startX: event.clientX, startY: event.clientY, width: node.width, height: node.height })
  }

  const onMove = (event: ReactPointerEvent) => {
    if(fingers.current.has(event.pointerId)){const rect=boardRef.current!.getBoundingClientRect();fingers.current.set(event.pointerId,{x:event.clientX-rect.left,y:event.clientY-rect.top});if(pinch.current&&fingers.current.size===2){const [first,second]=[...fingers.current.values()];setView(pinchCanvas(pinch.current.view,pinch.current.first,pinch.current.second,first!,second!));return}}
    if(suppressed.current)return
    if(drag?.kind==="select"){setDrag({...drag,to:toWorld(event.clientX,event.clientY)});return}
    if (!drag) return
    const dx = (event.clientX - drag.startX) / (drag.kind === "pan" ? 1 : view.zoom)
    const dy = (event.clientY - drag.startY) / (drag.kind === "pan" ? 1 : view.zoom)
    if (drag.kind === "pan") setView((v) => ({ ...v, x: drag.panX + dx, y: drag.panY + dy }))
    else if (drag.kind === "move") setDrag({ ...drag, dx, dy })
    else if (doc) setDoc(updateNode(doc, drag.id, { width: Math.max(80, drag.width + dx), height: Math.max(50, drag.height + dy) }))
  }

  const onUp = (event?:ReactPointerEvent) => {
    if(event)fingers.current.delete(event.pointerId)
    if(suppressed.current){if(!fingers.current.size){pinch.current=null;suppressed.current=false}setDrag(null);return}
    if(drag?.kind==="select"&&doc){const ids=selectCanvasBox(doc.nodes,drag.from,drag.to);setSelectedIds(ids);setSelected(ids.at(-1)??null);setDrag(null);return}
    if (!drag || !doc) return setDrag(null)
    if (drag.kind === "move" && (Math.abs(drag.dx) > 1 || Math.abs(drag.dy) > 1)) change(moveNodes(doc, drag.ids, drag.dx, drag.dy))
    if (drag.kind === "resize") change(doc)
    setDrag(null)
  }

  const onWheel = (event: React.WheelEvent) => {
    if (event.ctrlKey || event.metaKey) zoomBy(event.deltaY < 0 ? 1.12 : 1 / 1.12, event.clientX, event.clientY)
    else setView((v) => ({ ...v, x: v.x - event.deltaX, y: v.y - event.deltaY }))
  }

  // Dois cliques num cartão: texto abre a edição; nota abre em Notas.
  const editNode = (node: CanvasNode) => {
    if (readOnly) return
    if (node.type === "text") setEditing(node.id)
    else if (node.type === "file" && node.file && vault.index?.note(node.file)) navigate(noteRoute(node.file))
  }

  const onDoubleClick = (event: React.MouseEvent) => {
    // O quadro captura o ponteiro ao clicar num cartão (para arrastar), e o navegador entrega o `dblclick` ao quadro.
    // Por isso confere o que está sob o cursor antes de criar um cartão novo.
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-node-id]")
    const node = hit && doc?.nodes.find((n) => n.id === hit.dataset.nodeId)
    if (node) return editNode(node)
    if (hit) return
    if (readOnly || (event.target !== event.currentTarget && !(event.target as HTMLElement).classList.contains("canvas-world"))) return
    const p = toWorld(event.clientX, event.clientY)
    create({ type: "text", text: "", width: 260, height: 120, x: p.x - 130, y: p.y - 60 })
  }

  const removeSelected = useCallback(() => {
    if (!doc || readOnly) return
    if (selected) {
      change(removeNodes(doc, selectedIds.length?selectedIds:[selected]))
      setSelected(null);setSelectedIds([])
    } else if (selectedEdge) {
      change(removeEdge(doc, selectedEdge))
      setSelectedEdge(null)
    }
  }, [doc, readOnly, selected, selectedIds, selectedEdge, change])

  // Depois de escrever num cartão, ele cresce até GROW_LIMIT para o texto caber (é uma edição, então grava).
  const changeRef = useRef(change)
  changeRef.current = change
  const onMeasure = useCallback((id: string, need: number | null) => {
    setOverflowing((prev) => {
      if ((prev[id] ?? null) === need) return prev
      const next = { ...prev }
      if (need === null) delete next[id]
      else next[id] = need
      return next
    })
    if (autoFit.current !== id) return
    autoFit.current = null
    const latest = currentDoc.current, node = latest?.nodes.find((n) => n.id === id)
    if (latest && node && need && need > node.height && node.height < GROW_LIMIT) changeRef.current(updateNode(latest, id, { height: Math.min(need, GROW_LIMIT) }))
  }, [])

  // Teclado (UI-011): Tab passa pelos cartões, as setas movem os selecionados (Shift: mais longe), Enter edita ou abre.
  const onCardKey = (event: ReactKeyboardEvent, node: CanvasNode) => {
    if (editing === node.id || event.target !== event.currentTarget) return
    const step = event.shiftKey ? 50 : 10
    const delta = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, [number, number]>)[event.key]
    if (delta) {
      event.preventDefault()
      if (readOnly || !doc) return
      const ids = selectedIds.includes(node.id) ? selectedIds : [node.id]
      if (!selectedIds.includes(node.id)) { setSelectedIds(ids); setSelected(node.id) }
      change(moveNodes(doc, ids, delta[0], delta[1]))
    } else if (event.key === "Enter") {
      event.preventDefault()
      editNode(node)
    }
  }
  // Foco pelo teclado seleciona o cartão e traz para a vista o que estiver fora do quadro visível.
  const onCardFocus = (element: HTMLElement, node: CanvasNode) => {
    if (!element.matches(":focus-visible")) return
    if (!selectedIds.includes(node.id)) { setSelectedIds([node.id]); setSelected(node.id); setSelectedEdge(null) }
    const board = boardRef.current
    if (!board) return
    const left = view.x + node.x * view.zoom, top = view.y + node.y * view.zoom
    const right = left + node.width * view.zoom, bottom = top + node.height * view.zoom
    if (left < 0 || top < 0 || right > board.clientWidth || bottom > board.clientHeight)
      setView((v) => ({ ...v, x: board.clientWidth / 2 - (node.x + node.width / 2) * v.zoom, y: board.clientHeight / 2 - (node.y + node.height / 2) * v.zoom }))
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement | null)?.closest("input, textarea, [contenteditable]")
      if (typing || editing) return
      if (event.key === "Delete" || event.key === "Backspace") removeSelected()
      if (event.key === "Escape") {
        setLinking(null)
        setSelected(null);setSelectedIds([])
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [removeSelected, editing])

  const noteSet = useMemo(() => vaultNoteSet(index, path, {}, vault.platform), [index, path, vault.platform, vault.version])

  if (!entry) return <div className="canvas-message">O quadro “{path}” não está no cofre (foi apagado ou renomeado?).</div>
  if (error) return <div className="canvas-message"><strong>Não deu para abrir o quadro.</strong> {error} O arquivo não será alterado.</div>
  if (!doc) return <div className="canvas-message">Abrindo o quadro…</div>

  // Durante o arraste, os cartões andam só na tela; a gravação acontece ao soltar.
  const moving = drag?.kind === "move" ? drag : null
  const shiftedIds = moving
    ? new Set([...moving.ids, ...moving.ids.flatMap((id) => {
        const node = doc.nodes.find((n) => n.id === id)
        return node?.type === "group" ? nodesInside(doc, node) : []
      })])
    : null
  const nodes = doc.nodes.map((node) => (moving && shiftedIds?.has(node.id) ? { ...node, x: node.x + moving.dx, y: node.y + moving.dy } : node))
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const current = selected ? byId.get(selected) : undefined

  return (
    <NoteSetContext.Provider value={noteSet}>
      <div className="canvas-shell">
        <div className="canvas-toolbar" role="toolbar" aria-label="Quadro">
          <button className="btn sm" aria-pressed={multi} onClick={()=>setMulti(!multi)}>Selecionar vários</button><span className="small">{selectedIds.length>1?`${selectedIds.length} cartões selecionados`:""}</span>
          <button className="btn sm" disabled={readOnly} onClick={()=>setImagePicker(true)}>Imagem do cofre</button>
          <button className="btn sm" disabled={readOnly} onClick={() => create({ type: "text", text: "", width: 260, height: 120 })}>
            <Type size={14} /> Texto
          </button>
          <button className="btn sm" disabled={readOnly} onClick={() => setPicker(true)}>
            <FileText size={14} /> Nota
          </button>
          <button
            className="btn sm"
            disabled={readOnly}
            onClick={() => setAskLink(true)}
          >
            <Link2 size={14} /> Link
          </button>
          <button className="btn sm" disabled={readOnly} onClick={() => create({ type: "group", label: "Grupo", width: 520, height: 320 })}>
            <Group size={14} /> Grupo
          </button>
          <span className="canvas-sep" />
          <button className={`btn sm ${linking ? "primary" : ""}`} disabled={readOnly || !selected} onClick={() => setLinking(linking ? null : selected)} title="Escolha um cartão e depois clique no cartão de destino">
            <Cable size={14} /> {linking ? "Clique no destino…" : "Ligar"}
          </button>
          <div className="canvas-colors" aria-label="Cor">
            <Palette size={14} />
            {CANVAS_COLORS.map((c) => (
              <button
                key={c.id}
                className="canvas-swatch"
                style={{ background: c.css }}
                title={c.label}
                aria-label={`Cor ${c.label}`}
                disabled={readOnly || (!current && !selectedEdge)}
                onClick={() => (current ? change(updateNode(doc, current.id, { color: current.color === c.id ? "" : c.id })) : selectedEdge && change(updateEdge(doc, selectedEdge, { color: c.id })))}
              />
            ))}
          </div>
          <button className="btn sm" disabled={readOnly || !current || !overflowing[current.id]} onClick={() => current && overflowing[current.id] && change(updateNode(doc, current.id, { height: overflowing[current.id] }))} title="Aumenta o cartão escolhido até o texto caber inteiro">
            <FoldVertical size={14} /> Ajustar altura
          </button>
          <button className="icon-btn sm" disabled={readOnly || (!selected && !selectedEdge)} onClick={removeSelected} title="Apagar (Delete)" aria-label="Apagar selecionado">
            <Trash size={15} />
          </button>
          <span className="grow" />
          <button className="icon-btn sm" onClick={() => zoomBy(1 / 1.2)} aria-label="Diminuir zoom">
            <Minus size={15} />
          </button>
          <span className="tiny faint canvas-zoom">{Math.round(view.zoom * 100)}%</span>
          <button className="icon-btn sm" onClick={() => zoomBy(1.2)} aria-label="Aumentar zoom">
            <Plus size={15} />
          </button>
          <button className="icon-btn sm" onClick={() => fit()} title="Enquadrar tudo" aria-label="Enquadrar tudo">
            <Maximize size={15} />
          </button>
        </div>

        {current?.type==="file" && IMAGE.test(current.file??"") && !readOnly && <CanvasImageCrop key={current.id} node={current} path={path} onCrop={(file,original)=>{const latest=currentDoc.current;if(!latest||latest.nodes.find(n=>n.id===current.id)?.file!==original){toast("A imagem mudou durante o recorte. O anexo criado foi preservado.");return}change(updateNode(latest,current.id,{file,runas_original:typeof current.runas_original==="string"?current.runas_original:original}))}}/>}
        {current && current.type === "group" && !readOnly && (
          <div className="canvas-inspector">
            <label className="field">
              <span>Nome do grupo</span>
              <input className="input" value={current.label ?? ""} onChange={(e) => change(updateNode(doc, current.id, { label: e.target.value }))} />
            </label>
          </div>
        )}
        {selectedEdge && !readOnly && (
          <div className="canvas-inspector">
            <label className="field">
              <span>Rótulo da ligação</span>
              <input className="input" value={doc.edges.find((e) => e.id === selectedEdge)?.label ?? ""} onChange={(e) => change(updateEdge(doc, selectedEdge, { label: e.target.value }))} />
            </label>
          </div>
        )}

        <div
          ref={boardRef}
          className={`canvas-board ${drag?.kind === "pan" ? "panning" : ""} ${linking ? "linking" : ""}`}
          onPointerDownCapture={onTouchDown}
          onPointerDown={onBoardDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={()=>{if(drag?.kind==="resize"&&touchBase.current)setDoc(touchBase.current);fingers.current.clear();pinch.current=null;suppressed.current=false;setDrag(null)}}
          onWheel={onWheel}
          onDoubleClick={onDoubleClick}
          aria-label={`Quadro ${noteName(path)}`}
        >
          <p id={hintId} className="sr-only">Setas movem o cartão (com Shift, mais longe). Enter edita o texto ou abre a nota. Delete apaga.</p>
          <div className="canvas-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
            <svg className="canvas-edges" aria-hidden="true">
              <defs>
                <marker id="canvas-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                  <path d="M0 0L10 5L0 10z" fill="context-stroke" />
                </marker>
              </defs>
              {doc.edges.map((edge) => {
                const from = byId.get(edge.fromNode)
                const to = byId.get(edge.toNode)
                if (!from || !to) return null
                const a = anchorPoint(from, edge.fromSide)
                const b = anchorPoint(to, edge.toSide)
                const ca = control(a, edge.fromSide)
                const cb = control(b, edge.toSide)
                const color = colorCss(edge.color) ?? "var(--line-strong)"
                const mid = { x: (a.x + 3 * ca.x + 3 * cb.x + b.x) / 8, y: (a.y + 3 * ca.y + 3 * cb.y + b.y) / 8 }
                const d = `M${a.x} ${a.y} C ${ca.x} ${ca.y}, ${cb.x} ${cb.y}, ${b.x} ${b.y}`
                return (
                  <g key={edge.id} className={`canvas-edge ${selectedEdge === edge.id ? "selected" : ""}`}>
                    <path d={d} className="canvas-edge-hit" onPointerDown={(e) => { e.stopPropagation(); setSelectedEdge(edge.id); setSelected(null);setSelectedIds([]) }} />
                    <path d={d} fill="none" stroke={color} strokeWidth={2} markerEnd={edge.toEnd === "none" ? undefined : "url(#canvas-arrow)"} markerStart={edge.fromEnd === "arrow" ? "url(#canvas-arrow)" : undefined} />
                    {edge.label && (
                      <text x={mid.x} y={mid.y - 6} textAnchor="middle" className="canvas-edge-label">
                        {edge.label}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
            {nodes.map((node) => (
              <CanvasCard
                key={node.id}
                node={node}
                selected={selected === node.id || selectedIds.includes(node.id)}
                editing={editing === node.id}
                readOnly={readOnly}
                onDown={(e) => onNodeDown(e, node)}
                onResize={(e) => onResizeDown(e, node)}
                onEdit={() => editNode(node)}
                onText={(text) => { if (text !== (node.text ?? "")) autoFit.current = node.id; change(updateNode(doc, node.id, { text })) }}
                onDone={() => setEditing(null)}
                onMeasure={onMeasure}
                onKey={(e) => onCardKey(e, node)}
                onFocus={(element) => onCardFocus(element, node)}
                hintId={hintId}
              />
            ))}
          </div>
          {drag?.kind==="select"&&<div className="canvas-selection" style={{left:view.x+Math.min(drag.from.x,drag.to.x)*view.zoom,top:view.y+Math.min(drag.from.y,drag.to.y)*view.zoom,width:Math.abs(drag.from.x-drag.to.x)*view.zoom,height:Math.abs(drag.from.y-drag.to.y)*view.zoom}}/>}
          {!doc.nodes.length && <div className="canvas-hint">Quadro vazio. Dê dois cliques para criar um cartão de texto, ou use os botões acima.</div>}
        </div>
      </div>
      {imagePicker&&<CanvasImagePicker onClose={()=>setImagePicker(false)} onPick={file=>{create({type:"file",file,width:300,height:220});setImagePicker(false)}}/>}
      {picker && (
        <LinkPicker
          index={index}
          from={path}
          onClose={() => setPicker(false)}
          onPick={(link) => {
            const target = /^\[\[([^\]|]+)/.exec(link)?.[1]
            const dest = target ? index.resolve({ kind: "wiki", embed: false, target, start: 0, end: 0, raw: "", inFrontmatter: false }, path).dest : null
            if (dest) create({ type: "file", file: dest, width: 300, height: IMAGE.test(dest) ? 220 : 160 })
          }}
        />
      )}
      {askLink && (
        <LinkDialog
          onClose={() => setAskLink(false)}
          onPick={(url) => {
            setAskLink(false)
            create({ type: "link", url, width: 300, height: 80 })
          }}
        />
      )}
    </NoteSetContext.Provider>
  )
}

/** Endereço de um cartão de link (o Electron não tem `window.prompt`). */
function LinkDialog({ onClose, onPick }: { onClose(): void; onPick(url: string): void }) {
  const [url, setUrl] = useState("https://")
  const valid = /^https?:\/\/\S+\.\S+$/.test(url.trim())
  const confirm = () => valid && onPick(url.trim())
  return (
    <Modal
      title="Cartão de link"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={!valid} onClick={confirm}>Criar cartão</button>
        </>
      }
    >
      <label className="field">
        <span>Endereço</span>
        <input className="input" autoFocus inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirm()} aria-label="Endereço do link" />
      </label>
      <span className="small muted">O link abre no navegador; o app não busca nada na internet.</span>
    </Modal>
  )
}

function control(point: { x: number; y: number }, side: CanvasSide | undefined): { x: number; y: number } {
  const d = 70
  switch (side) {
    case "top":
      return { x: point.x, y: point.y - d }
    case "bottom":
      return { x: point.x, y: point.y + d }
    case "left":
      return { x: point.x - d, y: point.y }
    case "right":
      return { x: point.x + d, y: point.y }
    default:
      return point
  }
}

interface CardProps {
  node: CanvasNode
  selected: boolean
  editing: boolean
  readOnly: boolean
  onDown(event: ReactPointerEvent): void
  onResize(event: ReactPointerEvent): void
  onEdit(): void
  onText(text: string): void
  onDone(): void
  onMeasure(id: string, need: number | null): void
  onKey(event: ReactKeyboardEvent): void
  onFocus(element: HTMLElement): void
  hintId: string
}

/** Nome do cartão para leitores de tela: a primeira linha do texto, a nota, o link ou o grupo. */
function cardLabel(node: CanvasNode): string {
  if (node.type === "group") return `Grupo ${node.label || ""}`.trim()
  if (node.type === "file") return extname(node.file ?? "") === ".md" ? `Nota ${noteName(node.file ?? "")}` : `Arquivo ${(node.file ?? "").split("/").pop()}`
  if (node.type === "link") return `Link ${node.url ?? ""}`
  const first = (node.text ?? "").split("\n").map((line) => line.replace(/^[#>*\-\s]+/, "").replace(/[*_`~]|==|\[\[|\]\]/g, "").trim()).find(Boolean)
  return first ? `Cartão ${first.slice(0, 60)}` : "Cartão vazio"
}

function CanvasCard({ node, selected, editing, readOnly, onDown, onResize, onEdit, onText, onDone, onMeasure, onKey, onFocus, hintId }: CardProps) {
  const vault = useVault()
  const body = useRef<HTMLDivElement>(null)
  const [cut, setCut] = useState(false)
  const file = node.type === "file" ? node.file ?? "" : ""
  const noteText = file ? vault.index?.note(file)?.text : undefined
  const measured = node.type === "text" || (node.type === "file" && !IMAGE.test(file))
  // Mede se o texto passou da altura do cartão (CAM-7): mostra “continua” e informa o quadro, para Ajustar altura.
  useLayoutEffect(() => {
    const element = body.current
    if (!element || !measured || editing) return
    const measure = () => {
      const extra = element.scrollHeight - element.clientHeight
      setCut(extra > 2)
      onMeasure(node.id, extra > 2 ? Math.ceil(node.height + extra + 4) : null)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    return () => observer.disconnect()
  }, [measured, editing, node.id, node.text, node.width, node.height, noteText, onMeasure])
  const focusable = { tabIndex: 0, role: "group", "aria-roledescription": "cartão", "aria-label": cardLabel(node), "aria-describedby": hintId,
    onKeyDown: onKey, onFocus: (event: React.FocusEvent<HTMLDivElement>) => onFocus(event.currentTarget) }
  const color = colorCss(node.color)
  const style = { left: node.x, top: node.y, width: node.width, height: node.height, ...(color ? { ["--card" as string]: color } : {}) }
  const className = `canvas-card type-${node.type} ${selected ? "selected" : ""} ${color ? "colored" : ""}`
  const resize = !readOnly && selected && <span className="canvas-resize" onPointerDown={onResize} aria-hidden="true" />

  if (node.type === "group") {
    return (
      <div className={className} style={style} onPointerDown={onDown} data-node-id={node.id} {...focusable}>
        <span className="canvas-group-label">{node.label || "Grupo"}</span>
        {resize}
      </div>
    )
  }

  let content
  if (node.type === "text") {
    content = editing ? (
      <textarea className="canvas-textarea" autoFocus defaultValue={node.text ?? ""} onFocus={(e) => { const end = e.currentTarget.value.length; e.currentTarget.setSelectionRange(end, end) }} onBlur={(e) => { onText(e.target.value); onDone() }} onPointerDown={(e) => e.stopPropagation()} aria-label="Texto do cartão" />
    ) : node.text?.trim() ? (
      <Markdown source={node.text} className="canvas-md" />
    ) : (
      <span className="faint small">{readOnly ? "Cartão vazio" : "Dois cliques para escrever"}</span>
    )
  } else if (node.type === "file") {
    const note = vault.index?.note(file)
    const url = IMAGE.test(file) ? vault.platform.fileUrl(file) : null
    content = (
      <>
        <a
          className="canvas-file-title"
          href="#"
          onClick={(e) => {
            e.preventDefault()
            if (note) navigate(noteRoute(file))
            else if (!vault.index?.hasFile(file)) return
            else void vault.platform.openFile(file)
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {url ? <StickyNote size={13} /> : <FileText size={13} />} {extname(file) === ".md" ? noteName(file) : file.split("/").pop()}
        </a>
        {url ? (
          <img className="canvas-image" src={url} alt="" draggable={false} />
        ) : note ? (
          <Markdown source={excerpt(noteBody(note.text), node.subpath)} className="canvas-md" />
        ) : (
          <span className="small" style={{ color: "var(--red)" }}>“{file}” não está no cofre.</span>
        )}
      </>
    )
  } else if (node.type === "link") {
    content = (
      <a className="canvas-file-title" href={node.url} target="_blank" rel="noreferrer" onPointerDown={(e) => e.stopPropagation()}>
        <Link2 size={13} /> {node.url}
      </a>
    )
  } else {
    content = <span className="faint small">Tipo de cartão desconhecido ({node.type}); fica como está no arquivo.</span>
  }

  return (
    <div className={className} style={style} onPointerDown={onDown} onDoubleClick={(e) => { e.stopPropagation(); onEdit() }} data-node-id={node.id} {...focusable}>
      <div className="canvas-card-body" ref={body}>{measured && !editing ? <div className="canvas-card-content">{content}</div> : content}</div>
      {cut && <span className="canvas-more" aria-hidden="true">continua…</span>}
      {resize}
    </div>
  )
}

/** Começo da nota (ou da seção pedida) para caber no cartão. */
function excerpt(body: string, subpath?: string): string {
  let text = body
  if (subpath?.startsWith("#") && !subpath.startsWith("#^")) {
    const heading = subpath.slice(1).toLocaleLowerCase("pt-BR")
    const lines = body.split("\n")
    const start = lines.findIndex((l) => /^#{1,6}\s/.test(l) && l.replace(/^#{1,6}\s+/, "").trim().toLocaleLowerCase("pt-BR") === heading)
    if (start >= 0) text = lines.slice(start).join("\n")
  }
  return text.length > 900 ? `${text.slice(0, 900)}…` : text
}
