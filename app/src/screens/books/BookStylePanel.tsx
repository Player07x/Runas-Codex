import { Minus, Plus, Undo2 } from "lucide-react"
import { useState, type ReactNode } from "react"
import { ChoiceGroup } from "../../components/kit/ChoiceGroup"
import { SaveStatus } from "../../components/kit/Layout"
import { BOOK_MODELS, STYLE_KEYS, bookModel, modelNoteFor, modelNoteText, resolveStyle, vaultModels, type BookStyle, type ModelId } from "../../core/book-style"
import { bookProperties } from "../../core/books"
import { scopeBookCss } from "../../core/books-finish"
import { BOOK_SIZES, previewSettings, type BookSize } from "../../core/books-preview"
import { COVER_STYLES, NUMBERINGS, OPENINGS, PAGE_NUMBERS, RUNNING_HEADS, bookLayout } from "../../core/book-layout"
import type { PropertyValue } from "../../core/properties"
import type { IndexedNote } from "../../core/vault-index"
import { useVault } from "../../platform/VaultProvider"
import { TEXT_FONTS, TITLE_FONTS } from "./book-fonts"
import { vaultFonts } from "./vault-fonts"
import "./book-style.css"

export type StyleChanges = Record<string, PropertyValue | undefined>
export type SaveState = "salvo" | "salvando" | "erro" | "somente-leitura"

/** Ao trocar de modelo, os ajustes por cima do anterior saem (o tema antigo e a cor de papel antiga também). */
const RESET_KEYS = [...STYLE_KEYS, "tema", "fundo_pagina"]
const MODELS_FOLDER = "Livros/Modelos"

/**
 * Estilo do livro (L3, ADR 0033): o modelo e os ajustes por cima dele, em grupos. Cada mudança aparece na prévia na
 * hora; quem grava (um segundo depois da última, numa gravação só) é o Diagramar. `book` já vem com as mudanças.
 */
