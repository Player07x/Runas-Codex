import { useMemo, useState, type ReactNode } from "react"
import { FileText, Link2, Search } from "lucide-react"
import { planRename, renameProblem } from "../../core/rename"
import { scopeOf } from "../../core/spaces"
import { dirname, extname, noteName } from "../../core/text"
import type { VaultIndex } from "../../core/vault-index"
import { SPACES } from "../../lib/spaces"
import { Modal } from "../ui"

const spaceLabel = (path: string) => {
  const { space, root } = scopeOf(path)
  if (space === "wiki") return root.slice("Wikis/".length, -1) || "Wiki"
  return space ? SPACES[space].label : "Raiz"
}

/** Diálogo com um botão de confirmar; `busy` trava os botões enquanto grava. */
function ActionDialog({ title, children, confirm, confirmLabel, danger, onClose, disabled }: { title: string; children: ReactNode; confirm(): Promise<void>; confirmLabel: string; danger?: boolean; onClose(): void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const run = async () => {
    setBusy(true)
    setError(undefined)
    try {
      await confirm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className={`btn ${danger ? "danger" : "primary"}`} onClick={run} disabled={busy || disabled} aria-label={`Confirmar ${confirmLabel.toLocaleLowerCase("pt-BR")}`}>
            {busy ? "Gravando…" : confirmLabel}
          </button>
        </>
      }
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          if (!busy && !disabled) void run()
        }}
      >
        {children}
      </form>
      {error && <p className="small" style={{ color: "var(--red)" }}>{error}</p>}
    </Modal>
  )
}

/** Renomear ou mover uma nota (ou pasta), mostrando quantas notas terão links atualizados. */
export function RenameDialog({ index, path, folders, isFolder, onRename, onClose }: { index: VaultIndex; path: string; folders: string[]; isFolder?: boolean; onRename(to: string): Promise<void>; onClose(): void }) {
  const ext = isFolder ? "" : extname(path)
  const [name, setName] = useState(isFolder ? path.split("/").pop()! : noteName(path))
  const [folder, setFolder] = useState(dirname(path))
  const to = (folder ? folder + "/" : "") + name.trim() + ext
  const preview = useMemo(() => {
    if (isFolder) return { problem: null, count: null }
    const problem = renameProblem(index, path, to)
    if (problem) return { problem, count: 0 }
    try {
      return { problem: null, count: planRename(index, path, to).edits.length }
    } catch (error) {
      return { problem: error instanceof Error ? error.message : String(error), count: 0 }
    }
  }, [index, path, to, isFolder])
  return (
    <ActionDialog title={isFolder ? "Renomear pasta" : "Renomear ou mover"} confirmLabel="Renomear" onClose={onClose} confirm={() => onRename(to)} disabled={Boolean(preview.problem) || to === path}>
      <label className="field">
        <span>Nome</span>
        <input className="input" autoFocus aria-label="Novo nome" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field">
        <span>Pasta</span>
        <select className="select" value={folder} onChange={(event) => setFolder(event.target.value)} aria-label="Pasta de destino">
          {[...new Set(["", ...folders, dirname(path)])].filter((f) => !isFolder || !(f + "/").startsWith(path + "/")).sort((a, b) => a.localeCompare(b, "pt-BR")).map((f) => (
            <option key={f} value={f}>
              {f || "Raiz do cofre"}
            </option>
          ))}
        </select>
      </label>
      {preview.problem && to !== path ? (
        <span className="small" style={{ color: "var(--red)" }}>{preview.problem}</span>
      ) : (
        <span className="small muted">
          {to === path ? "Digite o novo nome ou escolha outra pasta." : isFolder ? "Os links para todos os arquivos da pasta são atualizados." : preview.count ? `Atualiza os links em ${preview.count} ${preview.count === 1 ? "arquivo" : "arquivos"}.` : "Nenhum outro arquivo aponta para esta nota."}
        </span>
      )}
    </ActionDialog>
  )
}

export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onClose, danger }: { title: string; children: ReactNode; confirmLabel: string; onConfirm(): Promise<void>; onClose(): void; danger?: boolean }) {
  return (
    <ActionDialog title={title} confirmLabel={confirmLabel} confirm={onConfirm} onClose={onClose} danger={danger}>
      <div className="small">{children}</div>
    </ActionDialog>
  )
}

export function NameDialog({ title, label, initial = "", hint, confirmLabel, onConfirm, onClose }: { title: string; label: string; initial?: string; hint?: string; confirmLabel: string; onConfirm(name: string): Promise<void>; onClose(): void }) {
  const [name, setName] = useState(initial)
  return (
    <ActionDialog title={title} confirmLabel={confirmLabel} confirm={() => onConfirm(name.trim())} onClose={onClose} disabled={!name.trim()}>
      <label className="field">
        <span>{label}</span>
        <input className="input" autoFocus aria-label={label} value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      {hint && <span className="small muted">{hint}</span>}
    </ActionDialog>
  )
}

/**
 * Seletor de link: busca no espaço da nota ou em todos. Notas de outro espaço entram com o caminho completo
 * (`[[Wikis/Mundo/Pessoa|Pessoa]]`), para o Obsidian resolver igual.
 */
export function LinkPicker({ index, from, onPick, onClose }: { index: VaultIndex; from: string; onPick(link: string): void; onClose(): void }) {
  const [query, setQuery] = useState("")
  const [all, setAll] = useState(false)
  const root = scopeOf(from).root
  const results = useMemo(() => {
    const scope = all ? "" : root
    const q = query.trim()
    const hits = q ? index.search(q, scope, 30).map((hit) => hit.path) : index.notesIn(scope).sort((a, b) => b.mtime - a.mtime).slice(0, 30).map((n) => n.path)
    return hits.filter((path) => path !== from)
  }, [index, query, all, root, from])
  const pick = (dest: string) => {
    const target = index.linkTarget(dest, from)
    const title = noteName(dest)
    onPick(target === title ? `[[${target}]]` : `[[${target}|${title}]]`)
    onClose()
  }
  return (
    <Modal title="Inserir link" onClose={onClose} wide>
      <div className="row" style={{ gap: 8 }}>
        <label className="search grow">
          <Search size={15} />
          <input className="input" autoFocus placeholder="Buscar nota (nome, apelido, texto)…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar nota para ligar" />
        </label>
        <div className="segmented" role="tablist" aria-label="Onde buscar">
          <button className={!all ? "active" : ""} onClick={() => setAll(false)}>
            Este espaço
          </button>
          <button className={all ? "active" : ""} onClick={() => setAll(true)}>
            Todos
          </button>
        </div>
      </div>
      <div className="list">
        {results.length === 0 && <span className="muted small">Nada encontrado.</span>}
        {results.map((path) => {
          const cross = scopeOf(path).root !== root
          return (
            <button key={path} className="list-item" onClick={() => pick(path)}>
              {cross ? <Link2 size={15} /> : <FileText size={15} />}
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="truncate" style={{ display: "block", fontWeight: 600 }}>{noteName(path)}</span>
                <span className="truncate tiny faint" style={{ display: "block" }}>{dirname(path) || "Raiz do cofre"}</span>
              </span>
              {cross && <span className="chip violet">{spaceLabel(path)}</span>}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
