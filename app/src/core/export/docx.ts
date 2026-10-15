// Portado do Runas Book/toDocx.ts (ADR 0004): títulos, runs, tabelas e imagens.
// A entrada agora é a árvore do leitor das notas; não usa HTML salvo em outro app.
import { AlignmentType, BorderStyle, ColumnBreak, Document, ExternalHyperlink, HeadingLevel, ImageRun, LevelFormat, Packer, PageBreak, Paragraph, SectionType, ShadingType, Table, TableCell, TableRow, TextRun, WidthType, type IRunOptions, type ISectionOptions, type ParagraphChild } from "docx"
import { BOOK_SIZES } from "../books-preview"
import { plainText, type ExportBook, type ExportNode } from "./book"

const headings = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6]
const elements = (nodes: ExportNode[]) => nodes.filter((n): n is Exclude<ExportNode, string> => typeof n !== "string")
const classes = (node: Exclude<ExportNode, string>) => (node.attrs.class ?? "").split(/\s+/)
const color = (value?: string) => {
  const hex = /^#([a-f\d]{6})$/i.exec(value ?? "")
  if (hex) return hex[1]
  const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value ?? "")
  return rgb ? rgb.slice(1, 4).map((v) => Number(v).toString(16).padStart(2, "0")).join("") : undefined
}
export async function generateDocx(book: ExportBook): Promise<Uint8Array> {
  const page = BOOK_SIZES[book.size]
  const width = (page.width - 2 * page.margin) * 96 / 25.4
  const theme = { manual: "7B251C", pergaminho: "694421", moderno: "215A79", minimalista: "222222" }[book.theme]
  const assets = new Map(book.assets.map((a) => [a.name, a]))
  function inline(nodes: ExportNode[], style: IRunOptions = {}): ParagraphChild[] {
    return nodes.flatMap((node): ParagraphChild[] => {
      if (typeof node === "string") return [new TextRun({ ...style, text: node })]
      if (node.tag === "br") return [new TextRun({ break: 1 })]
      if (node.tag === "img") {
        const asset = assets.get(node.attrs.src)
        if (!asset || !["image/png", "image/jpeg", "image/gif", "image/bmp"].includes(asset.mime)) return [new TextRun(node.attrs.alt || "[Imagem]")]
        const w = Math.min(width, Number(node.attrs.width) || asset.width || width)
        const h = w * ((asset.height || 1) / (asset.width || 1))
        return [new ImageRun({ data: asset.bytes, type: asset.mime === "image/jpeg" ? "jpg" : asset.mime.split("/")[1] as "png" | "gif" | "bmp", transformation: { width: w, height: h }, altText: { title: node.attrs.alt ?? "Imagem", description: node.attrs.alt ?? "Imagem", name: "Imagem" } })]
      }
      if (node.tag === "a" && /^(https?:|mailto:)/.test(node.attrs.href ?? "")) return [new ExternalHyperlink({ link: node.attrs.href, children: inline(node.children, { ...style, style: "Hyperlink" }) })]
      if (node.tag === "input") return [new TextRun(node.attrs.checked !== undefined ? "☑ " : "☐ ")]
      // O texto matemático fica legível e editável mesmo em leitores sem suporte ao MathML.
      if (classes(node).includes("katex")) {
        const annotation = find(node, "annotation")
        return [new TextRun({ ...style, text: annotation ? plainText(annotation) : plainText(node), font: "Cambria Math" })]
      }
      const css = Object.fromEntries((node.attrs.style ?? "").split(";").map((s) => s.split(":").map((v) => v.trim())).filter((p) => p.length === 2))
      const next: IRunOptions = { ...style,
        ...(node.tag === "strong" || node.tag === "b" ? { bold: true } : {}),
        ...(node.tag === "em" || node.tag === "i" ? { italics: true } : {}),
        ...(node.tag === "u" ? { underline: {} } : {}),
        ...(["s", "del"].includes(node.tag) ? { strike: true } : {}),
        ...(node.tag === "sup" ? { superScript: true } : {}), ...(node.tag === "sub" ? { subScript: true } : {}),
        ...(node.tag === "mark" ? { highlight: "yellow" } : {}),
        ...(node.tag === "code" || node.tag === "kbd" ? { font: "Courier New" } : {}),
        ...(color(css.color) ? { color: color(css.color) } : {}),
        ...(color(css["background-color"]) ? { shading: { fill: color(css["background-color"]) } } : {}),
        ...(css["font-variant"] === "small-caps" ? { smallCaps: true } : {}),
        ...(css["font-family"] ? { font: css["font-family"].split(",")[0].replace(/["']/g, "") } : {}),
        ...(css["font-size"]?.endsWith("px") ? { size: Math.round(parseFloat(css["font-size"]) * 1.5) } : {}),
      }
      return inline(node.children, next)
    })
  }
  function find(node: ExportNode, tag: string): Exclude<ExportNode, string> | undefined {
    if (typeof node === "string") return
    if (node.tag === tag) return node
    for (const child of node.children) { const result = find(child, tag); if (result) return result }
  }
  function blocks(nodes: ExportNode[], level = 0): (Paragraph | Table)[] {
    const out: (Paragraph | Table)[] = []
    for (const node of nodes) {
      if (typeof node === "string") { if (node.trim()) out.push(new Paragraph({ children: inline([node]) })); continue }
      const cls = classes(node)
      if (cls.includes("quebra-pagina")) { out.push(new Paragraph({ children: [new PageBreak()] })); continue }
      if (cls.includes("quebra-coluna")) { out.push(new Paragraph({ children: [new ColumnBreak()] })); continue }
      if (node.tag === "table") {
        const rows = elements(node.children).flatMap((n) => n.tag === "tr" ? [n] : elements(n.children).filter((r) => r.tag === "tr"))
        if (rows.length) out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rows.map((row) => new TableRow({ children: elements(row.children).filter((c) => ["td", "th"].includes(c.tag)).map((cell) => new TableCell({
          columnSpan: Number(cell.attrs.colspan) || 1, rowSpan: Number(cell.attrs.rowspan) || 1,
          shading: cell.tag === "th" ? { fill: "E9DFC9" } : undefined,
          children: blocks(cell.children).length ? blocks(cell.children) : [new Paragraph("")],
        })) })) }))
        continue
      }
      if (cls.includes("callout") || node.tag === "blockquote") {
        out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [new TableCell({ shading: { fill: "F2EBDD", type: ShadingType.CLEAR }, margins: { top: 140, bottom: 140, left: 160, right: 160 }, children: [...blocks(node.children), new Paragraph("")] })] })] }))
        continue
      }
      if (["ul", "ol"].includes(node.tag)) {
        const ref = `list-${listNumber++}`
        if (node.tag === "ol") numbering.push({ reference: ref, levels: Array.from({ length: 9 }, (_, i) => ({ level: i, format: LevelFormat.DECIMAL, text: `%${i + 1}.`, start: Number(node.attrs.start) || 1, alignment: AlignmentType.START, style: { paragraph: { indent: { left: 360 * (i + 1), hanging: 260 } } } })) })
        for (const item of elements(node.children).filter((n) => n.tag === "li")) {
          out.push(new Paragraph({ children: inline(item.children.filter((n) => typeof n === "string" || !["ul", "ol"].includes(n.tag))), ...(node.tag === "ul" ? { bullet: { level: Math.min(level, 8) } } : { numbering: { reference: ref, level: Math.min(level, 8) } }) }))
          out.push(...blocks(elements(item.children).filter((n) => ["ul", "ol"].includes(n.tag)), level + 1))
        }
        continue
      }
      if (node.tag === "hr") { out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: theme } } })); continue }
      if (/^h[1-6]$/.test(node.tag) || ["p", "pre", "figcaption", "dt", "dd", "summary", "img"].includes(node.tag)) {
        const align = node.attrs.align ?? /text-align:\s*(\w+)/.exec(node.attrs.style ?? "")?.[1]
        out.push(new Paragraph({ heading: /^h[1-6]$/.test(node.tag) ? headings[Number(node.tag[1]) - 1] : undefined,
          alignment: align === "center" ? AlignmentType.CENTER : align === "right" ? AlignmentType.RIGHT : align === "justify" ? AlignmentType.JUSTIFIED : undefined,
          children: inline(node.tag === "img" ? [node] : node.children, node.tag === "pre" ? { font: "Courier New", size: 18 } : {}), spacing: { after: 140 },
        }))
      } else out.push(...blocks(node.children, level))
    }
    return out
  }
  let listNumber = 0
  const numbering: { reference: string; levels: { level: number; format: typeof LevelFormat.DECIMAL; text: string; start: number; alignment: typeof AlignmentType.START; style: { paragraph: { indent: { left: number; hanging: number } } } }[] }[] = []
  const sections: ISectionOptions[] = []
  const properties = (columns = 1) => ({ type: SectionType.CONTINUOUS, column: { count: columns, space: 340 }, page: { size: { width: Math.round(page.width * 1440 / 25.4), height: Math.round(page.height * 1440 / 25.4) }, margin: { top: page.margin * 1440 / 25.4, bottom: page.margin * 1440 / 25.4, left: page.margin * 1440 / 25.4, right: page.margin * 1440 / 25.4 } } })
  let pending: (Paragraph | Table)[] = []
  function flush(columns = 1) { if (pending.length) { sections.push({ properties: properties(columns), children: pending }); pending = [] } }
  function flow(nodes: ExportNode[]) {
    for (const node of nodes) {
      if (typeof node !== "string" && classes(node).includes("md-colunas")) {
        flush()
        pending = blocks(node.children)
        flush(Number(/column-count:\s*(\d)/.exec(node.attrs.style ?? "")?.[1]) || 2)
      } else if (typeof node !== "string" && ["section", "main", "div"].includes(node.tag) && !classes(node).some((c) => ["callout", "quebra-pagina", "quebra-coluna", "katex", "mermaid"].includes(c))) flow(node.children)
      else pending.push(...blocks([node]))
    }
  }
  book.sections.forEach((section, i) => { if (i) pending.push(new Paragraph({ children: [new PageBreak()] })); flow(section.nodes) })
  flush()
  if (!sections.length) sections.push({ properties: properties(), children: [new Paragraph(book.title)] })
  const document = new Document({ title: book.title, creator: book.author, description: "Exportado das notas do Runas-Codex", sections, numbering: { config: numbering }, styles: { default: { document: { run: { font: book.theme === "manual" || book.theme === "pergaminho" ? "EB Garamond" : "Geist", size: 22, language: { value: "pt-BR" } } }, heading1: { run: { color: theme, bold: true, size: 36 } }, heading2: { run: { color: theme, bold: true, size: 28 } } } } })
  return new Uint8Array(await (await Packer.toBlob(document)).arrayBuffer())
}
