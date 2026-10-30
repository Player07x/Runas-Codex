import { openDocumentExport } from "../components/export/ExportDialog"
import { ResizablePanel } from "../components/ResizablePanel"
import { OverflowMenu, type MenuEntry } from "../components/kit/OverflowMenu"
import { useCallback, useDeferredValue, useEffect, useMemo, useState, type DragEvent, type HTMLAttributes, type ReactNode } from "react"
import { Archive, FileDown, ArrowUpDown, CalendarCheck, Check, ChevronDown, FilePlus2, FileText, Folder, FolderPlus, Hash, Heading, Lock, LockKeyhole, Network, PenLine, Pin, Plus, Replace, Search, Shuffle, Star, StarOff, Unlink, Vault } from "lucide-react"
import { bookmarkKey, bookmarkLabel, hasBookmark, type Bookmark } from "../core/bookmarks"
import { randomNote } from "../core/nav-history"
import { currentPath, openHere, openInNewTab, pruneLayout, split, type TabLayout } from "../core/tabs"
import { BaseScreen } from "../components/vault/QueryView"
import { TrashDialog } from "../components/vault/TrashDialog"
import { FolderAppearance, NoteIcon } from "../components/vault/Customization"
import { folderKey, usePreferences } from "../lib/customization"
import { ARCHIVE_FOLDER, isArchived, moveDestination, NOTE_COLORS, NOTE_ORDERS, noteFlags, sortNotes, type NoteOrder } from "../core/note-flags"
import { searchNotes } from "../core/search"
import { NotesLockScreen } from "../components/vault/NotesLock"
import { ReplaceDialog } from "../components/vault/ReplaceDialog"
import "../components/vault/note-actions.css"
import { toggleFavorite, useFavorites } from "../lib/bookmarks"
import { deleteWorkspace, IS_NOTE_WINDOW, OpenNoteContext, pruneTabs, saveWorkspace, setLayout, useSinglePane, useTabLayout, useWorkspaces, type OpenHow } from "../lib/tabs"
import { lockNotes, useNotesLock } from "../lib/notes-lock"
import { scopeOf } from "../core/spaces"
import { basename, dirname, joinPath, noteName } from "../core/text"
import type { IndexedNote, VaultIndex } from "../core/vault-index"
import { href, navigate } from "../lib/router"
import { flushOpenNotes, headingLinkText, noteRoute, vaultRoute } from "../lib/vault-notes"
import { ConfirmDialog, NameDialog, NewNoteDialog, RenameDialog } from "../components/vault/dialogs"
import { fillTemplate, formatDate } from "../core/templates"
import { GraphPage } from "../components/vault/GraphPage"
import { NoteView } from "../components/vault/NoteView"
import { VaultPanels } from "../components/vault/VaultPanels"
import { TabPanes } from "../components/vault/TabPanes"
import { WorkspaceMenu } from "../components/vault/WorkspaceMenu"
import { Empty, useToast } from "../components/ui"
import { useVault } from "../platform/VaultProvider"
import "./notes.css"

const NOTES_ROOT = "Notas/"
const SCOPE_KEY = "runas-codex:notas-escopo"
const ORDER_KEY = "runas-codex:notas-ordem"
/** Tipo dos dados do arrastar na árvore (o caminho da nota ou pasta). */
const DRAG_TYPE = "application/x-runas-codex-path"

export function NotesScreen({ noteId }: { noteId?: string }) {
  const vault = useVault()
  // Espaço Notas bloqueado por PIN neste aparelho: nada da tela aparece antes do PIN.
  const { locked } = useNotesLock()
  if (locked) return <NotesLockScreen />
  if (vault.loading && !vault.index) {
    return (
      <div className="page">
        <p className="muted">Abrindo o cofre…</p>
      </div>
    )
  }
  if (!vault.index || !vault.info) return <NoVault />
  return <VaultNotes key={vault.info.path} index={vault.index} noteId={noteId} />
}

function NoVault() {
  const vault = useVault()
  const toast = useToast()
  const run = (action: () => Promise<void>) => () => action().catch((error: unknown) => toast(error instanceof Error ? error.message : String(error)))
  return (
    <div className="page">
      <Empty title="Nenhum cofre aberto" action={<div className="row-wrap" style={{ justifyContent: "center" }}><button className="btn primary" onClick={run(vault.create)}><Plus size={16} /> Criar cofre novo</button><button className="btn" onClick={run(vault.choose)}><Vault size={16} /> Abrir pasta…</button></div>}>
        O cofre é uma pasta de notas Markdown, compatível com o Obsidian. Crie um cofre novo ou abra um que já existe
        (ele abre em somente leitura até você liberar a gravação).
        {vault.error && <span style={{ display: "block", color: "var(--red)", marginTop: 8 }}>{vault.error}</span>}
      </Empty>
    </div>
  )
}

type Dialog = { kind: "note"; folder: string } | { kind: "folder"; folder: string } | { kind: "rename-folder"; path: string } | { kind: "broken"; target: string; from?: string } | { kind: "unlock" }

interface TreeFolder {
  name: string
  path: string
  folders: Map<string, TreeFolder>
  notes: IndexedNote[]
}

