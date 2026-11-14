import { createRoot, type Root } from "react-dom/client"
import { syntaxTree } from "@codemirror/language"
import { EditorState, Facet, StateEffect, StateField, type Extension, type Range, type Text, type Transaction } from "@codemirror/state"
import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from "@codemirror/view"
import type { SyntaxNodeRef } from "@lezer/common"
import { changeEmbed } from "../../core/embeds"
import { parseFrontmatter } from "../../core/parse"
import type { NoteSet } from "../../lib/note-set"
import type { PropertiesDisplay } from "../../lib/properties-display"
import { Markdown } from "../Markdown"
import { NoteSetContext } from "../../lib/note-set"
import { Embed } from "../../markdown/Embed"
import { ImageEditContext, type ImageEditApi } from "../../markdown/EmbedImage"
import { isRenderedCodeBlock, toggledTaskLines } from "../../markdown/extensions"

/**
 * Live preview do editor, como no Obsidian: fora da linha (ou do trecho) do cursor, a marcação some e o texto aparece
 * formatado; tabelas, callouts, HTML, fórmulas, diagramas, embeds e o frontmatter viram a versão desenhada (o mesmo
 * leitor do modo leitura). Clicar num bloco desenhado põe o cursor nele e mostra o código.
 */

export interface LivePreviewHost {
  /** Resolve links e lê notas/anexos para os blocos desenhados. */
  noteSet(): NoteSet
  openWiki(target: string): void
  openUrl(url: string): void
  openTag(tag: string): void
}

export const livePreviewHost = Facet.define<LivePreviewHost, LivePreviewHost | null>({ combine: (values) => values[0] ?? null })

// ---------- Widgets ----------

/** Monta um componente React dentro do widget e avisa o editor quando a altura muda (imagens, KaTeX, Mermaid). */
function mountReact(view: EditorView, dom: HTMLElement, render: (root: Root) => void): void {
  const root = createRoot(dom)
  render(root)
  const observer = new ResizeObserver(() => view.requestMeasure())
  observer.observe(dom)
  ;(dom as HTMLElement & { cleanup?: () => void }).cleanup = () => {
    observer.disconnect()
    // Desmonta depois: o React não aceita desmontar no meio de outra renderização.
    setTimeout(() => root.unmount())
  }
}

function unmountReact(dom: HTMLElement): void {
  ;(dom as HTMLElement & { cleanup?: () => void }).cleanup?.()
}

/**
 * Alça e menu das imagens do widget: regravam o embed dentro de `raw`, o texto que o widget substitui (a partir de
 * onde ele está agora no documento). Se o texto mudou no meio do caminho, não grava nada.
 */
function imageEditApi(view: EditorView, dom: HTMLElement, raw: string): ImageEditApi {
  return {
    change(target, alias, next) {
      const from = view.posAtDOM(dom)
      if (view.state.sliceDoc(from, from + raw.length) !== raw) return
      const change = changeEmbed(raw, target, alias, next)
      if (change) view.dispatch({ changes: { from: from + change.from, to: from + change.to, insert: change.insert } })
    },
  }
}

/** Bloco desenhado pelo leitor (tabela, callout, HTML, matemática, Mermaid, sumário, embed sozinho na linha). */
class RenderedBlock extends WidgetType {
  constructor(
    readonly source: string,
    readonly context: string,
  ) {
    super()
  }

  eq(other: RenderedBlock): boolean {
    return other.source === this.source && other.context === this.context
  }

  toDOM(view: EditorView): HTMLElement {
    const dom = document.createElement("div")
    dom.className = "cm-lp-block"
    const host = view.state.facet(livePreviewHost)
    mountReact(view, dom, (root) =>
      root.render(
        <NoteSetContext.Provider value={host?.noteSet() ?? { notes: [], routeOf: () => "" }}>
          <ImageEditContext.Provider value={imageEditApi(view, dom, this.source)}>
            <Markdown source={this.source} contextSource={this.context || undefined} />
          </ImageEditContext.Provider>
        </NoteSetContext.Provider>,
      ),
    )
    // Clique fora de links e controles: o cursor entra no bloco e o código aparece.
    dom.addEventListener("mousedown", (event) => {
      if ((event.target as Element).closest("a, button, input, audio, video, summary, details")) return
      event.preventDefault()
      view.dispatch({ selection: { anchor: view.posAtDOM(dom) } })
      view.focus()
    })
    return dom
  }

  destroy(dom: HTMLElement): void {
    unmountReact(dom)
  }

