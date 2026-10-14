/**
 * Formato de um arquivo de texto do cofre. O app nunca muda o formato de quem já existe: CRLF continua CRLF, BOM
 * continua BOM, e um arquivo que não mudou não é regravado (docs/02, seção 5).
 */
export interface TextFormat {
  bom: boolean
  eol: "\n" | "\r\n"
}

export function detectFormat(text: string): TextFormat {
  const crlf = text.match(/\r\n/g)?.length ?? 0
  const lf = (text.match(/\n/g)?.length ?? 0) - crlf
  return { bom: text.startsWith("﻿"), eol: crlf > lf ? "\r\n" : "\n" }
}

/** Texto para o editor e o leitor: sem BOM e com `\n`. */
export function toEditorText(text: string): string {
  return text.replace(/^﻿/, "").replace(/\r\n?/g, "\n")
}

/** Volta do editor para o formato original do arquivo. */
export function fromEditorText(content: string, format: TextFormat): string {
  const body = format.eol === "\r\n" ? content.replace(/\r?\n/g, "\r\n") : content
  return format.bom ? `﻿${body}` : body
}

/**
 * O que gravar depois de editar no editor: `null` quando o conteúdo é o mesmo (o arquivo não é tocado, nem a data
 * dele). Arquivos com quebras de linha misturadas passam a usar a mais comum só quando o texto muda de fato.
 */
export function textToSave(original: string, editorContent: string): string | null {
  if (toEditorText(original) === editorContent) return null
  return fromEditorText(editorContent, detectFormat(original))
}

/** Compara nomes como o Obsidian: Unicode NFC e sem diferenciar maiúsculas. */
export function foldName(name: string): string {
  return name.normalize("NFC").toLocaleLowerCase("pt-BR")
}

export function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1)
}

/** Nome sem a extensão `.md` (como aparece nos links). */
export function noteName(path: string): string {
  return basename(path).replace(/\.md$/i, "")
}

export function dirname(path: string): string {
  const i = path.lastIndexOf("/")
  return i < 0 ? "" : path.slice(0, i)
}

export function extname(path: string): string {
  const name = basename(path)
  const i = name.lastIndexOf(".")
  return i <= 0 ? "" : name.slice(i).toLowerCase()
}

/** Junta e normaliza um caminho do cofre (`a/./b/../c` → `a/c`); `null` se sair da raiz. */
export function joinPath(...parts: string[]): string | null {
  const out: string[] = []
  for (const segment of parts.join("/").split("/")) {
    if (!segment || segment === ".") continue
    if (segment === "..") {
      if (!out.length) return null
      out.pop()
    } else out.push(segment)
  }
  return out.join("/")
}

/** Caminho relativo de `fromFolder` até `to` (os dois relativos à raiz do cofre). */
export function relativePath(fromFolder: string, to: string): string {
  const from = fromFolder ? fromFolder.split("/") : []
  const target = to.split("/")
  let common = 0
  while (common < from.length && common < target.length - 1 && from[common] === target[common]) common++
  return [...Array(from.length - common).fill(".."), ...target.slice(common)].join("/")
}
