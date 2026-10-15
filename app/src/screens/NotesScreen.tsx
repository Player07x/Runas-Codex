import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { Archive, CalendarCheck, ChevronDown, FilePlus2, Folder, FolderPlus, Hash, Lock, LockKeyhole, Network, PenLine, Pin, Plus, Search, Unlink, Vault } from "lucide-react"
import { ARCHIVE_FOLDER, NOTE_COLORS, noteFlags, sortNotes } from "../core/note-flags"
import { NotesLockScreen } from "../components/vault/NotesLock"
import { lockNotes, useNotesLock } from "../lib/notes-lock"
import { scopeOf } from "../core/spaces"
import { dirname, joinPath, noteName } from "../core/text"
import type { IndexedNote, VaultIndex } from "../core/vault-index"
import { href, navigate } from "../lib/router"
import { vaultRoute } from "../lib/vault-notes"
import { ConfirmDialog, NameDialog, NewNoteDialog, RenameDialog } from "../components/vault/dialogs"
import { fillTemplate, formatDate } from "../core/templates"
import { GraphPage } from "../components/vault/GraphPage"
import { NoteView } from "../components/vault/NoteView"
import { VaultPanels } from "../components/vault/VaultPanels"
import { Empty, useToast } from "../components/ui"
import { useVault } from "../platform/VaultProvider"
import "./notes.css"

const NOTES_ROOT = "Notas/"
const SCOPE_KEY = "runas-codex:notas-escopo"

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