  get estimatedHeight(): number {
    return Math.max(24, this.source.split("\n").length * 24)
  }
}

/**
 * Frontmatter (U77): uma barra “Propriedades · n” que abre a tabela, como o “ocultar propriedades” do Obsidian. Clicar
 * não põe mais o cursor no YAML (quem não conhece o formato estragava a nota sem querer); para mexer no texto, o botão
 * “Editar como texto” dentro do bloco, o painel Propriedades ou o modo Código.
 */
class PropertiesWidget extends WidgetType {
  constructor(readonly yaml: string, readonly open: boolean) {
    super()
  }

  eq(other: PropertiesWidget): boolean {
    return other.yaml === this.yaml && other.open === this.open
  }

  toDOM(view: EditorView): HTMLElement {
    // O espaço em volta do cartão fica no padding do invólucro: o CodeMirror mede a altura do bloco pela borda e não
    // conta margens entre os filhos do conteúdo. Com margem, tudo abaixo ficava 14 px fora do lugar e o clique caía
    // na linha de baixo (U16).
    const wrap = document.createElement("div")
    wrap.className = "cm-lp-properties-wrap"
    const dom = document.createElement("div")
    dom.className = `cm-lp-properties${this.open ? " open" : ""}`
    wrap.append(dom)
    const data = parseFrontmatter(this.yaml)?.data ?? {}
    const keys = Object.keys(data)
    const toggle = document.createElement("button")
    toggle.type = "button"
    toggle.className = "cm-lp-properties-toggle"
    toggle.setAttribute("aria-expanded", String(this.open))
    const chevron = document.createElement("span")
    chevron.className = "cm-lp-properties-chevron"
    chevron.setAttribute("aria-hidden", "true")
    const title = document.createElement("span")
    title.className = "cm-lp-properties-title"
    title.textContent = "Propriedades"
    const count = document.createElement("span")
    count.className = "cm-lp-properties-count"
    count.textContent = `· ${keys.length}`
    count.setAttribute("aria-label", `${keys.length} ${keys.length === 1 ? "propriedade" : "propriedades"}`)
    toggle.append(chevron, title, count)
    toggle.addEventListener("click", () => view.dispatch({ effects: setProperties.of({ open: !this.open }) }))
    dom.append(toggle)
    if (this.open) {
      const body = document.createElement("div")
      body.className = "cm-lp-properties-body"
      for (const [key, value] of Object.entries(data)) {
        const row = document.createElement("div")
        row.className = "cm-lp-property"
        const name = document.createElement("span")
        name.textContent = key
        const shown = document.createElement("span")
        shown.textContent = Array.isArray(value) ? value.join(", ") : value === null || value === undefined ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value)
        row.append(name, shown)
        body.append(row)
      }
      const edit = document.createElement("button")
      edit.type = "button"
      edit.className = "cm-lp-properties-edit"
      edit.textContent = "Editar como texto"
      edit.addEventListener("click", () => {
        // O cursor vai para o fim da primeira propriedade (ou para a linha depois do `---` de abertura).
        const line = view.state.doc.lines > 2 ? view.state.doc.line(2) : view.state.doc.line(1)
        view.dispatch({ effects: setProperties.of({ editing: true }), selection: { anchor: line.to }, scrollIntoView: true })
        view.focus()
      })
      body.append(edit)
      dom.append(body)
    }
    // Clique no cartão fora dos botões: nada (o cursor não entra no YAML nem pula para a linha de baixo).
    wrap.addEventListener("mousedown", (event) => {
      if (!(event.target as Element).closest("button")) event.preventDefault()
    })
    return wrap
  }

  ignoreEvent(): boolean {
    return true
  }
}

/** Embed no meio do texto (`texto ![[imagem.png]] texto`). */
class InlineEmbed extends WidgetType {
  constructor(
    readonly target: string,
    readonly alias: string | undefined,
    /** O texto do embed no documento (para a alça da imagem regravar). */
    readonly raw: string,
  ) {
    super()
  }

  eq(other: InlineEmbed): boolean {
    return other.target === this.target && other.alias === this.alias && other.raw === this.raw
  }

  toDOM(view: EditorView): HTMLElement {
    const dom = document.createElement("span")
    dom.className = "cm-lp-inline-embed md"
    const host = view.state.facet(livePreviewHost)
    mountReact(view, dom, (root) =>
      root.render(
        <NoteSetContext.Provider value={host?.noteSet() ?? { notes: [], routeOf: () => "" }}>
          <ImageEditContext.Provider value={imageEditApi(view, dom, this.raw)}>
            <Embed target={this.target} alias={this.alias} />
          </ImageEditContext.Provider>
        </NoteSetContext.Provider>,
      ),
    )
    return dom
  }

