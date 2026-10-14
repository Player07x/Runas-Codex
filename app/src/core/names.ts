import { basename, foldName } from "./text"

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i
/** `[ ] # ^ |` quebram links no Obsidian; `\ / : * ? " < >` não valem em arquivos do Windows ou do Android. */
const FORBIDDEN = /[[\]#^|\\/:*?"<>]/
const MAX_PATH = 260

/** Problema no nome de uma nota ou pasta, ou `null` se o nome serve nos três sistemas e no Obsidian. */
export function nameProblem(name: string): string | null {
  if (!name.trim()) return "O nome não pode ficar vazio."
  const bad = FORBIDDEN.exec(name)
  if (bad) return `O caractere “${bad[0]}” não é permitido em nomes (quebra links ou não vale no Windows).`
  if (/[. ]$/.test(name)) return "O nome não pode terminar com ponto ou espaço (o Windows não aceita)."
  if (name.startsWith(".")) return "Nomes que começam com ponto ficam ocultos no Obsidian."
  if (WINDOWS_RESERVED.test(name)) return `“${name}” é um nome reservado do Windows.`
  if (/[\u0000-\u001f]/.test(name)) return "O nome tem caracteres de controle."
  return null
}

/** Avisos (não impedem): caminho longo demais para o Windows. */
export function pathWarning(path: string, vaultRootLength = 0): string | null {
  return vaultRootLength + path.length + 1 > MAX_PATH ? `O caminho passa de ${MAX_PATH} caracteres e pode falhar no Windows.` : null
}

/**
 * Windows e o armazenamento do Android não diferenciam maiúsculas; o Linux diferencia. Dois arquivos que só mudam
 * nisso viram um só ao sincronizar, então o app recusa.
 */
export function caseCollision(newPath: string, existing: Iterable<string>, ignore?: string): string | null {
  const key = foldName(newPath)
  for (const path of existing) {
    if (path === ignore) continue
    if (foldName(path) === key) return path
  }
  return null
}

/** Problema de um caminho inteiro (cada pasta e o arquivo). */
export function pathProblem(path: string): string | null {
  for (const segment of path.split("/")) {
    const problem = nameProblem(segment === basename(path) ? segment.replace(/\.(md|canvas|base)$/i, "") : segment)
    if (problem) return problem
  }
  return null
}
