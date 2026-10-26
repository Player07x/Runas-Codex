import { exportHeadingId } from "../../core/export/documents"
import { bookDecorationCss } from "../../core/books-finish"
import { styleCss } from "../../core/book-style"
import { FONT_FILES } from "./book-fonts"
import { vaultFonts } from "./vault-fonts"
import type { ExportAsset, ExportBook, ExportNode } from "../../core/export/book"
import { bookExportPlan } from "../../core/export/book"
import type { IndexedNote, VaultIndex } from "../../core/vault-index"
import type { Platform } from "../../platform/platform"
import paperCss from "./book-pages.css?raw"
import markdownCss from "../../styles/markdown.css?raw"
import garamond from "@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-normal.woff2?url"
import geist from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url"
import cinzel from "@fontsource/cinzel/files/cinzel-latin-400-normal.woff2?url"

const safeAttrs = new Set(["id", "class", "style", "title", "alt", "width", "height", "colspan", "rowspan", "align", "open", "start", "checked", "type", "role", "aria-label", "xmlns", "viewBox"])
const styles = ["color", "background-color", "font-family", "font-size", "font-variant", "text-align", "column-count"]
const mimeFor = (path: string) => ({ png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", bmp: "image/bmp" })[path.split(".").at(-1)?.toLowerCase() ?? ""]

export async function captureBook(source: HTMLElement, index: VaultIndex, book: IndexedNote, platform: Platform, draft?: { path: string; text: string }): Promise<ExportBook> {
  const plan = bookExportPlan(index, book, draft)
  const sections = Array.from(source.querySelectorAll(":scope > .book-print > section"))
  if (sections.length !== plan.sections.length) throw new Error("O livro mudou durante a preparação. Atualize a prévia e tente novamente.")
  const assets: ExportAsset[] = [], warnings = new Set<string>()
  const imageNames = new Map<string, string>()
  const entries = await platform.listVault()
  const urlPaths = new Map(entries.flatMap((e) => { const url = platform.fileUrl(e.path); return url ? [[new URL(url, location.href).href, e.path]] : [] }))
  async function imageAsset(img: HTMLImageElement): Promise<string> {
    const src = img.currentSrc || img.src
    if (imageNames.has(src)) return imageNames.get(src)!
    let bytes: Uint8Array, mime: string
    const path = urlPaths.get(src)
    if (path) { bytes = await platform.readBinary(path); mime = mimeFor(path) ?? "image/png" }
    else if (src.startsWith("data:image/")) {
      const response = await fetch(src); bytes = new Uint8Array(await response.arrayBuffer()); mime = response.headers.get("content-type")?.split(";")[0] ?? "image/png"
    } else throw new Error(`Não foi possível incluir a imagem local: ${img.alt || src}`)
    // DOCX não suporta WebP/SVG em todos os leitores; rasterização local compartilhada.
    if (!["image/png", "image/jpeg", "image/gif", "image/bmp"].includes(mime)) {
      const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d"); if (!ctx || !canvas.width) throw new Error("Imagem inválida na exportação.")
      ctx.drawImage(img, 0, 0)
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Falha na conversão da imagem.")), "image/png"))
      bytes = new Uint8Array(await blob.arrayBuffer()); mime = "image/png"
    }
    const name = `assets/image-${assets.length}.${mime === "image/jpeg" ? "jpg" : mime.split("/")[1]}`
    assets.push({ name, mime, bytes, width: img.naturalWidth, height: img.naturalHeight }); imageNames.set(src, name)
    return name
  }
  async function capture(node: Node): Promise<ExportNode[]> {
    if (node.nodeType === Node.TEXT_NODE) return [node.textContent ?? ""]
    if (!(node instanceof Element)) return []
    if (["SCRIPT", "STYLE", "BUTTON"].includes(node.tagName)) return []
    if (node.classList.contains("embed-missing")) warnings.add("Há anexos ou imagens externas indisponíveis; o aviso foi preservado no texto.")
    if (node instanceof SVGElement && node.tagName === "svg") {
      // SVG de diagramas precisa conservar namespaces e atributos; já saiu do Mermaid sanitizado.
      const attrs = Object.fromEntries([...node.attributes].filter((a) => !a.name.startsWith("on")).map((a) => [a.name, a.value]))
      attrs.xmlns = "http://www.w3.org/2000/svg"
      const fallback = await svgFallback(node as SVGSVGElement)
      if (fallback) attrs["data-fallback"] = fallback
      else warnings.add("No DOCX, diagramas com rótulos em HTML entram como aviso (no PDF e no EPUB eles saem iguais à prévia).")
      return [{ tag: "svg", attrs, children: await captureSvgChildren(node) }]
    }
    const attrs: Record<string, string> = {}
    for (const attr of node.attributes) if (safeAttrs.has(attr.name) && attr.name !== "style") attrs[attr.name] = attr.value
    if (node instanceof HTMLElement && node.getAttribute("style")) {
      const computed = getComputedStyle(node)
      attrs.style = styles.map((key) => `${key}:${computed.getPropertyValue(key)}`).join(";")
    }
    if (/^H[1-6]$/.test(node.tagName) && node.closest(".md") && !attrs.id) attrs.id = exportHeadingId(node.textContent ?? "")
    if (node instanceof HTMLImageElement) {
      if (!node.complete || !node.naturalWidth) throw new Error(`Imagem não carregada: ${node.alt}`)
      attrs.src = await imageAsset(node)
      attrs.alt ??= "Imagem"
    }
    if (node instanceof HTMLAnchorElement) {
      const href = node.getAttribute("href") ?? ""
      if (/^(https?:|mailto:|#)/.test(href)) attrs.href = href
      // Links que saem do documento conservam o rótulo. Nunca empacotamos caminhos do computador.
      if (node.classList.contains("wikilink")) {
        delete attrs.href
        const path = (node.getAttribute("title") ?? "").replace(/^Em outro espaço: /, "")
        if (index.note(path)) attrs["data-note-path"] = path
        const raw = node.getAttribute("data-href") ?? ""
        const anchor = raw.includes("#") ? raw.slice(raw.indexOf("#") + 1) : ""
        if (anchor && !anchor.startsWith("^")) {
          attrs["data-note-anchor"] = "#" + encodeURIComponent(exportHeadingId(anchor))
          if (raw.startsWith("#")) attrs.href = attrs["data-note-anchor"]
        }
      }
    }
    const tag = node.tagName.toLowerCase()
    return [{ tag: tag === "input" ? "span" : tag, attrs: tag === "input" ? {} : attrs, children: tag === "input" ? [node.hasAttribute("checked") ? "☑" : "☐"] : (await Promise.all([...node.childNodes].map(capture))).flat() }]
  }
  /** PNG do diagrama para o DOCX. Rótulos em HTML (`foreignObject`) "sujam" o canvas e não deixam converter: `null`. */
  async function svgFallback(svg: SVGSVGElement): Promise<string | null> {
    const rect = svg.getBoundingClientRect()
    const width = Math.ceil(rect.width), height = Math.ceil(rect.height)
    if (!width || !height || svg.querySelector("foreignObject")) return null
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }))
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      const canvas = document.createElement("canvas")
      canvas.width = width * 2; canvas.height = height * 2
      const ctx = canvas.getContext("2d")
      if (!ctx) return null
      ctx.scale(2, 2)
      ctx.drawImage(image, 0, 0, width, height)
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Falha na conversão do diagrama.")), "image/png"))
      const name = `assets/diagram-${assets.length}.png`
      assets.push({ name, mime: "image/png", bytes: new Uint8Array(await blob.arrayBuffer()), width, height, docxOnly: true })
      return name
    } catch {
      return null
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  // SVG conserva também os descendentes: a conversão não precisa executar o conteúdo.
  async function svgTree(el: Element): Promise<ExportNode> {
    return { tag: el.localName, attrs: Object.fromEntries([...el.attributes].filter((a) => !a.name.startsWith("on")).map((a) => [a.name, a.value])), children: (await Promise.all([...el.childNodes].map(async (n): Promise<ExportNode | null> => n instanceof Element ? (n.tagName === "script" ? null : svgTree(n)) : n.nodeType === Node.TEXT_NODE ? n.textContent ?? "" : null))).filter((n): n is ExportNode => n !== null) }
  }
  // A função usa a árvore completa em vez de uma captura só das folhas.
  const captureSvgChildren = async (el: Element) => (await Promise.all([...el.childNodes].map(async (n): Promise<ExportNode | null> => n instanceof Element ? svgTree(n) : n.nodeType === Node.TEXT_NODE ? n.textContent ?? "" : null))).filter((n): n is ExportNode => n !== null)
  const rendered = []
  for (let i = 0; i < sections.length; i++) rendered.push({ ...plan.sections[i], nodes: await capture(sections[i]) })
  let css = `${markdownCss}\n${paperCss}\n${bookDecorationCss(book)}`
  for (const [name, family, url] of [["garamond", "EB Garamond Variable", garamond], ["geist", "Geist Variable", geist], ["cinzel", "Cinzel", cinzel]]) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Não foi possível incluir a fonte ${family}.`)
    assets.push({ name: `assets/${name}.woff2`, mime: "font/woff2", bytes: new Uint8Array(await response.arrayBuffer()) })
    css += `\n@font-face{font-family:'${family}';src:url('assets/${name}.woff2') format('woff2');font-weight:100 900}`
  }
  // As fontes escolhidas no Estilo do livro (L3) também vão junto: as do app em 400 e 700, as do cofre como estão.
  if (plan.style) {
    css += `\n${styleCss(plan.style)}`
    // Cinzel, EB Garamond e Geist já foram acima (as variáveis servem como as estáticas): só o nome muda.
    const included: Record<string, string> = { "EB Garamond": "garamond", Geist: "geist", Cinzel: "cinzel" }
    for (const family of new Set([plan.style.titleFont, plan.style.textFont])) {
      if (included[family]) { if (family !== "Cinzel") css += `\n@font-face{font-family:'${family}';src:url('assets/${included[family]}.woff2') format('woff2');font-weight:100 900}`; continue }
      const own = vaultFonts(index).find((f) => f.name === family)
      const files: [string, string, string][] = own ? [["normal", own.path, ""]] : (FONT_FILES[family] ?? []).map(([weight, url]) => [String(weight), "", url])
      for (const [weight, path, url] of files) {
        const ext = path ? path.split(".").at(-1)!.toLowerCase() : "woff2"
        const bytes = path ? await platform.readBinary(path) : new Uint8Array(await (await fetch(url)).arrayBuffer())
        const name = `assets/font-${assets.length}.${ext}`
        assets.push({ name, mime: ext === "ttf" ? "font/ttf" : ext === "otf" ? "font/otf" : `font/${ext}`, bytes })
        css += `\n@font-face{font-family:'${family}';src:url('${name}');font-weight:${weight}}`
      }
    }
  }
  return { ...plan, sections: rendered, assets, css, warnings: [...warnings] }
}