  destroy(dom: HTMLElement): void {
    unmountReact(dom)
  }
}

class BulletWidget extends WidgetType {
  eq(): boolean {
    return true
  }
  toDOM(): HTMLElement {
    const dom = document.createElement("span")
    dom.className = "cm-lp-bullet"
    dom.textContent = "•"
    return dom
  }
}

class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly from: number,
  ) {
    super()
  }

  eq(other: CheckboxWidget): boolean {
    return other.checked === this.checked && other.from === this.from
  }

  toDOM(view: EditorView): HTMLElement {
    const box = document.createElement("input")
    box.type = "checkbox"
    box.className = "cm-lp-checkbox"
    box.checked = this.checked
    box.setAttribute("aria-label", this.checked ? "Desmarcar tarefa" : "Marcar tarefa")
    box.addEventListener("mousedown", (event) => {
      event.preventDefault()
      if (view.state.readOnly) return
      // A linha inteira passa pelo módulo de tarefas (o Tasks põe a data de conclusão e cria a próxima recorrência).
      const line = view.state.doc.lineAt(this.from)
      const insert = toggledTaskLines(line.text).join(view.state.lineBreak)
      if (insert !== line.text) view.dispatch({ changes: { from: line.from, to: line.to, insert } })
    })
    // O estado desenhado vem só do texto: sem isto, o clique marca a caixa nativa, e o widget reaproveitado (a próxima
    // ocorrência de uma recorrência fica no mesmo lugar, ainda `[ ]`) apareceria marcado.
    box.addEventListener("click", (event) => event.preventDefault())
    return box
  }

  ignoreEvent(): boolean {
    return true
  }
}

class RuleWidget extends WidgetType {
  eq(): boolean {
    return true
  }
  toDOM(): HTMLElement {
    const dom = document.createElement("span")
    dom.className = "cm-lp-hr"
    return dom
  }
}

// ---------- Blocos desenhados (StateField: decorações de bloco não podem vir de plugins) ----------

interface BlockRange {
  from: number
  to: number
}

const CALLOUT_LINE = /^ {0,3}>\s*\[![^\]]+\]/
const EMBED_ONLY = /^\s*(?:!\[\[[^\]\n]+\]\]|!\[[^\]\n]*\]\([^)\n]+\))(?:\s*(?:!\[\[[^\]\n]+\]\]|!\[[^\]\n]*\]\([^)\n]+\)))*\s*$/
/** O sumário precisa dos títulos da nota inteira; os outros blocos registrados se desenham sozinhos. */
const TOC_FENCES = new Set(["table-of-contents", "toc"])

function frontmatterRange(state: EditorState): BlockRange | null {
  return frontmatterIn(state.doc)
}

function frontmatterIn(doc: Text): BlockRange | null {
  const head = doc.sliceString(0, Math.min(doc.length, 20_000))
  const frontmatter = parseFrontmatter(head)
  if (!frontmatter) return null
  return { from: 0, to: doc.lineAt(Math.max(0, frontmatter.end - 1)).to }
}

/** O cursor (ou uma seleção) toca as linhas de `from` a `to`? */
function touches(state: EditorState, from: number, to: number): boolean {
  const start = state.doc.lineAt(from).from
  const end = state.doc.lineAt(to).to
  return state.selection.ranges.some((range) => range.from <= end && range.to >= start)
}

