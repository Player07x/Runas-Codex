import { ShowArticle } from "./ShowArticle"
import { useCallback, useMemo, useState } from "react"
import { GitFork, Link2, Network, Plus } from "lucide-react"
import { dirname, noteName } from "../../core/text"
import { calendarFor, RELATION_TYPES, relationsOf, type Relation } from "../../core/wiki"
import { NoteSetContext } from "../../lib/note-set"
import { href, navigate } from "../../lib/router"
import { noteRoute, vaultNoteSet } from "../../lib/vault-notes"
import { useToast } from "../../components/ui"
import { NoteView } from "../../components/vault/NoteView"
import { useVault } from "../../platform/VaultProvider"
import { WikiArticleExtras } from "./WikiArticleExtras"
import { WIKI_INSERTS } from "./WikiTools"
import { Infobox } from "./Infobox"
import { NewArticleDialog } from "./WikiHome"
import { askWikiSearch, useWiki } from "./wiki-state"

export function WikiArticleView({ path }: { path: string }) {
  const vault = useVault()
  const toast = useToast()
  const { wiki, players } = useWiki()
  const index = vault.index!
  const note = index.note(path)
  const [panel, setPanel] = useState(false)
  const [create, setCreate] = useState<string | null>(null)
  const readOnly = vault.info?.readOnly ?? true
  const folders = useMemo(() => [...new Set(index.allFiles().map((f) => dirname(f.path)))].filter(Boolean), [index, vault.version])
  const calendarRef = useMemo(() => calendarFor(index, path), [index, path, vault.version])
  const noteSet = useMemo(() => vaultNoteSet(index, path, {}, vault.platform), [index, path, vault.platform, vault.version])
  const onCreate = useCallback((target: string) => (readOnly ? toast(`“${target}” ainda não existe.`) : setCreate(target)), [readOnly, toast])
  const onTag = useCallback((tag: string) => {
    askWikiSearch(`tag:${tag}`)
    navigate("/wiki")
  }, [])

  if (!note) {
    return (
      <div className="page">
        <p className="muted">Artigo não encontrado (foi renomeado ou apagado?). <a href={href("/wiki")}>Voltar para a wiki</a></p>
      </div>
    )
  }

  return (
    <div className={`wiki-article-layout ${panel ? "show-panel" : ""}`}>
      <section className="wiki-article-main">
        <NoteView key={`${path}:${players}`} path={path} folders={folders} onShowPanel={() => setPanel(!panel)} onBack={() => navigate("/wiki")} onCreate={onCreate} onTag={onTag} showSecrets={!players} toolbar={insert=><label className="wiki-resource-insert">Inserir recurso da Wiki<select className="input" value="" onChange={e=>{if(e.target.value)insert(e.target.value)}}><option value="">Escolha um recurso…</option>{WIKI_INSERTS.map(([label,syntax])=><option key={label} value={syntax}>{label}</option>)}</select></label>} />
      </section>
      <aside className="wiki-article-side">
        <NoteSetContext.Provider value={noteSet}>
          <Infobox
            note={note}
            calendar={calendarRef && "calendar" in calendarRef ? calendarRef.calendar : null}
            {...(calendarRef && "error" in calendarRef ? { calendarError: calendarRef.error } : {})}
            readOnly={readOnly}
            onSet={(key, value) => vault.setProperty(path, key, value)}
          />
          {!players && <ShowArticle note={note} />}
          <WikiArticleExtras key={note.path} note={note} players={players} />
          <Relations path={path} root={wiki?.root ?? ""} readOnly={readOnly} />
          <Mentions path={path} />
        </NoteSetContext.Provider>
      </aside>
      {create !== null && <NewArticleDialog initialName={create} onClose={() => setCreate(null)} />}
    </div>
  )
}

