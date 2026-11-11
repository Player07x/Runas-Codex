import "./new-article.css"
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { FolderPlus, Search } from "lucide-react"
import { articleKind, articleKinds, newArticleNote, newMapNote, type ArticleKind } from "../../core/wiki"
import { CALENDAR_TEMPLATES, calendarNoteBody, calendarTemplate, type CalendarTemplate } from "../../core/calendar-form"
import { defaultAbbr } from "../../core/calendar"
import { openConfigureNext } from "./CalendarConfig"
import { applyFicha, fichaErrors, groupKinds, linkName, withArticleBody, type FichaInput, type FichaValues } from "../../core/wiki-ficha"
import { CoverImagePicker } from "../../components/kit/CoverImagePicker"
import { FormField, FormGrid } from "../../components/kit/FormField"
import { Modal } from "../../components/ui"
import { navigate } from "../../lib/router"
import { useVault } from "../../platform/VaultProvider"
import { CategoryKindDialog } from "./CategoryDialogs"
import { FichaFields } from "./FichaFields"
import { articleRoute, iconByName, useWiki } from "./wiki-state"

const fold = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR")

// Duas colunas a partir de 900 px; abaixo, dois passos (tipo e nome, depois a ficha).
const wideQuery = typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia("(min-width: 900px)") : null
const subscribe = (listener: () => void) => { wideQuery?.addEventListener("change", listener); return () => wideQuery?.removeEventListener("change", listener) }
const useWideDialog = () => useSyncExternalStore(subscribe, () => wideQuery?.matches ?? true, () => true)

export interface NewArticleOptions {
  initialName?: string
  initialKind?: string
  initialFolder?: string
  /** Ficha já preenchida (gerador, Novo NPC). */
  initialValues?: FichaValues
  /** Texto que entra logo abaixo do título (o resultado de um gerador). */
  initialBody?: string
  /** Quem abriu fica com o artigo criado (o pino do mapa liga nele); sem isto, o app abre o artigo. */
  onCreated?(path: string): void
}

/**
 * Novo artigo (U29): o tipo em grupos de rádios com busca, o nome, a pasta e a ficha do tipo já na criação. Calendário
 * e mapa nascem com o bloco pronto (o mapa exige a imagem). “Criar artigo” fica no rodapé do diálogo.
 */
