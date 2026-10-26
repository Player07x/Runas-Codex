import { BookOpen, ChevronLeft, FileDown, History, LayoutGrid, LayoutTemplate, Library, Maximize2, MessageSquarePlus, Minimize2, PenLine, Plus, ScrollText, SlidersHorizontal, Trash2, Type } from "lucide-react"
import { toFicha } from "../../core/fichas"
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { findBooks, moveBookItem, readBook, type BookItem } from "../../core/books"
import { reviewComment } from "../../core/books-review"
import { dirname } from "../../core/text"
import type { IndexedNote } from "../../core/vault-index"
import { NoteView, type NoteEditorApi } from "../../components/vault/NoteView"
import { ResizablePanel, setPanelCollapsed } from "../../components/ResizablePanel"
import { useNarrow } from "../../components/editor/use-narrow"
import { OverflowMenu, type MenuEntry } from "../../components/kit/OverflowMenu"
import { ChoiceGroup } from "../../components/kit/ChoiceGroup"
import { Notice } from "../../components/kit/Layout"
import { Modal, Segmented } from "../../components/ui"
import { navigate } from "../../lib/router"
import { flushOpenNotes, vaultRoute } from "../../lib/vault-notes"
import { ConfirmDialog } from "../../components/vault/dialogs"
import { useVault } from "../../platform/VaultProvider"
import { BookSupport, type SupportTab } from "./BookSupport"
import { createCursorStore } from "./cursor-store"

const BookPreview = lazy(() => import("./BookPreview"))
const BookSidePreview = lazy(() => import("./BookSidePreview"))

type View = "escrever" | "organizar" | "previa"
const TYPEWRITER_KEY = "runas-codex:livros:maquina"
const ORGANIZE_KEY = "runas-codex:livros:organizar"
const KIND_LABEL: Record<string, string> = { capitulo: "Capítulo", parte: "Parte", secao: "Seção", indice: "Índice" }
type Status = "pronto" | "revisao" | "rascunho"
const STATUS_TEXT: Record<Status, string> = { pronto: "pronto", revisao: "revisão", rascunho: "rascunho" }
/** Status livre da nota (“revisão”, “Revisao”, “pronto”) num dos três pontos do sumário. */
const statusOf = (status: string): Status => (/pront/i.test(status) ? "pronto" : /revis/i.test(status) ? "revisao" : "rascunho")
const stored = (key: string) => { try { return localStorage.getItem(key) } catch { return null } }
const store = (key: string, value: string) => { try { localStorage.setItem(key, value) } catch { /* preferência opcional */ } }
/** Fecha um painel lateral (no celular, sumário e Apoio abrem por cima da página, um por vez). */
const closePanel = (id: string) => setPanelCollapsed(id, true)
const words = (count: number) => `${count.toLocaleString("pt-BR")} ${count === 1 ? "palavra" : "palavras"}`

/**
 * Livros: a mesa do escritor (rework F3b). Três modos — Escrever, Organizar e Diagramar — no lugar de sete botões; o
 * sumário recolhível à esquerda; a formatação aparece onde o cursor está (barra da seleção, menu `/`, galeria); o
 * Apoio (referências, revisão, capítulo) fica fechado até ser pedido. Foco é a única ação solta. Em Escrever, a
 * prévia ao lado mostra as páginas enquanto se escreve (L1); no celular, “Ver a página” abre a página do cursor em tela cheia.
 */
