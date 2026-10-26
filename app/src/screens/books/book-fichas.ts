import { fichaKind, splitFicha, type FichaField } from "../../core/fichas"

const isTag = (node: Node | null, tag: string): node is HTMLElement => node instanceof HTMLElement && node.tagName === tag
const isLabel = (node: Node | null): node is HTMLElement => isTag(node, "STRONG") && /:\s*$/.test(node.textContent ?? "")

/** Parágrafo que é só uma imagem (com a legenda, se houver). */
function isImageOnly(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement) || !["P", "FIGURE"].includes(el.tagName) || !el.querySelector("img")) return false
  const copy = el.cloneNode(true) as HTMLElement
  for (const caption of copy.querySelectorAll("figcaption, .md-legenda")) caption.remove()
  return !copy.textContent?.trim()
}

/** Rótulo no meio do texto da ficha: “**Ampliação:**”, “**Truque**:” ou “*<u>Ampliação:</u>*”, curto. */
function textLabel(node: Element): boolean {
  const text = node.textContent ?? ""
  if (text.length > 30 || !text.trim()) return false
  if (/:\s*$/.test(text)) return true
  const after = node.nextSibling
  return node.tagName === "STRONG" && after?.nodeType === Node.TEXT_NODE && /^\s*:/.test(after.textContent ?? "")
}

/** Lê `**Rótulo:** valor · **Outro:** valor` (com quebras de linha entre eles); `null` se o parágrafo não é só isso. */
function readFields(p: Element): FichaField[] | null {
  const fields: FichaField[] = []
  for (const node of p.childNodes) {
    if (isLabel(node)) { fields.push({ label: (node.textContent ?? "").replace(/:\s*$/, ""), value: "" }); continue }
    const text = isTag(node, "BR") ? " " : node.textContent ?? ""
    if (!fields.length) { if (text.trim()) return null; continue }
    fields[fields.length - 1]!.value += text
  }
  return fields.length ? fields : null
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  el.className = className
  el.append(...children)
  return el
}

/**
 * Fichas no papel (L5, ADR 0033), só na cópia que vai para o Paged.js: os callouts `[!magia]`, `[!runa]`… ganham a
 * classe da ficha; a primeira linha de campos vira “1 PV · Feitiço · Área” (rótulos óbvios somem, campo vazio não sai) e,
 * na criatura, a linha de atributos; no texto, “**Ampliação:**” vira “Ampliação.” em versalete.
 */
export function layoutFichas(root: HTMLElement): void {
  for (const callout of root.querySelectorAll<HTMLElement>(".book-print .callout[data-callout]")) {
    const kind = fichaKind(callout.dataset.callout ?? "")
    if (!kind) continue
    callout.classList.add("ficha", `ficha-${kind}`)
    const body = callout.querySelector(":scope > .callout-body")
    if (!body) continue
    // A imagem logo depois da ficha (fora do `>`, como no formato antigo) é a arte dela: entra na ficha.
    for (let next = callout.nextElementSibling; isImageOnly(next); next = callout.nextElementSibling) body.append(next)
    const first = body.querySelector(":scope > p")
    const fields = first ? readFields(first) : null
    if (first && fields) {
      const split = splitFicha(kind, fields)
      const parts: HTMLElement[] = []
      if (split.tags.length) parts.push(element("p", "ficha-tags", split.tags.flatMap((tag, i) => [...(i ? [" · "] : []), tag])))
      if (split.stats.length) parts.push(element("div", "ficha-stats", split.stats.map((stat) => element("span", "", [element("small", "", [stat.label]), stat.value]))))
      if (split.fields.length) parts.push(element("p", "ficha-campos", split.fields.map((field) => element("span", "ficha-campo", [element("b", "", [field.label]), ` ${field.value}`]))))
      first.replaceWith(...parts)
    }
    for (const strong of [...body.querySelectorAll("p strong, p u")]) {
      if (strong.closest(".ficha-tags, .ficha-campos, .ficha-stats") || !textLabel(strong)) continue
      // “**Truque**:”: os dois-pontos ficam fora do negrito.
      const colon = strong.nextSibling
      if (!/:\s*$/.test(strong.textContent ?? "") && colon?.nodeType === Node.TEXT_NODE) colon.textContent = (colon.textContent ?? "").replace(/^\s*:/, "")
      let next = strong.nextSibling, content = ""
      while (next && !isTag(next, "BR")) { content += next.textContent ?? ""; next = next.nextSibling }
      if (!content.trim()) {
        // Campo vazio (“**Material:**” sem nada) não sai, nem a quebra de linha dele.
        const before = strong.previousSibling
        if (isTag(before, "BR")) before.remove()
        else if (isTag(next, "BR")) next.remove()
        const p = strong.parentElement
        strong.remove()
        if (p && !p.textContent?.trim() && !p.querySelector("img, svg")) p.remove()
        continue
      }
      strong.textContent = (strong.textContent ?? "").replace(/:?\s*$/, ".")
      strong.classList.add("ficha-rotulo")
    }
  }
}
