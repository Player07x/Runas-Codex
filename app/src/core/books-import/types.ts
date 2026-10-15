export interface ImportedChapter { title: string; markdown: string }
export interface ImportedImage { id: string; name: string; bytes: Uint8Array }
export interface ImportedBook {
  title: string
  chapters: ImportedChapter[]
  images: ImportedImage[]
  warnings: string[]
}
export interface ImportOptions { headingLevel: number; title: string }
export const PAGE_BREAK = '<div class="quebra-pagina"></div>'
export const COLUMN_BREAK = '<div class="quebra-coluna"></div>'

/** Mantém exemplos de código literalmente, inclusive comandos que parecem formatadores. */
export function protectCode(source: string) {
  const saved: string[] = []
  const text = source.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[ \t]*$|(`+)[^\n]*?\2/gm, (value) => {
    saved.push(value)
    return `\uE000${saved.length - 1}\uE001`
  })
  return { text, restore: (value: string) => value.replace(/\uE000(\d+)\uE001/g, (original, n: string) => saved[Number(n)] ?? original) }
}

export function splitChapters(source: string, options: ImportOptions): ImportedChapter[] {
  const code = protectCode(source)
  const chapters: ImportedChapter[] = []
  let title = options.title, lines: string[] = []
  const flush = () => {
    const markdown = code.restore(lines.join("\n").trim())
    if (markdown) chapters.push({ title, markdown })
    lines = []
  }
  for (const line of code.text.split("\n")) {
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (heading && heading[1].length === options.headingLevel) {
      flush()
      title = heading[2].replace(/[*_`]/g, "").trim() || options.title
    }
    lines.push(line)
  }
  flush()
  return chapters
}
