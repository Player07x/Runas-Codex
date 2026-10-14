import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { BookOpenText, ChevronLeft, Code2, LayoutTemplate, Link2, Lock, PanelRight, PenLine, Trash2, TriangleAlert, Type } from "lucide-react"
import { scopeOf } from "../../core/spaces"
import { fillTemplate, insertTemplate } from "../../core/templates"
import { foldName, noteName, textToSave, toEditorText } from "../../core/text"
import { splitFrontmatter } from "../../lib/links"
import { NoteSetContext } from "../../lib/note-set"
import { navigate } from "../../lib/router"
import { vaultNoteSet, vaultRoute } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { Markdown } from "../Markdown"
import { Segmented, useToast } from "../ui"
import { ConfirmDialog, LinkPicker, RenameDialog, TemplatePicker } from "./dialogs"
import type { LivePreviewHost } from "./live-preview"
import { SourceEditor, type SourceEditorHandle } from "./SourceEditor"

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

interface Props {
  path: string
  folders: string[]
  onShowPanel(): void
  onBack(): void
  onCreate(target: string): void
  onTag(tag: string): void
  /** Barra opcional que insere no cursor do editor, sem outro fluxo de gravação. */
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
export function NoteView({ path, folders, onShowPanel, onBack, onCreate, onTag, headingRequest, toolbar, showSecrets = true }: Props) {
  const vault = useVault()
  const toast = useToast()
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
  const [docKey, setDocKey] = useState(0)
  const [state, setState] = useState<SaveState>("salvo")
  const [error, setError] = useState<string>()
  const [dialog, setDialog] = useState<"rename" | "trash" | "link" | "template" | null>(null)
  const editor = useRef<SourceEditorHandle>(null)
  const reader = useRef<HTMLDivElement>(null)

  // Referências para gravar fora do ciclo do React (troca de nota, saída da tela).
  const latest = useRef({ path, base, draft, readOnly, save: vault.save })
  latest.current = { path, base, draft, readOnly, save: vault.save }
  const saving = useRef<Promise<void> | null>(null)

  const flush = useCallback(async () => {
    const { path: target, base: original, draft: content, readOnly: locked, save } = latest.current
    if (locked) return
    const next = textToSave(original, content)
    if (next === null) {
      setState("salvo")
      return
    }
    setState("salvando")
    const run = save(target, next).then(
      () => {
        if (latest.current.path === target) {
          setBase(next)
          setState(toEditorText(next) === latest.current.draft ? "salvo" : "pendente")
        }
      },
      (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        setState(message.includes("mudou fora do app") ? "conflito" : "erro")
      },
    )
    saving.current = run
    await run
  }, [])

  // Grava ao sair da nota (a tela monta um NoteView por nota, com `key={path}`).
  useEffect(() => () => void flush(), [path, flush])

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

  useEffect(() => {
    if (!headingRequest) return
    setModeState("leitura")
    const headings = index.note(path)?.meta.headings ?? []
    const position = headings.findIndex((h) => h.line === headingRequest.line)
    setTimeout(() => reader.current?.querySelectorAll("h1, h2, h3, h4, h5, h6")[position]?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
  }, [headingRequest, index, path])

  const { body } = splitFrontmatter(draft)
  const status: Record<SaveState, string> = { salvo: "Salvo", pendente: "Editando…", salvando: "Salvando…", conflito: "Conflito", erro: "Erro ao salvar" }

  return (
    <article className="note-editor">
      <div className="editor-bar">
        <button className="icon-btn mobile-switch" onClick={onBack} aria-label="Voltar para a lista">
          <ChevronLeft size={18} />
        </button>
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
        <button className="icon-btn" onClick={onShowPanel} title="Links, propriedades e gráfico local" aria-label="Painel da nota">
          <PanelRight size={18} />
        </button>
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

      {!readOnly && mode !== "leitura" && toolbar?.((text) => editor.current?.insert(text))}

      <div className="editor-body" ref={reader}>
        {mode === "leitura" ? (
          <NoteSetContext.Provider value={noteSet}>
            {body.trim() ? <Markdown source={body} space={scopeOf(path).space ?? undefined} showSecrets={showSecrets} /> : <p className="muted">Nota vazia.</p>}
          </NoteSetContext.Provider>
        ) : (
          <SourceEditor ref={editor} value={draft} docKey={`${path}:${docKey}`} readOnly={readOnly} onChange={setDraft} onSave={() => void flush()} suggestLinks={suggestLinks} livePreview={mode === "live" ? previewHost : null} />
        )}
      </div>

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
            navigate("/notas")
          }}
        >
          “{noteName(path)}” vai para a lixeira do cofre (<code>.trash</code>), a mesma do Obsidian. Dá para recuperar de lá.
          {index.backlinks(path).length > 0 && <p style={{ marginTop: 8 }}>{index.backlinks(path).length} notas apontam para ela; os links vão ficar quebrados.</p>}
        </ConfirmDialog>
      )}
    </article>
  )
}
