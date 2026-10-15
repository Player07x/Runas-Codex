import { fromHtml } from "hast-util-from-html"
import { defaultSchema, sanitize } from "hast-util-sanitize"
import { toHtml } from "hast-util-to-html"
import type { Element, Root, RootContent } from "hast"
import { COLUMN_BREAK, PAGE_BREAK, protectCode } from "./types"

const tags = ["span", "p", "div", "u", "sup", "sub", "mark", "abbr", "small", "s", "figure", "figcaption"]
const schema = {
  ...defaultSchema,
  tagNames: [...defaultSchema.tagNames!, ...tags],
  attributes: {
    ...defaultSchema.attributes,
    "*": ["title", "align", "style"],
    div: ["className"], span: ["className", "style", "title"],
    img: ["src", "alt", "title"], td: ["colSpan", "rowSpan"], th: ["colSpan", "rowSpan"],
  },
  protocols: { ...defaultSchema.protocols, src: ["import-image"] },
}
const safeStyle = (style: string) => style.split(";").filter((rule) => {
  const [name, value] = rule.split(/:(.*)/s)
  return /^(color|background-color|font-family|font-size|font-variant|text-align|font-weight|font-style|text-decoration)$/.test(name.trim().toLowerCase()) &&
    !!value && /^[\w\s#.,%()'"+-]+$/.test(value) && !/url|expression|var\s*\(|attr\s*\(/i.test(value)
}).join(";")

function cleanTree(html: string, warnings: Set<string>): Root {
  const tree = fromHtml(html, { fragment: true })
  const visit = (node: Root | Element) => {
    for (const child of node.children) if (child.type === "element") {
      if (["script", "style", "iframe", "object", "embed", "form"].includes(child.tagName)) {
        child.tagName = "script" // sanitize elimina também o conteúdo.
        warnings.add("Scripts, folhas de estilo e conteúdo ativo foram removidos.")
      }
      if (typeof child.properties.style === "string") {
        const before = child.properties.style
        child.properties.style = safeStyle(before)
        if (child.properties.style !== before) warnings.add("Estilos sem equivalente no dialeto foram removidos; o texto foi preservado.")
      }
      if (child.properties.className) {
        const classes = String(child.properties.className).split(/[ ,]+/)
        const allowed = classes.filter((value) => ["capitular", "quebra-pagina", "quebra-coluna"].includes(value))
        if (allowed.length !== classes.length) warnings.add("Classes personalizadas foram removidas; o texto foi preservado.")
        child.properties.className = allowed
      }
      if (child.tagName === "img" && typeof child.properties.src === "string" && !child.properties.src.startsWith("import-image:")) {
        const url = child.properties.src
        child.tagName = "a"
        child.children = [{ type: "text", value: String(child.properties.alt || "Imagem externa") }]
        child.properties = { href: /^https?:\/\//i.test(url) ? url : undefined }
        warnings.add("Imagens externas ou locais referenciadas ficam como links; nenhum arquivo foi baixado.")
      }
      visit(child)
    }
  }
  visit(tree)
  const safe = sanitize(tree, schema)
  if (safe.type !== "root") throw new Error("HTML inválido para importar.")
  return safe
}

/** Sanitiza antes da conversão; nunca usa DOM, scripts ou carregamento de recursos. */
export function htmlToMarkdown(html: string, warnings: Set<string>): string {
  const tree = cleanTree(html, warnings)
  const text = (node: RootContent): string => node.type === "text" ? node.value : node.type === "element" ? node.children.map(text).join("") : ""
  const escape = (value: string) => value.replace(/([\\`*_{}\[\]<>#|])/g, "\\$1")
  const render = (node: RootContent): string => {
    if (node.type === "text") return escape(node.value)
    if (node.type !== "element") return ""
    const inner = node.children.map(render).join("")
    switch (node.tagName) {
      case "h1": case "h2": case "h3": case "h4": case "h5": case "h6": return `\n\n${"#".repeat(Number(node.tagName[1]))} ${inner}\n\n`
      case "strong": case "b": return `**${inner}**`
      case "em": case "i": return `*${inner}*`
      case "del": case "s": return `~~${inner}~~`
      case "br": return "  \n"
      case "hr": return "\n\n---\n\n"
      case "a": return node.properties.href ? `[${inner}](<${String(node.properties.href).replace(/[<>\n\r]/g, "")}>)` : inner
      case "img": return `![${escape(String(node.properties.alt ?? ""))}](${String(node.properties.src ?? "")})`
      case "blockquote": return "\n\n" + inner.trim().split("\n").map((line) => `> ${line}`).join("\n") + "\n\n"
      case "ul": case "ol": {
        let n = Number(node.properties.start) || 1
        return "\n\n" + node.children.filter((child) => child.type === "element" && child.tagName === "li").map((child) => {
          const marker = node.tagName === "ol" ? `${n++}. ` : "- "
          return marker + render(child).trim().replace(/\n/g, "\n" + " ".repeat(marker.length))
        }).join("\n") + "\n\n"
      }
      case "table": {
        // HTML sanitizado conserva células mescladas, além das tabelas comuns.
        return "\n\n" + toHtml(node) + "\n\n"
      }
      case "pre": return `\n\n${"`".repeat(Math.max(3, ...[...text(node).matchAll(/`+/g)].map((m) => m[0].length + 1)))}\n${text(node)}\n${"`".repeat(Math.max(3, ...[...text(node).matchAll(/`+/g)].map((m) => m[0].length + 1)))}\n\n`
      case "code": return toHtml(node)
      case "div": {
        const classes = String(node.properties.className ?? "")
        if (classes.includes("quebra-pagina")) return `\n\n${PAGE_BREAK}\n\n`
        if (classes.includes("quebra-coluna")) return `\n\n${COLUMN_BREAK}\n\n`
        return `\n\n${inner}\n\n`
      }
      case "p": return node.properties.align || node.properties.style ? `\n\n${toHtml(node)}\n\n` : `\n\n${inner}\n\n`
      case "span": case "u": case "sup": case "sub": case "mark": case "abbr": return toHtml(node)
      default: return inner
    }
  }
  return tree.children.map(render).join("").replace(/\n{3,}/g, "\n\n").trim()
}

/** HTML embutido no Markdown mantém a sintaxe original do texto e só os atributos seguros. */
export function sanitizeMarkdown(source: string, warnings: Set<string>): string {
  const code = protectCode(source)
  const tables: string[] = []
  // Linhas e células precisam do contexto da tabela para serem analisadas pelo parser HTML.
  let value = code.text.replace(/<table\b[^>]*>[\s\S]*?<\/table\s*>/gi, (html) => {
    tables.push(toHtml(cleanTree(html, warnings)))
    return `\uE100${tables.length - 1}\uE101`
  })
  value = value.replace(/<(script|style|iframe|object)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, () => {
    warnings.add("Scripts, folhas de estilo e conteúdo ativo foram removidos.")
    return ""
  })
  value = value.replace(/<!--([\s\S]*?)-->/g, "").replace(/<\/?[a-z][^>]*>/gi, (tag) => {
    const name = /^<\/?([a-z][\w-]*)/i.exec(tag)?.[1].toLowerCase() ?? ""
    if (tag.startsWith("</")) return schema.tagNames.includes(name) ? `</${name}>` : ""
    const tree = cleanTree(tag, warnings)
    const node = tree.children.find((child): child is Element => child.type === "element")
    if (!node) { warnings.add("HTML sem equivalente foi removido; o texto foi preservado."); return "" }
    const html = toHtml(node)
    return name === "img" ? htmlToMarkdown(tag, warnings) : html.slice(0, html.indexOf(">") + 1)
  })
  value = value.replace(/!\[([^\]]*)\]\((<?https?:\/\/[^\s)]+>?)(?:\s+"[^"]*")?\)/gi, (_, alt: string, url: string) => {
    warnings.add("Imagens por URL ficam como links; nenhum arquivo foi baixado.")
    return `[${alt || "Imagem externa"}](${url})`
  })
  value = value.replace(/!\[([^\]]*)\]\[([^\]]*)\]/g, (_, alt: string, id: string) => {
    warnings.add("Imagens por referência ficam como links; nenhum arquivo foi baixado.")
    return `[${alt || "Imagem externa"}][${id || alt}]`
  })
  return code.restore(value.replace(/\uE100(\d+)\uE101/g, (original, n: string) => tables[Number(n)] ?? original))
}
