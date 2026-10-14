import { useMemo, useState } from "react"
import { CalendarCheck, ChevronDown, Folder, Lock, Pin, Plus, Search, Trash } from "lucide-react"
import { NOTES } from "../data/notes"
import type { Note } from "../data/types"
import { splitFrontmatter } from "../lib/links"
import { href, navigate } from "../lib/router"
import { relativeDays } from "../lib/navigation"
import { TODAY } from "../data/agenda"
import { NoteEditor } from "../components/NoteEditor"
import { NotePanels } from "../components/NotePanels"
import { useToast } from "../components/ui"
import { useVault } from "../platform/VaultProvider"
import { NoteSetContext } from "../lib/note-set"
import { vaultRoute } from "../lib/vault-notes"
import "./notes.css"

const NEW_NOTE: Note = {
  id: "nova",
  title: "Sem título",
  space: "notas",
  path: "Notas/Sem título.md",
  tags: [],
  updated: TODAY.toISOString(),
  markdown: "# Sem título\n\nComece a escrever. Use [[ para linkar e # para tags.\n",
}

export function NotesScreen({ noteId }: { noteId?: string }) {
  const { info, notes, loading, error } = useVault()
  if (notes && info) return <VaultNotes vaultName={info.name} notes={notes} noteId={noteId} />
  if (loading)
    return (
      <div className="page">
        <p className="muted">Abrindo o cofre…</p>
      </div>
    )
  return <DemoNotes noteId={noteId} error={error} />
}

/** Notas de exemplo (navegador, ou app desktop sem cofre aberto). */
function DemoNotes({ noteId, error }: { noteId?: string; error?: string }) {
  const toast = useToast()
  const [query, setQuery] = useState("")
  const [showRight, setShowRight] = useState(false)
  const note = noteId === "nova" ? NEW_NOTE : NOTES.find((n) => n.id === noteId) ?? (noteId ? undefined : NOTES[0])
  const filtered = NOTES.filter((n) => n.title.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))
  const pinned = filtered.filter((n) => n.pinned)
  const daily = filtered.filter((n) => n.path.includes("/Diário/"))
  const rest = filtered.filter((n) => !n.pinned && !n.path.includes("/Diário/"))

  return (
    <div className={`workspace ${noteId ? "" : "show-left"} ${showRight ? "show-right" : ""}`}>
      <aside className="pane-left">
        <div className="pane-head">
          <div className="row between">
            <strong>Notas</strong>
            <div className="row" style={{ gap: 2 }}>
              <button className="icon-btn sm" title="Nota do dia" onClick={() => navigate("/notas/2026-10-13")}>
                <CalendarCheck size={16} />
              </button>
              <button className="icon-btn sm" title="Nova nota" onClick={() => navigate("/notas/nova")}>
                <Plus size={16} />
              </button>
            </div>
          </div>
          <label className="search">
            <Search size={15} />
            <input className="input" placeholder="Buscar em Notas" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <span className="tiny faint">Só o espaço Notas — a wiki e as campanhas ficam de fora.</span>
          {error && <span className="tiny" style={{ color: "var(--red)" }}>Não deu para abrir o cofre: {error}</span>}
        </div>
        <div className="pane-body" style={{ gap: 12 }}>
          {pinned.length > 0 && <NoteGroup title="Fixadas" icon={<Pin size={13} />} notes={pinned} current={note?.id} />}
          <NoteGroup title="Notas" icon={<Folder size={13} />} notes={rest} current={note?.id} />
          <NoteGroup title="Diário" icon={<Folder size={13} />} notes={daily} current={note?.id} />
          <button className="list-item muted small" onClick={() => toast("Protótipo: lixeira em .trash com restauração")}>
            <Trash size={15} /> Lixeira
          </button>
        </div>
      </aside>

      <section className="pane-center">
        {note ? (
          <NoteEditor note={note} onShowPanel={() => setShowRight(!showRight)} onBack={() => navigate("/notas")} />
        ) : (
          <div className="page">
            <p className="muted">Nota não encontrada.</p>
          </div>
        )}
      </section>

      <aside className="pane-right">{note && <NotePanels note={note} />}</aside>

      <button className="fab" onClick={() => navigate("/notas/nova")} aria-label="Nova nota">
        <Plus size={22} />
      </button>
    </div>
  )
}