export function BookStylePanel({ book, style, onChange, onUndo, canUndo, saveState, onEditCover, narrow }: {
  book: IndexedNote
  style: BookStyle
  onChange(changes: StyleChanges, coalesce?: string): void
  onUndo(): void
  canUndo: boolean
  saveState: SaveState
  onEditCover(): void
  narrow: boolean
}) {
  const vault = useVault(), index = vault.index!
  const readOnly = Boolean(vault.info?.readOnly)
  const props = bookProperties(book)
  const settings = previewSettings(book)
  const layout = bookLayout(props)
  const options = <T extends Record<string, string>>(table: T) => Object.entries(table).map(([value, label]) => ({ value: value as keyof T & string, label }))
  const own = modelNoteFor(index, book, props)
  // O estilo sem os ajustes do livro: escolher de novo o valor do modelo apaga o ajuste em vez de gravá-lo.
  const base = resolveStyle(Object.fromEntries(Object.entries(props).filter(([key]) => !RESET_KEYS.includes(key) || key === "tema")), own ? bookProperties(own) : undefined)
  const set = (key: string, value: PropertyValue | undefined, baseValue?: PropertyValue, coalesce?: string) =>
    onChange({ [key]: value === baseValue ? undefined : value }, coalesce)
  const reset = () => Object.fromEntries(RESET_KEYS.filter((key) => key in props).map((key) => [key, undefined]))
  const fonts = vaultFonts(index)
  const [saving, setSaving] = useState(false)
  const [modelName, setModelName] = useState(`Modelo ${book.name}`)
  const [modelError, setModelError] = useState("")
  const [css, setCss] = useState(typeof props.css_livro === "string" ? props.css_livro : "")
  const [cssError, setCssError] = useState("")
  const [terms, setTerms] = useState(Array.isArray(props.indice_termos) ? props.indice_termos.join("\n") : "")

  const current = own ? own.path : bookModel(props)
  const models: { key: string; label: string; style: BookStyle; choose(): void }[] = [
    ...(Object.keys(BOOK_MODELS) as ModelId[]).map((id) => ({ key: id, label: BOOK_MODELS[id].label, style: resolveStyle({ modelo: id }), choose: () => onChange({ ...reset(), modelo: id }) })),
    ...vaultModels(index).map((note) => ({ key: note.path, label: note.name, style: resolveStyle({}, bookProperties(note)), choose: () => onChange({ ...reset(), modelo: `[[${note.name}]]` }) })),
  ]

  async function saveModel() {
    setModelError("")
    try {
      const path = await vault.createNote(MODELS_FOLDER, modelName.trim(), modelNoteText(style))
      onChange({ ...reset(), modelo: `[[${path.slice(MODELS_FOLDER.length + 1, -3)}]]` })
      setSaving(false)
    } catch (error) { setModelError(error instanceof Error ? error.message : String(error)) }
  }

  const fontSelect = (label: string, key: "fonte_titulos" | "fonte_texto", value: string, builtIn: readonly string[], baseValue: string) => <label className="book-style-row">
    <span>{label}</span>
    <select className="select" value={value} style={{ fontFamily: `"${value}"` }} onChange={(e) => set(key, e.target.value, baseValue)}>
      <optgroup label="Do app">{[...new Set([...builtIn, ...(builtIn.includes(value) || fonts.some((f) => f.name === value) ? [] : [value])])].map((name) => <option key={name} value={name}>{name}</option>)}</optgroup>
      {fonts.length > 0 && <optgroup label="Do cofre">{fonts.map((f) => <option key={f.path} value={f.name}>{f.name}</option>)}</optgroup>}
    </select>
  </label>

  return <aside className="book-style-panel" aria-label="Estilo do livro">
    <div className="book-style-head">
      <h2>Estilo do livro</h2>
      <SaveStatus state={readOnly ? "somente-leitura" : saveState} />
      <button type="button" className="btn sm ghost" disabled={!canUndo || readOnly} onClick={onUndo} title="Desfazer o último ajuste"><Undo2 size={15} /> Desfazer</button>
      <button type="button" className="btn sm" disabled={readOnly} aria-expanded={saving} onClick={() => setSaving(!saving)}>Salvar como modelo…</button>
    </div>
    {saving && <form className="book-style-save" onSubmit={(e) => { e.preventDefault(); void saveModel() }}>
      <label className="field"><span>Nome do modelo</span><input className="input" required value={modelName} onChange={(e) => setModelName(e.target.value)} /></label>
      <p className="small muted">Vira a nota <code>{MODELS_FOLDER}/{modelName.trim() || "…"}.md</code>, com estas fontes, cores e colunas. Outros livros podem usar o mesmo modelo.</p>
      {modelError && <p role="alert" className="book-style-error">{modelError}</p>}
      <div className="row"><button className="btn sm primary" disabled={!modelName.trim()}>Salvar modelo</button><button type="button" className="btn sm ghost" onClick={() => setSaving(false)}>Cancelar</button></div>
    </form>}
    <fieldset className="book-style-groups" disabled={readOnly}>
      <Group title="Modelo" open>
        <div className="book-models" role="radiogroup" aria-label="Modelo do livro">
          {models.map((model) => <label key={model.key} className={`book-model${current === model.key ? " on" : ""}`}>
            <input type="radio" name="book-model" checked={current === model.key} onChange={model.choose} />
            <span className="book-model-page" aria-hidden="true" style={{ background: model.style.paper, color: model.style.ink }}>
              <b style={{ fontFamily: `"${model.style.titleFont}"`, color: model.style.accent }}>Aa</b>
              <span className="book-model-lines">{Array.from({ length: model.style.columns }, (_, i) => <i key={i} />)}</span>
            </span>
            <span className="book-model-name">{model.label}</span>
          </label>)}
        </div>
      </Group>
      <Group title="Tipografia" open={!narrow}>
        {fontSelect("Títulos", "fonte_titulos", style.titleFont, TITLE_FONTS, base.titleFont)}
        {fontSelect("Texto", "fonte_texto", style.textFont, TEXT_FONTS, base.textFont)}
        <div className="book-style-row">
          <span id="book-size-label">Tamanho</span>
          <span className="book-stepper" role="group" aria-labelledby="book-size-label">
            <button type="button" className="btn sm ghost" aria-label="Diminuir a letra" disabled={style.sizePt <= 8} onClick={() => set("corpo_pt", style.sizePt - .5, base.sizePt, "corpo_pt")}><Minus size={15} /></button>
            <output aria-live="polite">{style.sizePt.toLocaleString("pt-BR")} pt</output>
            <button type="button" className="btn sm ghost" aria-label="Aumentar a letra" disabled={style.sizePt >= 16} onClick={() => set("corpo_pt", style.sizePt + .5, base.sizePt, "corpo_pt")}><Plus size={15} /></button>
          </span>
        </div>
        <div className="book-style-row"><span>Entrelinha</span><ChoiceGroup label="Entrelinha" value={style.leading} options={[{ value: "justa", label: "Justa" }, { value: "normal", label: "Normal" }, { value: "folgada", label: "Folgada" }]} onChange={(v) => set("entrelinha", v, base.leading)} /></div>
        <div className="book-style-row"><span>Alinhamento</span><ChoiceGroup label="Alinhamento" value={style.justify ? "justificado" : "esquerda"} options={[{ value: "esquerda", label: "Esquerda" }, { value: "justificado", label: "Justificado" }]} onChange={(v) => set("alinhamento", v, base.justify ? "justificado" : "esquerda")} /></div>
        <label className="check"><input type="checkbox" checked={style.hyphenate} onChange={(e) => set("hifenizar", e.target.checked, base.hyphenate)} />Hifenizar em português</label>
      </Group>
      <Group title="Cores">
        {([["cor_papel", "Papel", style.paper, base.paper], ["cor_texto", "Texto", style.ink, base.ink], ["cor_destaque", "Destaque", style.accent, base.accent]] as const).map(([key, label, value, baseValue]) =>
          <label key={key} className="book-style-row"><span>{label}</span><input type="color" className="book-color" value={value} onChange={(e) => onChange({ [key]: e.target.value === baseValue ? undefined : e.target.value, ...(key === "cor_papel" && "fundo_pagina" in props ? { fundo_pagina: undefined } : {}) }, key)} /></label>)}
        <label className="check"><input type="checkbox" checked={props.fundo_impressao === true} onChange={(e) => set("fundo_impressao", e.target.checked || undefined)} />Fundo também na impressão</label>
        <label className="book-style-row"><span>Textura</span><select className="select" value={typeof props.textura === "string" ? props.textura : "nenhuma"} onChange={(e) => set("textura", e.target.value, "nenhuma")}><option value="nenhuma">Sem textura</option><option value="papel">Papel</option><option value="linho">Linho</option></select></label>
        <label className="field"><span>Marca d’água</span><input className="input" maxLength={100} value={typeof props.marca_agua === "string" ? props.marca_agua : ""} onChange={(e) => set("marca_agua", e.target.value || undefined, undefined, "marca_agua")} /></label>
      </Group>
      <Group title="Página">
        <div className="book-style-row"><span>Tamanho</span><ChoiceGroup label="Tamanho da página" value={settings.size} options={(Object.keys(BOOK_SIZES) as BookSize[]).map((size) => ({ value: size, label: size === "6x9" ? "6×9" : size }))} onChange={(v) => set("pagina", v, "A4")} /></div>
        <div className="book-style-row"><span>Colunas do livro</span><ChoiceGroup label="Colunas do livro" value={String(style.columns) as "1" | "2" | "3"} options={[{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }]} onChange={(v) => set("colunas", Number(v), base.columns)} /></div>
        <p className="small muted">Um capítulo pode pedir outra com <code>colunas:</code> nas propriedades; quem já usa <code>::: runas-colunas</code> fica como está.</p>
        <label className="check"><input type="checkbox" checked={layout.mirrored} onChange={(e) => onChange({ espelhadas: e.target.checked || undefined })} />Páginas espelhadas (margem interna maior)</label>
        <label className="book-style-row"><span>Margem (mm)</span><input className="input book-number" type="number" min="0" max="40" step="0.5" placeholder={String(BOOK_SIZES[settings.size].margin)} value={typeof props.margem_mm === "number" ? props.margem_mm : ""} onChange={(e) => set("margem_mm", e.target.value === "" ? undefined : Number(e.target.value), undefined, "margem_mm")} /></label>
        <label className="book-style-row"><span>Sangria (mm)</span><input className="input book-number" type="number" min="0" max="10" step="0.5" value={typeof props.sangria_mm === "number" ? props.sangria_mm : 0} onChange={(e) => set("sangria_mm", e.target.value === "" ? undefined : Number(e.target.value), 0, "sangria_mm")} /></label>
        <label className="check"><input type="checkbox" checked={props.marcas_corte === true} onChange={(e) => set("marcas_corte", e.target.checked || undefined)} />Marcas de corte</label>
      </Group>
      <Group title="Fichas">
        <div className="book-style-row"><span>Desenho</span><ChoiceGroup label="Desenho das fichas" value={style.fichas} options={[{ value: "tipografica", label: "Tipográfica" }, { value: "fundo", label: "Fundo suave" }, { value: "faixa", label: "Faixa no nome" }]} onChange={(v) => set("fichas", v, base.fichas)} /></div>
        <p className="small muted">Fichas são callouts <code>[!magia]</code>, <code>[!runa]</code>, <code>[!habilidade]</code>, <code>[!item]</code>, <code>[!criatura]</code>, <code>[!raca]</code>, <code>[!classe]</code> e <code>[!efeito]</code>. No texto, selecione uma magia no formato antigo e use “Converter em ficha”.</p>
      </Group>
      <Group title="Capítulos">
        <div className="book-style-row"><span>Abertura</span><ChoiceGroup label="Abertura dos capítulos" value={layout.opening} options={options(OPENINGS)} onChange={(v) => set("abertura", v, "simples")} /></div>
        {layout.opening === "pagina" && <p className="small muted">A imagem da abertura vem de <code>imagem:</code> (ou <code>capa:</code>) nas propriedades do capítulo.</p>}
        <div className="book-style-row"><span>Numeração</span><ChoiceGroup label="Numeração dos capítulos" value={layout.numbering} options={options(NUMBERINGS)} onChange={(v) => set("numeracao", v, "arabico")} /></div>
        <label className="check"><input type="checkbox" checked={layout.dropCap} onChange={(e) => set("capitular", e.target.checked || undefined)} />Letra capitular no começo do capítulo</label>
        <label className="check"><input type="checkbox" checked={settings.newChapter} onChange={(e) => onChange({ capitulos_nova_pagina: e.target.checked })} />Capítulos em página nova</label>
      </Group>
      <Group title="Cabeçalho e rodapé">
        <label className="book-style-row"><span>Cabeçalho</span><select className="select" value={layout.head} onChange={(e) => set("cabecalho", e.target.value, "livro-capitulo")}>{options(RUNNING_HEADS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        <label className="book-style-row"><span>Número da página</span><select className="select" value={layout.pageNumber} onChange={(e) => set("numero_pagina", e.target.value, layout.mirrored ? "externo" : "centro")}>{options(PAGE_NUMBERS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        <p className="small muted">O cabeçalho não aparece na capa, no sumário, nas partes nem na página que abre um capítulo.</p>
      </Group>
      <Group title="Partes do livro">
        <div className="book-style-row"><span>Capa</span><ChoiceGroup label="Desenho da capa" value={layout.cover} options={options(COVER_STYLES)} onChange={(v) => set("capa_estilo", v, "classica")} /></div>
        <button type="button" className="btn sm" onClick={onEditCover}>Editar capa e créditos…</button>
        <label className="check"><input type="checkbox" checked={layout.toc} onChange={(e) => set("sumario", e.target.checked || undefined)} />Sumário com o número das páginas</label>
        <label className="check"><input type="checkbox" checked={props.indice_remissivo === true} onChange={(e) => set("indice_remissivo", e.target.checked || undefined)} />Índice remissivo</label>
        <label className="check"><input type="checkbox" checked={props.glossario === true} onChange={(e) => set("glossario", e.target.checked || undefined)} />Glossário da Wiki</label>
        <label className="field"><span>Termos do índice (um por linha)</span><textarea className="input" rows={3} value={terms} onChange={(e) => { setTerms(e.target.value); const list = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean); set("indice_termos", list.length ? list : undefined, undefined, "indice_termos") }} /></label>
        <p className="small muted">O índice também usa os artigos da Wiki citados; o glossário usa o resumo de cada um.</p>
      </Group>
      <Group title="Exportação">
        <label className="book-style-row"><span>Imagens</span><select className="select" aria-label="Qualidade das imagens" value={typeof props.imagens === "string" ? props.imagens : "tela"} onChange={(e) => set("imagens", e.target.value, "tela")}><option value="tela">Tela (150 ppi, leve)</option><option value="grafica">Gráfica (300 ppi)</option><option value="original">Original</option></select></label>
      </Group>
      <Group title="Avançado">
        <label className="field"><span>CSS do livro</span><textarea className="input book-css" rows={5} placeholder="h1 { color: #763c35; }" value={css} onChange={(e) => {
          setCss(e.target.value)
          try { scopeBookCss(e.target.value); setCssError(""); set("css_livro", e.target.value.trim() ? e.target.value : undefined, undefined, "css_livro") }
          catch (error) { setCssError(error instanceof Error ? error.message : String(error)) }
        }} /></label>
        {cssError ? <p role="alert" className="book-style-error">{cssError} Enquanto houver erro, o CSS não é gravado.</p> : <p className="small muted">Regras simples de tipografia e cores, só no papel do livro. Sem @, URLs nem recursos externos.</p>}
      </Group>
    </fieldset>
  </aside>
}

/** Grupo recolhível do painel; o título é um botão de verdade (summary) com o nome do grupo. */
export function Group({ title, open = false, children }: { title: string; open?: boolean; children: ReactNode }) {
  return <details className="book-style-group" open={open}><summary>{title}</summary><div className="book-style-body">{children}</div></details>
}
