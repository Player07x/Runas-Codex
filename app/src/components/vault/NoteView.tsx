import { formatterInsertion } from "../../core/formatter-insertion"
import { createPortal } from "react-dom"
import { openDocumentExport } from "../export/ExportDialog"
import { imageLinkAt, linkedImages } from "../../core/images"
import { ImageRenameDialog, NoteImagesDialog } from "./NoteImages"
import { flushOpenNotes } from "../../lib/vault-notes"
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react"
import { Archive, ArchiveRestore, ArrowLeft, ArrowRight, BookOpenText, ChevronLeft, Code2, Copy, FileDown, History, ImagePlus, Images, LayoutTemplate, Link2, Merge, PanelRight, PenLine, Pin, PinOff, Scissors, Star, SwatchBook, Trash2, Type } from "lucide-react"
import { attachmentEmbed, imageExtension, pastedImageName } from "../../core/attachments"
import { blockRefAt } from "../../core/block-ref"
import { deepLinkFor } from "../../core/deep-link"
import { archivePath, NOTE_COLORS, noteFlags, unarchivePath, type NoteColor } from "../../core/note-flags"
import { scopeOf } from "../../core/spaces"
import { fillTemplate, insertTemplate } from "../../core/templates"
import { dirname, extname, foldName, noteName, textToSave, toEditorText } from "../../core/text"
import { splitFrontmatter } from "../../lib/links"
import { NoteSetContext } from "../../lib/note-set"
import { goBack, goForward, navigate, useNavHistory } from "../../lib/router"
import { hasBookmark } from "../../core/bookmarks"
import { toggleFavorite, useFavorites } from "../../lib/bookmarks"
import { useOpenNote } from "../../lib/tabs"
import { AUDIO_EXT, IMAGE_EXT, VIDEO_EXT } from "../../markdown/Embed"
import { TaskCheckboxContext, toggledTaskLines, type TaskCheckboxHandler } from "../../markdown/extensions"
import { checkboxLines } from "../../markdown/task-checkboxes"
import { editForLine, toggleLineCommand } from "../../core/tasks/edit"
import { statusRegistry } from "../../core/tasks/settings"
import { currentParseContext, tasksSettingsOf } from "../../lib/tasks"
import { TaskEditDialog } from "../tasks/TaskEditDialog"
import { copyLinkTarget, copyText, onFlushRequest, vaultNoteSet, vaultRoute } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { Markdown } from "../Markdown"
import { Modal, Segmented, useToast } from "../ui"
import { ConfirmDialog, LinkPicker, RenameDialog, TemplatePicker } from "./dialogs"
import { LINK_SELECTOR, targetOf, useLinkPreview } from "./LinkPreview"
import type { LivePreviewHost } from "./live-preview"
import { SourceEditor, type EditorSelectionInfo, type SourceEditorHandle } from "./SourceEditor"
import "./note-actions.css"
import { NoteTools, type NoteToolsHandle } from "./NoteTools"
import { OverflowMenu, type MenuEntry } from "../kit/OverflowMenu"
import { Notice, SaveStatus } from "../kit/Layout"
import { FormatGallery } from "../editor/FormatGallery"
import { SelectionBar, type SelectionAction } from "../editor/SelectionBar"
import { KeyboardBar } from "../editor/KeyboardBar"
import { useNarrow } from "../editor/use-narrow"
import { isBlockSyntax, type FormatterEntry } from "../../core/formatters"
import { textStats } from "../../core/note-tools"
import { countWords } from "../../core/books"
import { shortcutLabel, shortcutText, type ShortcutAction } from "../../core/shortcuts"
import { usePreferences } from "../../lib/customization"
import { updateAppearance, useAppearance } from "../../lib/appearance"
import { ICON_LABELS, NOTE_ICONS } from "./Customization"

/** Os três modos do Obsidian: leitura, live preview ("Editar") e código-fonte. */
export type ViewMode = "leitura" | "live" | "fonte"

const MODE_KEY = "runas-codex:modo-nota"
/** O modo fica lembrado por espaço (quem consulta a Wiki costuma ficar em Leitura); o valor antigo, de todo o app, vale até a primeira troca. */
const modeKey = (path: string) => `${MODE_KEY}:${scopeOf(path).space ?? "outros"}`

function savedMode(path: string): ViewMode {
  try {
    const value = localStorage.getItem(modeKey(path)) ?? localStorage.getItem(MODE_KEY)
    return value === "leitura" || value === "fonte" ? value : "live"
  } catch {
    return "live"
  }
}
type SaveState = "salvo" | "pendente" | "salvando" | "conflito" | "erro"

const AUTOSAVE_MS = 800

/** O que o leitor sabe mostrar dentro da nota (os outros tipos não viram anexo pelo editor). */
const isMedia = (name: string) => {
  const ext = extname(name)
  return IMAGE_EXT.has(ext) || AUDIO_EXT.has(ext) || VIDEO_EXT.has(ext) || ext === ".pdf"
}

/** O que o painel Apoio e as ações da seleção de Livros podem fazer no editor da nota. */
export interface NoteEditorApi {
  /** Texto do editor agora (com o frontmatter). */
  text: string
  insert(text: string, at?: number): void
  /** Troca o texto inteiro (um passo só no desfazer). */
  replaceAll(change: (text: string) => string): void
  selection(): { from: number; to: number } | null
  /** Seleciona um trecho e rola até ele. */
  select(from: number, to?: number): void
  focus(): void
}