function preview(markdown: string): string {
  return splitFrontmatter(markdown)
    .body.replace(/^#.*\n+/, "")
    .replace(/\[\[([^\]|]*\/)?([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_m, _dir, name: string, label?: string) => label ?? name)
    .replace(/[#>*\-[\]=|`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
}

function NoteGroup({ title, icon, notes, current }: { title: string; icon: React.ReactNode; notes: Note[]; current?: string }) {
  if (notes.length === 0) return null
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="eyebrow row" style={{ gap: 5 }}>
        <ChevronDown size={13} /> {icon} {title}
      </span>
      <div className="list">
        {notes.map((n) => (
          <a key={n.id} href={href(`/notas/${n.id}`)} className={`list-item note-item ${current === n.id ? "active" : ""}`} style={{ ["--note" as string]: n.color ? `var(--${n.color})` : "transparent" }}>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="truncate" style={{ display: "block", fontWeight: 600 }}>{n.title}</span>
              <span className="truncate tiny faint" style={{ display: "block" }}>
                {preview(n.markdown)}
              </span>
            </span>
            <span className="meta">{relativeDays(n.updated, TODAY)}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

/** Leitor do cofre real: todas as notas `.md`, agrupadas por pasta, abertas em somente leitura. */
function VaultNotes({ vaultName, notes, noteId }: { vaultName: string; notes: Note[]; noteId?: string }) {
  const [query, setQuery] = useState("")
  const [showRight, setShowRight] = useState(false)
  const noteSet = useMemo(() => ({ notes, routeOf: vaultRoute }), [notes])
  const note = noteId ? notes.find((n) => n.id === noteId) : notes[0]
  const q = query.trim().toLocaleLowerCase("pt-BR")
  const folders = useMemo(() => {
    const map = new Map<string, Note[]>()
    for (const n of notes) {
      if (q && !n.path.toLocaleLowerCase("pt-BR").includes(q)) continue
      const folder = n.path.includes("/") ? n.path.slice(0, n.path.lastIndexOf("/")) : ""
      map.set(folder, [...(map.get(folder) ?? []), n])
    }
    return [...map].sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
  }, [notes, q])
  const today = new Date()

  return (
    <NoteSetContext.Provider value={noteSet}>
      <div className={`workspace ${noteId ? "" : "show-left"} ${showRight ? "show-right" : ""}`}>
        <aside className="pane-left">
          <div className="pane-head">
            <div className="row between">
              <strong className="truncate">{vaultName}</strong>
              <span className="tiny faint">{notes.length} notas</span>
            </div>
            <label className="search">
              <Search size={15} />
              <input className="input" placeholder="Buscar no cofre" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <span className="tiny faint row" style={{ gap: 5 }}>
              <Lock size={12} /> Somente leitura — nada é gravado no disco.
            </span>
          </div>
          <div className="pane-body vault-tree" style={{ gap: 12 }}>
            {notes.length === 0 && <span className="muted small">Nenhuma nota .md nesta pasta.</span>}
            {folders.map(([folder, list]) => (
              <details key={folder} open={Boolean(q) || folders.length <= 12 || note?.path.startsWith(folder + "/")}>
                <summary className="eyebrow row" style={{ gap: 5, cursor: "pointer" }}>
                  <Folder size={13} /> {folder || "Raiz do cofre"} · {list.length}
                </summary>
                <div className="list" style={{ marginTop: 4 }}>
                  {list.map((n) => (
                    <a key={n.id} href={href(vaultRoute(n))} className={`list-item note-item ${note?.id === n.id ? "active" : ""}`} style={{ ["--note" as string]: "transparent" }}>
                      <span className="grow" style={{ minWidth: 0 }}>
                        <strong className="truncate" style={{ display: "block" }}>{n.title}</strong>
                        <span className="truncate tiny faint" style={{ display: "block" }}>
                          {preview(n.markdown)}
                        </span>
                      </span>
                      <span className="meta">{relativeDays(n.updated, today)}</span>
                    </a>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </aside>

        <section className="pane-center">
          {note ? (
            <NoteEditor note={note} readOnly onShowPanel={() => setShowRight(!showRight)} onBack={() => navigate("/notas")} />
          ) : (
            <div className="page">
              <p className="muted">{notes.length ? "Nota não encontrada no cofre." : "Este cofre ainda não tem notas .md."}</p>
            </div>
          )}
        </section>

        <aside className="pane-right">{note && <NotePanels note={note} />}</aside>
      </div>
    </NoteSetContext.Provider>
  )
}
