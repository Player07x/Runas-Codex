/**
 * Sumário em árvore dos Livros. A `estrutura` do livro continua uma lista reta de links (o Obsidian abre igual); o
 * nível vem do `tipo` de cada nota: uma seção pertence ao último capítulo acima dela, e a Parte é um título de grupo
 * (como na diagramação, `book-toc.ts`). Aqui só há contas puras sobre a lista; quem grava é o `useVault()`.
 */

export interface OutlineRow {
  /** Posição na `estrutura`. */
  index: number
  /** 1 = capítulo, parte ou índice; 2 = seção dentro de um capítulo. */
  level: 1 | 2
  /** Posição do capítulo dono (só seções). */
  parent: number | null
  /** Seções do capítulo, em ordem. */
  children: number[]
  kind: string
}

export function bookOutline(kinds: readonly string[]): OutlineRow[] {
  const rows: OutlineRow[] = []
  let chapter: number | null = null
  kinds.forEach((kind, index) => {
    if (kind === "secao" && chapter !== null) {
      rows.push({ index, level: 2, parent: chapter, children: [], kind })
      rows[chapter]!.children.push(index)
      return
    }
    rows.push({ index, level: 1, parent: null, children: [], kind })
    chapter = kind === "capitulo" ? index : null
  })
  return rows
}

/** O bloco que anda junto: o capítulo com as seções dele, ou só a linha. Intervalo [início, fim). */
export function blockOf(rows: readonly OutlineRow[], index: number): [number, number] {
  const row = rows[index]
  if (!row) return [index, index]
  return [index, row.children.length ? row.children[row.children.length - 1]! + 1 : index + 1]
}

/** Move o intervalo [from, to) para antes da posição `before` (contada na lista original). */
export function moveRange<T>(items: readonly T[], [from, to]: [number, number], before: number): T[] {
  if (before >= from && before <= to) return [...items]
  const block = items.slice(from, to)
  const rest = [...items.slice(0, from), ...items.slice(to)]
  const at = before > to ? before - (to - from) : before
  rest.splice(at, 0, ...block)
  return rest
}

/**
 * Alt+↑ / Alt+↓. Um capítulo (com as seções) troca de lugar com o bloco vizinho do mesmo nível; uma seção anda uma
 * linha e, ao passar por um capítulo, passa a ser seção dele. Devolve a nova ordem de posições, ou `null` se não anda.
 */
export function moveInOutline(rows: readonly OutlineRow[], index: number, direction: -1 | 1): number[] | null {
  const row = rows[index]
  if (!row) return null
  const order = rows.map((r) => r.index)
  if (row.level === 2) {
    // A seção desce para dentro do próximo capítulo (como primeira seção) ou sobe para o fim do anterior.
    const target = index + direction
    if (target < 0 || target >= rows.length) return null
    const next = [...order]
    next.splice(index, 1)
    next.splice(target, 0, index)
    return next
  }
  const [from, to] = blockOf(rows, index)
  if (direction < 0) {
    // Bloco anterior: sobe pelas linhas até achar uma de nível 1.
    let start = from - 1
    while (start >= 0 && rows[start]!.level === 2) start--
    if (start < 0) return null
    return moveRange(order, [from, to], start)
  }
  if (to >= rows.length) return null
  const [, nextEnd] = blockOf(rows, to)
  return moveRange(order, [from, to], nextEnd)
}

/** Alt+→: um capítulo vira seção do capítulo de cima (precisa haver um). */
export function canIndent(rows: readonly OutlineRow[], index: number): boolean {
  const row = rows[index]
  if (!row || row.level !== 1 || row.kind !== "capitulo") return false
  let above = index - 1
  while (above >= 0 && rows[above]!.level === 2) above--
  return above >= 0 && rows[above]!.kind === "capitulo"
}

/** Alt+←: uma seção vira capítulo (as seções abaixo dela, no mesmo capítulo, passam a ser dela). */
export const canOutdent = (rows: readonly OutlineRow[], index: number) => rows[index]?.level === 2

/** Linhas visíveis com os capítulos fechados. */
export function visibleRows(rows: readonly OutlineRow[], closed: ReadonlySet<number>): OutlineRow[] {
  return rows.filter((row) => row.parent === null || !closed.has(row.parent))
}

/** “Nome (cópia)”, “Nome (cópia 2)”… sem repetir um nome que já existe. */
export function copyName(name: string, taken: (candidate: string) => boolean): string {
  for (let n = 1; ; n++) {
    const candidate = `${name} (cópia${n > 1 ? ` ${n}` : ""})`
    if (!taken(candidate)) return candidate
  }
}

/** Troca o título `# Antigo` da primeira linha do corpo pelo nome da cópia (o resto do texto fica igual). */
export function retitle(text: string, from: string, to: string): string {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return text.replace(new RegExp(`^(#[ \\t]+)${escaped}[ \\t]*$`, "m"), `$1${to}`)
}
