import { findCodeBlocks, replaceCodeBlock } from "../../core/codeblocks"
import { initiativeYaml, treasuryYaml } from "../../core/campaign-tools"
import type { IndexedNote, VaultIndex } from "../../core/vault-index"
import type { VaultState } from "../../platform/VaultProvider"

/** Uma ferramenta da campanha: a nota (`tipo`) e o bloco YAML que ela guarda. */
export interface ToolNote {
  kind: string
  language: string
  title: string
  initial(): string
}

export const TREASURY_TOOL: ToolNote = { kind: "tesouro", language: "runas-tesouro", title: "Tesouro do grupo", initial: () => treasuryYaml({ coins: "", items: [] }) }
export const INITIATIVE_TOOL: ToolNote = { kind: "iniciativa", language: "runas-iniciativa", title: "Iniciativa presencial", initial: () => initiativeYaml({ round: 1, active: null, participants: [] }) }

/** A nota da ferramenta na campanha (a primeira com o `tipo`, em qualquer subpasta). */
export function findToolNote(index: VaultIndex, root: string, tool: ToolNote): IndexedNote | undefined {
  return index.notesIn(root).find((note) => note.meta.frontmatter?.data?.tipo === tool.kind)
}

/** Cria a nota da ferramenta em `Ferramentas/`, com um nome livre. */
export async function createToolNote(vault: VaultState, root: string, tool: ToolNote): Promise<string> {
  const folder = `${root}Ferramentas`
  let name = tool.title
  for (let i = 2; vault.index!.note(`${folder}/${name}.md`); i++) name = `${tool.title} ${i}`
  return vault.createNote(folder, name, `---\ntipo: ${tool.kind}\n---\n# ${tool.title}\n\n~~~${tool.language}\n${tool.initial()}\n~~~\n`)
}

/**
 * Troca o bloco da ferramenta lendo a nota na hora da gravação (nada de gravar por cima com o texto de um render
 * anterior); com `create`, cria a nota se ela ainda não existe. Devolve o caminho da nota.
 */
export async function updateToolBlock(vault: VaultState, root: string, tool: ToolNote, change: (content: string) => string, create = false): Promise<string> {
  let note = findToolNote(vault.index!, root, tool)
  if (!note && create) note = vault.index!.note(await createToolNote(vault, root, tool))
  if (!note) throw new Error(`Crie o ${tool.title.toLocaleLowerCase("pt-BR")} antes.`)
  const block = findCodeBlocks(note.text, tool.language)[0]
  if (!block) throw new Error(`O bloco ${tool.language} não foi encontrado em ${note.path}. Corrija a nota antes de editar.`)
  await vault.save(note.path, replaceCodeBlock(note.text, block, change(block.content)))
  return note.path
}