export function BookEditor({ book }: { book: IndexedNote }) {
  const vault = useVault(), index = vault.index!
  const structure = readBook(index, book)
  const [selected, setSelected] = useState<string | undefined>(() => structure.items.find((i) => i.note)?.note?.path)
  const [view, setView] = useState<View>("escrever")
  const [focus, setFocus] = useState(false)
  const [typewriter, setTypewriter] = useState(() => stored(TYPEWRITER_KEY) === "true")
  useEffect(() => store(TYPEWRITER_KEY, String(typewriter)), [typewriter])
  const [binderSlot, setBinderSlot] = useState<HTMLDivElement | null>(null)
  const [supportSlot, setSupportSlot] = useState<HTMLDivElement | null>(null)
  const [chapterSlot, setChapterSlot] = useState<HTMLDivElement | null>(null)
  const [supportTab, setSupportTab] = useState<SupportTab>("referencias")
  const [refQuery, setRefQuery] = useState("")
  const [revealSupport, setRevealSupport] = useState(false)
  const [comment, setComment] = useState<{ editor: NoteEditorApi; at: number } | null>(null)
  const [draft, setDraft] = useState<{ path: string; text: string }>()
  const onDraftChange = useCallback((text: string) => { if (selected) setDraft({ path: selected, text }) }, [selected])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [kind, setKind] = useState("capitulo")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [announcement, setAnnouncement] = useState("")
  const [deleting, setDeleting] = useState(false)
  const narrow = useNarrow()
  // Prévia ao lado (L1): o cursor vai para um repositório próprio, para só a prévia redesenhar a cada movimento.
  const cursor = useMemo(createCursorStore, [])
  const onCursorLine = useCallback((line: number) => { if (selected) cursor.set({ path: selected, line }) }, [selected, cursor])
  const [previewSlot, setPreviewSlot] = useState<HTMLDivElement | null>(null)
  const [sideOpen, setSideOpen] = useState(false)
  const [sheet, setSheet] = useState(false)
  const sheetButton = useRef<HTMLButtonElement>(null)
  const [lineRequest, setLineRequest] = useState<{ path: string; line: number; at: number }>()
  // O pedido de linha vale para a nota que está abrindo; depois some, para não repetir ao voltar ao capítulo.
  useEffect(() => { if (!lineRequest) return; const timer = setTimeout(() => setLineRequest(undefined), 1500); return () => clearTimeout(timer) }, [lineRequest])
  // Abaixo de 1400 px, Apoio e prévia dividem o lado direito: abrir um fecha o outro. Só reage quando um deles abre
  // (ao montar, os dois só informam como estavam).
  const sideWas = useRef<boolean | null>(null), toolsWas = useRef<boolean | null>(null)
  const sideChanged = useCallback((collapsed: boolean) => {
    const opening = !collapsed && sideWas.current === false
    sideWas.current = !collapsed
    setSideOpen(!collapsed)
    if (!opening) return
    if (window.innerWidth < 1400) setPanelCollapsed("book-tools", true)
    if (window.innerWidth < 1200) setPanelCollapsed("book-binder", true)
  }, [])
  const toolsChanged = useCallback((collapsed: boolean) => {
    const opening = !collapsed && toolsWas.current === false
    toolsWas.current = !collapsed
    if (opening && window.innerWidth < 1400) setPanelCollapsed("book-preview", true)
  }, [])
  const openAt = (path: string, line: number) => {
    if (path !== selected) setSelected(path)
    setLineRequest({ path, line, at: Date.now() })
    if (sheet) closeSheet()
  }
  const closeSheet = () => { setSheet(false); requestAnimationFrame(() => sheetButton.current?.focus()) }
  const locked = Boolean(vault.info?.readOnly || busy || structure.error)
  const current = selected ? index.note(selected) : undefined
  const currentItem = structure.items.find((item) => item.note?.path === selected)

  // Ao entrar num livro, a navegação do app recolhe para o trilho de ícones e a página ganha largura; ao sair, volta
  // como estava (se a pessoa a abriu de novo no meio do caminho, fica aberta).
  useEffect(() => {
    if (narrow) return
    if (document.querySelector('[data-panel-id="navigation"]')?.getAttribute("data-panel-collapsed") !== "false") return
    setPanelCollapsed("navigation", true)
    return () => setPanelCollapsed("navigation", false)
  }, [narrow])

  // No celular, abrir o sumário fecha o Apoio e vice-versa. Os botões chegam às barras por portal, então o clique é
  // ouvido no próprio elemento (o evento do React segue a árvore do painel, não a da barra).
  useEffect(() => {
    if (!narrow) return
    const pairs: [HTMLElement | null, string][] = [[binderSlot, "book-tools"], [supportSlot, "book-binder"]]
    const stop = pairs.map(([slot, other]) => {
      if (!slot) return () => {}
      const close = () => closePanel(other)
      slot.addEventListener("click", close, true)
      return () => slot.removeEventListener("click", close, true)
    })
    return () => stop.forEach((off) => off())
  }, [narrow, binderSlot, supportSlot])

  useEffect(() => {
    if (!focus) return
    document.body.classList.add("book-focus-active")
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) setFocus(false) }
    window.addEventListener("keydown", escape)
    return () => { document.body.classList.remove("book-focus-active"); window.removeEventListener("keydown", escape) }
  }, [focus])

  const run = async (action: () => Promise<void>) => {
    if (locked) return
    setBusy(true); setError("")
    try { await action() } catch (e) { setError(String(e)) } finally { setBusy(false) }
  }
  const insertNote = async (path: string) => {
    // Relê a estrutura depois da criação para incluir mudanças recebidas pelo observador.
    const latest = readBook(index, index.note(book.path)!)
    if (latest.error) throw new Error(latest.error)
    const links = latest.items.map((i) => i.link)
    const pos = latest.items.findIndex((i) => i.note?.path === selected)
    links.splice(pos < 0 ? links.length : pos + 1, 0, `[[${index.linkTarget(path, book.path)}]]`)
    await vault.setProperty(book.path, "estrutura", links)
    setSelected(path)
  }
  const move = (from: number, to: number) => void run(async () => {
    await vault.setProperty(book.path, "estrutura", moveBookItem(structure.items.map((i) => i.link), from, to))
    setAnnouncement(`Capítulo movido para a posição ${to + 1}.`)
  })
  const open = (path: string) => { setSelected(path); setLineRequest(undefined); setView("escrever"); if (narrow) closePanel("book-binder") }
  const showSupport = (tab: SupportTab) => { if (narrow) closePanel("book-binder"); setSupportTab(tab); setRevealSupport(true); setTimeout(() => setRevealSupport(false)) }
  const newChapter = () => { setCreating(true); setView("escrever") }

  const bookMenu: MenuEntry[] = [
    { label: "Novo capítulo…", icon: <Plus size={16} />, disabled: locked, onSelect: newChapter },
    { label: "Metadados do livro…", icon: <SlidersHorizontal size={16} />, onSelect: () => navigate(vaultRoute(book.path)) },
    { label: "Exportar…", icon: <FileDown size={16} />, onSelect: () => setView("previa") },
    // No celular, Foco sai da barra (o lugar fica para “Ver a página”) e mora aqui.
    ...(narrow && view === "escrever" ? [{ label: "Foco (só a página)", icon: <Maximize2 size={16} />, onSelect: () => setFocus(true) }] : []),
    "separator",
    { label: typewriter ? "Desligar a máquina de escrever" : "Ligar a máquina de escrever", icon: <Type size={16} />, onSelect: () => setTypewriter(!typewriter) },
    { label: "Snapshots do capítulo", icon: <History size={16} />, disabled: !current || view !== "escrever", onSelect: () => window.dispatchEvent(new CustomEvent("runas-codex:nota-acao", { detail: "history" })) },
  ]
  // Excluir o livro manda a nota dele e os capítulos para a lixeira do cofre. Ficam os capítulos de fora da pasta do
  // livro e os que outro livro também usa, para não sumir texto de outro lugar.
  const folder = dirname(book.path) + "/"
  const otherBooks = new Set(findBooks(index).filter((other) => other.path !== book.path).flatMap((other) => readBook(index, other).items.flatMap((item) => (item.note ? [item.note.path] : []))))
  const chapters = [...new Set(structure.items.flatMap((item) => (item.note ? [item.note.path] : [])))]
  const toTrash = chapters.filter((path) => path.startsWith(folder) && !otherBooks.has(path))
  const kept = chapters.filter((path) => !toTrash.includes(path))
  bookMenu.push("separator", { label: "Excluir livro…", icon: <Trash2 size={16} />, danger: true, disabled: locked, onSelect: () => setDeleting(true) })
  const views = [{ value: "escrever" as const, label: "Escrever", icon: <PenLine size={14} /> }, { value: "organizar" as const, label: "Organizar", icon: <LayoutGrid size={14} /> }, { value: "previa" as const, label: "Diagramar", icon: <LayoutTemplate size={14} /> }]

  return <div className={`books-editor books-view-${view} ${focus ? "books-focus" : ""}`}>
    {focus ? (
      <header className="book-bar book-focus-bar">
        <button type="button" className="btn sm" onClick={() => setFocus(false)}><Minimize2 size={16} /> Sair do foco</button>
        <div className="doc-title"><strong>{current?.name}</strong></div>
        <div className="doc-end"><div className="book-slot" ref={setChapterSlot} /></div>
      </header>
    ) : (
      <header className="book-bar">
        <button type="button" className="btn ghost book-back" onClick={() => navigate("/livros")} aria-label="Voltar aos livros"><ChevronLeft size={16} /><span>Livros</span></button>
        <div className="book-slot" ref={setBinderSlot} />
        <div className="doc-title"><small>Livro</small><strong>{book.name}</strong></div>
        <Segmented<View> label="Modo do livro" value={view} onChange={setView} options={views} />
        <div className="doc-end">
          {view === "escrever" && <div className="book-slot" ref={setChapterSlot} />}
          {view === "escrever" && !narrow && <div className="book-slot book-preview-slot" ref={setPreviewSlot} />}
          {view === "escrever" && narrow && current && <button ref={sheetButton} type="button" className="btn sm ghost" onClick={() => setSheet(true)} aria-label="Ver a página" title="Ver a página do cursor"><BookOpen size={16} /></button>}
          {view === "escrever" && !narrow && <button type="button" className="btn sm ghost book-focus-toggle" onClick={() => setFocus(true)} title="Só a página (Esc sai)"><Maximize2 size={16} /><span>Foco</span></button>}
          {view === "escrever" && <div className="book-slot" ref={setSupportSlot} />}
          <OverflowMenu label="Ações do livro" items={bookMenu} />
        </div>
      </header>
    )}
    {vault.info?.readOnly && <div className="doc-notice"><Notice tone="info" title="Somente leitura">Libere a gravação em Configurações › Cofre para escrever.</Notice></div>}
    {(error || structure.error) && <div className="doc-notice"><Notice tone="danger">{error || structure.error}</Notice></div>}
    <span className="sr-only" role="status">{announcement}</span>
    <div className="books-layout">
      <ResizablePanel id="book-binder" label="Sumário" side="left" width={260} controlsTarget={binderSlot} reveal={creating} hidden={focus} className="books-binder">
        <nav className="book-toc" aria-label="Sumário do livro">
          <ol>{structure.items.map((item, i) => {
            const status = statusOf(item.status), title = item.note?.name ?? item.link
            return <li key={`${item.link}:${i}`}>
              <button type="button" className="book-toc-item" disabled={!item.note} aria-current={selected === item.note?.path && view === "escrever" ? "true" : undefined} onClick={() => item.note && open(item.note.path)}>
                <span className={`book-dot ${status}`} aria-hidden="true" />
                <span className="book-toc-name">{title}</span>
                <small aria-hidden="true">{item.note ? item.words.toLocaleString("pt-BR") : "—"}</small>
                <span className="sr-only">{item.note ? `, ${STATUS_TEXT[status]}, ${words(item.words)}` : ", link quebrado"}</span>
              </button>
            </li>
          })}</ol>
          {creating ? <form className="book-new stack" onSubmit={(e) => {
            e.preventDefault(); void run(async () => {
              const path = await vault.createNote(dirname(book.path), name.trim(), `---\ntipo: ${kind}\nstatus: rascunho\nresumo: ""\n---\n# ${name.trim()}\n`)
              try { await insertNote(path) } catch (e) { throw new Error(`Nota criada; adicione-a por Fora do livro. ${String(e)}`) }
              setCreating(false); setName(""); setView("escrever")
            })
          }}>
            <label className="field"><span>Título</span><input className="input" required aria-label="Título do capítulo" value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="field"><span>Tipo</span><select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="capitulo">Capítulo</option>
              <option value="parte">Parte</option>
              <option value="secao">Seção</option>
            </select></label>
            <div className="row">
              <button className="btn sm primary" aria-label="Confirmar criar capítulo" disabled={locked || !name.trim()}>Criar</button>
              <button type="button" className="btn sm ghost" onClick={() => setCreating(false)}>Cancelar</button>
            </div>
          </form> : <button type="button" className="btn ghost book-toc-new" disabled={locked} onClick={() => setCreating(true)}><Plus size={16} /> Novo capítulo</button>}
          {structure.outside.length > 0 && <details className="book-outside">
            <summary>Fora do livro · {structure.outside.length}</summary>
            {structure.outside.map((note) => <div className="book-outside-row" key={note.path}>
              <button type="button" className="book-toc-item" onClick={() => open(note.path)}><span className="book-toc-name">{note.name}</span></button>
              <button type="button" className="btn sm" disabled={locked} onClick={() => void run(() => insertNote(note.path))} aria-label={`Incluir ${note.name}`}>Incluir</button>
            </div>)}
          </details>}
          {/* No celular os modos moram no fim do sumário, sem ocupar a barra. */}
          <div className="book-toc-modes" role="group" aria-label="Modo do livro">
            {views.map((option) => <button key={option.value} type="button" className="btn sm" aria-pressed={view === option.value} onClick={() => { setView(option.value); if (narrow) closePanel("book-binder") }}>{option.icon} {option.label}</button>)}
          </div>
        </nav>
      </ResizablePanel>
      <main className="books-main">
        {view === "organizar" ? <BookOrganize items={structure.items} locked={locked} onOpen={open} onMove={move} />
          : view === "previa" ? <Suspense fallback={<p className="page">Carregando prévia…</p>}><BookPreview book={book} draft={draft} onClose={() => setView("escrever")} /></Suspense>
          : current ? <>
            {!focus && <ChapterMeta item={currentItem} onEdit={() => showSupport("capitulo")} />}
            <NoteView
              key={current.path}
              variant="livro"
              path={current.path}
              folders={[...new Set(index.allNotes().map((n) => dirname(n.path)))]}
              focusHeader={chapterSlot}
              hideBackControl
              typewriter={typewriter}
              onDraftChange={onDraftChange}
              onCursorLine={onCursorLine}
              lineRequest={lineRequest?.path === current.path ? lineRequest : undefined}
              onTrashed={() => setSelected(structure.items.find((item) => item.note && item.note.path !== current.path)?.note?.path)}
              onShowPanel={() => showSupport("capitulo")}
              onBack={() => navigate("/livros")}
              onCreate={(target) => { setName(target); setCreating(true) }}
              onTag={() => navigate("/notas")}
              selectionActions={(editor) => [
                { label: "Comentar", icon: <MessageSquarePlus size={15} />, run: () => setComment({ editor, at: editor.selection()?.to ?? 0 }) },
                { label: "Citar da Wiki", icon: <Library size={15} />, run: () => { const range = editor.selection(); setRefQuery(range ? editor.text.slice(range.from, range.to) : ""); showSupport("referencias") } },
                // L5: a magia no formato antigo (nome em negrito, custo e tipo embaixo, o texto) vira a ficha `[!magia]`.
                { label: "Converter em ficha", icon: <ScrollText size={15} />, run: () => {
                  const range = editor.selection()
                  const ficha = range ? toFicha(editor.text.slice(range.from, range.to)) : null
                  if (!range || !ficha) { setAnnouncement("Selecione o nome em negrito, a linha do custo e o texto da magia para converter em ficha."); setError("Converter em ficha: selecione o nome em negrito (ou ###), a linha do custo e o texto."); return }
                  setError("")
                  editor.replaceAll((text) => text.slice(0, range.from) + ficha + text.slice(range.to))
                  setAnnouncement("Ficha criada.")
                } },
              ]}
              sidebar={focus ? undefined : (editor) => (
                <ResizablePanel id="book-tools" label="Apoio" width={300} controlsTarget={supportSlot} defaultCollapsed reveal={revealSupport} className="book-tools-panel" onCollapsedChange={toolsChanged}>
                  <BookSupport book={book} chapter={current} editor={editor} tab={supportTab} onTab={setSupportTab} query={refQuery} onQuery={setRefQuery} />
                </ResizablePanel>
              )}
              statusExtra={<>
                <span>Livro · {words(structure.words)}</span>
                <button type="button" className="statusbar-toggle book-typewriter-toggle" aria-pressed={typewriter} onClick={() => setTypewriter(!typewriter)}>Máquina de escrever: {typewriter ? "ligada" : "desligada"}</button>
              </>}
            />
          </> : <div className="page"><p>Escolha um capítulo no sumário. Links quebrados podem ser corrigidos nos metadados do livro.</p></div>}
      </main>
      {view === "escrever" && !narrow && <ResizablePanel id="book-preview" label="Prévia ao lado" width={460} maxWidth={960} controlsTarget={previewSlot} defaultCollapsed hidden={focus} className="book-side-panel" onCollapsedChange={sideChanged}>
        {sideOpen && <Suspense fallback={<p className="book-side-loading">Carregando a prévia…</p>}>
          <BookSidePreview book={book} draft={draft} chapterPath={selected} cursor={cursor} onOpenAt={openAt} onDiagramar={() => setView("previa")} />
        </Suspense>}
      </ResizablePanel>}
    </div>
    {sheet && narrow && view === "escrever" && <Suspense fallback={null}>
      <BookSidePreview variant="tela" book={book} draft={draft} chapterPath={selected} cursor={cursor} onOpenAt={openAt} onDiagramar={() => { setSheet(false); setView("previa") }} onClose={closeSheet} />
    </Suspense>}
    {deleting && <ConfirmDialog title="Excluir livro" confirmLabel="Mandar para a lixeira" danger onClose={() => setDeleting(false)} onConfirm={async () => {
      await flushOpenNotes()
      // Capítulos antes; a nota do livro por último (sem ela a tela do livro fecha).
      for (const path of toTrash) await vault.trash(path)
      await vault.trash(book.path)
      navigate("/livros")
    }}>
      <p>“{book.name}” e {toTrash.length === 1 ? "1 capítulo vão" : `${toTrash.length} capítulos vão`} para a lixeira do cofre (<code>.trash</code>), a mesma do Obsidian. Dá para recuperar de lá.</p>
      {kept.length > 0 && <p style={{ marginTop: 8 }}>Ficam no cofre, porque estão fora da pasta do livro ou também fazem parte de outro livro: {kept.map((path) => index.note(path)?.name ?? path).join(", ")}.</p>}
      {structure.outside.length > 0 && <p style={{ marginTop: 8 }}>{structure.outside.length === 1 ? "A nota que está na pasta mas fora do livro também fica." : `As ${structure.outside.length} notas que estão na pasta mas fora do livro também ficam.`}</p>}
    </ConfirmDialog>}
    {comment && <CommentDialog onClose={() => setComment(null)} onSave={(text) => {
      // Um espaço só quando o comentário cola em texto; no começo de uma linha ele entra sem espaço.
      const before = comment.editor.text[comment.at - 1]
      comment.editor.insert(`${before && !/\s/.test(before) ? " " : ""}${reviewComment(text)}`, comment.at)
      setComment(null)
    }} />}
  </div>
}