interface Props {
  /** Onde ficam os controles da nota quando ela não tem barra própria (Livros: estado e menu do capítulo). */
  focusHeader?: HTMLElement | null
  /** Livros: o modo é Visual ⇄ Código, na barra de status; Leitura é a própria Prévia do livro. */
  variant?: "livro"
  /** Itens a mais na barra de status (Livros: palavras do livro, máquina de escrever). */
  statusExtra?: ReactNode
  hideBackControl?: boolean
  formatSelection?: boolean
  typewriter?: boolean
  focused?: boolean
  path: string
  folders: string[]
  onShowPanel(): void
  /** Estado do painel ao lado, para o `aria-expanded` do botão Painel, e o que ele mostra (dica do botão). */
  panelOpen?: boolean
  panelHint?: string
  onBack(): void
  onTrashed?(): void
  onCreate(target: string): void
  onTag(tag: string): void
  /** Observação do rascunho para prévias; não grava nem substitui o autosave. */
  onDraftChange?: (text: string) => void
  /** Painel ao lado do editor (Livros: Apoio); mexe no texto só pelo editor, sem outro fluxo de gravação. */
  sidebar?: (editor: NoteEditorApi) => ReactNode
  /** Ações a mais na barra da seleção (Livros: Comentar, Citar da Wiki). */
  selectionActions?: (editor: NoteEditorApi) => SelectionAction[]
  /** Formatadores do espaço: aba própria na galeria e seção no menu `/` (a Wiki põe os recursos dela). */
  extraFormatters?: readonly FormatterEntry[]
  /** Pedido de rolar até um título (linha), vindo do sumário. */
  headingRequest?: { line: number; at: number }
  /** Livros: leva o cursor a uma linha (a partir de 0) sem trocar de modo (clique num título da prévia ao lado). */
  lineRequest?: { line: number; at: number }
  /** Livros: linha do cursor (a partir de 1) a cada movimento, para a prévia ao lado acompanhar. */
  onCursorLine?(line: number): void
  /** `false` esconde os segredos do mestre no modo leitura (versão dos jogadores). */
  showSecrets?: boolean
}

/**
 * Uma nota do cofre: leitura ou código-fonte (o live preview chega na etapa 3b). Grava sozinha depois de uma pausa na
 * digitação e sempre com a versão lida — se o arquivo mudou fora do app, avisa em vez de sobrescrever.
 */