function preview(note: IndexedNote): string {
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
  const fail = useCallback((error: unknown) => toast(error instanceof Error ? error.message : String(error)), [toast])

  const graph = noteId === "grafico"
  const path = noteId && noteId !== "nova" && noteId !== "hoje" && !graph ? noteId : undefined
  const note = path ? index.note(path) : undefined
  const currentFolder = note ? dirname(note.path) : root.replace(/\/$/, "")

  useEffect(() => {
    try {
      localStorage.setItem(SCOPE_KEY, wholeVault ? "cofre" : "notas")
    } catch {
      /* só não é lembrado */
    }
  }, [wholeVault])

  // Rotas de ação: /notas/nova e /notas/hoje.
  useEffect(() => {
    if (noteId !== "nova" && noteId !== "hoje") return
    if (readOnly) {
      toast("Cofre em somente leitura: libere a gravação para criar notas.")
      navigate("/notas")
      return
    }
    if (noteId === "nova") {
      const folder = root.replace(/\/$/, "")
      vault.createNote(folder, uniqueName(index, folder, "Sem título")).then((created) => navigate(vaultRoute(created)), fail)
    } else {
      // Como o plugin Notas diárias do Obsidian: pasta, formato do nome e modelo de `.obsidian/daily-notes.json`.
      const { daily, templates } = vault.config
      const now = new Date()
      const relative = formatDate(now, daily.format)
      const daily_ = joinPath(daily.folder || (hasNotesSpace ? "Notas/Diário" : "Diário"), relative + ".md")!
      if (index.note(daily_)) navigate(vaultRoute(daily_))
      else {
        const template = daily.template ? index.note(daily.template + ".md")?.text : undefined
        const content = template !== undefined ? fillTemplate(template, { title: noteName(daily_), date: now, config: templates }) : `# ${now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}\n\n`
        vault.createNote(dirname(daily_), noteName(daily_), content).then((created) => navigate(vaultRoute(created)), fail)
      }
    }
  }, [noteId])

  const notes = useMemo(() => index.notesIn(root), [index, root, vault.version])
  const folders = useMemo(() => [...new Set([...index.allFiles().map((f) => dirname(f.path)), ...createdFolders])].filter(Boolean), [index, createdFolders, vault.version])
  const tree = useMemo(() => buildTree(notes, root, createdFolders), [notes, root, createdFolders])
  const results = useMemo(() => (query.trim() ? index.search(query, root, 80) : null), [index, query, root, vault.version])
  const tags = useMemo(() => index.tags(root), [index, root, vault.version])
  const toWrite = useMemo(() => index.unresolved(root).slice(0, 30), [index, root, vault.version])

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
    <a key={n.path} href={href(vaultRoute(n.path))} data-note-path={n.path} className={`list-item note-item ${flags.color ? "colored" : ""} ${note?.path === n.path ? "active" : ""}`} style={{ ["--note" as string]: flags.color ? NOTE_COLORS[flags.color] : "transparent" }}>
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="truncate note-item-name" style={{ display: "block", fontWeight: 600 }}>
          {flags.pinned && <Pin size={12} className="note-pin" aria-label="fixada" />}
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
    const subfolders = [...folder.folders.values()].sort((a, b) => Number(isArchive(a)) - Number(isArchive(b)) || a.name.localeCompare(b.name, "pt-BR"))
    const items = sortNotes(folder.notes)
    const content = (
      <>
        {subfolders.map((sub) => (
          <details key={sub.path} open={(depth < 1 && !isArchive(sub)) || Boolean(note?.path.startsWith(sub.path + "/"))} className="vault-folder">
            <summary className="eyebrow row" style={{ gap: 5 }}>
              <ChevronDown size={13} className="folder-chevron" />
              {isArchive(sub) ? <Archive size={13} /> : <Folder size={13} />} <span className="grow truncate">{sub.name}</span>
              {!readOnly && (
                <span className="folder-actions">
                  <button className="icon-btn sm" title="Nova nota aqui" aria-label={`Nova nota em ${sub.name}`} onClick={(e) => (e.preventDefault(), setDialog({ kind: "note", folder: sub.path }))}>
                    <FilePlus2 size={13} />
                  </button>
                  <button className="icon-btn sm" title="Renomear ou mover pasta" aria-label="Renomear pasta" onClick={(e) => (e.preventDefault(), setDialog({ kind: "rename-folder", path: sub.path }))}>
                    <PenLine size={13} />
                  </button>
                </span>
              )}
            </summary>
            <div style={{ paddingLeft: 10 }}>{renderFolder(sub, depth + 1)}</div>
          </details>
        ))}
        <div className="list">{items.map((n) => noteItem(n))}</div>
      </>
    )
    return content
  }

  return (
    <div className={`workspace ${path || graph ? "" : "show-left"} ${showRight ? "show-right" : ""} ${graph ? "no-right" : ""}`}>
      <aside className="pane-left">
        <div className="pane-head">
          <div className="row between">
            <strong className="truncate">{root ? "Notas" : vault.info?.name}</strong>
            <div className="row" style={{ gap: 2 }}>
              <button className="icon-btn sm" title="Gráfico" aria-label="Abrir o gráfico" onClick={() => navigate("/notas/grafico")}>
                <Network size={16} />
              </button>
              {hasPin && (
                <button className="icon-btn sm" title="Bloquear as Notas (pede o PIN de novo)" aria-label="Bloquear as Notas" onClick={lockNotes}>
                  <LockKeyhole size={16} />
                </button>
              )}
              {!readOnly && (
                <>
                  <button className="icon-btn sm" title="Nota do dia" aria-label="Nota do dia" onClick={() => navigate("/notas/hoje")}>
                    <CalendarCheck size={16} />
                  </button>
                  <button className="icon-btn sm" title="Nova pasta" aria-label="Nova pasta" onClick={() => setDialog({ kind: "folder", folder: currentFolder })}>
                    <FolderPlus size={16} />
                  </button>
                  <button className="icon-btn sm" title="Nova nota" aria-label="Nova nota" onClick={() => setDialog({ kind: "note", folder: currentFolder })}>
                    <Plus size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
          <label className="search">
            <Search size={15} />
            <input className="input" placeholder="Buscar (tag:, path:, file:, “frase”)" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar notas" />
          </label>
          {hasNotesSpace && (
            <div className="segmented" role="tablist" aria-label="Onde mostrar">
              <button className={!wholeVault ? "active" : ""} onClick={() => setWholeVault(false)} aria-label="Mostrar só o espaço Notas">
                Espaço Notas
              </button>
              <button className={wholeVault ? "active" : ""} onClick={() => setWholeVault(true)} aria-label="Mostrar o cofre inteiro">
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
        <div className="pane-body" data-vault-tree style={{ gap: 12 }}>
          {results ? (
            <div className="stack" style={{ gap: 4 }}>
              <span className="eyebrow">{results.length} resultado(s)</span>
              <div className="list">{results.map((hit) => noteItem(index.note(hit.path)!, hit.snippet || hit.path))}</div>
            </div>
          ) : notes.length === 0 ? (
            <span className="muted small">{root ? "O espaço Notas está vazio." : "Nenhuma nota .md neste cofre."}</span>
          ) : (
            renderFolder(tree, 0)
          )}
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
      </aside>

      <section className={`pane-center ${graph ? "graph" : ""}`}>
        {graph ? (
          <GraphPage index={index} root={root} version={vault.version} onBroken={(target) => openBroken(target)} />
        ) : note ? (
          <NoteView key={note.path} path={note.path} folders={folders} onShowPanel={() => setShowRight(!showRight)} onBack={() => navigate("/notas")} onCreate={(t) => openBroken(t, note.path)} onTag={onTag} headingRequest={heading} />
        ) : (
          <div className="page">
            <p className="muted">{path ? "Nota não encontrada no cofre (foi renomeada ou apagada?)." : "Escolha uma nota na lista ou crie uma nova."}</p>
          </div>
        )}
      </section>

      <aside className="pane-right" hidden={graph}>
        {note && <VaultPanels index={index} path={note.path} readOnly={readOnly} onCreate={(t) => openBroken(t, note.path)} onSetProperty={(key, value) => vault.setProperty(note.path, key, value)} onHeading={(line) => setHeading({ line, at: Date.now() })} onSaveNote={vault.save} />}
      </aside>

      {!readOnly && (
        <button className="fab" onClick={() => setDialog({ kind: "note", folder: currentFolder })} aria-label="Nova nota (atalho)">
          <Plus size={22} />
        </button>
      )}

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

