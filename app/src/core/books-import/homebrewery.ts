import { sanitizeMarkdown } from "./html"
import { COLUMN_BREAK, PAGE_BREAK, protectCode, splitChapters, type ImportedBook, type ImportOptions } from "./types"

const boxes: Record<string, string> = {
  note: "nota", nota: "nota", descriptive: "descritivo", descritivo: "descritivo",
  monster: "statblock", statblock: "statblock", wide: "largo", largo: "largo",
  sidebar: "barra-lateral", warning: "aviso", aviso: "aviso", columns: "colunas",
}

/** Homebrewery v3 e GM Binder: converte contêineres aninhados sem interpretar exemplos de código. */
export function importHomebrewery(source: string, options: ImportOptions): ImportedBook {
  const warnings = new Set<string>()
  const code = protectCode(source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n"))
  const callout = (type: string, body: string) => {
    // O marcador de código ocupa uma linha só; prefixar o texto protegido antes
    // de montar o callout faz o `>` chegar também às linhas internas do fenced block.
    const prepared = code.prefixLines(body, "> ")
    return `\n\n> [!${type}]\n${prepared.trim().split("\n").map((line) => `> ${line}`).join("\n")}\n\n`
  }
  const convert = (input: string, nesting = 0): string => {
    if (nesting >= 64) { warnings.add("Blocos com mais de 64 níveis foram mantidos como texto."); return input }
    let output = "", cursor = 0
    while (cursor < input.length) {
      const start = input.indexOf("{{", cursor)
      if (start < 0) return output + input.slice(cursor)
      output += input.slice(cursor, start)
      let depth = 1, end = start + 2
      while (end < input.length && depth) {
        if (input.slice(end, end + 2) === "{{") { depth++; end += 2 }
        else if (input.slice(end, end + 2) === "}}") { depth--; if (depth) end += 2 }
        else end++
      }
      if (depth) { warnings.add("Um bloco {{…}} não foi fechado e foi mantido como texto."); return output + input.slice(start) }
      const content = input.slice(start + 2, end)
      const header = /^([^\s]+)[ \t]*(?:\n|[ \t])?([\s\S]*)$/.exec(content)
      if (!header) { cursor = end + 2; continue }
      const names = header[1].toLowerCase().split(",")
      let body = convert(header[2], nesting + 1)
      const types = names.flatMap((name) => boxes[name] ? [boxes[name]] : [])
      if (!types.length) warnings.add(`Bloco “${header[1]}” convertido em texto comum.`)
      if (names.some((name) => !boxes[name] && name !== "frame")) warnings.add(`Opções de “${header[1]}” sem equivalente foram removidas.`)
      for (const type of [...new Set(types)].reverse()) body = callout(type, body)
      output += body
      cursor = end + 2
    }
    return output
  }
  let markdown = convert(code.text)
  // GM Binder e Homebrewery legado usam divs em linhas próprias em vez de {{…}}.
  const wrappers: (string | undefined)[] = []
  markdown = markdown.split("\n").map((line) => {
    const open = /^\s*<div\b[^>]*class=["']([^"']*)["'][^>]*>\s*$/i.exec(line)
    if (open) {
      const type = open[1].split(/\s+/).map((name) => boxes[name.toLowerCase()]).find(Boolean)
      wrappers.push(type)
      if (!type) warnings.add(`Contêiner “${open[1]}” convertido em texto comum.`)
      return (wrappers.slice(0, -1).filter(Boolean).map(() => "> ").join("")) + (type ? `> [!${type}]` : "")
    }
    if (/^\s*<\/div>\s*$/i.test(line) && wrappers.length) { wrappers.pop(); return "" }
    const prefix = wrappers.filter(Boolean).map(() => "> ").join("")
    return prefix + code.prefixLines(line, prefix)
  }).join("\n")
  if (wrappers.length) warnings.add("Um contêiner HTML não foi fechado; confira o último capítulo.")
  // Cada página que contém uma quebra de coluna ganha seu contêiner, preservando callouts internos.
  const pages = markdown.split(/^\s*\\page(?:break)?\s*$/gm)
  markdown = pages.map((page) => {
    const converted = page.replace(/^[ \t]*\\column(?:break)?[ \t]*$/gm, `\n\n${COLUMN_BREAK}\n\n`)
    const heading = /^(\s*#{1,6}[^\n]*\n)/.exec(converted)?.[1] ?? ""
    return converted.includes(COLUMN_BREAK) ? heading + callout("colunas", converted.slice(heading.length)) : converted
  }).join(`\n\n${PAGE_BREAK}\n\n`)
  markdown = sanitizeMarkdown(markdown, warnings)
  markdown = code.restore(markdown)
  const chapters = splitChapters(markdown, options)
  if (!chapters.length) throw new Error("O arquivo não contém texto para importar.")
  return { title: options.title, chapters, images: [], warnings: [...warnings] }
}