/** Linha discreta acima do capítulo (LIV-4): tipo, status, palavras e resumo; clicar abre a aba Capítulo do Apoio. */
function ChapterMeta({ item, onEdit }: { item?: BookItem; onEdit(): void }) {
  if (!item?.note) return null
  const status = statusOf(item.status)
  return <button type="button" className="book-chapter-meta" onClick={onEdit} aria-label={`${KIND_LABEL[item.kind] ?? item.kind}, ${STATUS_TEXT[status]}, ${words(item.words)}${item.summary ? `, resumo: ${item.summary}` : ""}. Editar no Apoio`}>
    <span>{KIND_LABEL[item.kind] ?? item.kind}</span>
    <span className="book-chapter-status"><span className={`book-dot ${status}`} aria-hidden="true" />{STATUS_TEXT[status]}</span>
    <span>{words(item.words)}</span>
    <span className="book-chapter-summary">{item.summary ? `Resumo: ${item.summary}` : "Sem resumo"}</span>
  </button>
}

function CommentDialog({ onClose, onSave }: { onClose(): void; onSave(text: string): void }) {
  const [text, setText] = useState("")
  const field = useRef<HTMLTextAreaElement>(null)
  // O diálogo põe o foco no primeiro botão; o comentário começa no campo.
  useEffect(() => { field.current?.focus() }, [])
  return <Modal title="Comentário de revisão" onClose={onClose} footer={<>
    <button className="btn" onClick={onClose}>Cancelar</button>
    <button className="btn primary" disabled={!text.trim()} onClick={() => onSave(text)}>Comentar</button>
  </>}>
    <label className="field"><span>Comentário</span><textarea ref={field} className="input" rows={3} maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} /></label>
    <p className="small muted">Entra depois do trecho selecionado como <code>%% revisão: … %%</code>, oculto na leitura e na impressão. A lista fica na aba Revisão do Apoio.</p>
  </Modal>
}

