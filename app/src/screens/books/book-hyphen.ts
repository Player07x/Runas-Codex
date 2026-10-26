/**
 * Hifenização em português (L5, ADR 0033). O Chromium do Electron não hifeniza (`hyphens: auto` não faz nada no Linux),
 * e o texto justificado ficava com espaços grandes nas colunas. Os hífens suaves (U+00AD) entram só na cópia que vai para
 * o Paged.js; as notas, a prévia ao lado e as exportações EPUB/DOCX não mudam. Os padrões (6 KB) carregam só quando o
 * livro hifeniza.
 */
type Hyphenate = (text: string) => string
let loading: Promise<Hyphenate> | null = null

export function loadHyphenator(): Promise<Hyphenate> {
  loading ??= import("hyphen/pt").then(({ hyphenateSync }) => {
    const cache = new Map<string, string>()
    return (text: string) => {
      let out = cache.get(text)
      if (out === undefined) {
        // Palavras com menos de 6 letras não se partem (fica feio partir “casa” ou “sobre”).
        out = hyphenateSync(text, { hyphenChar: "­", minWordLength: 6 })
        if (cache.size > 20000) cache.clear()
        cache.set(text, out)
      }
      return out
    }
  })
  return loading
}

/** Títulos, código, fórmulas, sumário, capa e as etiquetas das fichas não se partem. */
const SKIP = "h1, h2, h3, h4, h5, h6, pre, code, kbd, .katex, .math, svg, .mermaid, .callout-title, .book-print-toc, .book-print-cover, .ficha-tags, .ficha-stats, .ficha-campo, .ficha-rotulo, .book-chapter-kicker"

export function hyphenateBook(root: HTMLElement, hyphenate: Hyphenate): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (/\p{L}{6}/u.test(node.nodeValue ?? "") && !node.parentElement?.closest(SKIP) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  })
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  for (const node of nodes) node.nodeValue = hyphenate(node.nodeValue ?? "")
}
