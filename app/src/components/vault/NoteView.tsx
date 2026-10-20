import { formatterInsertion } from "../../core/formatter-insertion"
import { createPortal } from "react-dom"
import { openDocumentExport } from "../export/ExportDialog"
import { imageLinkAt, linkedImages } from "../../core/images"
import { ImageRenameDialog, NoteImages } from "./NoteImages"
import { flushOpenNotes } from "../../lib/vault-notes"
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react"
import { Archive, ArchiveRestore, ArrowLeft, ArrowRight, BookOpenText, ChevronLeft, Code2, Copy, Ellipsis, ImagePlus, LayoutTemplate, Link2, Lock, PanelRight, PenLine, Pin, PinOff, Star, Tag, Trash2, TriangleAlert, Type } from "lucide-react"
import { attachmentEmbed, imageExtension, pastedImageName } from "../../core/attachments"
import { blockRefAt } from "../../core/block-ref"
import { deepLinkFor } from "../../core/deep-link"
import { archivePath, NOTE_COLORS, noteFlags, unarchivePath, type NoteColor } from "../../core/note-flags"
import { scopeOf } from "../../core/spaces"
import { fillTemplate, insertTemplate } from "../../core/templates"
import { extname, foldName, noteName, textToSave, toEditorText } from "../../core/text"
import { splitFrontmatter } from "../../lib/links"
import { NoteSetContext } from "../../lib/note-set"
import { goBack, goForward, navigate, useNavHistory } from "../../lib/router"
import { hasBookmark } from "../../core/bookmarks"
import { toggleFavorite, useFavorites } from "../../lib/bookmarks"
import { useOpenNote } from "../../lib/tabs"
import { AUDIO_EXT, IMAGE_EXT, VIDEO_EXT } from "../../markdown/Embed"
import { TaskCheckboxContext, toggledTaskLines, type TaskCheckboxHandler } from "../../markdown/extensions"
import { checkboxLines } from "../../markdown/task-checkboxes"
import { copyLinkTarget, copyText, onFlushRequest, vaultNoteSet, vaultRoute } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { Markdown } from "../Markdown"
import { Segmented, useToast } from "../ui"
import { ConfirmDialog, LinkPicker, RenameDialog, TemplatePicker } from "./dialogs"
import { LINK_SELECTOR, targetOf, useLinkPreview } from "./LinkPreview"
import type { LivePreviewHost } from "./live-preview"
import { SourceEditor, type SourceEditorHandle } from "./SourceEditor"
import "./note-actions.css"
import { NoteTools } from "./NoteTools"
import { ICON_LABELS, NOTE_ICONS } from "./Customization"

/** Os três modos do Obsidian: leitura, live preview ("Editar") e código-fonte. */
export type ViewMode = "leitura" | "live" | "fonte"

const MODE_KEY = "runas-codex:modo-nota"

