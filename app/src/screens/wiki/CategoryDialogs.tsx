import { useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Notice } from "../../components/kit/Layout"
import { Modal, useToast } from "../../components/ui"
import { categoryNotePath, isCategoryNote } from "../../core/personalization"
import { setProperty, type PropertyValue } from "../../core/properties"
import { activeFilters, categoryRoute, FIELD_PROBLEMS, type CategoryField } from "../../core/wiki-category"
import { ARTICLE_KINDS, articleKinds, customKindOf, FIELD_KIND_LABELS, fieldKey, fieldSpec, newCategoryNote, singularOf, type ArticleKind, type FieldDef, type FieldKind } from "../../core/wiki"
import { navigate } from "../../lib/router"
import { useVault } from "../../platform/VaultProvider"

/** Grava propriedades na nota da categoria; se ela ainda não existe, cria com `tipo: categoria` (como Personalizar). */
function useCategoryWriter() {
  const vault = useVault()
  return async (folder: string, name: string, entries: [string, PropertyValue | undefined][]) => {
    const path = categoryNotePath(folder)
    const note = vault.index!.note(path)
    let text = note?.text ?? setProperty(`# ${name}\n`, "tipo", "categoria")
    for (const [key, value] of entries) text = setProperty(text, key, value)
    if (note) await vault.save(path, text)
    else await vault.createNote(folder, name, text)
  }
}

/**
 * “Escolher filtros” da página de categoria: os campos dos artigos que servem de filtro (um valor de texto por nota)
 * e, à parte, os que não servem e por quê. A escolha vai para `filtros` na nota da categoria; “Automático” apaga.
 */
