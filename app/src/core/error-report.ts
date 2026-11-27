/**
 * Enviar relatório (1.9, ADR 0039): no lugar de telemetria, a pessoa monta um relatório no próprio aparelho, confere e
 * edita tudo, e só então decide mandar. O app não envia nada: “Enviar pelo GitHub” abre no navegador a página de novo
 * problema do repositório, já preenchida, e quem envia é a pessoa, lá. Conteúdo de notas nunca entra; caminhos de
 * pastas viram `<cofre>` e `~`.
 */

export const REPORT_REPO = "Player07x/Runas-Codex"
/** O GitHub aceita endereços longos, mas navegadores e o próprio GitHub cortam por volta de 8 mil caracteres. */
export const MAX_ISSUE_URL = 7500
export const MAX_ERRORS = 20

export interface ErrorEntry {
  /** Quando aconteceu (ms desde 1970). */
  at: number
  message: string
  stack?: string
}

export interface ReportContext {
  version: string
  system: string
  screen: string
  route: string
  errors: readonly ErrorEntry[]
}

/** Troca caminhos que identificam a pessoa (a pasta do cofre e a pasta pessoal) por rótulos. */
export function sanitizeReportText(text: string, vaultPath?: string | null): string {
  let result = text
  if (vaultPath && vaultPath.length > 2) result = result.split(vaultPath).join("<cofre>")
  return result
    .replace(/\/home\/[^/\s"')]+/g, "~")
    .replace(/\/Users\/[^/\s"')]+/g, "~")
    .replace(/[A-Za-z]:\\Users\\[^\\\s"')]+/g, "~")
    .replace(/\/storage\/emulated\/\d+/g, "<armazenamento>")
    .replace(/[?&]k=[0-9a-f]{16,}/gi, "?k=…")
}

/**
 * Mensagens de erro às vezes citam a nota (“Não foi possível gravar Diário/27-11.md”): o nome vira `<nota>`. Só nos
 * erros; a descrição é texto da pessoa, que ela mesma confere.
 */
export function scrubNoteNames(text: string): string {
  return text
    .replace(/([“"'«‘])[^“”"'«»‘’\n]{1,200}\.(md|canvas)([”"'»’])/gi, "$1<nota>.$2$3")
    .replace(/[^\s“”"'«»‘’()<>]+\.(md|canvas)\b/gi, "<nota>.$1")
}

/** A tela aberta, só pelo módulo (`/notas`, `/wiki`…): o resto do endereço tem o caminho da nota ou da mesa. */
export function reportRoute(hash: string): string {
  const segment = hash.replace(/^#/, "").split("?")[0]!.split("/").find(Boolean)
  return segment ? `/${segment}` : "/"
}

/** Erros que o navegador dispara sem haver problema (o ResizeObserver avisa quando adia uma medida). */
export function ignorableError(message: string): boolean {
  return /^ResizeObserver loop/i.test(message.trim())
}

const two = (value: number) => String(value).padStart(2, "0")
const time = (at: number) => { const date = new Date(at); return `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}` }

/** O texto do relatório, em Markdown (vira o corpo do problema no GitHub). */
export function buildReport(context: ReportContext, description: string, vaultPath?: string | null): string {
  const errors = context.errors.slice(-MAX_ERRORS)
  const lines = [
    "## O que aconteceu",
    "",
    description.trim() || "(descreva aqui o que você fazia e o que esperava)",
    "",
    "## Ambiente",
    "",
    `- Runas-Codex ${context.version}`,
    `- Sistema: ${context.system}`,
    `- Tela: ${context.screen}`,
    `- Onde: ${context.route || "/"}`,
    "",
    `## Erros desta sessão (${errors.length})`,
    "",
    ...(errors.length ? errors.flatMap((error) => [`- ${time(error.at)} — ${scrubNoteNames(error.message)}`, ...(error.stack ? ["  ```", ...error.stack.split("\n").slice(0, 6).map((line) => `  ${scrubNoteNames(line)}`), "  ```"] : [])]) : ["Nenhum erro registrado desde que o app abriu."]),
  ]
  return sanitizeReportText(lines.join("\n"), vaultPath)
}

/** Título curto a partir da descrição (ou do último erro), também sem caminhos pessoais. */
export function reportTitle(description: string, errors: readonly ErrorEntry[], vaultPath?: string | null): string {
  const lastError = errors.at(-1)?.message
  const first = sanitizeReportText(description.trim().split("\n")[0]?.trim() || (lastError ? scrubNoteNames(lastError) : "") || "Problema no Runas-Codex", vaultPath)
  return first.length > 80 ? `${first.slice(0, 79)}…` : first
}

/**
 * Endereço da página de novo problema, já preenchida. Um relatório longo demais é cortado no fim, com o aviso de que o
 * texto inteiro está em “Copiar”.
 */
export function issueUrl(title: string, body: string, repo = REPORT_REPO): { url: string; truncated: boolean } {
  const base = `https://github.com/${repo}/issues/new?title=${encodeURIComponent(title)}&body=`
  const note = "\n\n_(Relatório cortado: o texto inteiro está no botão Copiar do app.)_"
  let text = body
  let truncated = false
  while ((base + encodeURIComponent(text)).length > MAX_ISSUE_URL && text.length > 0) {
    truncated = true
    text = text.slice(0, Math.floor(text.length * 0.9))
  }
  return { url: base + encodeURIComponent(truncated ? text + note : text), truncated }
}

/** Guarda só os últimos `MAX_ERRORS` erros, sem repetir o mesmo erro em seguida. */
export function pushError(list: readonly ErrorEntry[], entry: ErrorEntry): ErrorEntry[] {
  const last = list.at(-1)
  if (last && last.message === entry.message && entry.at - last.at < 2000) return [...list]
  return [...list, entry].slice(-MAX_ERRORS)
}
