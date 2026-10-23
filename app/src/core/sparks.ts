/**
 * Centelhas (INI-2, rework F5): as ideias capturadas no Início vão para uma nota de entrada no cofre, uma por item de
 * lista, com a hora da captura. A ideia usada fica riscada (`~~…~~`), que o Obsidian mostra igual e que não vira tarefa
 * do plugin Tasks. Remover tira a linha; “Limpar as usadas” tira todas as riscadas.
 */

export const SPARKS_FOLDER = "Notas"
export const SPARKS_NAME = "Entrada"
export const SPARKS_PATH = `${SPARKS_FOLDER}/${SPARKS_NAME}.md`
export const SPARKS_HEADER = "# Entrada\n\nIdeias capturadas no Início (Centelhas). As riscadas já foram usadas.\n"

export interface Spark {
  /** Linha da nota (0-based). */
  line: number
  text: string
  used: boolean
  /** `AAAA-MM-DD HH:MM` da captura, se houver. */
  at?: string
}

const ITEM = /^[-*] (~~)?(.+?)(~~)?(?: — (\d{4}-\d{2}-\d{2} \d{2}:\d{2}))?\s*$/

const pad = (n: number) => String(n).padStart(2, "0")
export const stamp = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`

/** As ideias da nota, da mais nova (última linha) para a mais antiga. */
export function parseSparks(text: string): Spark[] {
  const list: Spark[] = []
  text.split("\n").forEach((raw, line) => {
    const m = ITEM.exec(raw.replace(/\r$/, ""))
    if (!m || /^\[[ xX]\]/.test(m[2]!)) return
    const used = Boolean(m[1] && m[3])
    const body = used ? m[2]! : `${m[1] ?? ""}${m[2]}${m[3] ?? ""}`
    list.push({ line, text: body.trim(), used, ...(m[4] ? { at: m[4] } : {}) })
  })
  return list.reverse()
}

/** Acrescenta a ideia no fim da nota (cria o cabeçalho se a nota ainda não existe). Quebras de linha viram espaço. */
export function addSpark(text: string | null, idea: string, now: Date): string {
  const clean = idea.replace(/\s*\r?\n\s*/g, " ").trim()
  const base = text ?? SPARKS_HEADER
  return `${base.replace(/\s*$/, "")}\n${text === null ? "\n" : ""}- ${clean} — ${stamp(now)}\n`
}

function editLine(text: string, line: number, edit: (raw: string) => string | null): string {
  const lines = text.split("\n")
  if (line < 0 || line >= lines.length || !ITEM.test(lines[line]!.replace(/\r$/, ""))) return text
  const next = edit(lines[line]!)
  if (next === null) lines.splice(line, 1)
  else lines[line] = next
  return lines.join("\n")
}

/** Risca ou desrisca a ideia (usada ↔ nova). */
export function toggleSpark(text: string, line: number): string {
  return editLine(text, line, (raw) => {
    const m = ITEM.exec(raw.replace(/\r$/, ""))!
    const used = Boolean(m[1] && m[3])
    const body = used ? m[2]! : `${m[1] ?? ""}${m[2]}${m[3] ?? ""}`
    return `- ${used ? body : `~~${body}~~`}${m[4] ? ` — ${m[4]}` : ""}`
  })
}

export function removeSpark(text: string, line: number): string {
  return editLine(text, line, () => null)
}

/** Tira todas as ideias riscadas. */
export function removeUsedSparks(text: string): string {
  const used = new Set(parseSparks(text).filter((s) => s.used).map((s) => s.line))
  return text.split("\n").filter((_, i) => !used.has(i)).join("\n")
}
