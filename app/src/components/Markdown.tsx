import { useState, type ReactNode } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import { ChevronDown, ChevronRight, Dices, Eye, EyeOff, FileText, Info, Lock, ShieldAlert, Sparkles, Swords, Quote, Lightbulb, Workflow, Sigma } from "lucide-react"
import type { SpaceId } from "../data/types"
import { basename, isCrossSpace, resolveLink } from "../lib/links"
import { navigate } from "../lib/router"
import { useNoteSet } from "../lib/note-set"

/**
 * Renderizador do protótipo: remark + rehype (a mesma família da versão final), com as extensões do
 * Obsidian feitas aqui por pré-processamento. Na etapa 3b isto vira plugins de verdade, testados
 * contra o mesmo corpus do editor.
 */

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "mark", "u", "kbd", "details", "summary", "span", "div", "p", "sup", "sub"],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className", "style", "align"],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: [...(defaultSchema.protocols?.href ?? []), "wiki", "tag", "embed"],
  },
}

type Block =
  | { type: "md"; text: string }
  | { type: "callout"; kind: string; title: string; fold: "" | "+" | "-"; body: string }

const CALLOUT_START = /^>\s*\[!([\w-]+)\]([+-])?\s*(.*)$/

function splitBlocks(source: string): Block[] {
  const blocks: Block[] = []
  const lines = source.split("\n")
  let buffer: string[] = []
  let inFence = false
  const flush = () => {
    if (buffer.length) blocks.push({ type: "md", text: buffer.join("\n") })
    buffer = []
  }
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (/^(```|~~~)/.test(line)) inFence = !inFence
    const callout = !inFence && line.match(CALLOUT_START)
    if (!callout) {
      buffer.push(line)
      continue
    }
    flush()
    const body: string[] = []
    while (i + 1 < lines.length && /^>/.test(lines[i + 1])) {
      i += 1
      body.push(lines[i].replace(/^>\s?/, ""))
    }
    blocks.push({ type: "callout", kind: callout[1].toLowerCase(), fold: (callout[2] ?? "") as "" | "+" | "-", title: callout[3], body: body.join("\n") })
  }
  flush()
  return blocks
}

/** Sintaxe do Obsidian → Markdown/HTML que o remark entende, fora de blocos de código. */
function preprocess(text: string): string {
  let inFence = false
  return text
    .replace(/%%[\s\S]*?%%/g, "")
    .split("\n")
    .map((line) => {
      if (/^(```|~~~)/.test(line)) {
        inFence = !inFence
        return line
      }
      if (inFence) return line
      const math = line.match(/^\$\$(.*)\$\$\s*$/)
      if (math) return "```math\n" + math[1].trim() + "\n```"
      return line
        .split(/(`[^`]*`|<[^>]+>)/)
        .map((part) => (part.startsWith("`") || part.startsWith("<") ? part : inline(part)))
        .join("")
    })
    .join("\n")
}