export function NewArticleDialog({ onClose, initialName = "", initialKind, initialFolder, initialValues = {}, initialBody = "", onCreated }: NewArticleOptions & { onClose(): void }) {
  const vault = useVault()
  const { wiki, calendar, calendars } = useWiki()
  const index = vault.index!
  const kinds = articleKinds(wiki!.root)
  const first = articleKind(initialKind) ?? kinds[0]!
  const [kind, setKind] = useState<ArticleKind>(first)
  const [newCategory, setNewCategory] = useState(false)
  const [name, setName] = useState(initialName)
  const [folder, setFolder] = useState(initialFolder ?? first.folder)
  const [movingFolder, setMovingFolder] = useState(false)
  const [image, setImage] = useState("")
  const [ficha, setFicha] = useState<FichaValues>(initialValues)
  const [query, setQuery] = useState("")
  const [step, setStep] = useState<1 | 2>(1)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; image?: string; ficha?: Record<string, string>; general?: string }>({})
  const wide = useWideDialog()
  const nameInput = useRef<HTMLInputElement>(null)
  const stepTitle = useRef<HTMLHeadingElement>(null)
  const ids = useId()
  const root = wiki!.root.replace(/\/$/, "")
  const readOnly = vault.info?.readOnly ?? true
  const allCalendars = calendars.map((ref) => ref.calendar)
  const folderPath = folder.trim() ? `${root}/${folder.trim().replace(/^\/+|\/+$/g, "")}` : root
  const from = `${folderPath}/${name.trim() || "Sem título"}.md`
  const hasFicha = kind.id !== "calendario" && kind.id !== "mapa" && kind.fields.length > 0
  const needsStep2 = hasFicha || kind.id === "mapa" || kind.id === "calendario" || kind.questions.length > 0
  const [template, setTemplate] = useState<CalendarTemplate>("gregoriano")

  const groups = useMemo(() => {
    const term = fold(query.trim())
    return groupKinds(kinds).map((group) => ({ ...group, kinds: group.kinds.filter((k) => !term || fold(k.label).includes(term)) })).filter((group) => group.kinds.length)
  }, [kinds, query])
  const shownCount = groups.reduce((n, group) => n + group.kinds.length, 0)

  const choose = (next: ArticleKind) => { setKind(next); setFolder(next.folder); setErrors({}) }
  // Trocar de passo leva o foco ao título do passo (o botão que foi clicado some com a troca).
  const moved = useRef(false)
  const goTo = (next: 1 | 2) => { moved.current = true; setStep(next) }
  useEffect(() => { if (moved.current) stepTitle.current?.focus() }, [step])

  const checkStep1 = () => {
    if (name.trim()) return true
    setErrors({ name: "Dê um nome ao artigo." })
    nameInput.current?.focus()
    return false
  }

  const create = async () => {
    if (!checkStep1()) { if (!wide) setStep(1); return }
    if (kind.id === "mapa" && !image) return setErrors({ image: "Escolha a imagem do mapa." })
    const problems = hasFicha ? fichaErrors(kind, ficha, allCalendars) : {}
    if (Object.keys(problems).length) {
      setErrors({ ficha: problems })
      if (!wide) setStep(2)
      return
    }
    setBusy(true)
    setErrors({})
    try {
      const title = name.trim()
      const text =
        kind.id === "calendario" ? calendarArticle(title, template)
        : kind.id === "mapa" ? newMapNote(title, index.linkTarget(linkName(image), `${folderPath}/${title}.md`))
        : withArticleBody(applyFicha(newArticleNote(kind, title), kind, ficha, allCalendars), initialBody)
      const created = await vault.createNote(folderPath, title, text)
      onClose()
      if (onCreated) onCreated(created)
      else if (kind.id === "calendario") (openConfigureNext(created), navigate(`/wiki/calendario/${encodeURIComponent(created)}`))
      else navigate(kind.id === "mapa" ? `/wiki/mapa/${encodeURIComponent(created)}` : articleRoute(created))
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : String(err) })
      setBusy(false)
    }
  }

  // Categoria nova criada daqui: volta ao Novo artigo com o tipo dela escolhido.
  if (newCategory) return <CategoryKindDialog root={wiki!.root} wikiName={wiki!.name} onClose={() => setNewCategory(false)} onCreated={(created) => choose(created)} />

  const showTypes = wide || step === 1
  const showFicha = wide || step === 2
  const footer = wide || !needsStep2
    ? <><button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Cancelar</button><button type="button" className="btn primary" onClick={() => void create()} disabled={busy || readOnly}>{busy ? "Criando…" : "Criar artigo"}</button></>
    : step === 1
      ? <><button type="button" className="btn ghost" onClick={onClose}>Cancelar</button><button type="button" className="btn primary" onClick={() => checkStep1() && goTo(2)}>Continuar</button></>
      : <><button type="button" className="btn ghost" onClick={() => goTo(1)} disabled={busy}>Voltar</button><button type="button" className="btn primary" onClick={() => void create()} disabled={busy || readOnly}>{busy ? "Criando…" : "Criar artigo"}</button></>

  const nameBlock = <div className="new-article-name">
    <FormGrid columns={1}>
      <FormField label="Nome" error={errors.name}>
        {(control) => <input ref={nameInput} id={control.id} className="input" autoFocus required value={name} onChange={(event) => { setName(event.target.value); if (errors.name) setErrors({}) }} aria-describedby={control.describedBy} aria-invalid={control.invalid || undefined} />}
      </FormField>
      {movingFolder && <FormField label={`Pasta (dentro de ${wiki!.name})`} hint="Pastas separadas por /">
        {(control) => <input id={control.id} className="input" value={folder} onChange={(event) => setFolder(event.target.value)} aria-describedby={control.describedBy} />}
      </FormField>}
    </FormGrid>
    {!movingFolder && <p className="new-article-folder small">
      <span className="muted">Em</span> <strong>{folder.trim() || wiki!.name}</strong>
      <button type="button" className="btn sm ghost" onClick={() => setMovingFolder(true)}>Trocar pasta</button>
    </p>}
  </div>

  return (
    <Modal title="Novo artigo" onClose={onClose} wide footer={footer}>
      <form className={`new-article${wide ? " two" : ""}`} onSubmit={(event) => { event.preventDefault(); if (wide || step === 2 || !needsStep2) void create(); else if (checkStep1()) goTo(2) }}>
        {!wide && needsStep2 && <h3 className="new-article-step" ref={stepTitle} tabIndex={-1}>{step === 1 ? "Passo 1 de 2 · Tipo e nome" : "Passo 2 de 2 · Ficha"}</h3>}
        {!wide && step === 1 && nameBlock}
        {showTypes && <div className="new-article-types">
          <FormField label="Buscar tipo" hint={<span role="status">{shownCount === 1 ? "1 tipo" : `${shownCount} tipos`}</span>}>
            {(control) => <span className="search"><Search size={15} aria-hidden="true" /><input id={control.id} className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-describedby={control.describedBy} /></span>}
          </FormField>
          <div className="new-article-groups">
            {groups.map((group) => <fieldset key={group.id} className="new-article-group">
              <legend>{group.label}</legend>
              {group.kinds.map((k) => { const Icon = iconByName(k.icon); return <label key={k.id} className={`new-article-kind${k.id === kind.id ? " on" : ""}`}>
                <input type="radio" name={`${ids}-tipo`} value={k.id} checked={k.id === kind.id} onChange={() => choose(k)} />
                <Icon size={16} aria-hidden="true" /><span>{k.label}</span>
              </label> })}
            </fieldset>)}
            {!groups.length && <p className="small muted">Nenhum tipo com “{query.trim()}”.</p>}
          </div>
          <button type="button" className="btn sm ghost new-article-category" onClick={() => setNewCategory(true)} disabled={readOnly}><FolderPlus size={15} /> Nova categoria…</button>
        </div>}

        <div className="new-article-main">
          {wide && nameBlock}
          {showFicha && <>
            {kind.id === "calendario" && <fieldset className="new-article-section new-calendar-templates">
              <legend className="new-article-section-title">Começar de um modelo</legend>
              {CALENDAR_TEMPLATES.map((t) => <label key={t.value} className={`new-article-kind${t.value === template ? " on" : ""}`}>
                <input type="radio" name={`${ids}-modelo`} value={t.value} checked={t.value === template} onChange={() => setTemplate(t.value)} />
                <span><strong>{t.label}</strong><small className="muted"> · {t.hint}</small></span>
              </label>)}
              <p className="small muted">Depois de criar, a aba Configurar abre para você ajustar meses, semana, luas e feriados.</p>
            </fieldset>}
            {kind.id === "mapa" && <section className="new-article-section" aria-labelledby={`${ids}-mapa`}>
              <h3 id={`${ids}-mapa`} className="new-article-section-title">Imagem do mapa</h3>
              <CoverImagePicker legend="Imagem do mapa (obrigatória)" nearNote={from} value={image} onChange={(link) => { setImage(link); setErrors({}) }} />
              {errors.image && <p className="kit-field-hint error" role="alert">{errors.image}</p>}
            </section>}
            {hasFicha && <details className="new-article-section" open>
              <summary id={`${ids}-ficha`} className="new-article-section-title">Ficha · {kind.label} <span className="muted small">opcional</span></summary>
              <FichaFields fields={kind.fields} values={ficha} onChange={(key: string, value: FichaInput) => setFicha((current) => ({ ...current, [key]: value }))} calendars={allCalendars} calendar={calendar?.calendar ?? null} root={wiki!.root} from={from} errors={errors.ficha} showAge />
            </details>}
            {kind.questions.length > 0 && <details className="new-article-questions">
              <summary>Perguntas-guia <span className="cnt">{kind.questions.length}</span></summary>
              <ul>{kind.questions.map((question) => <li key={question}>{question}</li>)}</ul>
              <p className="small muted">Elas entram no artigo como comentários (%% %%): aparecem só ao editar.</p>
            </details>}
          </>}
          {errors.general && <p className="kit-field-hint error" role="alert">{errors.general}</p>}
        </div>
      </form>
    </Modal>
  )
}

/** Nota de calendário nova a partir de um modelo (U35): o gregoriano começa no dia de hoje; os outros, no ano 1. */
function calendarArticle(title: string, kind: CalendarTemplate): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const now = new Date()
  const today = kind === "gregoriano" ? `${String(now.getFullYear()).padStart(4, "0")}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` : "0001-01-01"
  const form = { ...calendarTemplate(kind, title), sigla: defaultAbbr(title) }
  return `---\ntipo: calendario\n---\n# ${title}\n\n${calendarNoteBody(form, today)}`
}
