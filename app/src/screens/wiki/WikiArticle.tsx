import { ResizablePanel, usePanelToggle } from "../../components/ResizablePanel"
import { ShowArticle } from "./ShowArticle"
import { useCallback, useMemo, useState } from "react"
import { GitFork, Link2, Network, Plus, X } from "lucide-react"
import { dirname, noteName } from "../../core/text"
import { calendarFor, RELATION_TYPES, relationsOf, resolveTarget, type Relation } from "../../core/wiki"
import { addRelationWrites, relationSentence, relationSides, removeRelationWrites, type PropertyWrite } from "../../core/relation-sides"
import { ConfirmDialog } from "../../components/vault/dialogs"
import { useRemembered } from "../../lib/remembered"
import { NoteSetContext } from "../../lib/note-set"
import { href, navigate } from "../../lib/router"
import { noteRoute, vaultNoteSet } from "../../lib/vault-notes"
import { useToast } from "../../components/ui"
import { NoteView } from "../../components/vault/NoteView"
import { LinksPanel } from "../../components/vault/VaultPanels"
import { PanelTabs, TabPanel } from "../../components/kit/PanelTabs"
import { emblemIcon } from "../../components/kit/Emblem"
import { articleCategory, categoryLook, EMPTY_LOOK } from "../../core/personalization"
import { toneStyle } from "../../core/tones"
import { categoryRoute } from "../../core/wiki-category"
import { useVault } from "../../platform/VaultProvider"
import { WikiArticleExtras } from "./WikiArticleExtras"
import { FormField, FormGrid } from "../../components/kit/FormField"
import { NoteCombobox } from "../../components/kit/NoteCombobox"
import { WIKI_INSERTS } from "./WikiTools"

/** Recursos da Wiki: aba Wiki na galeria Formatar e seção no menu `/` (rework F3). */
const WIKI_FORMATTERS = WIKI_INSERTS.map(([label, syntax]) => ({ label, syntax, group: "Wiki" }))
import { Infobox } from "./Infobox"
import { NewArticleDialog } from "./WikiHome"
import { askWikiSearch, useWiki } from "./wiki-state"

/** U62: no celular, o artigo abre em Leitura (a ficha desenhada), não nas propriedades cruas do editor. */
const PHONE = () => typeof window !== "undefined" && window.matchMedia?.("(max-width: 640px)").matches === true

export function WikiArticleView({ path }: { path: string }) {
  const vault = useVault()
  const toast = useToast()
  const { wiki, players, calendars } = useWiki()
  const index = vault.index!
  const note = index.note(path)
  const panel = usePanelToggle("wiki-article")
  // Painel com abas (rework F4b, WIK-6): Ficha aberta por padrão, depois Relações, Citado em e Links.
  const [tab, setTab] = useState<"ficha" | "relacoes" | "citado" | "links">("ficha")
  const relationCount = useMemo(() => relationsOf(index, path, wiki?.root ?? "").length, [index, path, wiki?.root, vault.version])
  const citedCount = useMemo(() => index.backlinks(path).length, [index, path, vault.version])
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

  const category = wiki ? articleCategory(path, wiki.root) : null
  const categoryStyle = useMemo(() => (category && vault.index ? categoryLook(vault.index, category) : EMPTY_LOOK), [category, vault.index, vault.version])
  const CategoryEmblem = emblemIcon(categoryStyle.emblem)

  if (!note) {
    return (
      <div className="page">
        <p className="muted">Artigo não encontrado (foi renomeado ou apagado?). <a href={href("/wiki")}>Voltar para a wiki</a></p>
      </div>
    )
  }

  return (
    <div className={`wiki-article-layout ${panel.overlay ? "show-panel" : ""}${categoryStyle.tone ? " toned" : ""}`} style={toneStyle(categoryStyle.tone)}>
      <section className="wiki-article-main">
        <NoteView key={`${path}:${players}`} defaultMode={PHONE() ? "leitura" : undefined} path={path} folders={folders} onShowPanel={panel.toggle} panelOpen={panel.expanded} panelHint="Ficha, relações, citações e links" onBack={() => navigate("/wiki")} onCreate={onCreate} onTag={onTag} showSecrets={!players} extraFormatters={WIKI_FORMATTERS} />
      </section>
      <ResizablePanel id="wiki-article" label="Detalhes do artigo" side="right" width={340} className="wiki-article-side" onCollapsedChange={panel.onCollapsedChange}>
        <PanelTabs label="Detalhes do artigo" idPrefix="artigo-painel" value={tab} onChange={setTab} tabs={[
          { value: "ficha", label: "Ficha" },
          { value: "relacoes", label: "Relações", count: relationCount },
          { value: "citado", label: "Citado em", count: citedCount },
          { value: "links", label: "Links" },
        ]} />
        <TabPanel idPrefix="artigo-painel" value={tab}>
        <NoteSetContext.Provider value={noteSet}>
          {tab === "ficha" && <>
          {category && (categoryStyle.tone || categoryStyle.emblem) && <a className="tone-chip" href={href(categoryRoute(category))}>{CategoryEmblem && <CategoryEmblem size={14} aria-hidden="true" />}{category.split("/").at(-1)}</a>}
          <Infobox
            note={note}
            calendar={calendarRef && "calendar" in calendarRef ? calendarRef.calendar : null}
            calendars={[...calendars.map((c) => c.calendar), ...(calendarRef && "calendar" in calendarRef && !calendars.some((c) => c.path === calendarRef.path) ? [calendarRef.calendar] : [])]}
            {...(calendarRef && "error" in calendarRef ? { calendarError: calendarRef.error } : {})}
            readOnly={readOnly}
            onSet={(key, value) => vault.setProperty(path, key, value)}
          />
          {!players && <ShowArticle note={note} />}
          <WikiArticleExtras key={note.path} note={note} players={players} />
          </>}
          {tab === "relacoes" && <Relations path={path} root={wiki?.root ?? ""} readOnly={readOnly} />}
          {tab === "citado" && (citedCount ? <Mentions path={path} /> : <p className="small muted">Nenhuma nota cita este artigo ainda.</p>)}
          {tab === "links" && <LinksPanel index={index} path={path} readOnly={readOnly} onCreate={onCreate} onSaveNote={vault.save} />}
        </NoteSetContext.Provider>
        </TabPanel>
      </ResizablePanel>
      {create !== null && <NewArticleDialog initialName={create} onClose={() => setCreate(null)} />}
    </div>
  )
}