/** Os blocos que o live preview desenha, com o texto de cada um. */
function renderableBlocks(state: EditorState): (BlockRange & { source: string; kind: "block" | "toc" })[] {
  const blocks: (BlockRange & { source: string; kind: "block" | "toc" })[] = []
  const front = frontmatterRange(state)
  for (let node = syntaxTree(state).topNode.firstChild; node; node = node.nextSibling) {
    if (front && node.from <= front.to) continue
    const from = state.doc.lineAt(node.from).from
    const to = state.doc.lineAt(Math.max(node.from, node.to - (state.sliceDoc(node.to - 1, node.to) === "\n" ? 1 : 0))).to
    const text = state.sliceDoc(from, to)
    let kind: "block" | "toc" | null = null
    if (node.name === "Table" || node.name === "HTMLBlock") kind = "block"
    else if (node.name === "Blockquote" && CALLOUT_LINE.test(text)) kind = "block"
    else if (node.name === "FencedCode") {
      const info = /^ {0,3}(?:`{3,}|~{3,})\s*([\w-]+)/.exec(text)?.[1]?.toLowerCase() ?? ""
      if (isRenderedCodeBlock(info)) kind = TOC_FENCES.has(info) ? "toc" : "block"
    } else if (node.name === "Paragraph") {
      const trimmed = text.trim()
      if ((trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) || EMBED_ONLY.test(text)) kind = "block"
    }
    if (kind) blocks.push({ from, to, source: text, kind })
  }
  return blocks
}

// ---------- Propriedades recolhidas (U77) ----------
// O YAML só aparece como texto depois do “Editar como texto”; volta ao cartão quando o cursor sai dele. Enquanto é
// cartão, o cursor não para dentro do frontmatter e digitar ou apagar não o atinge (o Backspace no começo do corpo
// juntaria o `---` com a primeira linha). O painel Propriedades e o modo Código continuam editando como antes.

/** Como o frontmatter aparece (Configurações › Editor e atalhos). */
export const propertiesDisplay = Facet.define<PropertiesDisplay, PropertiesDisplay>({ combine: (values) => values[0] ?? "recolhidas" })

interface PropertiesView { open: boolean; editing: boolean }
const setProperties = StateEffect.define<Partial<PropertiesView>>()
const propertiesState = StateField.define<PropertiesView>({
  create: (state) => ({ open: state.facet(propertiesDisplay) === "abertas", editing: false }),
  update(value, tr) {
    let next = value
    for (const effect of tr.effects) if (effect.is(setProperties)) next = { ...next, ...effect.value }
    if (next.editing && tr.selection && !tr.effects.some((effect) => effect.is(setProperties))) {
      const front = frontmatterRange(tr.state)
      if (!front || !touches(tr.state, front.from, front.to)) next = { ...next, editing: false }
    }
    return next
  },
})

function propertiesOf(state: EditorState): PropertiesView {
  return state.field(propertiesState, false) ?? { open: state.facet(propertiesDisplay) === "abertas", editing: false }
}

/** Depois desta transação, o YAML está aberto como texto? */
function editingAfter(tr: Transaction): boolean {
  let editing = propertiesOf(tr.startState).editing
  for (const effect of tr.effects) if (effect.is(setProperties) && effect.value.editing !== undefined) editing = effect.value.editing
  return editing
}

const propertiesGuard = EditorState.transactionFilter.of((tr) => {
  if (editingAfter(tr)) return tr
  const before = frontmatterRange(tr.startState)
  // Digitar, colar, apagar ou arrastar dentro do frontmatter fechado: nada acontece. Apagar uma seleção que cobre o
  // frontmatter inteiro (Ctrl A, Delete) continua valendo.
  if (before && tr.docChanged && (tr.isUserEvent("input") || tr.isUserEvent("delete") || tr.isUserEvent("move"))) {
    const end = Math.min(before.to + 1, tr.startState.doc.length)
    let hit = false
    tr.changes.iterChangedRanges((from, to) => {
      if (from === to ? from <= before.to : from < end && to > before.from && !(from <= before.from && to >= end)) hit = true
    })
    if (hit) return []
  }
  // O cursor que cairia dentro do cartão (Ctrl Home, seta para cima) vai para a primeira linha depois dele.
  if (!tr.selection && !tr.docChanged) return tr
  const front = frontmatterIn(tr.newDoc)
  const main = tr.newSelection.main
  if (!front || !main.empty || main.head > front.to || front.to + 1 > tr.newDoc.length) return tr
  return [tr, { selection: { anchor: front.to + 1 }, sequential: true }]
})

function buildBlocks(state: EditorState): DecorationSet {
  const ranges: Range<Decoration>[] = []
  const front = frontmatterRange(state)
  const view = propertiesOf(state)
  // Nota que é só frontmatter, sem linha depois: não há onde pôr o cursor fora dele, então o texto aparece.
  const stuck = front !== null && front.to >= state.doc.length && touches(state, front.from, front.to)
  if (front && !view.editing && !stuck) {
    const display = state.facet(propertiesDisplay)
    ranges.push((display === "escondidas"
      ? Decoration.replace({ block: true })
      : Decoration.replace({ widget: new PropertiesWidget(state.sliceDoc(front.from, front.to) + "\n", view.open), block: true })).range(front.from, front.to))
  }
  const doc = state.doc.toString()
  for (const block of renderableBlocks(state)) {
    if (touches(state, block.from, block.to)) continue
    ranges.push(Decoration.replace({ widget: new RenderedBlock(block.source, block.kind === "toc" ? doc : ""), block: true }).range(block.from, block.to))
  }
  return Decoration.set(ranges, true)
}

// ---------- Clique sem pulo (U16) ----------
// Enquanto o botão do mouse está apertado, o que o cursor revela fica como estava. Se a linha aberta fechasse já no
// mousedown, o texto abaixo subiria e o CodeMirror, que relê a posição do mouse ao redesenhar e ao soltar o botão,
// levaria o cursor (ou a seleção) para a linha de baixo. Ao soltar, tudo se redesenha com o cursor já no lugar.

const pointerHold = StateEffect.define<boolean>()
const pointerHeld = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const effect of tr.effects) if (effect.is(pointerHold)) value = effect.value
    return value
  },
})

/** A transação só move o cursor com o mouse, com o botão ainda apertado? Então o desenho espera o botão subir. */
function waitsForRelease(tr: Transaction): boolean {
  return !tr.docChanged && tr.startState.field(pointerHeld, false) === true && tr.state.field(pointerHeld, false) === true && tr.isUserEvent("select.pointer")
}
function released(tr: Transaction): boolean {
  return tr.effects.some((effect) => effect.is(pointerHold) && !effect.value)
}

const pointerHoldEvents = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (event.button === 0 && !view.state.field(pointerHeld)) view.dispatch({ effects: pointerHold.of(true) })
    return false
  },
})

const pointerRelease = ViewPlugin.fromClass(
  class {
    constructor(readonly view: EditorView) {
      this.release = this.release.bind(this)
      // Na janela, e não no documento: o CodeMirror fecha a seleção do mouse no documento, antes deste aviso.
      window.addEventListener("mouseup", this.release)
      window.addEventListener("blur", this.release)
    }
    release() {
      if (this.view.state.field(pointerHeld, false)) this.view.dispatch({ effects: pointerHold.of(false) })
    }
    destroy() {
      window.removeEventListener("mouseup", this.release)
      window.removeEventListener("blur", this.release)
    }
  },
)

const blockField = StateField.define<DecorationSet>({
  create: buildBlocks,
  update(value, tr) {
    if (released(tr)) return buildBlocks(tr.state)
    if (waitsForRelease(tr)) return value
    if (tr.docChanged || tr.selection || syntaxTree(tr.state) !== syntaxTree(tr.startState) || propertiesOf(tr.state) !== propertiesOf(tr.startState)) return buildBlocks(tr.state)
    return value
  },
  provide: (field) => EditorView.decorations.from(field),
})

// ---------- Marcas no texto (ViewPlugin, só o trecho visível) ----------

const hide = Decoration.replace({})
const MARKS_OF: Record<string, string> = { Emphasis: "EmphasisMark", StrongEmphasis: "EmphasisMark", Strikethrough: "StrikethroughMark", Highlight: "HighlightMark", InlineCode: "CodeMark" }

function wikiParts(inner: string): { target: string; alias?: string; aliasStart: number } {
  const bar = /\\?\|/.exec(inner)
  return bar ? { target: inner.slice(0, bar.index).trim(), alias: inner.slice(bar.index + bar[0].length), aliasStart: bar.index + bar[0].length } : { target: inner.trim(), aliasStart: 0 }
}

function buildInline(view: EditorView): DecorationSet {
  const { state } = view
  const ranges: Range<Decoration>[] = []
  const skip: BlockRange[] = renderableBlocks(state).filter((b) => !touches(state, b.from, b.to))
  const front = frontmatterRange(state)
  if (front) skip.push(front)
  const inSkip = (pos: number) => skip.some((b) => pos >= b.from && pos <= b.to)
  const near = (from: number, to: number) => state.selection.ranges.some((r) => r.from <= to && r.to >= from)
  const onLine = (pos: number) => touches(state, pos, pos)
  const host = state.facet(livePreviewHost)
  // Frontmatter com o cursor dentro: código YAML, sem virar título (o parser lê `---` como título setext).
  if (front) for (let pos = front.from; pos <= front.to; pos = state.doc.lineAt(pos).to + 1) ranges.push(Decoration.line({ class: "cm-lp-frontmatter" }).range(state.doc.lineAt(pos).from))

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter(node: SyntaxNodeRef) {
        if (node.name === "Document") return
        if (inSkip(node.from)) return false
        const name = node.name
        const heading = /^ATXHeading(\d)$/.exec(name)
        if (heading) {
          ranges.push(Decoration.line({ class: `cm-lp-h cm-lp-h${heading[1]}` }).range(state.doc.lineAt(node.from).from))
          const mark = node.node.firstChild
          if (mark?.name === "HeaderMark" && !onLine(node.from)) {
            const after = state.sliceDoc(mark.to, mark.to + 1) === " " ? mark.to + 1 : mark.to
            ranges.push(hide.range(mark.from, after))
          }
          return
        }
        if (name in MARKS_OF) {
          if (name === "Highlight") ranges.push(Decoration.mark({ class: "cm-lp-highlight" }).range(node.from, node.to))
          if (!near(node.from, node.to)) {
            for (let child = node.node.firstChild; child; child = child.nextSibling) if (child.name === MARKS_OF[name]) ranges.push(hide.range(child.from, child.to))
          }
          return
        }
        if (name === "WikiLink" || name === "Embed") {
          const embed = name === "Embed"
          const open = node.from + (embed ? 3 : 2)
          const inner = state.sliceDoc(open, node.to - 2)
          const { target, alias, aliasStart } = wikiParts(inner)
          if (near(node.from, node.to)) return false
          if (embed) {
            ranges.push(Decoration.replace({ widget: new InlineEmbed(target, alias, state.sliceDoc(node.from, node.to)) }).range(node.from, node.to))
            return false
          }
          const name_ = target.split("#")[0]!
          const found = name_ ? host?.noteSet().resolve?.(name_, "wiki") : { path: "", route: "", cross: false }
          const shown = alias !== undefined ? open + aliasStart : open
          ranges.push(hide.range(node.from, shown))
          ranges.push(Decoration.mark({ class: `cm-lp-wikilink ${found ? "" : "broken"} ${found?.cross ? "cross" : ""}`, attributes: { "data-lp-wiki": target } }).range(shown, node.to - 2))
          ranges.push(hide.range(node.to - 2, node.to))
          return false
        }
        if (name === "Link" || name === "Image") {
          if (near(node.from, node.to)) return
          const marks: { from: number; to: number }[] = []
          let url = ""
          for (let child = node.node.firstChild; child; child = child.nextSibling) {
            if (child.name === "LinkMark") marks.push({ from: child.from, to: child.to })
            if (child.name === "URL") url = state.sliceDoc(child.from, child.to)
          }
          if (name === "Image") {
            const alt = marks.length >= 2 ? state.sliceDoc(marks[0]!.to, marks[1]!.from) : ""
            ranges.push(Decoration.replace({ widget: new InlineEmbed(decodeTarget(url.replace(/^<|>$/g, "")), alt || undefined, state.sliceDoc(node.from, node.to)) }).range(node.from, node.to))
            return false
          }
          if (marks.length < 2 || !url) return
          ranges.push(hide.range(node.from, marks[0]!.to))
          ranges.push(Decoration.mark({ class: "cm-lp-link", attributes: { "data-lp-href": url.replace(/^<|>$/g, "") } }).range(marks[0]!.to, marks[1]!.from))
          ranges.push(hide.range(marks[1]!.from, node.to))
          return false
        }
        if (name === "URL" && node.node.parent?.name !== "Link" && node.node.parent?.name !== "Image" && node.node.parent?.name !== "Autolink") {
          ranges.push(Decoration.mark({ class: "cm-lp-link external", attributes: { "data-lp-href": state.sliceDoc(node.from, node.to) } }).range(node.from, node.to))
          return
        }
        if (name === "HashTag") {
          ranges.push(Decoration.mark({ class: "cm-lp-tag", attributes: { "data-lp-tag": state.sliceDoc(node.from + 1, node.to) } }).range(node.from, node.to))
          return
        }
        if (name === "ObsidianComment") {
          ranges.push(Decoration.mark({ class: "cm-lp-comment" }).range(node.from, node.to))
          return false
        }
        if (name === "Blockquote") {
          for (let pos = node.from; pos <= node.to; ) {
            const line = state.doc.lineAt(pos)
            ranges.push(Decoration.line({ class: "cm-lp-quote" }).range(line.from))
            pos = line.to + 1
          }
          return
        }
        if (name === "QuoteMark") {
          if (!onLine(node.from)) ranges.push(hide.range(node.from, state.sliceDoc(node.to, node.to + 1) === " " ? node.to + 1 : node.to))
          return
        }
        if (name === "ListItem") {
          const mark = node.node.firstChild
          const task = node.node.getChild("Task")?.getChild("TaskMarker")
          if (mark?.name === "ListMark") {
            const bullet = /^[-*+]$/.test(state.sliceDoc(mark.from, mark.to))
            const space = state.sliceDoc(mark.to, mark.to + 1) === " " ? mark.to + 1 : mark.to
            // Estados do Tasks com outro caractere (`[/]`, `[-]`…): também são caixa, marcada, como no Obsidian.
            const custom = task ? null : /^\[([^\]\s])\][ \t]/.exec(state.sliceDoc(space, space + 4))
            const box = task ? { from: task.from, to: task.to } : custom ? { from: space, to: space + 3 } : null
            if (box && !near(mark.from, box.to)) {
              ranges.push(hide.range(mark.from, space))
              const checked = task ? /x/i.test(state.sliceDoc(task.from, task.to)) : true
              ranges.push(Decoration.replace({ widget: new CheckboxWidget(checked, box.from) }).range(box.from, box.to))
              if (checked) ranges.push(Decoration.line({ class: "cm-lp-task-done" }).range(state.doc.lineAt(node.from).from))
            } else if (bullet && !near(mark.from, mark.to)) {
              ranges.push(Decoration.replace({ widget: new BulletWidget() }).range(mark.from, mark.to))
            }
          }
          return
        }
        if (name === "HorizontalRule") {
          if (!onLine(node.from)) ranges.push(Decoration.replace({ widget: new RuleWidget() }).range(node.from, node.to))
          return false
        }
        if (name === "FencedCode" || name === "CodeBlock") {
          for (let pos = node.from; pos <= node.to; ) {
            const line = state.doc.lineAt(pos)
            ranges.push(Decoration.line({ class: "cm-lp-codeblock" }).range(line.from))
            pos = line.to + 1
          }
          return false
        }
        return
      },
    })
  }
  return Decoration.set(ranges, true)
}

function decodeTarget(url: string): string {
  try {
    return decodeURIComponent(url)
  } catch {
    return url
  }
}

const inlinePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildInline(view)
    }
    update(update: ViewUpdate) {
      const waiting = update.transactions.length > 0 && update.transactions.every(waitsForRelease)
      if (update.transactions.some(released) || update.docChanged || (update.selectionSet && !waiting) || update.viewportChanged || syntaxTree(update.state) !== syntaxTree(update.startState)) this.decorations = buildInline(update.view)
    }
  },
  { decorations: (plugin) => plugin.decorations },
)

/** Cliques em links, wikilinks e tags abrem o destino (o cursor não vai para lá). */
const clicks = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey) return false
    const host = view.state.facet(livePreviewHost)
    const target = event.target as Element
    const wiki = target.closest<HTMLElement>("[data-lp-wiki]")
    const link = target.closest<HTMLElement>("[data-lp-href]")
    const tag = target.closest<HTMLElement>("[data-lp-tag]")
    if (!host || !(wiki || link || tag)) return false
    event.preventDefault()
    if (wiki) host.openWiki(wiki.dataset.lpWiki!)
    else if (link) host.openUrl(link.dataset.lpHref!)
    else if (tag) host.openTag(tag.dataset.lpTag!)
    return true
  },
})

const theme = EditorView.baseTheme({
  ".cm-lp-h": { fontFamily: "var(--font-display)", fontWeight: "650", color: "var(--text)" },
  // O tamanho vem da linha; o realce do modo código não soma por cima.
  ".cm-lp-h span": { fontSize: "inherit" },
  ".cm-lp-h1": { fontSize: "1.75em", lineHeight: "1.4" },
  ".cm-lp-h2": { fontSize: "1.4em", lineHeight: "1.45" },
  ".cm-lp-h3": { fontSize: "1.18em" },
  ".cm-lp-h5, .cm-lp-h6": { color: "var(--muted)" },
  ".cm-lp-highlight": { backgroundColor: "color-mix(in srgb, var(--gold) 35%, transparent)", borderRadius: "3px" },
  ".cm-lp-wikilink, .cm-lp-link": { color: "var(--cyan)", cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: "3px" },
  ".cm-lp-wikilink.broken": { color: "var(--red)" },
  ".cm-lp-wikilink.cross": { color: "var(--violet)" },
  ".cm-lp-tag": { padding: "0 6px", borderRadius: "999px", backgroundColor: "color-mix(in srgb, var(--violet) 18%, transparent)", color: "var(--violet)", cursor: "pointer" },
  ".cm-lp-comment": { color: "var(--faint)", fontStyle: "italic" },
  ".cm-lp-quote": { borderLeft: "3px solid var(--line-strong)", paddingLeft: "12px !important", color: "var(--muted)" },
  ".cm-lp-codeblock": { backgroundColor: "var(--bg-deep)", fontFamily: "var(--font-mono)", fontSize: "0.92em" },
  ".cm-lp-bullet": { display: "inline-block", width: "0.9em", color: "var(--violet)" },
  ".cm-lp-checkbox": { margin: "0 6px 0 0", verticalAlign: "-2px", accentColor: "var(--cyan)", cursor: "pointer" },
  ".cm-lp-task-done": { color: "var(--faint)", textDecoration: "line-through" },
  ".cm-lp-hr": { display: "inline-block", width: "100%", height: "1px", verticalAlign: "middle", background: "linear-gradient(90deg, transparent, var(--line-strong), transparent)" },
  ".cm-lp-block": { padding: "4px 0", cursor: "text", fontFamily: "var(--font-sans)", whiteSpace: "normal" },
  ".cm-lp-block:hover": { outline: "1px dashed var(--line)", outlineOffset: "4px", borderRadius: "6px" },
  ".cm-lp-inline-embed": { display: "inline-block", maxWidth: "100%", verticalAlign: "top", fontFamily: "var(--font-sans)", whiteSpace: "normal" },
  ".cm-lp-frontmatter, .cm-lp-frontmatter span": { fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: "400", color: "var(--muted)" },
  ".cm-lp-properties-wrap": { padding: "4px 0 10px", cursor: "default" },
  ".cm-lp-properties": { border: "1px solid var(--line)", borderRadius: "10px", backgroundColor: "var(--panel)", fontFamily: "var(--font-sans)", fontSize: "13px" },
  ".cm-lp-properties:not(.open)": { display: "inline-block", maxWidth: "100%" },
  ".cm-lp-properties-toggle": { display: "flex", alignItems: "center", gap: "6px", width: "100%", minHeight: "32px", padding: "4px 12px", border: "0", borderRadius: "10px", background: "none", color: "var(--muted)", font: "inherit", cursor: "pointer", textAlign: "left" },
  ".cm-lp-properties-toggle:hover": { color: "var(--text)", backgroundColor: "var(--panel-2)" },
  ".cm-lp-properties-toggle:focus-visible, .cm-lp-properties-edit:focus-visible": { outline: "2px solid var(--cyan)", outlineOffset: "2px" },
  ".cm-lp-properties-chevron": { width: "7px", height: "7px", marginRight: "2px", borderRight: "2px solid currentColor", borderBottom: "2px solid currentColor", transform: "rotate(-45deg)", transition: "transform 120ms ease" },
  ".cm-lp-properties.open .cm-lp-properties-chevron": { transform: "rotate(45deg) translate(-2px, -1px)" },
  ".cm-lp-properties-title": { fontSize: "11px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase" },
  ".cm-lp-properties-count": { color: "var(--muted)", fontSize: "12px" },
  ".cm-lp-properties-body": { padding: "2px 12px 8px", borderTop: "1px solid var(--line)" },
  ".cm-lp-property": { display: "grid", gridTemplateColumns: "minmax(90px, 30%) 1fr", gap: "10px", padding: "2px 0", overflowWrap: "anywhere" },
  ".cm-lp-property > span:first-child": { color: "var(--muted)" },
  ".cm-lp-properties-edit": { marginTop: "6px", minHeight: "32px", padding: "4px 10px", border: "1px solid var(--line)", borderRadius: "8px", background: "var(--panel-2)", color: "var(--text)", font: "inherit", fontSize: "12px", cursor: "pointer" },
  ".cm-lp-properties-edit:hover": { borderColor: "var(--cyan)" },
  "@media (pointer: coarse)": { ".cm-lp-properties-toggle, .cm-lp-properties-edit": { minHeight: "44px" } },
  "@media (prefers-reduced-motion: reduce)": { ".cm-lp-properties-chevron": { transition: "none" } },
})

/** O live preview inteiro: liga com `livePreviewHost.of(...)` para os links e blocos desenhados. */
export function livePreview(display: PropertiesDisplay = "recolhidas"): Extension {
  return [propertiesDisplay.of(display), propertiesState, propertiesGuard, pointerHeld, blockField, inlinePlugin, clicks, pointerHoldEvents, pointerRelease, theme, EditorView.contentAttributes.of({ class: "cm-live-preview" })]
}

export { frontmatterRange, renderableBlocks, blockField, pointerHeld, pointerHold, propertiesState, propertiesGuard, setProperties }