export function FilterChooser({ folder, name, fields, chosen, onClose }: { folder: string; name: string; fields: CategoryField[]; chosen: string[] | null; onClose(): void }) {
  const vault = useVault()
  const toast = useToast()
  const write = useCategoryWriter()
  const usable = fields.filter((field) => !field.problem)
  const unusable = fields.filter((field) => field.problem)
  const [picked, setPicked] = useState(() => new Set(activeFilters(fields, chosen).map((field) => field.key)))
  const [busy, setBusy] = useState(false)
  const readOnly = vault.info?.readOnly ?? true
  const save = async (keys: string[] | undefined) => {
    setBusy(true)
    try {
      await write(folder, name, [["filtros", keys]])
      toast(keys ? "Filtros gravados na categoria." : "A categoria voltou aos filtros automáticos.")
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error))
      setBusy(false)
    }
  }
  const toggle = (key: string, on: boolean) => setPicked((current) => { const next = new Set(current); if (on) next.add(key); else next.delete(key); return next })
  return (
    <Modal title={`Filtros de ${name}`} onClose={onClose} footer={<>
      <button className="btn ghost" onClick={onClose} disabled={busy}>Cancelar</button>
      {chosen && <button className="btn" onClick={() => void save(undefined)} disabled={busy || readOnly}>Voltar ao automático</button>}
      <button className="btn primary" onClick={() => void save(usable.map((field) => field.key).filter((key) => picked.has(key)))} disabled={busy || readOnly}>Salvar</button>
    </>}>
      <div className="stack category-filter-chooser">
        {readOnly && <Notice tone="warn" title="Cofre em somente leitura">Libere a gravação em Configurações › Cofre para escolher os filtros.</Notice>}
        <p className="small muted">Marque os campos que viram filtro nesta categoria. A escolha fica na nota da categoria (<code>filtros</code>) e vale em todos os aparelhos.</p>
        <fieldset>
          <legend>Servem de filtro</legend>
          {usable.length === 0 && <p className="small muted">Nenhum campo dos artigos tem um valor de texto por nota.</p>}
          {usable.map((field) => (
            <label key={field.key} className="check category-filter-option">
              <input type="checkbox" checked={picked.has(field.key)} onChange={(event) => toggle(field.key, event.target.checked)} />
              <span className="stack" style={{ gap: 2 }}>
                <strong className="small">{field.label}</strong>
                <span className="tiny muted">{field.values.slice(0, 4).map((value) => value.text).join(", ")}{field.values.length > 4 ? "…" : ""} · {field.values.length} {field.values.length === 1 ? "valor" : "valores"}{field.values.length > 8 ? " (vira uma lista de escolha)" : ""}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {unusable.length > 0 && (
          <section aria-labelledby="filtros-fora">
            <h3 id="filtros-fora" className="eyebrow">Não servem de filtro</h3>
            <ul className="category-filter-out">
              {unusable.map((field) => <li key={field.key} className="small"><strong>{field.label}</strong> <span className="muted">— {FIELD_PROBLEMS[field.problem!]}{field.example ? ` (por exemplo, ${field.example})` : ""}</span></li>)}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  )
}

type Row = { label: string; kind: FieldKind }
const KIND_ORDER: FieldKind[] = ["texto", "link", "links", "numero", "data", "imagem"]
const BAD_NAME = /[\\/:*?"<>|#^[\]]/
const splitList = (text: string) => text.split(/\n|,/).map((item) => item.trim()).filter(Boolean)

/**
 * Categoria criada pelo usuário (“Monstros”, “Plantas”): o nome, o nome de cada artigo (vira o `tipo`) e a ficha.
 * Sem `folder`, cria a pasta e a nota da categoria; com `folder`, edita a ficha de uma categoria que já existe. Tirar
 * um campo da ficha não apaga o valor dos artigos que já o têm.
 */
export function CategoryKindDialog({ root, wikiName, folder, onClose, onCreated }: {
  root: string; wikiName: string; folder?: string; onClose(): void
  /** Quem abriu de dentro do Novo artigo recebe o tipo criado em vez de ir para a página da categoria. */
  onCreated?(kind: ArticleKind): void
}) {
  const vault = useVault()
  const toast = useToast()
  const write = useCategoryWriter()
  const index = vault.index!
  const editing = folder !== undefined
  const current = useMemo(() => {
    if (!folder) return null
    const note = index.note(categoryNotePath(folder))
    return customKindOf(folder, note && isCategoryNote(note) ? note.meta.frontmatter?.data ?? {} : { campos: [] })
  }, [folder, index])
  const [name, setName] = useState(folder ? folder.split("/").at(-1)! : "")
  const [label, setLabel] = useState(current?.label ?? "")
  const [rows, setRows] = useState<Row[]>(() => current?.fields.length ? current.fields.map((field) => ({ label: field.label, kind: field.kind })) : [{ label: "Imagem", kind: "imagem" }, { label: "", kind: "texto" }])
  const [sections, setSections] = useState((current?.sections ?? ["Descrição", "História"]).join(", "))
  const [questions, setQuestions] = useState((current?.questions ?? []).join("\n"))
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const readOnly = vault.info?.readOnly ?? true
  const article = label.trim() || singularOf(name)
  const templates = ARTICLE_KINDS.filter((kind) => kind.fields.length > 0)

  const setRow = (i: number, patch: Partial<Row>) => setRows((list) => list.map((row, j) => (j === i ? { ...row, ...patch } : row)))
  const copyFrom = (id: string) => {
    const kind = templates.find((k) => k.id === id)
    if (!kind) return
    setRows(kind.fields.map((field) => ({ label: field.label, kind: field.kind })))
    setSections(kind.sections.join(", "))
    setQuestions(kind.questions.join("\n"))
  }

  const save = async () => {
    const plural = name.trim()
    const target = folder ?? `${root}${plural}`
    const id = fieldKey(article)
    const fields: FieldDef[] = rows.filter((row) => row.label.trim()).map((row) => {
      const key = fieldKey(row.label)
      return { key: row.kind === "data" && key && !key.endsWith("_mundo") ? `${key}_mundo` : key, label: row.label.trim(), kind: row.kind }
    })
    const keys = fields.map((field) => field.key)
    if (!plural) return setError("Dê um nome à categoria (no plural, como “Monstros”).")
    if (BAD_NAME.test(plural)) return setError("O nome da categoria não pode ter / \\ : * ? \" < > | # ^ [ ].")
    if (!id) return setError("Dê um nome a cada artigo (como “Monstro”).")
    if (ARTICLE_KINDS.some((kind) => kind.id === id)) return setError(`“${article}” já é um tipo pronto da Wiki. Use outro nome, ou crie artigos desse tipo pelo Novo artigo.`)
    if (articleKinds(root).some((kind) => kind.id === id && kind.root && kind.folder !== target.slice(root.length))) return setError(`Outra categoria desta wiki já cria “${article}”.`)
    if (fields.some((field) => !field.key)) return setError("Cada campo precisa de um nome com letras ou números.")
    if (new Set(keys).size !== keys.length) return setError("Dois campos ficaram com o mesmo nome.")
    if (!editing && index.note(categoryNotePath(target))) return setError(`Já existe a categoria “${plural}” nesta wiki.`)
    const kind = { label: article, fields, sections: splitList(sections), questions: questions.split("\n").map((q) => q.trim()).filter(Boolean) }
    setBusy(true)
    setError(undefined)
    try {
      if (editing) {
        await write(target, plural, [["artigo", article], ["campos", fields.length ? fields.map(fieldSpec) : undefined], ["secoes", kind.sections.length ? kind.sections : undefined], ["perguntas", kind.questions.length ? kind.questions : undefined]])
        toast("Ficha da categoria gravada.")
      } else {
        await vault.createNote(target, plural, newCategoryNote(plural, kind))
        toast(`Categoria “${plural}” criada.`)
        if (onCreated) onCreated({ id, folder: target.slice(root.length), icon: "folder", root, ...kind, sections: kind.sections.length ? kind.sections : ["Descrição", "História"] })
        else navigate(categoryRoute(target))
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <Modal title={editing ? `Ficha de ${name}` : "Nova categoria"} wide onClose={onClose} footer={<>
      <button className="btn ghost" onClick={onClose} disabled={busy}>Cancelar</button>
      <button className="btn primary" onClick={() => void save()} disabled={busy || readOnly}>{busy ? "Gravando…" : editing ? "Salvar" : "Criar categoria"}</button>
    </>}>
      <form className="stack category-kind-form" onSubmit={(event) => { event.preventDefault(); void save() }}>
        {readOnly && <Notice tone="warn" title="Cofre em somente leitura">Libere a gravação em Configurações › Cofre para criar categorias.</Notice>}
        <div className="form-grid">
          <label className="field">
            <span>Nome da categoria</span>
            <input className="input" autoFocus={!editing} disabled={editing} value={name} placeholder="Monstros" onChange={(event) => setName(event.target.value)} aria-label="Nome da categoria" />
            <span className="tiny muted">{editing ? "Para trocar o nome, renomeie a pasta em Notas." : `Vira a pasta ${wikiName}/${name.trim() || "…"}.`}</span>
          </label>
          <label className="field">
            <span>Nome de cada artigo</span>
            <input className="input" value={label} placeholder={singularOf(name) || "Monstro"} onChange={(event) => setLabel(event.target.value)} aria-label="Nome de cada artigo" />
            <span className="tiny muted">Aparece em “Novo {article.toLocaleLowerCase("pt-BR") || "artigo"}” e vira <code>tipo: {fieldKey(article) || "…"}</code>.</span>
          </label>
        </div>
        <fieldset className="category-kind-fields">
          <legend>Ficha de cada artigo</legend>
          <label className="field">
            <span>Começar com a ficha de um tipo pronto</span>
            <select className="select" value="" onChange={(event) => copyFrom(event.target.value)}>
              <option value="">Escolha para copiar os campos…</option>
              {templates.map((kind) => <option key={kind.id} value={kind.id}>{kind.label}</option>)}
            </select>
          </label>
          {rows.map((row, i) => (
            <div key={i} className="category-kind-row">
              <label className="field grow">
                <span className="sr-only">Nome do campo {i + 1}</span>
                <input className="input" value={row.label} placeholder="Habitat" onChange={(event) => setRow(i, { label: event.target.value })} aria-label={`Nome do campo ${i + 1}`} />
              </label>
              <label className="field">
                <span className="sr-only">Tipo do campo {i + 1}</span>
                <select className="select" value={row.kind} onChange={(event) => setRow(i, { kind: event.target.value as FieldKind })} aria-label={`Tipo do campo ${i + 1}`}>
                  {KIND_ORDER.map((kind) => <option key={kind} value={kind}>{FIELD_KIND_LABELS[kind]}</option>)}
                </select>
              </label>
              <button type="button" className="icon-btn" onClick={() => setRows((list) => list.filter((_, j) => j !== i))} aria-label={`Remover o campo ${row.label.trim() || i + 1}`}><Trash2 size={16} /></button>
              {row.label.trim() && <code className="tiny muted category-kind-key">{fieldKey(row.label)}{row.kind === "data" && !fieldKey(row.label).endsWith("_mundo") ? "_mundo" : ""}:</code>}
            </div>
          ))}
          <button type="button" className="btn sm" onClick={() => setRows((list) => [...list, { label: "", kind: "texto" }])}><Plus size={14} /> Adicionar campo</button>
          <span className="tiny muted">Link aponta para outro artigo (como Habitat → um Local). Data usa o calendário do mundo. Imagem vira o retrato do artigo nos cartões.{editing ? " Tirar um campo não apaga o valor dos artigos que já o têm." : ""}</span>
        </fieldset>
        <div className="form-grid">
          <label className="field">
            <span>Seções do texto</span>
            <input className="input" value={sections} onChange={(event) => setSections(event.target.value)} placeholder="Descrição, História" />
            <span className="tiny muted">Separadas por vírgula; viram títulos ## no artigo novo.</span>
          </label>
          <label className="field">
            <span>Perguntas-guia (uma por linha)</span>
            <textarea className="input" rows={3} value={questions} onChange={(event) => setQuestions(event.target.value)} placeholder="Onde ele vive?" />
            <span className="tiny muted">Entram como comentários %% %%: aparecem só ao editar.</span>
          </label>
        </div>
        {error && <p className="small" role="alert" style={{ color: "var(--red)" }}>{error}</p>}
      </form>
    </Modal>
  )
}
