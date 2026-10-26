import { tocHtml, type TocEntry } from "../../core/book-layout"

/**
 * Letra capitular no primeiro parágrafo de cada capítulo, se ele tiver ao menos três linhas de texto: num parágrafo de
 * uma linha a letra fica maior que ele e, nas colunas equilibradas, escapa para a coluna ao lado.
 */
export function markDropCaps(root: HTMLElement): void {
  for (const first of root.querySelectorAll(".book-print > .book-chapter > .md > p:first-of-type")) {
    if ((first.textContent ?? "").trim().length >= 160) first.classList.add("book-capitular")
  }
}

/**
 * Sumário do livro (L4): montado na cópia que vai para o Paged.js, depois da capa e dos créditos, a partir dos títulos
 * que o leitor desenhou. Partes, capítulos, apêndices e, dentro deles, os títulos `##`; seções do livro ficam recuadas.
 * O número da página vem do `target-counter` das regras de página, e o link leva ao lugar no PDF.
 */
export function insertToc(root: HTMLElement): void {
  const print = root.querySelector<HTMLElement>(":scope > .book-print")
  if (!print) return
  let next = 0
  const target = (el: Element) => {
    if (!el.id || root.querySelectorAll(`[id="${CSS.escape(el.id)}"]`).length > 1) el.id = `book-toc-${next++}`
    return el.id
  }
  const entries: TocEntry[] = []
  for (const section of print.querySelectorAll<HTMLElement>(":scope > section[data-book-chapter]")) {
    const kind = section.dataset.bookKind ?? "secao"
    const heading = section.querySelector(".book-chapter-heading") ?? section.querySelector(".md :is(h1, h2)")
    if (!heading?.textContent?.trim()) continue
    const label = section.querySelector<HTMLElement>(".book-chapter-kicker")?.dataset.toc || null
    entries.push({ id: target(heading), title: heading.textContent.trim(), level: kind === "parte" ? 0 : kind === "secao" ? 2 : 1, label })
    if (kind === "secao" || kind === "parte") continue
    // Os `##` do capítulo (fora de caixas e notas incorporadas) também entram, um nível abaixo.
    for (const sub of section.querySelectorAll(".md h2")) {
      if (sub === heading || sub.closest(".callout, .embed-note, blockquote") || !sub.textContent?.trim()) continue
      entries.push({ id: target(sub), title: sub.textContent.trim(), level: 2 })
    }
  }
  if (!entries.length) return
  const nav = document.createElement("nav")
  nav.className = "book-print-toc"
  nav.setAttribute("aria-label", "Sumário")
  nav.innerHTML = tocHtml(entries)
  const after = print.querySelector(":scope > .book-print-credits") ?? print.querySelector(":scope > .book-print-cover")
  if (after) after.after(nav)
  else print.prepend(nav)
}
