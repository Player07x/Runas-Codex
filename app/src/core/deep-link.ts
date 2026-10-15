/**
 * Endereço para abrir uma nota de fora do app (outro programa, um PDF, um evento do calendário do celular):
 * `runas://abrir?nota=Notas%2FCaderno.md`. O caminho é relativo ao cofre aberto; nada fora dele é aceito.
 */
export const DEEP_LINK_SCHEME = "runas"

export function deepLinkFor(path: string): string {
  return `${DEEP_LINK_SCHEME}://abrir?nota=${encodeURIComponent(path)}`
}

/** O caminho da nota de um endereço `runas://abrir?nota=…`; `null` se não é um endereço válido do app. */
export function notePathFromUrl(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== `${DEEP_LINK_SCHEME}:`) return null
  // `runas://abrir?…`: conforme o sistema, "abrir" chega como host ou como caminho.
  if ((parsed.host || parsed.pathname.replace(/^\/+|\/+$/g, "")) !== "abrir") return null
  const raw = parsed.searchParams.get("nota")?.trim().replace(/\\/g, "/").replace(/^\/+/, "")
  if (!raw) return null
  const parts = raw.split("/")
  if (parts.some((p) => p === ".." || p === "." || !p) || /^[a-z]:/i.test(raw)) return null
  return /\.(md|canvas)$/i.test(raw) ? raw : `${raw}.md`
}

/** O primeiro `runas://` numa linha de comando (é como o Windows e o Linux entregam o endereço ao app). */
export function notePathFromArgv(argv: readonly string[]): string | null {
  for (const arg of argv) {
    if (arg.startsWith(`${DEEP_LINK_SCHEME}://`)) return notePathFromUrl(arg)
  }
  return null
}
