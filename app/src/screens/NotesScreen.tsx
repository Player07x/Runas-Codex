import { useState } from "react"
import { CalendarCheck, ChevronDown, Folder, Pin, Plus, Search, Trash } from "lucide-react"
import { NOTES } from "../data/notes"
import type { Note } from "../data/types"
import { href, navigate } from "../lib/router"
import { relativeDays } from "../lib/navigation"
import { TODAY } from "../data/agenda"
import { NoteEditor } from "../components/NoteEditor"
import { NotePanels } from "../components/NotePanels"
import { useToast } from "../components/ui"
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
  return markdown
    .replace(/^#.*\n+/, "")
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
