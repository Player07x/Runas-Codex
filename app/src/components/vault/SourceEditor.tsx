import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import { autocompletion, startCompletion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete"
import { defaultKeymap, history, historyKeymap, indentWithTab, redo, undo } from "@codemirror/commands"
import { markdown } from "@codemirror/lang-markdown"
import { GFM } from "@lezer/markdown"
import { HighlightStyle, syntaxHighlighting, syntaxTree } from "@codemirror/language"
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search"
import { Compartment, EditorSelection, EditorState, RangeSetBuilder } from "@codemirror/state"
import { Decoration, EditorView, keymap, lineNumbers as lineNumberGutter, MatchDecorator, placeholder, ViewPlugin, type DecorationSet, type ViewUpdate } from "@codemirror/view"
import { tags } from "@lezer/highlight"
import { parseFrontmatter } from "../../core/parse"
import { SLASH_COMMANDS } from "../../core/note-tools"
import { FORMATTER_GROUPS, slashItems, type FormatterEntry, type SlashItem } from "../../core/formatters"
import { suggestForTaskLine } from "../../core/tasks/suggest"
import { currentParseContext, vaultTaskIds } from "../../lib/tasks"
import { obsidianSyntax } from "../../markdown/lezer-obsidian"
import { livePreview as livePreviewExtension, livePreviewHost, type LivePreviewHost } from "./live-preview"

export interface LinkSuggestion {
  label: string
  detail: string
  /** Texto que entra entre `[[` e `]]`. */
  insert: string
}

export interface SourceEditorHandle {
  /** Insere texto no cursor (ou no lugar da seleção); com `at`, naquela posição do documento. */
  insert(text: string, at?: number): void
  /** Como `insert`, mas numa linha só sua (quebra a linha antes e depois, se precisar): imagens e outros blocos. */
  insertBlock(text: string, at?: number): void
  /** Troca o documento inteiro a partir do texto e do cursor atuais (um passo só no desfazer). */
  transform(change: (doc: string, cursor: number) => { text: string; cursor: number }): void
  focus(): void
  /** Posição do cursor no documento (`null` sem editor). */
  cursor(): number | null
  selection(): { from: number; to: number } | null
  /** Põe (ou tira, se já tem) a marca dos dois lados da seleção: `**`, `*`, `~~`, `==`. */
  wrap(mark: string): void
  /** Abre o menu `/` no cursor (botão “/” da barra sobre o teclado). */
  openSlash(): void
  /** Seleciona um trecho e rola até ele (o “Ir” dos comentários de revisão). */
  select(from: number, to?: number): void
  /** Foca e rola até uma linha do arquivo. */
  scrollToLine(line: number): void
}

/** Seleção com texto, em relação ao canto do editor: onde a barra de formatação aparece. */
export interface EditorSelectionInfo { from: number; to: number; top: number; bottom: number; left: number; right: number; focused: boolean }

interface Props {
  /** Texto inicial; para trocar o documento por fora (outra nota, recarregar), mude `docKey`. */
  typewriter?: boolean
  value: string
  docKey: string
  readOnly: boolean
  onChange(value: string): void
  onImageLinkContext?(at: number): boolean
  onSave?(): void
  suggestLinks?(query: string): LinkSuggestion[]
  /** Com isto, o editor fica em live preview (marcação escondida fora do cursor, blocos desenhados). */
  livePreview?: LivePreviewHost | null
  /**
   * Arquivos colados (Ctrl+V) ou soltos no editor. `at` é a posição onde soltaram; `null` = no cursor. Sem isto, o
   * editor não aceita arquivos (o CodeMirror colaria o conteúdo como texto).
   */
  onFiles?(files: File[], at: number | null, how: "colar" | "soltar"): void
  /** Seleção com texto (ou `null`), para a barra de formatação. */
  onSelection?(selection: EditorSelectionInfo | null): void
  /** Linha e coluna do cursor, para a barra de status. */
  onCursor?(line: number, column: number): void
  /** Itens do menu `/` que o editor não resolve sozinho (galeria, imagem, modelo, link). */
  onSlashAction?(action: "format" | "image" | "template" | "link"): void
  /** Números de linha no modo Código. */
  lineNumbers?: boolean
  /** Formatadores do espaço (a aba Wiki da galeria), que também entram no menu `/`. */
  extraFormatters?: readonly FormatterEntry[]
}

/** Liga ou desliga a marca em volta de cada seleção (Ctrl+B, Ctrl+I e a barra da seleção). */
function toggleWrap(view: EditorView, mark: string): boolean {
  if (view.state.readOnly) return false
  const doc = view.state
  view.dispatch(doc.changeByRange((range) => {
    const before = doc.sliceDoc(range.from - mark.length, range.from)
    const after = doc.sliceDoc(range.to, range.to + mark.length)
    // `*` colado em `**` é o negrito, não o itálico (a menos que seja `***`).
    const boldAround = mark === "*" && doc.sliceDoc(range.from - 2, range.from) === "**" && doc.sliceDoc(range.from - 3, range.from) !== "***"
    if (before === mark && after === mark && !boldAround) {
      return { changes: [{ from: range.from - mark.length, to: range.from }, { from: range.to, to: range.to + mark.length }], range: EditorSelection.range(range.from - mark.length, range.to - mark.length) }
    }
    return { changes: [{ from: range.from, insert: mark }, { from: range.to, insert: mark }], range: EditorSelection.range(range.from + mark.length, range.to + mark.length) }
  }))
  view.focus()
  return true
}

/** Código: o frontmatter numa faixa própria, para separar propriedades do texto. */
const frontmatterBand = ViewPlugin.fromClass(class {
  decorations: DecorationSet
  constructor(view: EditorView) { this.decorations = this.build(view) }
  update(update: ViewUpdate) { if (update.docChanged) this.decorations = this.build(update.view) }
  build(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>()
    const end = parseFrontmatter(view.state.sliceDoc(0, Math.min(view.state.doc.length, 50_000)))?.end ?? 0
    for (let pos = 0; pos < end && pos <= view.state.doc.length;) {
      const line = view.state.doc.lineAt(pos)
      builder.add(line.from, line.from, Decoration.line({ class: "cm-frontmatter" }))
      pos = line.to + 1
    }
    return builder.finish()
  }
}, { decorations: (plugin) => plugin.decorations })

/** Código: comentários de revisão (`%% revisão: … %%`) em dourado, para achar e apagar rápido. */
const reviewMarks = new MatchDecorator({ regexp: /%%\s*revis[aã]o\b[^%]*%%/giu, decoration: Decoration.mark({ class: "cm-review" }) })
const reviewComments = ViewPlugin.fromClass(class {
  decorations: DecorationSet
  constructor(view: EditorView) { this.decorations = reviewMarks.createDeco(view) }
  update(update: ViewUpdate) { this.decorations = reviewMarks.updateDeco(update, this.decorations) }
}, { decorations: (plugin) => plugin.decorations })

const codeExtensions = (code: boolean, numbers: boolean) => (code ? [frontmatterBand, reviewComments, ...(numbers ? [lineNumberGutter()] : [])] : [])

const FORMATTER_TITLES = FORMATTER_GROUPS.map((group) => group.title)
/** Seção do item no menu `/`, na ordem: ações, comandos e os grupos da galeria. */
const slashSection = (item: SlashItem, extra: readonly string[]) => item.kind === "action" ? { name: "Ações", rank: 0 } : extra.includes(item.detail) ? { name: item.detail, rank: 1 } : FORMATTER_TITLES.includes(item.detail) ? { name: item.detail, rank: 3 + FORMATTER_TITLES.indexOf(item.detail) } : { name: "Comandos", rank: 2 }

/** Colar com texto junto (célula de planilha, trecho de documento) é colar texto; só a imagem sozinha vira arquivo. */
function pastedFiles(data: DataTransfer | null): File[] {
  if (!data || data.getData("text/plain").trim()) return []
  return [...data.files]
}

/** Cores pelas variáveis do tema: o editor acompanha o claro/escuro do Órbita. */
const theme = EditorView.theme({
  "&": { color: "var(--text)", backgroundColor: "transparent", fontSize: "calc(14px * var(--font-scale, 1))", height: "100%" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.7" },
  ".cm-content": { caretColor: "var(--cyan)", padding: "0 0 40vh" },
  ".cm-cursor": { borderLeftColor: "var(--cyan)" },
  "&.cm-focused": { outline: "none" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": { backgroundColor: "color-mix(in srgb, var(--cyan) 28%, transparent) !important" },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-placeholder": { color: "var(--faint)" },
  ".cm-tooltip": { border: "1px solid var(--line-strong)", borderRadius: "10px", backgroundColor: "var(--panel)", color: "var(--text)", overflow: "hidden" },
  ".cm-tooltip-autocomplete > ul > li": { padding: "4px 10px", fontFamily: "var(--font-sans)" },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "var(--panel-2)", color: "var(--text)" },
  ".cm-completionDetail": { color: "var(--faint)", marginLeft: "8px", fontStyle: "normal" },
  ".cm-searchMatch": { backgroundColor: "color-mix(in srgb, var(--gold) 30%, transparent)" },
  ".cm-panels": { backgroundColor: "var(--panel)", color: "var(--text)", borderColor: "var(--line)" },
})

const highlight = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: "700", fontSize: "1.3em", color: "var(--text)" },
  { tag: tags.heading2, fontWeight: "700", fontSize: "1.15em", color: "var(--text)" },
  { tag: [tags.heading3, tags.heading4, tags.heading5, tags.heading6], fontWeight: "700", color: "var(--text)" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: [tags.link, tags.url], color: "var(--cyan)" },
  { tag: tags.monospace, color: "var(--gold)" },
  { tag: tags.quote, color: "var(--muted)" },
  { tag: [tags.processingInstruction, tags.meta, tags.contentSeparator], color: "var(--faint)" },
  { tag: tags.list, color: "var(--violet)" },
])

