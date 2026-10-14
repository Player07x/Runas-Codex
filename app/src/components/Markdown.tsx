import { Children, createContext, useContext, useMemo, type ReactNode } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import rehypeHighlight from "rehype-highlight"
import type { Element, ElementContent } from "hast"
import { Dices, ImageOff, ListTree } from "lucide-react"
import type { SpaceId } from "../data/types"
import { maskNonContent } from "../core/parse"
import { foldName } from "../core/text"
import { isCrossSpace, resolveLink } from "../lib/links"
import { navigate } from "../lib/router"
import { useNoteSet } from "../lib/note-set"
import { prepareSource, remarkBlocks } from "../markdown/blocks"
import { Callout, LayoutCallout, LAYOUT_CALLOUTS } from "../markdown/Callout"
import { Embed, IMAGE_EXT } from "../markdown/Embed"
import { codeBlockFor, registerCodeBlock, type CodeBlockProps } from "../markdown/extensions"
import { MathTex } from "../markdown/MathTex"
import { MermaidDiagram } from "../markdown/Mermaid"
import { remarkObsidian } from "../markdown/remark-obsidian"

/**
 * Leitor de Markdown do Runas-Codex: remark (CommonMark + GFM + matemática) com o plugin do dialeto
 * (`remark-obsidian`), HTML do texto passando pela sanitização, realce de código e os blocos que o remark não conhece
 * (callouts, contêineres `:::`) separados antes por `splitBlocks`. A mesma sintaxe renderiza no Obsidian (docs/02, §5).
 */

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "runas-callout", "runas-callout-title", "mark", "u", "kbd", "details", "summary", "span", "div", "p", "sup", "sub", "abbr", "dl", "dt", "dd", "figure", "figcaption", "small", "s", "ins", "hr"],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className", "style", "align", "title", "data*"],
    img: [...(defaultSchema.attributes?.img ?? []), "width", "height", "loading"],
    td: [...(defaultSchema.attributes?.td ?? []), "colSpan", "rowSpan"],
    th: [...(defaultSchema.attributes?.th ?? []), "colSpan", "rowSpan"],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: [...(defaultSchema.protocols?.href ?? []), "wiki", "tag", "embed"],
  },
}

const remarkPlugins = [remarkGfm, remarkMath, remarkBlocks, remarkObsidian]
const rehypePlugins = [rehypeRaw, [rehypeSanitize, schema], [rehypeHighlight, { detect: false }]] as never

/** Títulos da nota (para o sumário ```table-of-contents```) e se os segredos do mestre aparecem. */
const MarkdownContext = createContext<{ headings: { level: number; text: string }[]; showSecrets: boolean }>({ headings: [], showSecrets: true })

/** Opções da renderização em volta (para blocos registrados: ex. esconder pinos secretos na versão dos jogadores). */
export function useMarkdownOptions(): { showSecrets: boolean } {
  return { showSecrets: useContext(MarkdownContext).showSecrets }
}

