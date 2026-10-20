import { strToU8, zipSync, type Zippable } from "fflate"
import { nodeXml, xml, type ExportBook, type ExportNode } from "./book"

const hasTag = (nodes: ExportNode[], tag: string): boolean => nodes.some((n) => typeof n !== "string" && (n.tag === tag || hasTag(n.children, tag)))
/** EPUB 3 sem recursos remotos. O primeiro registro ZIP é mimetype, sem compressão. */
export function generateEpub(book: ExportBook, modified = new Date()): Uint8Array {
  const files: Zippable = { mimetype: [strToU8("application/epub+zip"), { level: 0 }] }
  const page = (title: string, body: string) => `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${xml(book.language)}" lang="${xml(book.language)}"><head><title>${xml(title)}</title><link rel="stylesheet" type="text/css" href="book.css" /></head><body class="book-paper tema-${book.theme}"><main class="book-print">${body}</main></body></html>`
  files["META-INF/container.xml"] = strToU8('<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml" /></rootfiles></container>')
  const manifest: string[] = ['<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>', '<item id="css" href="book.css" media-type="text/css"/>']
  book.sections.forEach((section, i) => {
    const properties = [hasTag(section.nodes, "svg") ? "svg" : "", hasTag(section.nodes, "math") ? "mathml" : ""].filter(Boolean).join(" ")
    manifest.push(`<item id="s${i}" href="section-${i}.xhtml" media-type="application/xhtml+xml"${properties ? ` properties="${properties}"` : ""}/>`)
    files[`EPUB/section-${i}.xhtml`] = strToU8(page(section.title, section.nodes.map(nodeXml).join("").replace(/href="#(book-chapter-\d+)"/g, (_match, id: string) => { const target = book.sections.findIndex(s => s.nodes.some(n => typeof n !== "string" && n.attrs.id === id)); return target < 0 ? `href="#${id}"` : `href="section-${target}.xhtml#${id}"` })))
  })
  book.assets.forEach((asset, i) => {
    if (asset.docxOnly) return
    if (!/^assets\/[a-zA-Z0-9_.-]+$/.test(asset.name)) throw new Error("Nome de recurso inválido.")
    files[`EPUB/${asset.name}`] = asset.bytes
    manifest.push(`<item id="a${i}" href="${xml(asset.name)}" media-type="${xml(asset.mime)}"/>`)
  })
  files["EPUB/nav.xhtml"] = strToU8(page("Sumário", `<nav epub:type="toc" id="toc"><h1>Sumário</h1><ol>${book.sections.map((s, i) => `<li><a href="section-${i}.xhtml">${xml(s.title)}</a></li>`).join("")}</ol></nav>`))
  files["EPUB/book.css"] = strToU8(`${book.css}\n.book-print :is(.md-colunas,.runas-colunas-1,.runas-colunas-2,.runas-colunas-3,.runas-colunas-4) {columns:auto!important;column-count:1!important} .book-print {font-size:1em} img,svg{max-width:100%;height:auto} .book-print-cover{min-height:0!important} .book-print .callout.barra-lateral{max-width:100%} .quebra-pagina{break-after:page}`)
  files["EPUB/package.opf"] = strToU8(`<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">${xml(book.identifier)}</dc:identifier><dc:title>${xml(book.title)}</dc:title><dc:creator>${xml(book.author)}</dc:creator><dc:language>${xml(book.language)}</dc:language><meta property="dcterms:modified">${modified.toISOString().replace(/\.\d{3}Z$/, "Z")}</meta></metadata><manifest>${manifest.join("")}</manifest><spine>${book.sections.map((_, i) => `<itemref idref="s${i}"/>`).join("")}</spine></package>`)
  return zipSync(files, { level: 6 })
}