/** As relações de um artigo, com “Adicionar”; a tela de Relações usa o mesmo bloco no painel do nó (sem os atalhos). */
export function Relations({ path, root, readOnly, shortcuts = true }: { path: string; root: string; readOnly: boolean; shortcuts?: boolean }) {
  const vault = useVault()
  const toast = useToast()
  const index = vault.index!
  const [adding, setAdding] = useState(false), [removing, setRemoving] = useState<Relation | null>(null)
  const relations = useMemo(() => relationsOf(index, path, root), [index, path, root, vault.version])
  const groups = new Map<string, Relation[]>()
  for (const r of relations) groups.set(r.type.label, [...(groups.get(r.type.label) ?? []), r])
  const family = relations.some((r) => r.type.group === "familia")
  const org = relations.some((r) => r.type.key === "membros" || r.type.key === "liderado_por")
  return (
    <section className="card wiki-relations">
      <div className="row between">
        <span className="section-title row">
          <GitFork size={15} /> Relações
        </span>
        {!readOnly && (
          <button className="btn sm" onClick={() => setAdding(!adding)} aria-expanded={adding} title="Adicionar relação">
            <Plus size={15} /> Adicionar
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
              {!readOnly && r.other && <button type="button" className="icon-btn sm wiki-relation-remove" aria-label={`Remover a relação ${r.type.label} com ${noteName(r.other)}`} title="Remover" onClick={() => setRemoving(r)}><X size={14} aria-hidden="true" /></button>}
            </span>
          ))}
        </div>
      ))}
      {removing?.other && <RemoveRelation path={path} relation={removing} onClose={() => setRemoving(null)} />}
      {shortcuts && (family || org) && (
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

/** Grava as propriedades, uma por vez, pelo `setProperty` (versão lida); devolve o que não deu para gravar. */
async function applyWrites(setProperty: (path: string, key: string, value: string[] | undefined) => Promise<void>, writes: PropertyWrite[]): Promise<string[]> {
  const failed: string[] = []
  for (const write of writes) {
    try { await setProperty(write.path, write.key, write.value.length ? write.value : undefined) }
    catch (err) { failed.push(`${noteName(write.path)}: ${err instanceof Error ? err.message : String(err)}`) }
  }
  return failed
}

const GROUPS: [Relation["type"]["group"], string][] = [["familia", "Família"], ["organizacao", "Organização"], ["diplomacia", "Diplomacia"], ["outras", "Outras"]]
const parseBoth = (raw: unknown) => raw !== false

/**
 * Nova relação (D12, U73, U74): tipo nos dois sentidos, a nota pelo `NoteCombobox` e a atitude opcional. Uma frase
 * confere quem é o quê; “Gravar também em…” (lembrado no aparelho) grava a ligação de volta na outra nota.
 */
function AddRelation({ path, root, onDone, onError }: { path: string; root: string; onDone(): void; onError(message: string): void }) {
  const vault = useVault()
  const index = vault.index!
  const [type, setType] = useState(RELATION_TYPES[0]!.key)
  const [target, setTarget] = useState("")
  const [attitude, setAttitude] = useState("")
  const [error, setError] = useState("")
  const [both, setBoth] = useRemembered("runas-codex:relacao-dois-lados", parseBoth)
  const clean = target.trim().replace(/^\[\[|\]\]$/g, "")
  const other = clean ? resolveTarget(index, clean, path) : null
  const otherName = other ? noteName(other) : clean
  const save = async () => {
    if (!clean) return setError("Escolha a nota.")
    const writes = other
      ? addRelationWrites(index, path, type, other, { note: attitude, both })
      : addRelationWrites(index, path, type, path, { note: attitude, both: false, link: `[[${clean}]]` })
    const failed = await applyWrites(vault.setProperty, writes)
    if (failed.length) return onError(`Não deu para gravar: ${failed.join("; ")}`)
    onDone()
  }
  return (
    <form className="stack add-relation" onSubmit={(e) => { e.preventDefault(); void save() }}>
      <FormGrid columns={1}>
        <FormField label="Tipo da relação">
          {(control) => <select id={control.id} className="select" value={type} onChange={(e) => setType(e.target.value)}>
            {GROUPS.map(([group, label]) => <optgroup key={group} label={label}>
              {RELATION_TYPES.filter((r) => r.group === group).map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </optgroup>)}
          </select>}
        </FormField>
        <FormField label="Com quem" error={error} hint="Um artigo da wiki">
          {(control) => <NoteCombobox id={control.id} value={target} onChange={(value) => { setTarget(value); setError("") }} root={root} from={path} describedBy={control.describedBy} invalid={control.invalid} />}
        </FormField>
        <FormField label="Atitude (opcional)" hint="Ex.: hostil, amigo de infância, tesoureira">
          {(control) => <input id={control.id} className="input" value={attitude} onChange={(e) => setAttitude(e.target.value)} aria-describedby={control.describedBy} />}
        </FormField>
      </FormGrid>
      {clean && <p className="small add-relation-sentence" aria-live="polite">{relationSentence(type, noteName(path), otherName)}.</p>}
      <label className="row add-relation-both">
        <input type="checkbox" checked={both && Boolean(other)} disabled={!other} onChange={(e) => setBoth(e.target.checked)} />
        <span className="small">{other ? `Gravar também em ${otherName}` : "Gravar também na outra nota (escolha um artigo que já existe)"}</span>
      </label>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn sm primary" type="submit">Adicionar</button>
        <button className="btn sm ghost" type="button" onClick={onDone}>Cancelar</button>
      </div>
    </form>
  )
}

/** Remover uma relação: sai da nota onde está escrita e, se estiver nas duas, pergunta se sai da outra também. */
function RemoveRelation({ path, relation, onClose }: { path: string; relation: Relation; onClose(): void }) {
  const vault = useVault(), toast = useToast()
  const other = relation.other!, name = noteName(other)
  const sides = relationSides(vault.index!, path, relation.type.key, other)
  const [alsoThere, setAlsoThere] = useState(true)
  return (
    <ConfirmDialog title={`Remover “${relation.type.label}: ${name}”?`} confirmLabel="Remover" danger onClose={onClose} onConfirm={async () => {
      const writes = removeRelationWrites(vault.index!, path, relation.type.key, other, { here: sides.here, there: sides.there && (alsoThere || !sides.here) })
      const failed = await applyWrites(vault.setProperty, writes)
      if (failed.length) toast(`Não deu para remover: ${failed.join("; ")}`)
    }}>
      {sides.here && sides.there
        ? <label className="row"><input type="checkbox" checked={alsoThere} onChange={(e) => setAlsoThere(e.target.checked)} /> <span>Remover também em {name}</span></label>
        : sides.there ? <>Esta relação está escrita em {name}; ela sai de lá.</> : <>A relação sai desta nota.</>}
    </ConfirmDialog>
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
