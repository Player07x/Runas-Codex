import { nameProblem } from "./names"
import { renameProblem } from "./rename"
import { dirname, extname } from "./text"
import type { VaultIndex } from "./vault-index"

/**
 * Nome da nota no título (U99, decisão 13): o título no topo da nota renomeia na mesma pasta, como o do Obsidian.
 * Mudar de pasta continua em “Renomear ou mover”.
 */
export function titleTarget(path: string, name: string): string {
  const folder = dirname(path)
  return (folder ? folder + "/" : "") + name.trim() + extname(path)
}

/** O que impede o nome digitado; `null` quando dá para renomear (ou quando o nome não mudou). */
export function titleProblem(index: VaultIndex, path: string, name: string): string | null {
  const clean = name.trim()
  const problem = nameProblem(clean)
  if (problem) return problem
  if (clean.includes("/")) return "Para mudar de pasta, use “Renomear ou mover”."
  const to = titleTarget(path, clean)
  return to === path ? null : renameProblem(index, path, to)
}

/** Modelo inicial do “Criar o primeiro modelo”: as variáveis do plugin Templates do Obsidian. */
export const FIRST_TEMPLATE = "# {{title}}\n\nCriada em {{date}} às {{time}}.\n\n"

/** Pasta do primeiro modelo: a configurada no Obsidian ou `Templates`, a padrão dele. */
export const firstTemplateFolder = (configured: string) => configured.replace(/\/$/, "") || "Templates"