function inline(text: string): string {
  return text
    .replace(/==([^=]+)==/g, "<mark>$1</mark>")
    .replace(/!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_m, target: string) => `[${basename(target)}](embed:${encodeURIComponent(target)})`)
    .replace(/\[\[([^\]|#]*)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, (_m, target: string, heading: string | undefined, label: string | undefined) => {
      const shown = label ?? (target ? basename(target) + (heading ? ` › ${heading.slice(1)}` : "") : heading?.slice(1) ?? "")
      return `[${shown}](wiki:${encodeURIComponent(target + (heading ?? ""))})`
    })
    .replace(/(^|[\s(])#([\p{L}][\p{L}\p{N}_/-]*)/gu, (_m, before: string, tag: string) => `${before}[#${tag}](tag:${encodeURIComponent(tag)})`)
}

const CALLOUT_ICONS: Record<string, ReactNode> = {
  nota: <Info size={16} />,
  aviso: <ShieldAlert size={16} />,
  perigo: <ShieldAlert size={16} />,
  dica: <Lightbulb size={16} />,
  descritivo: <Quote size={16} />,
  citacao: <Quote size={16} />,
  segredo: <Lock size={16} />,
  statblock: <Swords size={16} />,
}

const CALLOUT_TITLES: Record<string, string> = {
  nota: "Nota",
  aviso: "Aviso",
  perigo: "Perigo",
  dica: "Dica",
  descritivo: "Leia em voz alta",
  segredo: "Segredo",
  statblock: "Statblock",
}

interface MarkdownProps {
  source: string
  space?: SpaceId
  /** Segredos do mestre aparecem (o mestre) ou somem (versão dos jogadores). */
  showSecrets?: boolean
  className?: string
}

export function Markdown({ source, space, showSecrets = true, className }: MarkdownProps) {
  const blocks = splitBlocks(source)
  return (
    <div className={`md ${className ?? ""}`}>
      {blocks.map((block, index) =>
        block.type === "md" ? (
          <MarkdownChunk key={index} text={block.text} space={space} />
        ) : block.kind === "segredo" && !showSecrets ? null : (
          <Callout key={index} block={block} space={space} />
        ),
      )}
    </div>
  )
}

function Callout({ block, space }: { block: Extract<Block, { type: "callout" }>; space?: SpaceId }) {
  const [open, setOpen] = useState(block.fold !== "-")
  const [revealed, setRevealed] = useState(false)
  const secret = block.kind === "segredo"
  return (
    <div className={`callout ${block.kind} ${secret ? "secret" : ""} ${secret && !revealed ? "hidden" : ""}`}>
      <div className="callout-title" onClick={block.fold ? () => setOpen(!open) : undefined} style={{ cursor: block.fold ? "pointer" : undefined }}>
        {CALLOUT_ICONS[block.kind] ?? <Sparkles size={16} />}
        <span className="grow">{block.title || CALLOUT_TITLES[block.kind] || block.kind}</span>
        {secret && (
          <button className="btn ghost sm" onClick={() => setRevealed(!revealed)} title="Segredos não vão para a versão dos jogadores">
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />} Só o mestre
          </button>
        )}
        {block.fold && (open ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
      </div>
      {open && (
        <div className="callout-body">
          <Markdown source={block.body} space={space} />
        </div>
      )}
    </div>
  )
}

function MarkdownChunk({ text, space }: { text: string; space?: SpaceId }) {
  const set = useNoteSet()
  const find = (target: string, kind: "wiki" | "markdown") => {
    if (set.resolve) return set.resolve(target, kind)
    const note = resolveLink(target, space, set.notes)
    return note ? { path: note.path, route: set.routeOf(note), cross: isCrossSpace(target, space) } : undefined
  }
  const components: Components = {
    a({ href = "", children }) {
      if (href.startsWith("wiki:")) {
        const raw = decodeURIComponent(href.slice(5))
        const target = raw.split("#")[0]
        const found = target ? find(target, "wiki") : undefined
        const broken = Boolean(target) && !found
        return (
          <a
            className={`wikilink ${broken ? "broken" : ""} ${found?.cross ? "cross" : ""}`}
            title={broken ? `“${target}” ainda não existe — clique para criar` : found?.cross ? `Em outro espaço: ${found.path}` : found?.path}
            onClick={(event) => {
              event.preventDefault()
              if (found) navigate(found.route)
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
      if (href.startsWith("embed:")) {
        return (
          <span className="chip cyan">
            <FileText size={13} /> {children}
          </span>
        )
      }
      // Link markdown para um arquivo do cofre (`[texto](Pasta/Nota.md)`): abre dentro do app.
      if (set.resolve && !/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith("#")) {
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
      return <a href={href} target="_blank" rel="noreferrer">{children}</a>
    },
    code({ className, children }) {
      const text = String(children)
      if (!className && text.startsWith("dice:")) {
        return (
          <span className="dice-inline" title="Clique para rolar">
            <Dices size={13} /> {text.slice(5).trim()}
          </span>
        )
      }
      if (className === "language-mermaid") {
        return (
          <span className="row muted">
            <Workflow size={16} /> Diagrama Mermaid — desenhado na etapa 3b: <code>{text.trim()}</code>
          </span>
        )
      }
      if (className === "language-math") {
        return (
          <span className="row" style={{ justifyContent: "center", fontFamily: "var(--font-book)", fontSize: 18 }}>
            <Sigma size={16} /> {text.trim().replace(/\\text\{([^}]*)\}/g, "$1")}
          </span>
        )
      }
      return <code className={className}>{children}</code>
    },
  }
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
      remarkRehypeOptions={{ footnoteLabel: "Notas de rodapé", footnoteBackLabel: "Voltar ao texto" }}
      urlTransform={(url) => url}
      components={components}
    >
      {preprocess(text)}
    </ReactMarkdown>
  )
}
