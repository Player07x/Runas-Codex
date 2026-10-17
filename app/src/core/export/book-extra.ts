import { strToU8, zipSync, type Zippable } from "fflate"
import { bookExportPlan, nodeXml, xml, type ExportBook, type ExportNode } from "./book"
import { bookProperties } from "../books"
import { parseNote } from "../parse"
import type { IndexedNote, VaultIndex } from "../vault-index"

const base64 = (bytes: Uint8Array) => { let text = ""; for (let i=0;i<bytes.length;i+=8192) text += String.fromCharCode(...bytes.subarray(i,i+8192)); return btoa(text) }
export function generateHtml(book: ExportBook): Uint8Array {
  let body = book.sections.map(s => s.nodes.map(nodeXml).join("")).join("\n"), css = book.css
  for (const asset of book.assets) {
    if (asset.docxOnly) continue
    const data = `data:${asset.mime};base64,${base64(asset.bytes)}`
    body = body.split(`"${asset.name}"`).join(`"${data}"`)
    css = css.split(asset.name).join(data)
  }
  return strToU8(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'"><title>${xml(book.title)}</title><style>${css.replace(/<\/style/gi,"< /style")}</style><body class="book-paper tema-${book.theme}"><main class="book-print">${body}</main></body></html>`)
}
const rtfText = (text: string) => text.split("").map(c => c === "\\" || c === "{" || c === "}" ? "\\"+c : c === "\n" ? "\\line " : c.charCodeAt(0)>127 ? `\\u${c.charCodeAt(0)>32767?c.charCodeAt(0)-65536:c.charCodeAt(0)}?` : c).join("")
export function generateRtf(book: ExportBook): Uint8Array {
  function node(n: ExportNode): string {
    if (typeof n === "string") return rtfText(n)
    const inner = n.children.map(node).join("")
    if (n.tag === "img") {
      const asset = book.assets.find(a => a.name === n.attrs.src)
      if (!asset || !["image/png","image/jpeg"].includes(asset.mime)) return rtfText(`[Imagem: ${n.attrs.alt ?? ""}]`)
      return `{\\pict\\${asset.mime === "image/png"?"pngblip":"jpegblip"}\\picwgoal${Math.min(8000,(asset.width ?? 200)*15)}\\pichgoal${Math.min(10000,(asset.height ?? 150)*15)} ${[...asset.bytes].map(b => b.toString(16).padStart(2,"0")).join("")}}`
    }
    if (n.tag === "svg") return rtfText("[Diagrama disponível no PDF/HTML]")
    if (/^h[1-6]$/.test(n.tag)) return `{\\b\\fs${48-Number(n.tag[1])*4} ${inner}}\\par `
    if (["strong","b"].includes(n.tag)) return `{\\b ${inner}}`
    if (["em","i"].includes(n.tag)) return `{\\i ${inner}}`
    if (n.tag === "u") return `{\\ul ${inner}}`
    if (n.tag === "s" || n.tag === "del") return `{\\strike ${inner}}`
    if (["td","th"].includes(n.tag)) return inner+"\\tab "
    if (["p","div","section","tr","li","blockquote","pre","br"].includes(n.tag)) return inner+"\\par "; return inner
  }
  return strToU8(`{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Georgia;}}\\uc1\\f0\\fs22 ${book.sections.map(s => s.nodes.map(node).join("")).join("\\page ")}}`)
}
/** O arquivo único usa caminhos absolutos dentro do cofre; o ZIP conserva a árvore original e as dependências. */
export function generateMarkdown(index: VaultIndex, book: IndexedNote, draft?: { path: string; text: string }): string {
  const plan = bookExportPlan(index, book, draft)
  return plan.sections.map(s => {
    let body = s.body
    for (const link of parseNote(body).links.reverse()) {
      if (link.inFrontmatter) continue
      const dest = index.resolve(link,s.path).dest
      if (!dest) continue
      const target = dest.replace(/\.md$/i,"") + (link.subpath ?? "")
      const next = link.kind === "wiki" ? `${link.embed?"!":""}[[${target}${link.alias?`|${link.alias}`:""}]]` : `${link.embed?"!":""}[${link.alias ?? ""}](<${dest}${link.subpath ?? ""}>)`
      body = body.slice(0,link.start)+next+body.slice(link.end)
    }
    return `# ${s.title}\n\n${s.kind === "capa" ? String(bookProperties(book).autor ?? "") : body}`
  }).join("\n\n---\n\n")+"\n"
}
export async function generateMarkdownZip(index: VaultIndex, book: IndexedNote, readBinary: (path: string) => Promise<Uint8Array>, draft?: { path: string; text: string }): Promise<Uint8Array> {
  bookExportPlan(index,book,draft)
  const files: Zippable = {}, seen = new Set<string>()
  async function include(path: string) {
    if (seen.has(path)) return
    seen.add(path)
    const note = index.note(path)
    if (!note) { files[path] = await readBinary(path); return }
    const text = draft?.path === path ? draft.text : note.text
    files[path] = strToU8(text)
    for (const link of parseNote(text).links) {
      const dest = index.resolve(link,path).dest
      if (dest) await include(dest)
    }
  }
  await include(book.path)
  files["LEIA-ME.txt"] = strToU8("Livro Markdown: extraia esta pasta e abra como cofre no Obsidian. A árvore original e as notas/anexos ligados foram preservados.\n")
  return zipSync(files)
}