/**
 * Organizar (LIV-6): Estrutura e Cortiça numa visão só, em cartões ou lista. Mover por arrastar, pelo menu de cada
 * capítulo ou com Alt+↑ e Alt+↓ no capítulo focado; a posição nova é anunciada.
 */
function BookOrganize({ items, locked, onOpen, onMove }: { items: BookItem[]; locked: boolean; onOpen(path: string): void; onMove(from: number, to: number): void }) {
  const [style, setStyle] = useState<"cartoes" | "lista">(() => (stored(ORGANIZE_KEY) === "lista" ? "lista" : "cartoes"))
  useEffect(() => store(ORGANIZE_KEY, style), [style])
  const drag = useRef<number | null>(null)
  const list = useRef<HTMLOListElement>(null)
  // Depois de mover pelo teclado, o foco acompanha o capítulo: espera a gravação pôr o mesmo link na posição nova.
  const [follow, setFollow] = useState<{ link: string; to: number } | null>(null)
  useEffect(() => {
    if (!follow || items[follow.to]?.link !== follow.link) return
    list.current?.querySelector<HTMLElement>(`[data-book-position="${follow.to}"]`)?.focus()
    setFollow(null)
  }, [items, follow])
  const moveTo = (from: number, to: number) => { if (locked || to < 0 || to >= items.length) return; setFollow({ link: items[from]!.link, to }); onMove(from, to) }
  return <section className={`book-organize ${style}`} aria-label="Organizar capítulos">
    <div className="book-organize-head">
      <p className="small muted">Arraste pelo ⠿, use o menu de cada capítulo ou Alt+↑ e Alt+↓ com o capítulo focado.</p>
      <ChoiceGroup label="Mostrar como" value={style} onChange={setStyle} options={[{ value: "cartoes", label: "Cartões" }, { value: "lista", label: "Lista" }]} />
    </div>
    <ol className="book-organize-list" ref={list}>{items.map((item, i) => {
      const title = item.note?.name ?? item.link, status = statusOf(item.status)
      return <li key={`${item.link}:${items.slice(0, i).filter((other) => other.link === item.link).length}`} className="book-organize-item" data-book-position={i} tabIndex={0}
        aria-label={`${i + 1}. ${title}, ${STATUS_TEXT[status]}, ${words(item.words)}`}
        onKeyDown={(event) => {
          if (!event.altKey || event.target !== event.currentTarget) return
          if (event.key === "ArrowUp") { event.preventDefault(); moveTo(i, i - 1) }
          if (event.key === "ArrowDown") { event.preventDefault(); moveTo(i, i + 1) }
        }}>
        <button type="button" className="icon-btn sm book-drag" tabIndex={-1} disabled={locked} aria-label={`Arrastar ${title}`}
          onPointerDown={(e) => { drag.current = i; e.currentTarget.setPointerCapture(e.pointerId) }} onPointerCancel={() => { drag.current = null }}
          onPointerUp={(e) => {
            const from = drag.current; drag.current = null
            const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-book-position]")
            if (from !== null && target && Number(target.dataset.bookPosition) !== from) onMove(from, Number(target.dataset.bookPosition))
          }}>⠿</button>
        <div className="book-organize-text">
          <small className="book-organize-meta"><span className={`book-dot ${status}`} aria-hidden="true" /> {i + 1} · {STATUS_TEXT[status]}</small>
          <button type="button" className="book-organize-name" disabled={!item.note} onClick={() => item.note && onOpen(item.note.path)}>{title}</button>
          <p>{item.note ? item.summary || "Sem resumo" : "Link quebrado: corrija nos metadados do livro."}</p>
        </div>
        <OverflowMenu label={`Ações de ${title}`} items={[
          { label: "Abrir", icon: <PenLine size={16} />, disabled: !item.note, onSelect: () => item.note && onOpen(item.note.path) },
          { label: "Subir", hint: "Alt+↑", disabled: locked || i === 0, onSelect: () => moveTo(i, i - 1) },
          { label: "Descer", hint: "Alt+↓", disabled: locked || i === items.length - 1, onSelect: () => moveTo(i, i + 1) },
        ]} />
      </li>
    })}</ol>
  </section>
}
