import { nameProblem } from "./names"
import { basename, dirname, extname, foldName, joinPath, relativePath } from "./text"
import type { VaultIndex } from "./vault-index"

/**
 * Anexos (imagens, PDFs, áudio) como o Obsidian grava: na pasta de anexos de `.obsidian/app.json`, com nome que não
 * repete (`mapa.png`, `mapa 1.png`…). Os links seguem o formato de link novo da mesma configuração.
 */
export interface AppConfig {
  /** `attachmentFolderPath`: `/` (raiz), `./` (pasta da nota), `./sub` (subpasta da nota) ou uma pasta do cofre. */
  attachmentFolder: string
  newLinkFormat: "shortest" | "relative" | "absolute"
  useMarkdownLinks: boolean
}

/** Lê o `app.json` do Obsidian (valores ausentes ou inválidos = padrões do Obsidian). */
export function appConfig(json: Record<string, unknown>): AppConfig {
  const format = json.newLinkFormat
  return {
    attachmentFolder: typeof json.attachmentFolderPath === "string" ? json.attachmentFolderPath.trim() : "/",
    newLinkFormat: format === "relative" || format === "absolute" ? format : "shortest",
    useMarkdownLinks: json.useMarkdownLinks === true,
  }
}

/** Pasta (relativa ao cofre, `""` = raiz) onde entra um anexo novo da nota `notePath`; `null` se sai do cofre. */
export function attachmentFolder(setting: string, notePath?: string): string | null {
  const value = setting.trim()
  if (!value || value === "/") return ""
  if (value === "." || value.startsWith("./")) return joinPath(dirname(notePath ?? ""), value.slice(2))
  return joinPath(value)
}

const FORBIDDEN = /[[\]#^|\\/:*?"<>\u0000-\u001f]/g

/** Nome de arquivo que vale no cofre (sem os caracteres que quebram links ou o Windows); extensão em minúsculas. */
export function cleanAttachmentName(name: string): string {
  const file = basename(name.replace(/\\/g, "/"))
  // `.png` sozinho é só extensão (no disco seria um arquivo oculto sem nome).
  const ext = extname(file) || (/^\.[^.]+$/.test(file) ? file.toLowerCase() : "")
  const stem = (ext ? file.slice(0, -ext.length) : file).replace(FORBIDDEN, "-").replace(/\s+/g, " ").replace(/^[.\s]+|[.\s]+$/g, "")
  const cleanExt = ext.replace(FORBIDDEN, "")
  const candidate = `${stem}${cleanExt}`
  return stem && !nameProblem(candidate) ? candidate : `anexo${cleanExt}`
}

/**
 * Caminho de um anexo novo: a pasta de anexos da configuração (relativa a `nearNote` quando é `./`) e o nome limpo e
 * livre. Recusa pasta fora do cofre ou com nome que o app não grava (oculta, por exemplo).
 */
export function attachmentPath(setting: string, fileName: string, existing: Iterable<string>, nearNote?: string): string {
  const folder = attachmentFolder(setting, nearNote)
  if (folder === null) throw new Error(`A pasta de anexos do Obsidian (“${setting}”) fica fora do cofre.`)
  for (const part of folder ? folder.split("/") : []) {
    const problem = nameProblem(part)
    if (problem) throw new Error(`Pasta de anexos “${folder}”: ${problem}`)
  }
  return availableAttachmentPath(folder, cleanAttachmentName(fileName), existing)
}

/** Caminho livre para `fileName` em `folder`: o próprio nome, ou `nome 1.ext`, `nome 2.ext`… (sem diferenciar maiúsculas). */
export function availableAttachmentPath(folder: string, fileName: string, existing: Iterable<string>): string {
  const taken = new Set([...existing].map(foldName))
  const ext = extname(fileName)
  const stem = ext ? fileName.slice(0, -ext.length) : fileName
  for (let n = 0; ; n++) {
    const path = joinPath(folder, n === 0 ? fileName : `${stem} ${n}${ext}`)!
    if (!taken.has(foldName(path))) return path
  }
}

const IMAGE_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
  "image/bmp": ".bmp",
}

/** Extensão de uma imagem pelo tipo (`image/png` → `.png`); `null` se o app não mostra esse formato. */
export function imageExtension(mime: string): string | null {
  return IMAGE_TYPES[mime.toLowerCase()] ?? null
}

const pad = (n: number) => String(n).padStart(2, "0")

/** Nome da imagem colada, como o Obsidian faz, em português: `Imagem colada 20261014153012.png`. */
export function pastedImageName(date: Date, extension: string): string {
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `Imagem colada ${stamp}${extension}`
}

/** Destino de link Markdown: espaços e parênteses codificados (`Imagem%20colada.png`), como o Obsidian grava. */
function markdownDestination(target: string): string {
  return target.replace(/%/g, "%25").replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29")
}

/**
 * Texto do embed de um anexo novo na nota, no formato de link do `app.json`: `![[mapa.png]]` (wikilink) ou
 * `![](mapa.png)` (links em Markdown). "Mais curto" usa o nome quando ele é único; "relativo" vale para links em
 * Markdown (wikilinks relativos não existem no Obsidian, então caem no mais curto).
 */
export function attachmentEmbed(path: string, notePath: string, app: AppConfig, index: Pick<VaultIndex, "linkTarget">): string {
  const target = app.newLinkFormat === "absolute" ? path : app.newLinkFormat === "relative" && app.useMarkdownLinks ? relativePath(dirname(notePath), path) : index.linkTarget(path, notePath)
  return app.useMarkdownLinks ? `![](${markdownDestination(target)})` : `![[${target}]]`
}

/** Descrição da pasta de anexos para a tela de Configurações. */
export function attachmentFolderLabel(setting: string): string {
  const value = setting.trim()
  if (!value || value === "/") return "Raiz do cofre"
  if (value === "." || value === "./") return "Mesma pasta da nota"
  if (value.startsWith("./")) return `Subpasta “${value.slice(2)}” da nota`
  return `Pasta “${value.replace(/^\/+|\/+$/g, "")}”`
}

/** O que o leitor mostra dentro da nota (e por isso conta como anexo). */
export const ATTACHMENT_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".bmp", ".mp3", ".wav", ".ogg", ".m4a", ".flac", ".opus", ".3gp", ".mp4", ".webm", ".ogv", ".mov", ".mkv", ".pdf"])

/**
 * Anexos que nenhuma nota nem quadro usa. Conservador: além dos links resolvidos, basta o nome do arquivo aparecer em
 * algum texto (propriedade, bloco desenhado como `runas-mapa`, HTML, quadro `.canvas`) para o anexo não entrar na lista.
 */
export function unusedAttachments(index: VaultIndex, otherTexts: string[] = []): string[] {
  const candidates = index.allFiles().map((f) => f.path).filter((path) => ATTACHMENT_EXTENSIONS.has(extname(path)) && index.backlinks(path).length === 0)
  if (!candidates.length) return []
  const texts = [...index.allNotes().map((note) => note.text), ...otherTexts].map(foldName)
  return candidates
    .filter((path) => {
      const name = foldName(basename(path))
      const encoded = name.replace(/ /g, "%20")
      return !texts.some((text) => text.includes(name) || text.includes(encoded))
    })
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
}