function headingsOf(source: string): { level: number; text: string }[] {
  const lines = source.split("\n")
  return maskNonContent(source)
    .split("\n")
    .flatMap((line, i) => {
      const m = /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(line)
      return m ? [{ level: m[1]!.length, text: lines[i]!.replace(/^ {0,3}#{1,6}[ \t]+/, "").replace(/[ \t]+#+[ \t]*$|[ \t]*$/, "").replace(/\s*\{[.#][^}]*\}$/, "").replace(/\s\^[A-Za-z0-9-]+$/, "") }] : []
    })
}

interface MarkdownProps {
  source: string
  space?: SpaceId
  /** Segredos do mestre aparecem (o mestre) ou somem (versão dos jogadores). */
  showSecrets?: boolean
  className?: string
  /** Nota inteira, quando `source` é só um trecho dela (o live preview desenha bloco a bloco): os títulos do sumário vêm daqui. */
  contextSource?: string
}

export function Markdown({ source, space, showSecrets = true, className, contextSource }: MarkdownProps) {
  const prepared = useMemo(() => prepareSource(source), [source])
  const headingSource = contextSource ?? prepared
  const context = useMemo(() => ({ headings: headingsOf(headingSource), showSecrets }), [headingSource, showSecrets])
  return (
    <MarkdownContext.Provider value={context}>
      <div className={`md ${className ?? ""}`}>
        <MarkdownBody text={prepared} space={space} />
      </div>
    </MarkdownContext.Provider>
  )
}

function textOf(node: ElementContent | undefined): string {
  if (!node) return ""
  if (node.type === "text") return node.value
  return node.type === "element" ? node.children.map(textOf).join("") : ""
}

function classesOf(node: Element | undefined): string[] {
  const value = node?.properties?.className as unknown
  return Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(" ") : []
}

/** Rola até o título com esse texto, dentro da nota aberta. */
function scrollToHeading(from: HTMLElement | null, text: string) {
  const root = from?.closest(".editor-body, .page, .md") ?? document
  const wanted = foldName(text)
  const heading = [...root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")].find((h) => foldName(h.textContent ?? "") === wanted)
  heading?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function TableOfContents() {
  const { headings } = useContext(MarkdownContext)
  if (!headings.length) return null
  const top = Math.min(...headings.map((h) => h.level))
  return (
    <nav className="md-sumario" aria-label="Sumário da nota">
      <span className="eyebrow row" style={{ gap: 6 }}>
        <ListTree size={14} /> Sumário
      </span>
      {headings.map((h, i) => (
        <a key={i} href="#" style={{ paddingLeft: (h.level - top) * 14 }} onClick={(event) => (event.preventDefault(), scrollToHeading(event.currentTarget, h.text))}>
          {h.text}
        </a>
      ))}
    </nav>
  )
}

registerCodeBlock(["mermaid"], ({ code }: CodeBlockProps) => <MermaidDiagram code={code} />)
registerCodeBlock(["table-of-contents", "toc"], () => <TableOfContents />)

function MarkdownBody({ text, space }: { text: string; space?: SpaceId }) {
  const set = useNoteSet()
  const { showSecrets } = useContext(MarkdownContext)
  // Os dois últimos componentes desenham as tags próprias do `remarkBlocks` (callouts).
  const components = useMemo(() => {
    const find = (target: string, kind: "wiki" | "markdown") => {
      if (set.resolve) return set.resolve(target, kind)
      const note = resolveLink(target, space, set.notes)
      return note ? { path: note.path, route: set.routeOf(note), cross: isCrossSpace(target, space) } : undefined
    }
    return {
      a({ href = "", children, title }) {
        if (href.startsWith("wiki:")) {
          const raw = decodeURIComponent(href.slice(5))
          const hash = raw.indexOf("#")
          const target = hash < 0 ? raw : raw.slice(0, hash)
          const subpath = hash < 0 ? "" : raw.slice(hash + 1)
          const found = target ? find(target, "wiki") : undefined
          const broken = Boolean(target) && !found
          return (
            <a
              className={`wikilink ${broken ? "broken" : ""} ${found?.cross ? "cross" : ""}`}
              title={broken ? `“${target}” ainda não existe — clique para criar` : found?.cross ? `Em outro espaço: ${found.path}` : (found?.path ?? subpath)}
              data-href={raw}
              onClick={(event) => {
                event.preventDefault()
                if (!target && subpath) scrollToHeading(event.currentTarget, subpath.split("#").at(-1)!.replace(/^\^/, ""))
                else if (found) navigate(found.route)
                else if (target) set.onBroken?.(target)
              }}
              href="#"
            >
              {children}
            </a>
          )
        }
        if (href.startsWith("tag:")) {
          const tag = decodeURIComponent(href.slice(4))
          return (
            <a
              className="tag"
              href="#"
              onClick={(event) => {
                event.preventDefault()
                set.onTag?.(tag)
              }}
            >
              {children}
            </a>
          )
        }
        if (href.startsWith("embed:")) return <Embed target={decodeURIComponent(href.slice(6))} alias={title ?? undefined} space={space} />
        // Link markdown para um arquivo do cofre (`[texto](Pasta/Nota.md)`): abre dentro do app.
        if (!/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith("#")) {
          let target = href
          try {
            target = decodeURIComponent(href)
          } catch {
            /* fica como está */
          }
          const found = find(target.split("#")[0]!, "markdown")
          return (
            <a
              className={`wikilink ${found ? "" : "broken"} ${found?.cross ? "cross" : ""}`}
              title={found?.path ?? `“${target}” não existe`}
              href="#"
              onClick={(event) => {
                event.preventDefault()
                if (found) navigate(found.route)
              }}
            >
              {children}
            </a>
          )
        }
        if (href.startsWith("#")) return <a href={href}>{children}</a>
        return (
          <a href={href} target="_blank" rel="noreferrer" className="external" title={href}>
            {children}
          </a>
        )
      },
      img({ src = "", alt, title, width, height, className }) {
        // Imagens da internet não carregam: o app não faz chamadas de rede fora da mesa.
        if (/^(https?:)?\/\//i.test(src)) {
          return (
            <span className="embed-missing" title={`Imagem da internet não carregada (o app é offline): ${src}`}>
              <ImageOff size={14} /> {alt || "imagem externa"}
            </span>
          )
        }
        let path = src
        try {
          path = decodeURIComponent(src)
        } catch {
          /* fica como está */
        }
        if (/^(data|blob):/i.test(src)) return <img src={src} alt={alt} width={width} height={height} className={className} />
        const found = find(path, "markdown") ?? find(path, "wiki")
        const url = found && IMAGE_EXT.has(path.slice(path.lastIndexOf(".")).toLowerCase()) ? set.fileUrl?.(found.path) : undefined
        if (!url) {
          return (
            <span className={`embed-missing ${found ? "" : "broken"}`} title={found ? "Anexos aparecem no app desktop" : `“${path}” não está no cofre`}>
              <ImageOff size={14} /> {alt || path}
            </span>
          )
        }
        const image = <img src={url} alt={alt} width={width} height={height} className={className} loading="lazy" />
        if (!title) return image
        return (
          <span className="md-figura">
            {image}
            <span className="md-legenda">{title}</span>
          </span>
        )
      },
      pre({ node, children }) {
        const code = node?.children.find((child): child is Element => child.type === "element" && child.tagName === "code")
        const classes = classesOf(code)
        if (classes.includes("language-math")) return <MathTex tex={textOf(code).trim()} display />
        // Blocos desenhados (```mermaid, ```table-of-contents e os que outros módulos registram).
        const language = classes.find((c) => c.startsWith("language-"))?.slice("language-".length)
        const Block = language ? codeBlockFor(language) : undefined
        if (Block && language) return <Block code={textOf(code).replace(/\n$/, "")} language={language} />
        return <pre>{children}</pre>
      },
      code({ className, children, node }) {
        const raw = textOf(node?.children[0])
        if (className?.includes("language-math")) return <MathTex tex={raw} display={false} />
        if (!className && raw.startsWith("dice:")) {
          return (
            <span className="dice-inline" title="Rolagem (sintaxe do Dice Roller)">
              <Dices size={13} /> {raw.slice(5).trim()}
            </span>
          )
        }
        return <code className={className}>{children}</code>
      },
      "runas-callout"({ node, children }: { node?: Element; children?: ReactNode }) {
        const props = node?.properties ?? {}
        const kind = String(props.dataKind ?? "nota")
        const meta = String(props.dataMeta ?? "")
        const fold = String(props.dataFold ?? "") as "" | "+" | "-"
        const titleNode = node?.children.find((child: ElementContent): child is Element => child.type === "element" && child.tagName === "runas-callout-title")
        const hasTitle = Boolean(titleNode && (textOf(titleNode).trim() || titleNode.children.some((c: ElementContent) => c.type === "element")))
        const [title, ...body] = Children.toArray(children).filter((child) => !(typeof child === "string" && !child.trim()))
        const content = body.length ? body : null
        if (LAYOUT_CALLOUTS.has(kind)) {
          return (
            <LayoutCallout kind={kind} title={title} hasTitle={hasTitle} meta={meta}>
              {content}
            </LayoutCallout>
          )
        }
        return (
          <Callout kind={kind} title={title} hasTitle={hasTitle} meta={meta} fold={fold} showSecrets={showSecrets}>
            {content}
          </Callout>
        )
      },
      "runas-callout-title"({ children }: { children?: ReactNode }) {
        return <>{children}</>
      },
      table({ children, className }) {
        return (
          <div className="table-wrap">
            <table className={className}>{children}</table>
          </div>
        )
      },
    }
  }, [set, space, showSecrets]) as Components
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      remarkRehypeOptions={{ footnoteLabel: "Notas de rodapé", footnoteBackLabel: "Voltar ao texto" }}
      urlTransform={(url) => url}
      components={components}
    >
      {text}
    </ReactMarkdown>
  )
}