function buildTree(notes: IndexedNote[], root: string, extraFolders: string[]): TreeFolder {
  const top: TreeFolder = { name: "", path: root.replace(/\/$/, ""), folders: new Map(), notes: [] }
  const folderFor = (folderPath: string): TreeFolder => {
    const rel = folderPath.slice(top.path ? top.path.length + 1 : 0)
    let node = top
    if (!rel || folderPath === top.path) return top
    for (const part of rel.split("/")) {
      const path = node.path ? `${node.path}/${part}` : part
      if (!node.folders.has(part)) node.folders.set(part, { name: part, path, folders: new Map(), notes: [] })
      node = node.folders.get(part)!
    }
    return node
  }
  for (const folder of extraFolders) if (folder.startsWith(root)) folderFor(folder)
  for (const note of notes) folderFor(dirname(note.path)).notes.push(note)
  return top
}

// T6: o resumo de cada nota sai de várias regex; com 10 mil notas, refazer a cada render travava a lista.
const previews = new WeakMap<IndexedNote, string>()
function preview(note: IndexedNote): string {
  const cached = previews.get(note)
  if (cached !== undefined) return cached
  const text = computePreview(note)
  previews.set(note, text)
  return text
}

function computePreview(note: IndexedNote): string {
  const body = note.meta.frontmatter ? note.text.slice(note.meta.frontmatter.end) : note.text
  return body
    .replace(/^#.*\n+/, "")
    .replace(/!?\[\[([^\]|#]*\/)?([^\]|#]+)(?:#[^\]|]*)?(?:\\?\|([^\]]*))?\]\]/g, (_m, _dir, name: string, label?: string) => label ?? name)
    .replace(/[#>*\-[\]=|`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
}

function uniqueName(index: VaultIndex, folder: string, base: string): string {
  const taken = new Set(index.allFiles().filter((f) => dirname(f.path) === folder).map((f) => noteName(f.path).toLocaleLowerCase("pt-BR")))
  for (let n = 0; ; n++) {
    const name = n ? `${base} ${n}` : base
    if (!taken.has(name.toLocaleLowerCase("pt-BR"))) return name
  }
}

function VaultNotes({ index, noteId }: { index: VaultIndex; noteId?: string }) {
  const vault = useVault()
  const preferences = usePreferences()
  const [trashOpen, setTrashOpen] = useState(false)
  const { hasPin } = useNotesLock()
  const toast = useToast()
  const readOnly = vault.info?.readOnly ?? true
  const hasNotesSpace = index.allFiles().some((f) => f.path.startsWith(NOTES_ROOT))
  const [wholeVault, setWholeVault] = useState(() => {
    try {
      return localStorage.getItem(SCOPE_KEY) === "cofre"
    } catch {
      return false
    }
  })
  const root = wholeVault || !hasNotesSpace ? "" : NOTES_ROOT
  const [query, setQuery] = useState("")
  const [showRight, setShowRight] = useState(false)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [heading, setHeading] = useState<{ line: number; at: number }>()
  const [createdFolders, setCreatedFolders] = useState<string[]>([])
  const [replacing, setReplacing] = useState(false)
  const [order, setOrder] = useState<NoteOrder>(() => {
    try {
      const saved = localStorage.getItem(ORDER_KEY)
      return NOTE_ORDERS.some((o) => o.order === saved) ? (saved as NoteOrder) : "nome"
    } catch {
      return "nome"
    }
  })
  const [orderMenu, setOrderMenu] = useState(false)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const fail = useCallback((error: unknown) => toast(error instanceof Error ? error.message : String(error)), [toast])

  const graph = noteId === "grafico"
  const path = noteId && noteId !== "nova" && noteId !== "hoje" && noteId !== "aleatoria" && !graph ? noteId : undefined
  const note = path ? index.note(path) : undefined
  const currentFolder = note ? dirname(note.path) : root.replace(/\/$/, "")

  useEffect(() => {
    try {
      localStorage.setItem(SCOPE_KEY, wholeVault ? "cofre" : "notas")
    } catch {
      /* só não é lembrado */
    }
  }, [wholeVault])

  useEffect(() => {
    try {
      localStorage.setItem(ORDER_KEY, order)
    } catch {
      /* só não é lembrada */
    }
  }, [order])

  // Rotas de ação: /notas/nova e /notas/hoje.
  useEffect(() => {
    if (noteId !== "nova" && noteId !== "hoje") return
    if (readOnly) {
      toast("Cofre em somente leitura: libere a gravação para criar notas.")
      navigate("/notas", { replace: true })
      return
    }
    if (noteId === "nova") {
      const folder = root.replace(/\/$/, "")
      vault.createNote(folder, uniqueName(index, folder, "Sem título")).then((created) => navigate(vaultRoute(created), { replace: true }), fail)
    } else {
      // Como o plugin Notas diárias do Obsidian: pasta, formato do nome e modelo de `.obsidian/daily-notes.json`.
      const { daily, templates } = vault.config
      const now = new Date()
      const relative = formatDate(now, daily.format)
      const daily_ = joinPath(daily.folder || (hasNotesSpace ? "Notas/Diário" : "Diário"), relative + ".md")!
      if (index.note(daily_)) navigate(vaultRoute(daily_), { replace: true })
      else {
        const template = daily.template ? index.note(daily.template + ".md")?.text : undefined
        const content = template !== undefined ? fillTemplate(template, { title: noteName(daily_), date: now, config: templates }) : `# ${now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}\n\n`
        vault.createNote(dirname(daily_), noteName(daily_), content).then((created) => navigate(vaultRoute(created), { replace: true }), fail)
      }
    }
  }, [noteId])

  const notes = useMemo(() => index.notesIn(root), [index, root, vault.version])
  const folders = useMemo(() => [...new Set([...index.allFiles().map((f) => dirname(f.path)), ...createdFolders])].filter(Boolean), [index, createdFolders, vault.version])
  const tree = useMemo(() => buildTree(notes, root, createdFolders), [notes, root, createdFolders])
  // A busca acompanha a digitação sem segurar cada tecla (T6): o React refaz a lista quando sobra tempo.
  const deferredQuery = useDeferredValue(useSettled(query, index.size > LARGE_VAULT ? 180 : 0))
  const results = useMemo(() => (deferredQuery.trim() ? searchNotes(index, deferredQuery, root, 80) : null), [index, deferredQuery, root, vault.version])
  const tags = useMemo(() => index.tags(root), [index, root, vault.version])
  const toWrite = useMemo(() => index.unresolved(root).slice(0, 30), [index, root, vault.version])
  const vaultId = vault.info?.path
  const favorites = useFavorites(vaultId)
  const layout = useTabLayout(vaultId)
  const workspaces = useWorkspaces(vaultId)
  const single = useSinglePane()

  // Abas e painéis (core/tabs.ts): a rota é a aba ativa do painel em foco. Abrir uma nota pela rota (lista, link,
  // favorito, paleta) troca essa aba; mexer nas abas muda a rota.
  const changeTabs = useCallback(
    (next: TabLayout, options?: { replace?: boolean }) => {
      setLayout(vaultId, next)
      const target = currentPath(next)
      if (target !== path) navigate(target ? vaultRoute(target) : "/notas", options)
    },
    [vaultId, path],
  )
  const openNote = useCallback(
    (target: string, how: OpenHow) => {
      if (how === "aba") setLayout(vaultId, (l) => openInNewTab(l, target))
      else if (how === "lado" || how === "baixo") setLayout(vaultId, (l) => split(l, target, how))
      navigate(vaultRoute(target))
    },
    [vaultId],
  )
  useEffect(() => {
    if (path) setLayout(vaultId, (l) => (currentPath(l) === path ? l : openHere(l, path)))
  }, [path, vaultId])
  // Sem nota na rota (/notas), o computador mostra a aba em foco; o celular mostra a lista.
  useEffect(() => {
    const target = currentPath(layout)
    if (!noteId && !single && target && index.hasFile(target)) navigate(vaultRoute(target), { replace: true })
  }, [noteId, single])
  // Abas de arquivos que sumiram (lixeira, apagados fora do app) fecham.
  useEffect(() => pruneTabs(vaultId, (p) => index.hasFile(p)), [vault.version, vaultId])
  useEffect(() => {
    const action = (event: Event) => {
      const kind = (event as CustomEvent<string>).detail, current = currentPath(layout)
      if (kind === "trash") setTrashOpen(true)
      if (kind === "workspace") document.querySelector<HTMLButtonElement>('button[aria-label="Workspaces"]')?.click()
      if (kind === "newbase") document.querySelector<HTMLButtonElement>('button[aria-label="Nova base"]')?.click()
      if (current && (kind === "split-right" || kind === "split-below")) changeTabs(split(layout, current, kind === "split-right" ? "lado" : "baixo"))
    }
    window.addEventListener("runas-codex:nota-acao", action)
    return () => window.removeEventListener("runas-codex:nota-acao", action)
  }, [layout, changeTabs])
  const fromObsidian = vault.config.bookmarks.filter((b) => !hasBookmark(favorites, b))

  // Nota aleatória do espaço (as arquivadas ficam de fora); a rota /notas/aleatoria é a da paleta de comandos.
  const pickRandom = useCallback(() => randomNote(index.notesIn(root).map((n) => n.path).filter((p) => !isArchived(p)), path), [index, root, path])
  useEffect(() => {
    if (noteId !== "aleatoria") return
    const picked = pickRandom()
    if (!picked) toast("Não há notas para sortear.")
    navigate(picked ? vaultRoute(picked) : "/notas", { replace: true })
  }, [noteId])

  // Arrastar nota ou pasta para outra pasta (ou para a raiz do espaço): move com os links, como "Renomear ou mover".
  const moveInto = async (from: string, folder: string) => {
    const isFolder = !index.hasFile(from)
    const result = moveDestination(from, folder, isFolder, (p) => index.hasFile(p) || folders.includes(p))
    if (!result) return
    if ("error" in result) return toast(result.error)
    try {
      await flushOpenNotes()
      const plan = await vault.rename(from, result.to)
      const changed = plan.edits.length ? ` Links atualizados em ${plan.edits.length} arquivo(s).` : ""
      toast(`${isFolder ? "Pasta movida" : "Nota movida"} para ${folder || "a raiz do cofre"}.${changed}`)
      // A nota aberta foi junto: a rota acompanha o caminho novo.
      if (note && (note.path === from || note.path.startsWith(from + "/"))) navigate(vaultRoute(result.to + note.path.slice(from.length)), { replace: true })
    } catch (error) {
      fail(error)
    }
  }
  const dragSource = (path: string) =>
    readOnly
      ? {}
      : {
          draggable: true,
          onDragStart: (event: DragEvent) => {
            event.stopPropagation()
            // Solta no editor como `[[link]]` (como no Obsidian), em vez do endereço da página.
            if (index.hasFile(path)) {
              event.dataTransfer.clearData()
              event.dataTransfer.setData("text/plain", `[[${index.linkTarget(path, note?.path ?? path)}]]`)
            }
            event.dataTransfer.setData(DRAG_TYPE, path)
            event.dataTransfer.effectAllowed = "copyMove"
          },
        }
  const dropZone = (folder: string) =>
    readOnly
      ? {}
      : {
          onDragOver: (event: DragEvent) => {
            if (!event.dataTransfer.types.includes(DRAG_TYPE)) return
            event.preventDefault()
            event.stopPropagation()
            event.dataTransfer.dropEffect = "move"
            if (dropTarget !== folder) setDropTarget(folder)
          },
          onDragLeave: (event: DragEvent) => {
            if (!(event.currentTarget as Node).contains(event.relatedTarget as Node | null)) setDropTarget((current) => (current === folder ? null : current))
          },
          onDrop: (event: DragEvent) => {
            const from = event.dataTransfer.getData(DRAG_TYPE)
            if (!from) return
            event.preventDefault()
            event.stopPropagation()
            setDropTarget(null)
            void moveInto(from, folder)
          },
        }

  const openFavorite = (b: Bookmark) => {
    if (b.type === "search") return setQuery(b.query)
    if (b.type === "folder") return setQuery(`path:"${b.path}/"`)
    if (!index.hasFile(b.path)) return toast(`“${bookmarkLabel(b)}” não existe mais no cofre.`)
    if (!/\.md$/i.test(b.path)) return navigate(noteRoute(b.path))
    navigate(vaultRoute(b.path))
    const wanted = b.subpath?.replace(/^#/, "").split("#").pop()
    const target = wanted ? index.note(b.path)?.meta.headings.find((h) => headingLinkText(h.text) === headingLinkText(wanted)) : undefined
    if (target) setHeading({ line: target.line, at: Date.now() })
  }
  const favoriteItem = (b: Bookmark, obsidian: boolean) => {
    const label = bookmarkLabel(b)
    const missing = b.type === "file" ? !index.hasFile(b.path) : b.type === "folder" ? Boolean(b.path) && !folders.includes(b.path) : false
    const Icon = b.type === "search" ? Search : b.type === "folder" ? Folder : b.subpath ? Heading : FileText
    return (
      <div key={(obsidian ? "obsidian:" : "") + bookmarkKey(b)} className="outline-row">
        <button className={`list-item small grow ${missing ? "favorite-missing" : ""}`} onClick={() => openFavorite(b)} title={missing ? "Não existe mais no cofre" : b.type === "search" ? `Buscar: ${b.query}` : b.path}>
          <Icon size={14} />
          <span className="grow truncate">{label}</span>
          {obsidian && <span className="chip" title="Marcador do Obsidian (.obsidian/bookmarks.json): mude por lá">Obsidian</span>}
        </button>
        {!obsidian && (
          <button className="icon-btn sm" title="Tirar dos favoritos" aria-label={`Tirar ${label} dos favoritos`} onClick={() => toggleFavorite(vaultId, b)}>
            <StarOff size={13} />
          </button>
        )}
      </div>
    )
  }
  const starButton = (b: Bookmark, name: string) => {
    const on = hasBookmark(favorites, b)
    return (
      <button className="icon-btn sm" title={on ? "Tirar dos favoritos" : "Favoritar"} aria-label={on ? `Tirar ${name} dos favoritos` : `Favoritar ${name}`} aria-pressed={on} onClick={(e) => (e.preventDefault(), toggleFavorite(vaultId, b))}>
        <Star size={13} fill={on ? "currentColor" : "none"} color={on ? "var(--gold)" : undefined} />
      </button>
    )
  }

  const openBroken = useCallback((target: string, from?: string) => (readOnly ? toast(`“${target}” ainda não existe.`) : setDialog({ kind: "broken", target, from })), [readOnly, toast])
  const onTag = useCallback((tag: string) => setQuery(`tag:${tag}`), [])

  const createFromBroken = async (target: string, from?: string) => {
    const clean = target.replace(/\.md$/i, "")
    const folder = clean.includes("/") ? dirname(clean) : (from ? scopeOf(from).root : root).replace(/\/$/, "") || currentFolder
    const created = await vault.createNote(folder, clean.includes("/") ? clean.slice(clean.lastIndexOf("/") + 1) : clean)
    navigate(vaultRoute(created))
  }

  const noteItem = (n: IndexedNote, extra?: ReactNode) => {
    const flags = noteFlags(n)
    return (
    <a
      key={n.path}
      href={href(vaultRoute(n.path))}
      data-note-path={n.path}
      {...dragSource(n.path)}
      // Ctrl+clique e botão do meio abrem numa aba nova (como no Obsidian).
      onClick={(event) => (event.ctrlKey || event.metaKey) && (event.preventDefault(), openNote(n.path, "aba"))}
      onAuxClick={(event) => event.button === 1 && (event.preventDefault(), openNote(n.path, "aba"))}
      className={`list-item note-item ${flags.color ? "colored" : ""} ${note?.path === n.path ? "active" : ""}`} style={{ ["--note" as string]: flags.color ? NOTE_COLORS[flags.color] : "transparent" }}>
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="truncate note-item-name" style={{ display: "block", fontWeight: 600 }}>
          {flags.pinned && <Pin size={12} className="note-pin" aria-label="fixada" />}
          <NoteIcon icon={String(n.meta.frontmatter?.data?.icone ?? "file")} color={flags.color} />{" "}
          {n.name}
        </span>
        <span className="truncate tiny faint" style={{ display: "block" }}>{extra ?? (preview(n) || "Vazia")}</span>
      </span>
    </a>
    )
  }

  const renderFolder = (folder: TreeFolder, depth: number): ReactNode => {
    // A pasta Arquivo do espaço fica por último e fechada; as notas fixadas vêm antes das outras.
    const isArchive = (sub: TreeFolder) => sub.path === `${NOTES_ROOT}${ARCHIVE_FOLDER}`
    // Pastas pelo nome (de Z a A só na ordem "Nome (Z a A)", como no Obsidian).
    const sign = order === "nome-desc" ? -1 : 1
    const subfolders = [...folder.folders.values()].sort((a, b) => Number(isArchive(a)) - Number(isArchive(b)) || sign * a.name.localeCompare(b.name, "pt-BR"))
    const items = sortNotes(folder.notes, order)
    const content = (
      <>
        {subfolders.map((sub) => (
          <LazyFolder key={sub.path} lazy={notes.length > LARGE_VAULT} initialOpen={depth < 1 && !isArchive(sub)} forceOpen={Boolean(note?.path.startsWith(sub.path + "/"))} className={`vault-folder ${dropTarget === sub.path ? "drop-target" : ""}`} zone={dropZone(sub.path)} summary={
            <summary className="eyebrow row" style={{ gap: 5 }} {...dragSource(sub.path)}>
              <ChevronDown size={13} className="folder-chevron" />
              {isArchive(sub) ? <Archive size={13} /> : <NoteIcon folder {...preferences.folders[folderKey(vault.info!.path, sub.path)]} />} <span className="grow truncate">{sub.name}</span>
            </summary>} actions={
              <span className="folder-actions">
                <button type="button" className="icon-btn sm" aria-label={`Exportar pasta ${sub.name}`} title="Exportar pasta…" onClick={e => { e.preventDefault(); e.stopPropagation(); openDocumentExport({ paths: index.notesIn(sub.path + "/").map(note => note.path), title: sub.name }) }}>↗</button>
                <FolderAppearance path={sub.path} />
                {starButton({ type: "folder", path: sub.path }, `a pasta ${sub.name}`)}
                {!readOnly && (
                  <>
                    <button className="icon-btn sm" title="Nova nota aqui" aria-label={`Nova nota em ${sub.name}`} onClick={(e) => (e.preventDefault(), setDialog({ kind: "note", folder: sub.path }))}>
                      <FilePlus2 size={13} />
                    </button>
                    <button className="icon-btn sm" title="Renomear ou mover pasta" aria-label="Renomear pasta" onClick={(e) => (e.preventDefault(), setDialog({ kind: "rename-folder", path: sub.path }))}>
                      <PenLine size={13} />
                    </button>
                  </>
                )}
              </span>
            }>
            {() => <div style={{ paddingLeft: 10 }}>{renderFolder(sub, depth + 1)}</div>}
          </LazyFolder>
        ))}
        <NoteChunks items={items} active={note?.path} render={noteItem} />
      </>
    )
    return content
  }

  const sep = "separator" as const
  const listMenu: MenuEntry[] = [
    ...(!readOnly ? [
      { label: "Nova pasta…", icon: <FolderPlus size={16} />, onSelect: () => setDialog({ kind: "folder", folder: currentFolder }) },
      { label: "Nota do dia", icon: <CalendarCheck size={16} />, onSelect: () => navigate("/notas/hoje") },
    ] : []),
    { label: "Nota aleatória", icon: <Shuffle size={16} />, onSelect: () => { const picked = pickRandom(); if (picked) navigate(vaultRoute(picked)); else toast("Não há notas para sortear.") } },
    { label: "Gráfico", icon: <Network size={16} />, onSelect: () => navigate("/notas/grafico") },
    sep,
    ...(!readOnly ? [{ label: "Buscar e substituir…", icon: <Replace size={16} />, onSelect: () => void flushOpenNotes().then(() => setReplacing(true)) }] : []),
    { label: "Exportar…", icon: <FileDown size={16} />, onSelect: () => openDocumentExport({ paths: index.notesIn(currentFolder ? currentFolder + "/" : root).map((note) => note.path), title: currentFolder || root || vault.info?.name || "Notas" }) },
    { label: "Lixeira do cofre…", icon: <Archive size={16} />, onSelect: () => setTrashOpen(true) },
    ...(hasPin ? [{ label: "Bloquear as Notas", icon: <LockKeyhole size={16} />, onSelect: lockNotes }] : []),
  ]

  return (
    <div className={`workspace ${path || graph ? "" : "show-left"} ${showRight ? "show-right" : ""} ${graph ? "no-right" : ""}`}>
      <ResizablePanel id="notes-left" label="Lista de notas" side="left" width={280} className="pane-left">
        <div className="pane-head">
          {/* Cabeçalho da lista (rework F4a, NOT-1): título, uma ação principal e o resto no ⋯, com nome. */}
          <div className="row between notes-head">
            <strong className="truncate">{root ? "Notas" : vault.info?.name}</strong>
            <div className="row" style={{ gap: 4 }}>
              {!readOnly && <button className="btn sm primary notes-new" onClick={() => setDialog({ kind: "note", folder: currentFolder })}><Plus size={15} /> Nova nota</button>}
              <OverflowMenu label="Ações das notas" items={listMenu} />
            </div>
          </div>
          <div className="row notes-filter">
            <label className="search grow">
              <Search size={15} />
              <input className="input" placeholder="Buscar (tag:, path:, line:, [prop:valor], /regex/)" title="Termos, “frase”, -excluir, OR, path:, file:, tag:, content:, line:(…), section:(…), [propriedade], [propriedade:valor] e /regex/" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar notas" />
            </label>
            <button className="icon-btn sm" title={`Ordem: ${NOTE_ORDERS.find((o) => o.order === order)!.label}`} aria-label={`Ordem das notas: ${NOTE_ORDERS.find((o) => o.order === order)!.label}`} aria-expanded={orderMenu} onClick={() => setOrderMenu(!orderMenu)}>
              <ArrowUpDown size={16} />
            </button>
          </div>
          {orderMenu && (
            <div className="card tight order-menu" role="menu" aria-label="Ordem das notas">
              {NOTE_ORDERS.map((o) => (
                <button key={o.order} role="menuitemradio" aria-checked={o.order === order} className="list-item small" onClick={() => (setOrder(o.order), setOrderMenu(false))}>
                  <Check size={14} style={{ visibility: o.order === order ? "visible" : "hidden" }} /> {o.label}
                </button>
              ))}
            </div>
          )}
          {hasNotesSpace && (
            <div className="segmented" role="group" aria-label="Onde mostrar">
              <button className={!wholeVault ? "active" : ""} aria-pressed={!wholeVault} onClick={() => setWholeVault(false)} aria-label="Mostrar só o espaço Notas">
                Espaço Notas
              </button>
              <button className={wholeVault ? "active" : ""} aria-pressed={wholeVault} onClick={() => setWholeVault(true)} aria-label="Mostrar o cofre inteiro">
                Cofre inteiro
              </button>
            </div>
          )}
          {readOnly && (
            <button className="proto-note" style={{ cursor: "pointer", textAlign: "left" }} onClick={() => setDialog({ kind: "unlock" })}>
              <Lock size={14} /> Somente leitura — liberar gravação
            </button>
          )}
        </div>
        <div className={`pane-body ${dropTarget === root.replace(/\/$/, "") ? "drop-root" : ""}`} data-vault-tree style={{ gap: 12 }} {...dropZone(root.replace(/\/$/, ""))}>
          {results ? (
            <div className="stack" style={{ gap: 4 }}>
              <span className="eyebrow row between">
                {results.length} resultado(s)
                {starButton({ type: "search", query: query.trim() }, "esta busca")}
              </span>
              {results.error && <span className="small" role="alert" style={{ color: "var(--red)" }}>{results.error}</span>}
              <div className="list">{results.map((hit) => noteItem(index.note(hit.path)!, hit.snippet || hit.path))}</div>
            </div>
          ) : null}
          {!results && favorites.length + fromObsidian.length > 0 && (
            <details className="vault-folder" open>
              <summary className="eyebrow row" style={{ gap: 5 }}>
                <ChevronDown size={13} className="folder-chevron" /> <Star size={13} /> Favoritos · {favorites.length + fromObsidian.length}
              </summary>
              <div className="list">
                {favorites.map((b) => favoriteItem(b, false))}
                {fromObsidian.map((b) => favoriteItem(b, true))}
              </div>
            </details>
          )}
          {results ? null : notes.length === 0 ? (
            <span className="muted small">{root ? "O espaço Notas está vazio." : "Nenhuma nota .md neste cofre."}</span>
          ) : (
            renderFolder(tree, 0)
          )}
          {!results && <details className="vault-folder">
            <summary className="eyebrow">Bases · {index.allFiles().filter(f => /\.base$/i.test(f.path)).length}</summary>
            <div className="list">
              {index.allFiles().filter(f => /\.base$/i.test(f.path)).map(file => <button key={file.path} className="list-item small" onClick={() => openNote(file.path, "aba")}>{basename(file.path)}</button>)}
              {!readOnly && <button className="btn sm" aria-label="Nova base" onClick={() => {
                let n = 0, target: string
                do { target = joinPath(currentFolder, `Base de notas${n ? ` ${n}` : ""}.base`)!; n++ } while (index.hasFile(target))
                void vault.createFile(target, `filters:\n  and:\n    - file.inFolder(${JSON.stringify(root.replace(/\/$/, ""))})\nviews:\n  - type: table\n    name: Notas\n    order: [file.name, file.tags]\n    sort:\n      - property: file.name\n        direction: ASC\n`).then(p => openNote(p, "aba"), fail)
              }}>Nova base</button>}
            </div>
          </details>}
          {!results && tags.length > 0 && (
            <details className="vault-folder">
              <summary className="eyebrow row" style={{ gap: 5 }}>
                <ChevronDown size={13} className="folder-chevron" /> <Hash size={13} /> Tags · {tags.length}
              </summary>
              <div className="row-wrap" style={{ padding: "6px 2px" }}>
                {tags.map((t) => (
                  <button key={t.tag} className="chip" onClick={() => onTag(t.tag)}>
                    #{t.tag} <span className="faint">{t.count}</span>
                  </button>
                ))}
              </div>
            </details>
          )}
          {!results && toWrite.length > 0 && (
            <details className="vault-folder">
              <summary className="eyebrow row" style={{ gap: 5 }}>
                <ChevronDown size={13} className="folder-chevron" /> <Unlink size={13} /> A escrever · {toWrite.length}
              </summary>
              <div className="list">
                {toWrite.map((u) => (
                  <button key={u.target} className="list-item small" onClick={() => openBroken(u.target, u.from[0])} title={`Citada em: ${u.from.map(noteName).join(", ")}`}>
                    <span className="grow truncate" style={{ color: "var(--red)" }}>{u.target}</span>
                    <span className="meta">{u.from.length}×</span>
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
      </ResizablePanel>

      <section className={`pane-center ${graph ? "graph" : "tabs-host"}`}>
        {graph ? (
          <GraphPage index={index} root={root} version={vault.version} onBroken={(target) => openBroken(target)} />
        ) : path && !index.hasFile(path) ? (
          <div className="page">
            <p className="muted">Nota não encontrada no cofre (foi renomeada ou apagada?).</p>
          </div>
        ) : (
          <OpenNoteContext.Provider value={openNote}>
            <TabPanes
              layout={layout}
              onChange={changeTabs}
              label={(p) => (/\.md$/i.test(p) ? noteName(p) : basename(p))}
              treeDragType={DRAG_TYPE}
              single={single}
              onOpenWindow={vault.platform.openWindow ? (p) => void vault.platform.openWindow!(vaultRoute(p)).catch(fail) : undefined}
              stripEnd={
                !IS_NOTE_WINDOW && (
                  <WorkspaceMenu
                    workspaces={workspaces}
                    onSave={(name) => (saveWorkspace(vaultId, name, showRight), toast(`Workspace “${name}” guardado neste aparelho.`))}
                    onOpen={(name) => {
                      const saved = workspaces[name]
                      if (!saved) return
                      changeTabs(pruneLayout(saved.layout, (p) => index.hasFile(p)))
                      setShowRight(saved.rightPanel)
                    }}
                    onDelete={(name) => deleteWorkspace(vaultId, name)}
                  />
                )
              }
              renderTab={(tabPath, _pane, focused) =>
                /\.base$/i.test(tabPath) && index.hasFile(tabPath) ? <BaseScreen key={tabPath} path={tabPath} /> : index.note(tabPath) ? (
                  <NoteView focused={focused} key={tabPath} path={tabPath} folders={folders} onShowPanel={() => setShowRight(!showRight)} onBack={() => navigate("/notas")} onCreate={(t) => openBroken(t, tabPath)} onTag={onTag} headingRequest={focused ? heading : undefined} />
                ) : (
                  <div className="page">
                    <p className="muted">“{basename(tabPath)}” não abre aqui.</p>
                  </div>
                )
              }
            />
          </OpenNoteContext.Provider>
        )}
      </section>

      <ResizablePanel id="notes-right" label="Detalhes da nota" side="right" width={300} className="pane-right" hidden={graph}>
        {note && <VaultPanels index={index} path={note.path} readOnly={readOnly} onCreate={(t) => openBroken(t, note.path)} onSetProperty={(key, value) => vault.setProperty(note.path, key, value)} onHeading={(line) => setHeading({ line, at: Date.now() })} onSaveNote={vault.save} />}
      </ResizablePanel>

      {!readOnly && (
        <button className="fab" onClick={() => setDialog({ kind: "note", folder: currentFolder })} aria-label="Nova nota (atalho)">
          <Plus size={22} />
        </button>
      )}

      {replacing && (
        <ReplaceDialog
          index={index}
          paths={results ? results.map((hit) => hit.path) : notes.map((n) => n.path)}
          scopeLabel={results ? `as ${results.length} notas da busca “${query}”` : root ? "o espaço Notas" : "o cofre inteiro"}
          onClose={() => setReplacing(false)}
        />
      )}
      {trashOpen && <TrashDialog root={root.replace(/\/$/, "")} onClose={() => setTrashOpen(false)} />}
      {dialog?.kind === "note" && (
        <NewNoteDialog
          initial={uniqueName(index, dialog.folder, "Sem título")}
          hint={`Em: ${dialog.folder || "raiz do cofre"}`}
          templates={vault.templates().map((t) => t.path)}
          onClose={() => setDialog(null)}
          onConfirm={async (name, templatePath) => {
            const template = templatePath ? index.note(templatePath)?.text : undefined
            const content = template !== undefined ? fillTemplate(template, { title: name, date: new Date(), config: vault.config.templates }) : ""
            navigate(vaultRoute(await vault.createNote(dialog.folder, name, content)))
          }}
        />
      )}
      {dialog?.kind === "folder" && (
        <NameDialog
          title="Nova pasta"
          label="Nome da pasta"
          hint={`Dentro de: ${dialog.folder || "raiz do cofre"}`}
          confirmLabel="Criar"
          onClose={() => setDialog(null)}
          onConfirm={async (name) => {
            const folder = joinPath(dialog.folder, name)!
            await vault.createFolder(folder)
            setCreatedFolders((list) => [...list, folder])
          }}
        />
      )}
      {dialog?.kind === "rename-folder" && (
        <RenameDialog
          index={index}
          path={dialog.path}
          isFolder
          folders={folders}
          onClose={() => setDialog(null)}
          onRename={async (to) => {
            const plan = await vault.rename(dialog.path, to)
            setCreatedFolders((list) => list.map((f) => (f === dialog.path ? to : f)))
            toast(plan.edits.length ? `Pasta renomeada; links atualizados em ${plan.edits.length} arquivo(s)` : "Pasta renomeada")
            if (note && note.path.startsWith(dialog.path + "/")) navigate(vaultRoute(to + note.path.slice(dialog.path.length)))
          }}
        />
      )}
      {dialog?.kind === "broken" && (
        <ConfirmDialog title="Criar nota" confirmLabel="Criar" onClose={() => setDialog(null)} onConfirm={() => createFromBroken(dialog.target, dialog.from)}>
          “{dialog.target}” ainda não existe. Criar agora{dialog.from ? ` no espaço de “${noteName(dialog.from)}”` : ""}?
        </ConfirmDialog>
      )}
      {dialog?.kind === "unlock" && (
        <ConfirmDialog title="Liberar gravação" confirmLabel="Liberar" onClose={() => setDialog(null)} onConfirm={() => vault.setWritable(true)}>
          O app passa a poder criar, editar, renomear e mandar notas para a lixeira neste cofre. Antes, ele faz um backup das
          notas (fora do cofre). Arquivos que você não editar não são regravados.
        </ConfirmDialog>
      )}
    </div>
  )
}

/**
 * Pasta da árvore que, em cofre grande (`lazy`), só desenha o conteúdo quando aberta (T6): com 10 mil notas, as pastas
 * fechadas desenhavam tudo escondido. Em cofre pequeno continua tudo no DOM, como antes (a busca do navegador e o
 * smoke do Electron contam com isso). Abre sozinha quando a nota aberta está dentro dela.
 */
function LazyFolder({ lazy, initialOpen, forceOpen, className, zone, summary, actions, children }: { lazy: boolean; initialOpen: boolean; forceOpen: boolean; className: string; zone: HTMLAttributes<HTMLElement>; summary: ReactNode; actions: ReactNode; children: () => ReactNode }) {
  const [open, setOpen] = useState(initialOpen || forceOpen)
  useEffect(() => { if (forceOpen) setOpen(true) }, [forceOpen])
  // Os botões da pasta ficam fora do <summary> (T7: controle dentro de controle confunde teclado e leitor de tela).
  return (
    <div className="vault-folder-wrap">
      <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className={className} {...zone}>
        {summary}
        {(open || !lazy) && children()}
      </details>
      {actions}
    </div>
  )
}

const CHUNK = 200

/** Notas de uma pasta em partes de 200, com “Mostrar mais” (T6); a nota aberta sempre entra na parte mostrada. */
function NoteChunks({ items, active, render }: { items: IndexedNote[]; active?: string; render(note: IndexedNote): ReactNode }) {
  const [limit, setLimit] = useState(CHUNK)
  const activeAt = active ? items.findIndex((n) => n.path === active) : -1
  const shown = Math.max(limit, activeAt + 1)
  return (
    <div className="list">
      {items.slice(0, shown).map((n) => render(n))}
      {items.length > shown && (
        <button type="button" className="btn sm ghost notes-more" onClick={() => setLimit(shown + CHUNK)}>
          Mostrar mais {Math.min(CHUNK, items.length - shown)} de {items.length - shown} restantes
        </button>
      )}
    </div>
  )
}

/** A partir de quantas notas a busca espera uma pausa na digitação (T6). */
const LARGE_VAULT = 2000

/** O valor depois de `delay` ms sem mudar (0 devolve na hora). */
function useSettled<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    if (!delay) return setSettled(value)
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return delay ? settled : value
}
