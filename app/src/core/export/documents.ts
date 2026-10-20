import { zipSync, strToU8, type Zippable } from "fflate"
import { findCodeBlocks } from "../codeblocks"
import { parseMap } from "../wiki"
import { VaultIndex as Index } from "../vault-index"
import { publicWikiIndex } from "../wiki-public"
import type { VaultIndex } from "../vault-index"
import { nodeXml, xml, type ExportBook, type ExportNode } from "./book"

/** Fecha a seleção por links só quando solicitado, usando a projeção pública antes de seguir qualquer ligação. */
export function documentPaths(index: VaultIndex, paths: string[], linked: boolean, players: boolean): string[] {
  const source = players ? publicWikiIndex(index) : index
  const wanted = new Set<string>(), queue = [...new Set(paths)]
  while (queue.length) {
    const path = queue.shift()!
    if (wanted.has(path) || !source.note(path)) continue
    wanted.add(path)
    if (wanted.size > 200) throw new Error("Selecione até 200 notas por documento ou site.")
    if (linked) for (const link of source.outgoing(path)) if (link.dest && source.note(link.dest)) queue.push(link.dest)
  }
  return [...wanted]
}

/** IDs nativos para os links de títulos funcionarem também fora do aplicativo. */
export const exportHeadingId = (text: string): string => text.normalize("NFC").trim().toLocaleLowerCase("pt-BR").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-|-$/g, "") || "secao"

/** Páginas sem JavaScript, com nomes gerados (nenhum caminho de nota vira um caminho do ZIP). */
export function generateStaticSite(book: ExportBook): Uint8Array {
  const sections = book.sections.filter(section => !["capa", "creditos", "contracapa"].includes(section.kind))
  const pages = new Map(sections.map((section, i) => [section.path, `nota-${i + 1}.html`]))
  const files: Zippable = {}
  const page = (title: string, body: string, root = false) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${xml(title)}</title><link rel="stylesheet" href="${root ? "" : "../"}book.css"></head><body class="book-paper tema-${book.theme}"><main class="book-print offline-site">${body}</main></body></html>`
  function rewrite(node: ExportNode): ExportNode {
    if (typeof node === "string") return node
    const attrs = { ...node.attrs }
    if (node.tag === "a" && (attrs.class ?? "").split(/\s+/).includes("wikilink")) {
      const target = pages.get(attrs["data-note-path"] ?? (attrs.title ?? "").replace(/^Em outro espaço: /, ""))
      if (target) attrs.href = target + (attrs["data-note-anchor"] ?? "")
      else if (!attrs.href?.startsWith("#")) delete attrs.href
    }
    delete attrs["data-note-path"]; delete attrs["data-note-anchor"]
    if (node.tag === "img" && attrs.src?.startsWith("assets/")) attrs.src = "../" + attrs.src
    return { ...node, attrs, children: node.children.map(rewrite) }
  }
  files["index.html"] = strToU8(page(book.title, `<h1>${xml(book.title)}</h1><nav aria-label="Notas"><ul>${sections.map(s => `<li><a href="notas/${pages.get(s.path)}">${xml(s.title)}</a></li>`).join("")}</ul></nav>`, true))
  sections.forEach((section, i) => {
    const previous = sections[i - 1], next = sections[i + 1]
    const nav = `<nav aria-label="Navegação"><a href="../index.html">Índice</a>${previous ? ` · <a rel="prev" href="${pages.get(previous.path)}">Anterior</a>` : ""}${next ? ` · <a rel="next" href="${pages.get(next.path)}">Próxima</a>` : ""}</nav>`
    files[`notas/${pages.get(section.path)}`] = strToU8(page(section.title, nav + `<article>${section.nodes.map(n => nodeXml(rewrite(n))).join("")}</article>` + nav))
  })
  let css = book.css
  for (const asset of book.assets.filter(asset => asset.mime.startsWith("font/"))) {
    let binary = ""
    for (let offset = 0; offset < asset.bytes.length; offset += 8192) binary += String.fromCharCode(...asset.bytes.subarray(offset, offset + 8192))
    css = css.split(asset.name).join(`data:${asset.mime};base64,${btoa(binary)}`)
  }
  files["book.css"] = strToU8(css + "\n.offline-site{max-width:960px;margin:auto;padding:24px}.offline-site nav{margin:16px 0}.offline-site a{overflow-wrap:anywhere}.offline-site img{max-width:100%;height:auto}")
  for (const asset of book.assets) if (!asset.docxOnly) {
    if (!/^assets\/[\w.-]+$/.test(asset.name)) throw new Error("Caminho de recurso inválido no site.")
    files[asset.name] = asset.bytes
  }
  files["LEIA-ME.txt"] = strToU8("Extraia todo o ZIP e abra index.html no navegador. O site funciona sem internet e sem JavaScript. Mapas são imagem e lista de locais; controles interativos não fazem parte da exportação.\n" + book.warnings.join("\n"))
  return zipSync(files)
}

/** Mapas de documentos são uma imagem e uma lista legível, sem controles ou camadas secretas. */
export function staticDocumentIndex(index: VaultIndex, players: boolean): VaultIndex {
  const source = players ? publicWikiIndex(index) : index
  const texts: Record<string, string> = {}
  for (const note of source.allNotes()) {
    let text = note.text
    const replace = (start: number, end: number, content: string) => {
      const opening = text.lastIndexOf("\n", start - 2) + 1
      const closingStart = text.indexOf("\n", end)
      const closingEnd = text.indexOf("\n", closingStart + 1)
      return text.slice(0, opening) + content + "\n" + (closingEnd < 0 ? "" : text.slice(closingEnd + 1))
    }
    for (const block of findCodeBlocks(text, "runas-mapa").reverse()) {
      try {
        const spec = parseMap(block.content)
        const pins = spec.pins.filter(pin => !players || (!pin.secret && !/segredo|secret/i.test(pin.layer ?? "")))
        const content = ["**Mapa**", `![[${spec.image}]]`, ...pins.map(pin => `- ${pin.note ? `[[${pin.note.replace(/^\[\[|\]\]$/g, "")}]]` : (pin.label ?? "Local")}${pin.label && pin.note ? ` — ${pin.label}` : ""}`)].join("\n\n")
        text = replace(block.contentStart, block.contentEnd, content)
      } catch { text = replace(block.contentStart, block.contentEnd, "_Mapa indisponível: confira sua configuração no aplicativo._") }
    }
    texts[note.path] = text
  }
  return new Index(source.allFiles(), texts)
}