export const SourceEditor = forwardRef<SourceEditorHandle, Props>(function SourceEditor({ value, docKey, readOnly, onChange, onSave, suggestLinks, livePreview, onFiles, typewriter, onImageLinkContext, onSelection, onCursor, onSlashAction, lineNumbers = false, extraFormatters }, ref) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const readOnlyConf = useRef(new Compartment())
  const previewConf = useRef(new Compartment())
  const codeConf = useRef(new Compartment())
  // As funções mudam a cada render; o editor lê sempre a versão atual por estas referências.
  const callbacks = useRef({ onChange, onSave, suggestLinks, livePreview, onFiles, typewriter, onImageLinkContext, onSelection, onCursor, onSlashAction, extraFormatters })
  callbacks.current = { onChange, onSave, suggestLinks, livePreview, onFiles, typewriter, onImageLinkContext, onSelection, onCursor, onSlashAction, extraFormatters }
  // Anfitrião estável para o live preview (o editor não é recriado quando as funções mudam).
  const previewHost = useRef<LivePreviewHost>({
    noteSet: () => callbacks.current.livePreview!.noteSet(),
    openWiki: (target) => callbacks.current.livePreview?.openWiki(target),
    openUrl: (url) => callbacks.current.livePreview?.openUrl(url),
    openTag: (tag) => callbacks.current.livePreview?.openTag(tag),
  })
  const previewExtensions = (on: boolean) => (on ? [livePreviewHost.of(previewHost.current), livePreviewExtension()] : [])

  useEffect(() => {
    const linkSource = (context: CompletionContext): CompletionResult | null => {
      const match = context.matchBefore(/\[\[[^\]|#\n]*/)
      if (!match || !callbacks.current.suggestLinks) return null
      const query = match.text.slice(2)
      const closing = context.state.sliceDoc(context.pos, context.pos + 2) === "]]"
      return {
        from: match.from + 2,
        filter: false,
        options: callbacks.current.suggestLinks(query).map((s) => ({ label: s.label, detail: s.detail, apply: closing ? s.insert : `${s.insert}]]` })),
      }
    }
    // `@nome` também liga a outra nota (vira `[[Nota]]`), como no World Anvil. Só depois de espaço ou no começo da
    // linha (e-mail não dispara) e fora de código e do frontmatter.
    const mentionSource = (context: CompletionContext): CompletionResult | null => {
      const match = context.matchBefore(/(?<=^|[\s(["'«—])@[^\s@[\]|#]*/)
      if (!match || !callbacks.current.suggestLinks) return null
      if ((parseFrontmatter(context.state.doc.toString())?.end ?? 0) > match.from) return null
      const node = syntaxTree(context.state).resolveInner(match.from, 1)
      for (let n: typeof node | null = node; n; n = n.parent) if (/Code|Comment/.test(n.name)) return null
      return {
        from: match.from,
        filter: false,
        // Link com caminho (nota de outro espaço) mostra o nome, não o caminho.
        options: callbacks.current.suggestLinks(match.text.slice(1)).map((s) => ({ label: s.label, detail: s.detail, apply: s.insert.includes("/") ? `[[${s.insert}|${s.label}]]` : `[[${s.insert}]]` })),
      }
    }
    // Menu `/`: ações, comandos e o catálogo inteiro de formatadores (core/formatters.ts), filtrados sem acento.
    const applySlash = (editorView: EditorView, item: SlashItem, from: number, to: number) => {
      if (item.kind === "action") {
        const date = item.action === "date" ? new Date().toLocaleDateString("sv-SE") : ""
        editorView.dispatch({ changes: { from, to, insert: date }, selection: { anchor: from + date.length } })
        if (item.action !== "date") callbacks.current.onSlashAction?.(item.action)
        return
      }
      let insert = item.insert
      if (item.block) {
        const line = editorView.state.doc.lineAt(from)
        if (editorView.state.sliceDoc(line.from, from).trim()) insert = "\n" + insert
        if (editorView.state.sliceDoc(to, line.to).trim()) insert += "\n"
      }
      // O texto de exemplo (“texto”, “Título”) fica selecionado, para a pessoa digitar por cima.
      const sample = /texto|Título|Nome|tarefa|item/.exec(insert)
      editorView.dispatch({ changes: { from, to, insert }, selection: sample ? { anchor: from + sample.index, head: from + sample.index + sample[0].length } : { anchor: from + insert.length } })
    }
    const slashSource = (context: CompletionContext): CompletionResult | null => {
      const match = context.matchBefore(/(?:^|(?<=\s))\/[\p{L}\d+ -]{0,30}/u)
      if (!match || (parseFrontmatter(context.state.doc.toString())?.end ?? 0) > match.from) return null
      const node = syntaxTree(context.state).resolveInner(match.from, 1)
      for (let n: typeof node | null = node; n; n = n.parent) if (/Code|Comment/.test(n.name)) return null
      const extra = callbacks.current.extraFormatters ?? []
      const items = slashItems(match.text.slice(1), SLASH_COMMANDS, extra)
      if (!items.length) return null
      const extraGroups = [...new Set(extra.map((f) => f.group))]
      return { from: match.from, filter: false, options: items.map((item) => ({ label: item.label, detail: item.detail, section: slashSection(item, extraGroups), apply: (editorView: EditorView, _completion: unknown, from: number, to: number) => applySlash(editorView, item, from, to) })) }
    }
    // Autocompletar do Tasks numa linha de tarefa: campos, datas, regras de repetição e ids.
    const taskSource = (context: CompletionContext): CompletionResult | null => {
      const line = context.state.doc.lineAt(context.pos)
      if (!/^[\s>]*(?:[-*+]|\d+[.)]) +\[.\]/.test(line.text)) return null
      const node = syntaxTree(context.state).resolveInner(context.pos, -1)
      for (let n: typeof node | null = node; n; n = n.parent) if (/Code|Comment/.test(n.name)) return null
      const ctx = currentParseContext()
      const found = suggestForTaskLine(line.text, context.pos - line.from, ctx.settings, new Date(), line.text.includes("⛔") || line.text.includes("dependsOn::") ? vaultTaskIds() : [])
      if (!found) return null
      return { from: line.from + found.from, filter: false, options: found.options.map((o) => ({ label: o.label, detail: o.detail, apply: o.apply })) }
    }
    // Cursor para a barra de status e seleção para a barra de formatação (medida depois do layout).
    const report = (editorView: EditorView) => {
      const main = editorView.state.selection.main
      const line = editorView.state.doc.lineAt(main.head)
      callbacks.current.onCursor?.(line.number, main.head - line.from + 1)
      if (!callbacks.current.onSelection) return
      if (main.empty) return callbacks.current.onSelection(null)
      editorView.requestMeasure({
        read: (v) => {
          const start = v.coordsAtPos(main.from), end = v.coordsAtPos(main.to), box = host.current?.getBoundingClientRect()
          return start && end && box ? { top: Math.min(start.top, end.top) - box.top, bottom: Math.max(start.bottom, end.bottom) - box.top, left: Math.min(start.left, end.left) - box.left, right: Math.max(start.right, end.right) - box.left, focused: v.hasFocus } : null
        },
        write: (at) => callbacks.current.onSelection?.(at ? { from: main.from, to: main.to, ...at } : null),
      })
    }
    const state = EditorState.create({
      doc: value,
      // O cursor começa depois do frontmatter (no live preview, as propriedades aparecem desenhadas).
      selection: { anchor: parseFrontmatter(value)?.end ?? 0 },
      extensions: [
        history(),
        markdown({ extensions: [GFM, obsidianSyntax] }),
        syntaxHighlighting(highlight),
        highlightSelectionMatches(),
        autocompletion({ override: [linkSource, mentionSource, slashSource, taskSource], icons: false }),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ spellcheck: "true", lang: "pt-BR", "aria-label": "Código-fonte Markdown" }),
        placeholder("Comece a escrever. Use [[ ou @ para ligar a outra nota e / para formatar."),
        keymap.of([
          { key: "Mod-s", run: () => (callbacks.current.onSave?.(), true) },
          { key: "Mod-b", run: (editorView) => toggleWrap(editorView, "**") },
          { key: "Mod-i", run: (editorView) => toggleWrap(editorView, "*") },
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        readOnlyConf.current.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
        previewConf.current.of(previewExtensions(Boolean(livePreview))),
        codeConf.current.of(codeExtensions(!livePreview, lineNumbers)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) callbacks.current.onChange(update.state.doc.toString())
          if (update.docChanged || update.selectionSet || update.focusChanged || update.geometryChanged) report(update.view)
          if ((update.docChanged || update.selectionSet) && callbacks.current.typewriter) {
            const pos = update.state.selection.main.head
            requestAnimationFrame(() => { if (view.current === update.view) update.view.dispatch({ effects: EditorView.scrollIntoView(Math.min(pos, update.view.state.doc.length), { y: "center" }) }) })
          }
        }),
        EditorView.domEventHandlers({
          contextmenu(event, editorView) {
            const at = editorView.posAtCoords({ x: event.clientX, y: event.clientY }) ?? editorView.state.selection.main.head
            if (!editorView.state.readOnly && callbacks.current.onImageLinkContext?.(at)) { event.preventDefault(); return true }
            return false
          },
          paste(event, editorView) {
            const files = pastedFiles(event.clipboardData)
            if (!files.length || !callbacks.current.onFiles || editorView.state.readOnly) return false
            event.preventDefault()
            callbacks.current.onFiles(files, null, "colar")
            return true
          },
          drop(event, editorView) {
            const files = [...(event.dataTransfer?.files ?? [])]
            if (!files.length || !callbacks.current.onFiles) return false
            event.preventDefault()
            if (editorView.state.readOnly) return true
            callbacks.current.onFiles(files, editorView.posAtCoords({ x: event.clientX, y: event.clientY }), "soltar")
            return true
          },
        }),
        theme,
      ],
    })
    view.current = new EditorView({ state, parent: host.current! })
    const editorView = view.current
    const measure = () => { if (view.current === editorView) editorView.requestMeasure() }
    const geometry = new ResizeObserver(measure)
    geometry.observe(host.current!)
    void document.fonts.ready.then(measure)
    document.fonts.addEventListener("loadingdone", measure)
    return () => {
      geometry.disconnect()
      document.fonts.removeEventListener("loadingdone", measure)
      view.current?.destroy()
      view.current = null
    }
    // O documento só é recriado quando `docKey` muda (trocar de nota ou recarregar do disco).
  }, [docKey])

  useEffect(() => {
    view.current?.dispatch({ effects: readOnlyConf.current.reconfigure([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]) })
  }, [readOnly])

  useEffect(() => {
    view.current?.dispatch({ effects: previewConf.current.reconfigure(previewExtensions(Boolean(livePreview))) })
  }, [Boolean(livePreview)])

  useEffect(() => {
    view.current?.dispatch({ effects: codeConf.current.reconfigure(codeExtensions(!livePreview, lineNumbers)) })
  }, [Boolean(livePreview), lineNumbers])

  useEffect(() => {
    const command = (event: Event) => {
      if (!view.current || !host.current?.contains(document.activeElement)) return
      const action = (event as CustomEvent<string>).detail
      if (action === "save") callbacks.current.onSave?.()
      if (action === "undo" && !view.current.state.readOnly) undo(view.current)
      if (action === "redo" && !view.current.state.readOnly) redo(view.current)
    }
    window.addEventListener("runas-codex:comando", command)
    return () => window.removeEventListener("runas-codex:comando", command)
  }, [])

  useImperativeHandle(ref, () => ({
    insert(text: string, at?: number) {
      const v = view.current
      if (!v) return
      const { from, to } = at === undefined ? v.state.selection.main : { from: Math.min(at, v.state.doc.length), to: Math.min(at, v.state.doc.length) }
      v.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } })
      v.focus()
    },
    insertBlock(text: string, at?: number) {
      const v = view.current
      if (!v) return
      const { from, to } = at === undefined ? v.state.selection.main : { from: Math.min(at, v.state.doc.length), to: Math.min(at, v.state.doc.length) }
      const before = from > 0 && v.state.sliceDoc(from - 1, from) !== "\n" ? "\n" : ""
      const after = to < v.state.doc.length && v.state.sliceDoc(to, to + 1) !== "\n" ? "\n" : ""
      const insert = `${before}${text}${after}`
      v.dispatch({ changes: { from, to, insert }, selection: { anchor: from + before.length + text.length } })
      v.focus()
    },
    transform(change) {
      const v = view.current
      if (!v) return
      const { text, cursor } = change(v.state.doc.toString(), v.state.selection.main.head)
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text }, selection: { anchor: Math.min(cursor, text.length) } })
      v.focus()
    },
    focus() {
      view.current?.focus()
    },
    cursor() {
      return view.current?.state.selection.main.head ?? null
    },
    selection() {
      const selected = view.current?.state.selection.main
      return selected && !selected.empty ? { from: selected.from, to: selected.to } : null
    },
    wrap(mark: string) {
      if (view.current) toggleWrap(view.current, mark)
    },
    select(from: number, to = from) {
      const v = view.current
      if (!v) return
      const max = v.state.doc.length
      v.dispatch({ selection: { anchor: Math.min(from, max), head: Math.min(to, max) }, scrollIntoView: true })
      v.focus()
    },
    openSlash() {
      const v = view.current
      if (!v || v.state.readOnly) return
      const at = v.state.selection.main.head
      const before = at > 0 ? v.state.sliceDoc(at - 1, at) : "\n"
      const insert = /\s/.test(before) ? "/" : " /"
      v.dispatch({ changes: { from: at, insert }, selection: { anchor: at + insert.length } })
      v.focus()
      startCompletion(v)
    },
    scrollToLine(line: number) {
      const v = view.current
      if (!v) return
      const target = v.state.doc.line(Math.max(1, Math.min(v.state.doc.lines, line + 1))).from
      v.dispatch({ selection: { anchor: target }, effects: EditorView.scrollIntoView(target, { y: "center" }) })
      v.focus()
    },
  }))

  return <div ref={host} className={`source-editor ${livePreview ? "live" : ""}`} />
})