function Relations({ path, root, readOnly }: { path: string; root: string; readOnly: boolean }) {
  const vault = useVault()
  const toast = useToast()
  const index = vault.index!
  const [adding, setAdding] = useState(false)
  const relations = useMemo(() => relationsOf(index, path, root), [index, path, root, vault.version])
  const groups = new Map<string, Relation[]>()
  for (const r of relations) groups.set(r.type.label, [...(groups.get(r.type.label) ?? []), r])
  const family = relations.some((r) => r.type.group === "familia")
  const org = relations.some((r) => r.type.key === "membro_de" && r.inverse) || relations.some((r) => r.type.key === "lider_de" && r.inverse)
  return (
    <section className="card wiki-relations">
      <div className="row between">
        <span className="section-title row">
          <GitFork size={15} /> Relações
        </span>
        {!readOnly && (
          <button className="icon-btn sm" onClick={() => setAdding(!adding)} aria-label="Adicionar relação" title="Adicionar relação">
            <Plus size={15} />
          </button>
        )}
      </div>
      {adding && <AddRelation path={path} root={root} onDone={() => setAdding(false)} onError={(m) => toast(m)} />}
      {relations.length === 0 && !adding && <span className="small muted">Nenhuma. Relações são propriedades como aliados, inimigos, pais, membro_de (uma lista de links).</span>}
      {[...groups].map(([label, list]) => (
        <div key={label} className="stack" style={{ gap: 2 }}>
          <span className="eyebrow">{label}</span>
          {list.map((r, i) => (
            <span key={i} className="small row" style={{ gap: 6 }}>
              {r.other ? (
                <a href={href(noteRoute(r.other))} className="wikilink">
                  {noteName(r.other)}
                </a>
              ) : (
                <span className="wikilink broken">{r.target}</span>
              )}
              {r.note && <span className="chip">{r.note}</span>}
              {r.inverse && <span className="tiny faint" title="Escrito na outra nota">↩</span>}
            </span>
          ))}
        </div>
      ))}
      {(family || org) && (
        <div className="row-wrap">
          {family && (
            <a className="btn sm" href={href(`/wiki/relacoes/${encodeURIComponent(path)}`)}>
              <Network size={14} /> Árvore genealógica
            </a>
          )}
          {org && (
            <a className="btn sm" href={href(`/wiki/relacoes/${encodeURIComponent(path)}`)}>
              <Network size={14} /> Organograma
            </a>
          )}
        </div>
      )}
    </section>
  )
}

function AddRelation({ path, root, onDone, onError }: { path: string; root: string; onDone(): void; onError(message: string): void }) {
  const vault = useVault()
  const index = vault.index!
  const [type, setType] = useState(RELATION_TYPES[0]!.key)
  const [target, setTarget] = useState("")
  const [attitude, setAttitude] = useState("")
  const names = useMemo(() => index.notesIn(root).filter((n) => n.path !== path).map((n) => n.path), [index, root, path])
  const save = async () => {
    const dest = names.find((p) => noteName(p).toLocaleLowerCase("pt-BR") === target.trim().toLocaleLowerCase("pt-BR")) ?? names.find((p) => p === target.trim())
    if (!target.trim()) return onError("Escolha a nota.")
    const link = `[[${dest ? index.linkTarget(dest, path) : target.trim()}]]${attitude.trim() ? ` (${attitude.trim()})` : ""}`
    const current = index.note(path)?.meta.frontmatter?.data?.[type]
    const list = Array.isArray(current) ? current.map(String) : typeof current === "string" && current.trim() ? [current] : []
    try {
      await vault.setProperty(path, type, [...list, link])
      onDone()
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error))
    }
  }
  return (
    <form
      className="stack add-relation"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <select className="select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo da relação">
        {RELATION_TYPES.map((r) => (
          <option key={r.key} value={r.key}>
            {r.label}
          </option>
        ))}
      </select>
      <input className="input" list="relacao-notas" placeholder="Nota" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Nota da relação" />
      <datalist id="relacao-notas">
        {names.map((p) => (
          <option key={p} value={noteName(p)} />
        ))}
      </datalist>
      <input className="input" placeholder="Atitude (opcional): hostil, amigo de infância…" value={attitude} onChange={(e) => setAttitude(e.target.value)} aria-label="Atitude" />
      <div className="row" style={{ gap: 6 }}>
        <button className="btn sm primary" type="submit">
          Adicionar
        </button>
        <button className="btn sm ghost" type="button" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function Mentions({ path }: { path: string }) {
  const vault = useVault()
  const backlinks = useMemo(() => vault.index!.backlinks(path), [vault.index, path, vault.version])
  if (!backlinks.length) return null
  return (
    <section className="card">
      <span className="section-title row">
        <Link2 size={15} /> Citado em · {backlinks.length}
      </span>
      <div className="stack" style={{ gap: 6, marginTop: 6 }}>
        {backlinks.slice(0, 12).map((b) => (
          <a key={b.from} className="card tight link" href={href(noteRoute(b.from))} style={{ textDecoration: "none", color: "var(--text)" }}>
            <strong className="small">{noteName(b.from)}</strong>
            {b.context[0] && <p className="muted tiny" style={{ marginTop: 2 }}>{b.context[0]}</p>}
          </a>
        ))}
      </div>
    </section>
  )
}