function savedMode(): ViewMode {
  try {
    const value = localStorage.getItem(MODE_KEY)
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

interface Props {
  /** Controles de navegação ao lado de Sair do Foco no editor de Livros. */
  focusHeader?: HTMLElement | null
  hideBackControl?: boolean
  formatSelection?: boolean
  typewriter?: boolean
  focused?: boolean
  path: string
  folders: string[]
  onShowPanel(): void
  onBack(): void
  onTrashed?(): void
  onCreate(target: string): void
  onTag(tag: string): void
  /** Observação do rascunho para prévias; não grava nem substitui o autosave. */
  onDraftChange?: (text: string) => void
  /** Barra opcional que insere no cursor do editor, sem outro fluxo de gravação. */
  sidebar?: (insert: (text: string) => void) => ReactNode
  toolbar?: (insert: (text: string) => void) => ReactNode
  /** Pedido de rolar até um título (linha), vindo do sumário. */
  headingRequest?: { line: number; at: number }
  /** `false` esconde os segredos do mestre no modo leitura (versão dos jogadores). */
  showSecrets?: boolean
}

/**
 * Uma nota do cofre: leitura ou código-fonte (o live preview chega na etapa 3b). Grava sozinha depois de uma pausa na
 * digitação e sempre com a versão lida — se o arquivo mudou fora do app, avisa em vez de sobrescrever.
 */
export function NoteView({ path, folders, onShowPanel, onBack, onTrashed, onCreate, onTag, headingRequest, toolbar, sidebar, showSecrets = true, onDraftChange, typewriter, focused = true, focusHeader, hideBackControl = false, formatSelection = false }: Props) {
  const vault = useVault()
  const toast = useToast()
  const history = useNavHistory()
  const openNote = useOpenNote()
  const favorites = useFavorites(vault.info?.path)
  const favorite = hasBookmark(favorites, { type: "file", path })
  const index = vault.index!
  const note = index.note(path)!
  const readOnly = vault.info?.readOnly ?? true
  const [mode, setModeState] = useState<ViewMode>(readOnly ? "leitura" : savedMode)
  const setMode = (next: ViewMode) => {
    setModeState(next)
    if (readOnly) return
    try {
      localStorage.setItem(MODE_KEY, next)
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
  const [dialog, setDialog] = useState<"rename" | "trash" | "link" | "template" | null>(null)
  const [expandedTools, setExpandedTools] = useState(false)
  const [imageRename, setImageRename] = useState<string | null>(null)
  const renameImage = (image: string) => { void flushOpenNotes().then(() => setImageRename(image), error => toast(String(error))) }
  const [copyMenu, setCopyMenu] = useState(false)
  const [organizeMenu, setOrganizeMenu] = useState(false)
  const editor = useRef<SourceEditorHandle>(null)
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
    setOrganizeMenu(false)
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
  const status: Record<SaveState, string> = { salvo: "Salvo", pendente: "Editando…", salvando: "Salvando…", conflito: "Conflito", erro: "Erro ao salvar" }

  return (
    <article
      className="note-editor"
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
      <div className={`editor-bar ${expandedTools ? "tools-expanded" : ""}`}>
        {focusHeader ? createPortal(<>
          {!hideBackControl && <button className="icon-btn" onClick={onBack} aria-label="Voltar" title="Voltar"><ChevronLeft size={18} /></button>}
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
          <button className="btn focus-note-actions" aria-label={expandedTools ? "Recolher ações" : "Ações da nota"} title={expandedTools ? "Recolher ações" : "Ações da nota"} aria-expanded={expandedTools} onClick={() => setExpandedTools(!expandedTools)}><Ellipsis size={17}/><span>{expandedTools ? "Recolher ações" : "Ações da nota"}</span></button>
        </>, focusHeader) : <>
        {!hideBackControl && <button className="icon-btn mobile-switch" onClick={onBack} aria-label="Voltar para a lista">
          <ChevronLeft size={18} />
        </button>}
        <button className="btn editor-tools-toggle" aria-expanded={expandedTools} onClick={() => setExpandedTools(!expandedTools)}>{expandedTools ? "Recolher ações" : "Ações da nota"}</button>
        </>}
        <span className="note-history">
          <button className="icon-btn" title={vault.platform.kind === "capacitor" ? "Voltar" : "Voltar (Alt ←)"} aria-label="Voltar" disabled={!history.canBack} onClick={goBack}>
            <ArrowLeft size={17} />
          </button>
          <button className="icon-btn" title={vault.platform.kind === "capacitor" ? "Avançar" : "Avançar (Alt →)"} aria-label="Avançar" disabled={!history.canForward} onClick={goForward}>
            <ArrowRight size={17} />
          </button>
        </span>
        <button className="btn note-export-action" onClick={() => openDocumentExport({ paths: [path], title: note.name, players: !showSecrets })}>Exportar…</button>
        <NoteImages path={path} text={draft} onRename={renameImage} />
        {!focusHeader && <Segmented<ViewMode>
          label="Modo da nota"
          value={mode}
          onChange={setMode}
          options={[
            { value: "leitura", label: "Leitura", icon: <BookOpenText size={14} /> },
            ...(readOnly ? [] : [{ value: "live" as const, label: "Editar", icon: <Type size={14} /> }]),
            { value: "fonte", label: "Código", icon: <Code2 size={14} /> },
          ]}
        />}
        {readOnly && (
          <span className="chip gold" title="Libere a gravação em Configurações › Cofre">
            <Lock size={13} /> Somente leitura
          </span>
        )}
        <span className="tiny faint truncate editor-status" title={path}>
          {readOnly ? path : `${status[state]} · ${path}`}
        </span>
        {!readOnly && (
          <>
            <button
              className="icon-btn"
              title="Inserir link (inclusive para outro espaço)"
              aria-label="Inserir link"
              onClick={() => {
                if (mode === "leitura") setMode("live")
                setDialog("link")
              }}
            >
              <Link2 size={17} />
            </button>
            <button
              className="icon-btn"
              title={vault.platform.kind === "capacitor" ? "Inserir imagem" : "Inserir imagem (também dá para colar com Ctrl+V ou arrastar para a nota)"}
              aria-label="Inserir imagem"
              onClick={() => {
                if (mode === "leitura") setMode("live")
                fileInput.current?.click()
              }}
            >
              <ImagePlus size={17} />
            </button>
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
            <button
              className="icon-btn"
              title="Inserir modelo"
              aria-label="Inserir modelo"
              onClick={() => {
                if (mode === "leitura") setMode("live")
                setDialog("template")
              }}
            >
              <LayoutTemplate size={17} />
            </button>
            <button className="icon-btn" title="Renomear ou mover" aria-label="Renomear nota" onClick={() => void flush().then(() => setDialog("rename"))}>
              <PenLine size={17} />
            </button>
            <button className="icon-btn" title="Mandar para a lixeira" aria-label="Mandar para a lixeira" onClick={() => setDialog("trash")}>
              <Trash2 size={17} />
            </button>
          </>
        )}
        {!readOnly && (
          <div className="note-copy">
            <button className="icon-btn" title="Fixar, colorir e arquivar" aria-label="Organizar a nota" aria-expanded={organizeMenu} onClick={() => setOrganizeMenu(!organizeMenu)}>
              <Tag size={17} />
            </button>
            {organizeMenu && (
              <div className="note-menu card" role="menu" onMouseLeave={() => setOrganizeMenu(false)}>
                <button role="menuitem" className="list-item small" onClick={() => organize(() => vault.setProperty(path, "fixada", flags.pinned ? undefined : true))}>
                  {flags.pinned ? <PinOff size={14} /> : <Pin size={14} />} {flags.pinned ? "Desafixar" : "Fixar no topo da lista"}
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
                  {flags.color && (
                    <button className="btn sm ghost" onClick={() => setColor(undefined)}>
                      Sem cor
                    </button>
                  )}
                </div>
                <label className="field"><span>Ícone da nota</span><select className="input" aria-label="Ícone da nota" value={String(note.meta.frontmatter?.data?.icone ?? "file")} onChange={event => organize(() => vault.setProperty(path, "icone", event.target.value))}>{Object.keys(NOTE_ICONS).map(icon => <option key={icon} value={icon}>{ICON_LABELS[icon as keyof typeof NOTE_ICONS]}</option>)}</select></label>
                {toArchive && (
                  <button role="menuitem" className="list-item small" onClick={() => move(toArchive)}>
                    <Archive size={14} /> Arquivar (vai para Notas/Arquivo)
                  </button>
                )}
                {fromArchive && (
                  <button role="menuitem" className="list-item small" onClick={() => move(fromArchive)}>
                    <ArchiveRestore size={14} /> Desarquivar
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <button className="icon-btn" title={favorite ? "Tirar dos favoritos" : "Favoritar a nota"} aria-label={favorite ? "Tirar dos favoritos" : "Favoritar a nota"} aria-pressed={favorite} onClick={() => toggleFavorite(vault.info?.path, { type: "file", path })}>
          <Star size={17} fill={favorite ? "currentColor" : "none"} color={favorite ? "var(--gold)" : undefined} />
        </button>
        <div className="note-copy">
          <button className="icon-btn" title="Copiar link" aria-label="Copiar link" aria-expanded={copyMenu} onClick={() => setCopyMenu(!copyMenu)}>
            <Copy size={17} />
          </button>
          {copyMenu && (
            <div className="note-menu card" role="menu" onMouseLeave={() => setCopyMenu(false)}>
              <button role="menuitem" className="list-item small" onClick={() => (setCopyMenu(false), copyNoteLink())}>
                Link da nota
              </button>
              <button
                role="menuitem"
                className="list-item small"
                disabled={readOnly || mode === "leitura"}
                title={readOnly ? "Libere a gravação para criar o ^id do bloco" : mode === "leitura" ? "No modo Editar ou Código, ponha o cursor no parágrafo" : undefined}
                onClick={() => (setCopyMenu(false), copyBlockLink())}
              >
                Link do bloco no cursor
              </button>
              {vault.platform.kind === "electron" && (
                <button
                  role="menuitem"
                  className="list-item small"
                  title="Abre esta nota a partir de outro programa (um PDF, o calendário, um atalho)"
                  onClick={() => (setCopyMenu(false), copied(deepLinkFor(path)))}
                >
                  Endereço runas://
                </button>
              )}
            </div>
          )}
        </div>
        <button className="icon-btn" onClick={onShowPanel} title="Links, propriedades e gráfico local" aria-label="Painel da nota">
          <PanelRight size={18} />
        </button>
        <NoteTools active={focused} path={path} draft={draft} selection={() => editor.current?.selection() ?? null} replace={(text, cursor) => editor.current?.transform(() => ({ text, cursor }))} flush={flushChecked} />
      </div>

      {(state === "conflito" || state === "erro") && (
        <div className="proto-note" style={{ margin: "10px 14px 0", color: "var(--red)", borderColor: "color-mix(in srgb, var(--red) 50%, var(--line))", background: "color-mix(in srgb, var(--red) 7%, transparent)" }}>
          <TriangleAlert size={15} />
          <span className="grow">{error}</span>
          {state === "conflito" && (
            <>
              <button className="btn sm" onClick={reloadFromDisk}>
                Usar a do disco
              </button>
              <button className="btn sm danger" onClick={keepMine}>
                Manter a minha
              </button>
            </>
          )}
        </div>
      )}

      {!readOnly && mode !== "leitura" && toolbar?.((text) => {
        const range = editor.current?.selection()
        const selectedText = range ? draft.slice(range.from, range.to) : ""
        editor.current?.insert(formatSelection ? formatterInsertion(text, selectedText) : text)
      })}

      <div className={sidebar ? "books-writing-area" : undefined} style={sidebar ? undefined : { display: "contents" }}>
      <div className="editor-body" ref={reader}>
        {mode === "leitura" ? (
          <NoteSetContext.Provider value={noteSet}>
            <TaskCheckboxContext.Provider value={taskBoxes}>
              {body.trim() ? <Markdown source={body} space={scopeOf(path).space ?? undefined} showSecrets={showSecrets} /> : <p className="muted">Nota vazia.</p>}
            </TaskCheckboxContext.Provider>
          </NoteSetContext.Provider>
        ) : (
          <SourceEditor onImageLinkContext={at => { const image = imageLinkAt(index,path,draft,at); if (!image) return false; renameImage(image); return true }} typewriter={typewriter} ref={editor} value={draft} docKey={`${path}:${docKey}`} readOnly={readOnly} onChange={setDraft} onSave={() => void flush()} suggestLinks={suggestLinks} livePreview={mode === "live" ? previewHost : null} onFiles={readOnly ? undefined : (files, at, how) => void addFiles(files, at, how === "colar")} />
        )}
      </div>

      {mode !== "leitura" && sidebar?.((text) => editor.current?.insert(text))}
      </div>

      {linkPreview}
      {imageRename && <ImageRenameDialog path={imageRename} onClose={() => setImageRename(null)} />}

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
      {dialog === "link" && <LinkPicker index={index} from={path} onPick={(link) => setTimeout(() => editor.current?.insert(link))} onClose={() => setDialog(null)} />}
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