export function NoteView({ path, folders, onShowPanel, panelOpen, panelHint = "Links, propriedades e gráfico local", onBack, onTrashed, onCreate, onTag, headingRequest, lineRequest, onCursorLine, selectionActions, extraFormatters, sidebar, showSecrets = true, onDraftChange, typewriter, focused = true, focusHeader, hideBackControl = false, variant, statusExtra }: Props) {
  const vault = useVault()
  const toast = useToast()
  const history = useNavHistory()
  const openNote = useOpenNote()
  const favorites = useFavorites(vault.info?.path)
  const favorite = hasBookmark(favorites, { type: "file", path })
  const index = vault.index!
  const note = index.note(path)!
  const readOnly = vault.info?.readOnly ?? true
  const book = variant === "livro"
  const [mode, setModeState] = useState<ViewMode>(() => (readOnly ? "leitura" : book && savedMode(path) === "leitura" ? "live" : savedMode(path)))
  // Ctrl+Shift+E sai do Código para o modo de antes.
  const beforeCode = useRef<ViewMode>("live")
  const setMode = (next: ViewMode) => {
    if (next === "fonte" && mode !== "fonte") beforeCode.current = mode
    setModeState(next)
    if (readOnly) return
    try {
      localStorage.setItem(modeKey(path), next)
    } catch {
      /* só não é lembrado */
    }
  }
  const [base, setBase] = useState(note.text)
  const [draft, setDraft] = useState(() => toEditorText(note.text))
  useEffect(() => { onDraftChange?.(draft) }, [draft, onDraftChange])
  const [docKey, setDocKey] = useState(0)
  const [state, setState] = useState<SaveState>("salvo")
  const [error, setError] = useState<string>()
  const [dialog, setDialog] = useState<"rename" | "trash" | "link" | "template" | "decorate" | "images" | null>(null)
  const [gallery, setGallery] = useState(false)
  // Barra da seleção, posição do cursor (barra de status) e foco no editor (barra sobre o teclado, no celular).
  const [selectionAt, setSelectionAt] = useState<EditorSelectionInfo | null>(null)
  const [barFocused, setBarFocused] = useState(false)
  const [cursorAt, setCursorAt] = useState({ line: 1, column: 1 })
  const [editorFocused, setEditorFocused] = useState(false)
  const [linkLabel, setLinkLabel] = useState("")
  const narrow = useNarrow()
  const appearance = useAppearance()
  const shortcuts = usePreferences().shortcuts
  const keyHint = (action: ShortcutAction) => (vault.platform.kind === "capacitor" ? undefined : shortcutText(shortcutLabel(action, shortcuts)))
  const [imageRename, setImageRename] = useState<string | null>(null)
  // "Criar ou editar tarefa" (Tasks) na linha do cursor.
  const [taskEdit, setTaskEdit] = useState<{ line: number; text: string } | null>(null)
  const renameImage = (image: string) => { void flushOpenNotes().then(() => setImageRename(image), error => toast(String(error))) }
  const editor = useRef<SourceEditorHandle>(null)
  const tools = useRef<NoteToolsHandle>(null)
  const surface = useRef<HTMLDivElement>(null)
  const selectionBar = useRef<HTMLDivElement>(null)
  const reader = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // Referências para gravar fora do ciclo do React (troca de nota, saída da tela).
  const latest = useRef({ path, base, draft, readOnly, save: vault.save, index })
  latest.current = { path, base, draft, readOnly, save: vault.save, index }
  const saving = useRef<Promise<void> | null>(null)
  const ownSave = useRef<{ path: string; text: string } | null>(null)
  const saveError = useRef<string | null>(null)

  const flush = useCallback(async () => {
    if (saving.current) await saving.current
    const { path: target, base: original, draft: content, readOnly: locked, save } = latest.current
    if (locked) return
    const next = textToSave(original, content)
    if (next === null) {
      saveError.current = null
      setState("salvo")
      return
    }
    const onDisk = latest.current.index.note(target)?.text
    if (onDisk !== original && onDisk !== next) {
      saveError.current = "Esta nota mudou fora do app enquanto você editava."
      setState("conflito"); setError(saveError.current); return
    }
    saveError.current = null
    ownSave.current = { path: target, text: next }
    setState("salvando")
    const run = save(target, next).then(
      () => {
        if (latest.current.path === target) {
          latest.current.base = next
          setBase(next)
          setState(toEditorText(next) === latest.current.draft ? "salvo" : "pendente")
        }
      },
      (err: unknown) => {
        if (ownSave.current?.path === target && ownSave.current.text === next) ownSave.current = null
        const message = err instanceof Error ? err.message : String(err)
        saveError.current = message
        setError(message)
        setState(message.includes("mudou fora do app") ? "conflito" : "erro")
      },
    )
    saving.current = run
    try { await run } finally { if (saving.current === run) saving.current = null }
  }, [])
  const flushChecked = useCallback(async () => { await flush(); if (saveError.current) throw new Error(saveError.current) }, [flush])

  // Grava ao sair da nota (a tela monta um NoteView por nota, com `key={path}`).
  useEffect(() => () => void flush(), [path, flush])
  // Grava quando a árvore vai mover ou substituir notas (lib/vault-notes.ts).
  useEffect(() => onFlushRequest(flushChecked), [flushChecked])

  // Pausa na digitação → grava.
  useEffect(() => {
    if (readOnly || state === "conflito" || textToSave(base, draft) === null) return
    setState("pendente")
    const timer = setTimeout(() => void flush(), AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [draft])

  // Mudança no disco (Obsidian, sincronização): sem edição pendente, recarrega; com edição, avisa.
  useEffect(() => {
    if (note.text === base) return
    // A própria gravação do app (o índice muda antes de a promessa voltar).
    // O usuário pode já ter continuado a digitar: o texto confirmado ainda é nosso, embora o rascunho seja maior.
    if (ownSave.current?.path === path && ownSave.current.text === note.text) {
      ownSave.current = null
      setBase(note.text)
      return
    }
    if (toEditorText(note.text) === draft) {
      setBase(note.text)
      return
    }
    if (textToSave(base, draft) === null) {
      setBase(note.text)
      setDraft(toEditorText(note.text))
      setDocKey((k) => k + 1)
      setState("salvo")
    } else {
      setState("conflito")
      setError("Esta nota mudou fora do app enquanto você editava.")
    }
  }, [note.text])

  const reloadFromDisk = () => {
    saveError.current = null
    setBase(note.text)
    setDraft(toEditorText(note.text))
    setDocKey((k) => k + 1)
    setState("salvo")
    setError(undefined)
  }
  const keepMine = () => {
    // A versão do disco vira a base: a próxima gravação substitui o arquivo pelo texto do editor.
    setBase(note.text)
    setState("pendente")
    setError(undefined)
    setTimeout(() => void flush())
  }

  // Imagem importada, colada ou solta vai para a pasta comum; demais anexos seguem a configuração do Obsidian.
  const addFiles = useCallback(
    async (files: File[], at: number | null, pasted: boolean) => {
      const links: string[] = []
      for (const file of files) {
        const ext = imageExtension(file.type) ?? extname(file.name)
        const name = pasted || !file.name ? pastedImageName(new Date(), ext) : file.name
        if (!isMedia(name)) {
          toast(`“${file.name || "Arquivo colado"}” não é imagem, áudio, vídeo nem PDF; o app não anexa esse tipo na nota.`)
          continue
        }
        try {
          const saved = await vault.addAttachment(name, new Uint8Array(await file.arrayBuffer()), path)
          links.push(attachmentEmbed(saved, path, vault.config.app, vault.index!))
        } catch (err) {
          toast(err instanceof Error ? err.message : String(err))
        }
      }
      if (links.length) setTimeout(() => editor.current?.insertBlock(links.join("\n"), at ?? undefined))
    },
    [vault, path, toast],
  )

  const noteSet = useMemo(() => vaultNoteSet(index, path, { onBroken: onCreate, onTag }, vault.platform), [index, path, onCreate, onTag, vault.version, vault.platform])
  const previewHost = useMemo<LivePreviewHost>(
    () => ({
      noteSet: () => noteSet,
      openWiki(target) {
        const name = target.split("#")[0]!
        if (!name) return
        const found = noteSet.resolve?.(name, "wiki")
        if (found) navigate(found.route)
        else onCreate(name)
      },
      openUrl(url) {
        if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
          window.open(url, "_blank", "noreferrer")
          return
        }
        let target = url
        try {
          target = decodeURIComponent(url)
        } catch {
          /* fica como está */
        }
        const found = noteSet.resolve?.(target.split("#")[0]!, "markdown")
        if (found) navigate(found.route)
      },
      openTag: onTag,
    }),
    [noteSet, onCreate, onTag],
  )
  const suggestLinks = useCallback(
    (query: string) => {
      const root = scopeOf(path).root
      // Só notas cujo nome ou apelido bate com o que foi digitado (o texto das notas não entra).
      const q = foldName(query.trim())
      const named = (p: string) => foldName(noteName(p)).includes(q) || (index.note(p)?.meta.aliases ?? []).some((a) => foldName(a).includes(q))
      const hits = q ? index.search(query, "", 60).map((h) => h.path).filter(named).slice(0, 20) : index.notesIn(root).sort((a, b) => b.mtime - a.mtime).slice(0, 20).map((n) => n.path)
      return hits.filter((p) => p !== path).map((p) => ({ label: noteName(p), detail: scopeOf(p).root === root ? p.slice(0, p.lastIndexOf("/") + 1) : `outro espaço · ${p}`, insert: index.linkTarget(p, path) }))
    },
    [index, path],
  )

  // Prévia dos links: hover na leitura, Ctrl + hover na edição, toque longo no celular.
  const linkPreview = useLinkPreview(reader, { index, noteSet, platform: vault.platform, needsModifier: mode !== "leitura" })

  useEffect(() => {
    if (!headingRequest) return
    setModeState("leitura")
    const headings = index.note(path)?.meta.headings ?? []
    const position = headings.findIndex((h) => h.line === headingRequest.line)
    setTimeout(() => reader.current?.querySelectorAll("h1, h2, h3, h4, h5, h6")[position]?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
  }, [headingRequest, index, path])

  useEffect(() => {
    if (!lineRequest) return
    // Somente leitura: não há cursor; rola a leitura até o título daquela linha, se houver.
    if (mode === "leitura") {
      const position = (index.note(path)?.meta.headings ?? []).findIndex((h) => h.line === lineRequest.line)
      const timer = window.setTimeout(() => reader.current?.querySelectorAll("h1, h2, h3, h4, h5, h6")[position]?.scrollIntoView({ block: "start" }), 60)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => editor.current?.scrollToLine(lineRequest.line), 60)
    return () => window.clearTimeout(timer)
  }, [lineRequest])

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ path?: string; line?: number }>).detail
      if (detail?.path !== path || typeof detail.line !== "number") return
      setModeState("fonte")
      window.setTimeout(() => editor.current?.scrollToLine(detail.line!), 100)
    }
    window.addEventListener("runas-codex:ir-para-tarefa", listener)
    return () => window.removeEventListener("runas-codex:ir-para-tarefa", listener)
  }, [path])

  const copied = (link: string) =>
    void copyText(link).then((ok) => toast(ok ? `Copiado: ${link}` : "O sistema não deixou copiar."))
  const copyNoteLink = () => copied(`[[${copyLinkTarget(index, path)}]]`)
  // Link do parágrafo (ou item, citação, tabela) onde está o cursor; o `^id` é criado se ainda não existe.
  const copyBlockLink = () => {
    const cursor = editor.current?.cursor()
    const ref = cursor === null || cursor === undefined ? null : blockRefAt(draft, cursor)
    if (!ref) {
      toast("Ponha o cursor num parágrafo, item de lista, citação ou tabela.")
      return
    }
    if (ref.created) editor.current?.transform(() => ({ text: ref.text, cursor: cursor! }))
    copied(`[[${copyLinkTarget(index, path)}#^${ref.id}]]`)
  }

  // Fixar, colorir e arquivar (propriedades `fixada` e `cor`; arquivar move para Notas/Arquivo, com os links).
  const flags = noteFlags(note)
  const toArchive = archivePath(path)
  const fromArchive = unarchivePath(path)
  const organize = (action: () => Promise<unknown>) => {
    void flush()
      .then(action)
      .catch((err: unknown) => toast(err instanceof Error ? err.message : String(err)))
  }
  const setColor = (color: NoteColor | undefined) => organize(() => vault.setProperty(path, "cor", color))
  const move = (to: string) =>
    organize(async () => {
      await vault.rename(path, to)
      navigate(vaultRoute(to))
    })

  const openLinkInTab = (event: ReactMouseEvent) => {
    if (mode !== "leitura" || !(event.target instanceof Element)) return
    const link = event.target.closest<HTMLElement>(LINK_SELECTOR)
    const target = link ? targetOf(link, noteSet, index) : null
    if (!target) return
    event.preventDefault()
    event.stopPropagation()
    openNote(target.path, "aba")
  }

  // Ctrl+E alterna Leitura e Editar, Ctrl+Shift+E entra e sai do Código, Ctrl+/ abre a galeria Formatar.
  useEffect(() => {
    const run = (event: Event) => {
      if (!focused) return
      const kind = (event as CustomEvent<string>).detail
      if (kind === "readingMode" && !book) setMode(mode === "leitura" ? (readOnly ? "leitura" : "live") : "leitura")
      if (kind === "codeMode") setMode(mode === "fonte" ? (readOnly ? "leitura" : beforeCode.current === "fonte" ? "live" : beforeCode.current) : "fonte")
      if (kind === "format" && !readOnly) openGallery()
    }
    window.addEventListener("runas-codex:comando", run)
    return () => window.removeEventListener("runas-codex:comando", run)
  })

  // Comandos do Tasks no editor: alternar a tarefa da linha do cursor e abrir a janela de edição.
  useEffect(() => {
    const run = (kind: string) => {
      if (!focused || readOnly || mode === "leitura" || !editor.current) return
      if (kind === "toggleTask" || kind === "toggle-task") {
        editor.current.transform((doc, cursor) => {
          const start = doc.lastIndexOf("\n", cursor - 1) + 1
          const end = doc.indexOf("\n", cursor) < 0 ? doc.length : doc.indexOf("\n", cursor)
          const result = toggleLineCommand(doc.slice(start, end), currentParseContext())
          const before = result.lines.slice(0, -1).join("\n")
          const lastStart = start + before.length + (result.lines.length > 1 ? 1 : 0)
          const last = result.lines.at(-1) ?? ""
          return { text: doc.slice(0, start) + result.lines.join("\n") + doc.slice(end), cursor: result.cursorAtEnd ? lastStart + last.length : Math.min(lastStart + (cursor - start), lastStart + last.length) }
        })
      }
      if (kind === "editTask" || kind === "edit-task") {
        const cursor = editor.current.cursor() ?? 0
        const line = draft.slice(0, cursor).split("\n").length - 1
        setTaskEdit({ line, text: draft.split("\n")[line] ?? "" })
      }
      const setStatus = /^set-task-status:(.*)$/.exec(kind)
      if (setStatus) {
        let symbol = ""
        try { symbol = decodeURIComponent(setStatus[1] ?? "") } catch { return }
        const ctx = currentParseContext()
        const status = statusRegistry(ctx.settings).bySymbol(symbol)
        if (!status.symbol) return
        editor.current.transform((doc, cursor) => {
          const start = doc.lastIndexOf("\n", cursor - 1) + 1
          const end = doc.indexOf("\n", cursor) < 0 ? doc.length : doc.indexOf("\n", cursor)
          const original = doc.slice(start, end)
          const edit = editForLine(original, 0, ctx, { status })
          if (!edit) return { text: doc, cursor }
          const replacement = edit.lines.join("\n")
          return { text: doc.slice(0, start) + replacement + doc.slice(end), cursor: Math.min(start + replacement.length, start + Math.max(0, cursor - start)) }
        })
      }
    }
    const fromShortcut = (event: Event) => run((event as CustomEvent<string>).detail)
    window.addEventListener("runas-codex:comando", fromShortcut)
    window.addEventListener("runas-codex:nota-acao", fromShortcut)
    return () => {
      window.removeEventListener("runas-codex:comando", fromShortcut)
      window.removeEventListener("runas-codex:nota-acao", fromShortcut)
    }
  }, [focused, readOnly, mode, draft])

  // Em Livros, a contagem é a do sumário e da prévia (só o texto visível: sem tags, alvos de link nem comentários).
  const stats = book ? { ...textStats(draft), words: countWords(draft) } : textStats(draft)
  const api: NoteEditorApi = {
    text: draft,
    insert: (text, at) => editor.current?.insert(text, at),
    replaceAll: (change) => editor.current?.transform((doc, cursor) => { const next = change(doc); return { text: next, cursor: Math.min(cursor, next.length) } }),
    selection: () => editor.current?.selection() ?? null,
    select: (from, to) => editor.current?.select(from, to),
    focus: () => editor.current?.focus(),
  }
  const openGallery = () => { if (mode === "leitura") setMode("live"); setGallery(true) }
  // Formatador no cursor. Com seleção, ela entra no lugar do texto de exemplo; se o formatador não tem onde pôr a
  // seleção (quebra de página, tabela…), ele entra depois dela, sem apagar o texto selecionado.
  const insertFormatter = (syntax: string) => setTimeout(() => {
    const handle = editor.current
    if (!handle) return
    const range = handle.selection()
    const selected = range ? latest.current.draft.slice(range.from, range.to) : ""
    const text = formatterInsertion(syntax, selected)
    if (selected && text !== syntax) return handle.insert(text)
    if (!isBlockSyntax(syntax)) return handle.insert(text, range?.to)
    // Bloco com seleção vai para o fim da linha dela, para não partir o parágrafo no meio.
    const lineEnd = range ? latest.current.draft.indexOf("\n", range.to) : -1
    handle.insertBlock(text, range ? (lineEnd < 0 ? latest.current.draft.length : lineEnd) : undefined)
  })
  const openLinkDialog = () => {
    const range = editor.current?.selection()
    setLinkLabel(range ? draft.slice(range.from, range.to) : "")
    if (mode === "leitura") setMode("live")
    setDialog("link")
  }
  const pickImage = () => { if (mode === "leitura") setMode("live"); fileInput.current?.click() }
  const pickTemplate = () => { if (mode === "leitura") setMode("live"); setDialog("template") }
  const slashAction = (action: "format" | "image" | "template" | "link") => {
    if (action === "format") setGallery(true)
    else if (action === "image") fileInput.current?.click()
    else if (action === "template") setDialog("template")
    else openLinkDialog()
  }
  const showSelectionBar = !readOnly && !narrow && mode !== "leitura" && selectionAt !== null && (selectionAt.focused || barFocused) && !gallery && !dialog
  const showKeyboardBar = !readOnly && narrow && mode !== "leitura" && editorFocused && !gallery && !dialog
  // No celular, a barra inferior do app dá lugar à barra de formatação enquanto se escreve.
  useEffect(() => {
    if (!showKeyboardBar) return
    document.body.classList.add("editing-text")
    return () => document.body.classList.remove("editing-text")
  }, [showKeyboardBar])

  const { body } = splitFrontmatter(draft)
  // Modo leitura: a caixa clicada é achada pela ordem (a n-ésima caixa do texto); se a contagem não bate, não arrisca.
  const taskBoxes = useMemo<TaskCheckboxHandler | null>(
    () =>
      readOnly
        ? null
        : {
            source: body,
            onToggle(index, total) {
              const lines = checkboxLines(draft)
              const line = lines[index]
              if (lines.length !== total || line === undefined) {
                toast("Não deu para achar esta tarefa no texto; marque-a no modo Editar.")
                return
              }
              const all = draft.split("\n")
              all.splice(line, 1, ...toggledTaskLines(all[line]!))
              setDraft(all.join("\n"))
            },
          },
    [body, draft, readOnly, toast],
  )
  const sep = "separator" as const
  const editing = !readOnly
  // O menu ⋯ junta o que eram ícones soltos na barra (rework F3, EST-1); tudo tem nome e, quando há, o atalho.
  const menu: MenuEntry[] = [
    ...(editing ? [
      { label: "Formatar…", icon: <Type size={16} />, hint: keyHint("format"), onSelect: openGallery },
      { label: "Inserir link…", icon: <Link2 size={16} />, onSelect: openLinkDialog },
      { label: "Inserir imagem…", icon: <ImagePlus size={16} />, onSelect: pickImage },
      { label: "Inserir modelo…", icon: <LayoutTemplate size={16} />, onSelect: pickTemplate },
      sep,
      { label: "Renomear ou mover…", icon: <PenLine size={16} />, onSelect: () => void flush().then(() => setDialog("rename")) },
    ] : []),
    { label: favorite ? "Tirar dos favoritos" : "Favoritar", icon: <Star size={16} />, onSelect: () => toggleFavorite(vault.info?.path, { type: "file", path }) },
    ...(editing ? [
      { label: "Fixar, cor e ícone…", icon: <SwatchBook size={16} />, onSelect: () => setDialog("decorate") },
      ...(toArchive ? [{ label: "Arquivar", icon: <Archive size={16} />, onSelect: () => move(toArchive) }] : []),
      ...(fromArchive ? [{ label: "Desarquivar", icon: <ArchiveRestore size={16} />, onSelect: () => move(fromArchive) }] : []),
    ] : []),
    sep,
    { label: "Copiar link da nota", icon: <Copy size={16} />, onSelect: copyNoteLink },
    { label: "Copiar link do bloco no cursor", icon: <Copy size={16} />, disabled: readOnly || mode === "leitura", onSelect: copyBlockLink },
    ...(vault.platform.kind === "electron" ? [{ label: "Copiar endereço runas://", icon: <Copy size={16} />, onSelect: () => copied(deepLinkFor(path)) }] : []),
    sep,
    { label: "Histórico de versões", icon: <History size={16} />, hint: keyHint("history"), onSelect: () => tools.current?.open("history") },
    ...(editing ? [
      { label: "Extrair seleção para nota…", icon: <Scissors size={16} />, onSelect: () => tools.current?.open("extract") },
      { label: "Mesclar em outra nota…", icon: <Merge size={16} />, onSelect: () => tools.current?.open("merge") },
      { label: "Renomear imagens da nota…", icon: <Images size={16} />, onSelect: () => setDialog("images") },
    ] : []),
    { label: "Exportar…", icon: <FileDown size={16} />, onSelect: () => openDocumentExport({ paths: [path], title: note.name, players: !showSecrets }) },
    ...(editing ? [sep, { label: "Mandar para a lixeira", icon: <Trash2 size={16} />, danger: true, onSelect: () => setDialog("trash") }] : []),
  ]
  const modes = (
    <Segmented<ViewMode>
      label="Modo da nota"
      value={mode}
      onChange={setMode}
      options={[
        { value: "leitura", label: "Leitura", icon: <BookOpenText size={14} /> },
        ...(readOnly ? [] : [{ value: "live" as const, label: "Editar", icon: <Type size={14} /> }]),
        { value: "fonte", label: "Código", icon: <Code2 size={14} /> },
      ]}
    />
  )
  const actionsMenu = <OverflowMenu label={book ? "Ações do capítulo" : "Ações da nota"} items={menu} />
  const saveState = readOnly ? "somente-leitura" : state === "salvo" ? "salvo" : state === "erro" || state === "conflito" ? "erro" : "salvando"
  const folder = dirname(path).split("/").pop() ?? ""

  return (
    <article
      className={`note-editor mode-${mode}`}
      onContextMenuCapture={event => {
        if (readOnly || !(event.target instanceof HTMLImageElement)) return
        const src = event.target.src
        const image = linkedImages(index, path, draft).find(image => { const url = vault.platform.fileUrl(image); return url && new URL(url, window.location.href).href === src })
        if (image) { event.preventDefault(); event.stopPropagation(); renameImage(image) }
      }}
      // No modo leitura, Ctrl+clique e botão do meio num link abrem a nota numa aba nova (o leitor não muda: o clique é
      // pego aqui antes de chegar ao link). No live preview o botão do meio é colar, no Linux; lá fica como está.
      onClickCapture={(event) => (event.ctrlKey || event.metaKey) && openLinkInTab(event)}
      onAuxClick={(event) => event.button === 1 && openLinkInTab(event)}
    >
      {/* Livros põe voltar, modo e menu na própria barra; as outras telas usam a barra única do documento. */}
      {focusHeader ? createPortal(book ? <>
        <SaveStatus state={saveState} />
        {actionsMenu}
      </> : <>
        {!hideBackControl && <button className="icon-btn" onClick={onBack} aria-label="Voltar" title="Voltar"><ChevronLeft size={18} /></button>}
        {modes}
        {actionsMenu}
      </>, focusHeader) : (
        <div className="editor-bar doc-bar">
          {!hideBackControl && <button className="icon-btn mobile-switch" onClick={onBack} aria-label="Voltar para a lista">
            <ChevronLeft size={18} />
          </button>}
          <span className="note-history">
            <button className="icon-btn" title={vault.platform.kind === "capacitor" ? "Voltar" : "Voltar (Alt ←)"} aria-label="Voltar" disabled={!history.canBack} onClick={goBack}>
              <ArrowLeft size={17} />
            </button>
            <button className="icon-btn" title={vault.platform.kind === "capacitor" ? "Avançar" : "Avançar (Alt →)"} aria-label="Avançar" disabled={!history.canForward} onClick={goForward}>
              <ArrowRight size={17} />
            </button>
          </span>
          {/* O nome é o h1 da tela (nota aberta, artigo da Wiki): leitores de tela navegam pelos títulos. */}
          <div className="doc-title editor-status" title={path}>{folder && <small>{folder}</small>}<h1>{note.name}</h1></div>
          {modes}
          <div className="doc-end">
            <SaveStatus state={saveState} />
            <button className="btn sm ghost doc-panel" onClick={onShowPanel} aria-label="Painel da nota" aria-expanded={panelOpen} title={panelHint}><PanelRight size={17} /><span>Painel</span></button>
            {actionsMenu}
          </div>
        </div>
      )}

      {(state === "conflito" || state === "erro") && (
        <div className="doc-notice">
          <Notice tone="danger" title={state === "conflito" ? "Esta nota mudou fora do app" : "Não deu para salvar"} actions={state === "conflito" ? <>
            <button className="btn sm" onClick={reloadFromDisk}>Usar a do disco</button>
            <button className="btn sm danger" onClick={keepMine}>Manter a minha</button>
          </> : undefined}>{error}</Notice>
        </div>
      )}

      <div className={sidebar ? "books-writing-area" : undefined} style={sidebar ? undefined : { display: "contents" }}>
      <div className="editor-body" ref={reader}>
        {mode === "leitura" ? (
          <NoteSetContext.Provider value={noteSet}>
            <TaskCheckboxContext.Provider value={taskBoxes}>
              {body.trim() ? <Markdown source={body} space={scopeOf(path).space ?? undefined} showSecrets={showSecrets} /> : <p className="muted">Nota vazia.</p>}
            </TaskCheckboxContext.Provider>
          </NoteSetContext.Provider>
        ) : (
          <div
            className="editor-surface"
            ref={surface}
            onFocus={() => setEditorFocused(true)}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setEditorFocused(false); setBarFocused(false) } }}
            onKeyDown={(event) => {
              // Alt+F10 leva o teclado até a barra da seleção (padrão dos editores com barra flutuante).
              if (!(event.altKey && event.key === "F10") || !showSelectionBar) return
              event.preventDefault()
              setBarFocused(true)
              requestAnimationFrame(() => selectionBar.current?.querySelector("button")?.focus())
            }}
          >
            <SourceEditor onImageLinkContext={at => { const image = imageLinkAt(index,path,draft,at); if (!image) return false; renameImage(image); return true }} typewriter={typewriter} ref={editor} value={draft} docKey={`${path}:${docKey}`} readOnly={readOnly} onChange={setDraft} onSave={() => void flush()} suggestLinks={suggestLinks} livePreview={mode === "live" ? previewHost : null} onFiles={readOnly ? undefined : (files, at, how) => void addFiles(files, at, how === "colar")}
              onSelection={setSelectionAt} onCursor={mode === "fonte" || onCursorLine ? (line, column) => { if (mode === "fonte") setCursorAt({ line, column }); onCursorLine?.(line) } : undefined} onSlashAction={slashAction} lineNumbers={appearance.codeLineNumbers} extraFormatters={extraFormatters} />
            {showSelectionBar && selectionAt && (
              <SelectionBar
                ref={selectionBar}
                at={selectionAt}
                width={surface.current?.clientWidth ?? 640}
                onWrap={(mark) => { setBarFocused(false); editor.current?.wrap(mark) }}
                onLink={() => { setBarFocused(false); openLinkDialog() }}
                onMore={() => { setBarFocused(false); setGallery(true) }}
                onLeave={() => { setBarFocused(false); editor.current?.focus() }}
                extra={selectionActions?.(api)}
              />
            )}
          </div>
        )}
      </div>

      {mode !== "leitura" && sidebar?.(api)}
      </div>

      <div className="editor-statusbar">
        {mode === "fonte" && <span className="statusbar-mode">MARKDOWN</span>}
        {mode === "fonte" && <span>Linha {cursorAt.line}, coluna {cursorAt.column}</span>}
        <span className="note-word-count">{stats.words} {stats.words === 1 ? "palavra" : "palavras"} · {stats.characters} {stats.characters === 1 ? "caractere" : "caracteres"}</span>
        {mode === "fonte" && <button type="button" className="statusbar-toggle" aria-pressed={appearance.codeLineNumbers} onClick={() => updateAppearance({ codeLineNumbers: !appearance.codeLineNumbers })}>Números de linha: {appearance.codeLineNumbers ? "ligados" : "desligados"}</button>}
        {book && !readOnly && <button type="button" className="statusbar-toggle" title={`Alternar Visual e Código${keyHint("codeMode") ? ` (${keyHint("codeMode")})` : ""}`} onClick={() => setMode(mode === "fonte" ? "live" : "fonte")}>Modo: {mode === "fonte" ? "Código" : "Visual"}</button>}
        {statusExtra}
      </div>

      {!readOnly && (
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          aria-label="Escolher imagens"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])]
            event.target.value = ""
            void addFiles(files, null, false)
          }}
        />
      )}
      <NoteTools ref={tools} active={focused} path={path} draft={draft} selection={() => editor.current?.selection() ?? null} replace={(text, cursor) => editor.current?.transform(() => ({ text, cursor }))} flush={flushChecked} />
      {showKeyboardBar && <KeyboardBar onFormat={() => setGallery(true)} onSlash={() => editor.current?.openSlash()} onWrap={(mark) => editor.current?.wrap(mark)} onLink={openLinkDialog} onTask={() => window.dispatchEvent(new CustomEvent("runas-codex:nota-acao", { detail: "toggle-task" }))} />}
      {gallery && <FormatGallery code={mode === "fonte"} extra={extraFormatters} onClose={() => setGallery(false)} onInsert={insertFormatter} />}
      {dialog === "images" && <NoteImagesDialog path={path} text={draft} onRename={renameImage} onClose={() => setDialog(null)} />}
      {dialog === "decorate" && (
        <Modal title="Fixar, cor e ícone" onClose={() => setDialog(null)} footer={<button className="btn" onClick={() => setDialog(null)}>Fechar</button>}>
          <button className="btn" onClick={() => organize(() => vault.setProperty(path, "fixada", flags.pinned ? undefined : true))}>
            {flags.pinned ? <PinOff size={15} /> : <Pin size={15} />} {flags.pinned ? "Desafixar" : "Fixar no topo da lista"}
          </button>
          <div className="note-colors" role="group" aria-label="Cor da nota">
            {(Object.keys(NOTE_COLORS) as NoteColor[]).map((color) => (
              <button
                key={color}
                className={`note-swatch ${flags.color === color ? "active" : ""}`}
                style={{ ["--swatch" as string]: NOTE_COLORS[color] }}
                title={color}
                aria-label={`Cor ${color}`}
                aria-pressed={flags.color === color}
                onClick={() => setColor(flags.color === color ? undefined : color)}
              />
            ))}
            {flags.color && <button className="btn sm ghost" onClick={() => setColor(undefined)}>Sem cor</button>}
          </div>
          <label className="field"><span>Ícone da nota</span><select className="input" aria-label="Ícone da nota" value={String(note.meta.frontmatter?.data?.icone ?? "file")} onChange={event => organize(() => vault.setProperty(path, "icone", event.target.value))}>{Object.keys(NOTE_ICONS).map(icon => <option key={icon} value={icon}>{ICON_LABELS[icon as keyof typeof NOTE_ICONS]}</option>)}</select></label>
        </Modal>
      )}

      {linkPreview}
      {imageRename && <ImageRenameDialog path={imageRename} onClose={() => setImageRename(null)} />}
      {taskEdit && (
        <TaskEditDialog
          initialLine={/^[\s>]*(?:[-*+]|\d+[.)])[ \t]+\[.\]/.test(taskEdit.text) ? taskEdit.text : `- [ ] ${taskEdit.text.replace(/^[\s>]*(?:[-*+]|\d+[.)])?[ \t]*/, "")}`}
          settings={tasksSettingsOf(vault.info?.path)}
          onLines={(lines) =>
            editor.current?.transform((doc) => {
              const all = doc.split("\n")
              if ((all[taskEdit.line] ?? "") !== taskEdit.text) throw new Error("A linha mudou; abra a janela de novo.")
              const indent = /^[\s>]*/.exec(taskEdit.text)?.[0] ?? ""
              all.splice(taskEdit.line, 1, ...lines.map((l) => (/^[\s>]/.test(l) ? l : indent + l)))
              const cursor = all.slice(0, taskEdit.line + lines.length).join("\n").length
              return { text: all.join("\n"), cursor }
            })
          }
          onClose={() => setTaskEdit(null)}
        />
      )}

      {dialog === "template" && (
        <TemplatePicker
          templates={vault.templates().map((t) => t.path)}
          folder={vault.config.templates.folder}
          onClose={() => setDialog(null)}
          onPick={(templatePath) => {
            const template = fillTemplate(index.note(templatePath)?.text ?? "", { title: noteName(path), date: new Date(), config: vault.config.templates })
            setTimeout(() => editor.current?.transform((doc, cursor) => insertTemplate(doc, cursor, template)))
          }}
        />
      )}
      {dialog === "link" && <LinkPicker index={index} from={path} onPick={(link) => setTimeout(() => editor.current?.insert(linkLabel && /^\[\[[^\]|]+\]\]$/.test(link) ? link.replace(/\]\]$/, `|${linkLabel}]]`) : link))} onClose={() => setDialog(null)} />}
      {dialog === "rename" && (
        <RenameDialog
          index={index}
          path={path}
          folders={folders}
          onClose={() => setDialog(null)}
          onRename={async (to) => {
            const plan = await vault.rename(path, to)
            if (plan.edits.length) toast(`Links atualizados em ${plan.edits.length} ${plan.edits.length === 1 ? "arquivo" : "arquivos"}`)
            navigate(vaultRoute(to))
          }}
        />
      )}
      {dialog === "trash" && (
        <ConfirmDialog
          title="Mandar para a lixeira"
          confirmLabel="Mandar para a lixeira"
          danger
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await vault.trash(path)
            if (onTrashed) onTrashed()
            else navigate("/notas")
          }}
        >
          “{noteName(path)}” vai para a lixeira do cofre (<code>.trash</code>), a mesma do Obsidian. Dá para recuperar de lá.
          {index.backlinks(path).length > 0 && <p style={{ marginTop: 8 }}>As referências na estrutura dos livros serão removidas automaticamente. Outros links para esta nota podem ficar quebrados.</p>}
        </ConfirmDialog>
      )}
    </article>
  )
}
