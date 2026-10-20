import { createContext, type ComponentType } from "react"

/**
 * Pontos de extensão do leitor de Markdown, para cada módulo (Wiki, Livros…) acrescentar o que precisa sem editar
 * `components/Markdown.tsx` nem os plugins do dialeto.
 *
 * **Blocos de código desenhados:** um bloco ```` ```nome ```` cujo nome foi registrado aqui aparece desenhado pelo
 * componente (no modo leitura e como bloco no live preview), em vez de código. Ex.: ```` ```runas-calendario ```` na
 * Wiki. Registre no carregamento do módulo (o arquivo precisa ser importado por `App.tsx` ou por uma tela que ele
 * importa). Nomes em minúsculas; registrar de novo o mesmo nome troca o componente.
 *
 * **Arquivos embutidos por extensão:** `![[arquivo.ext#trecho]]` de uma extensão registrada aqui aparece desenhado pelo
 * componente (no modo leitura e no live preview), em vez de ser lido como nota. Ex.: `![[personagens.base#Tabela]]`
 * nas Notas (Bases do Obsidian). Mesmas regras de registro dos blocos.
 */

export interface CodeBlockProps {
  /** O texto de dentro do bloco, como está na nota. */
  code: string
  /** O nome do bloco (o que vem depois de ```). */
  language: string
}

const codeBlocks = new Map<string, ComponentType<CodeBlockProps>>()

export function registerCodeBlock(languages: string[], component: ComponentType<CodeBlockProps>): void {
  for (const language of languages) codeBlocks.set(language.toLowerCase(), component)
}

export function codeBlockFor(language: string): ComponentType<CodeBlockProps> | undefined {
  return codeBlocks.get(language.toLowerCase())
}

/** O live preview desenha este bloco (em vez de mostrar o código)? */
export function isRenderedCodeBlock(language: string): boolean {
  return codeBlocks.has(language.toLowerCase())
}

export interface FileEmbedProps {
  /** Caminho do arquivo no cofre, já resolvido. */
  path: string
  /** O que vem depois do nome, com o `#` (`#Tabela`), ou vazio. */
  subpath: string
  /** O texto depois de `|`. */
  alias?: string
  /** Caminho da nota que embute o arquivo, quando o leitor sabe. */
  from?: string
}

const fileEmbeds = new Map<string, ComponentType<FileEmbedProps>>()

/** Extensões com o ponto (`.base`), em minúsculas. */
export function registerFileEmbed(extensions: string[], component: ComponentType<FileEmbedProps>): void {
  for (const ext of extensions) fileEmbeds.set(ext.toLowerCase(), component)
}

export function fileEmbedFor(ext: string): ComponentType<FileEmbedProps> | undefined {
  return fileEmbeds.get(ext.toLowerCase())
}

/**
 * **Marcar tarefas:** um módulo (as Tarefas, com o comportamento do plugin Tasks) pode decidir o que entra no lugar da
 * linha quando clicam na caixa — ex.: `- [x] … ✅ 2026-10-18` e a próxima ocorrência de uma tarefa recorrente. Sem
 * nada registrado, o clique só alterna `[ ]` e `[x]`. Vale para o live preview e para o modo leitura.
 */
export type TaskToggle = (line: string) => string[] | null

let taskToggle: TaskToggle | null = null

export function registerTaskToggle(toggle: TaskToggle | null): void {
  taskToggle = toggle
}

/** O que entra no lugar da linha de tarefa clicada (a linha sem o `\r`). */
export function toggledTaskLines(line: string): string[] {
  const custom = taskToggle?.(line)
  if (custom) return custom
  return [line.replace(/^([\s>]*(?:[-*+]|\d+[.)])[ \t]+\[)([^\]])\]/, (_m, before: string, mark: string) => `${before}${mark === " " ? "x" : " "}]`)]
}

/**
 * Caixas clicáveis no modo leitura: a tela que mostra a nota diz qual texto o leitor recebeu (`source`) e o que fazer
 * com o clique na caixa número `index` (na ordem do documento) de um total de `total`. Um leitor com outro texto (uma
 * nota embutida, um trecho) ignora o contexto e deixa as caixas só para ver.
 */
export interface TaskCheckboxHandler {
  source: string
  onToggle(index: number, total: number): void
}

export const TaskCheckboxContext = createContext<TaskCheckboxHandler | null>(null)
