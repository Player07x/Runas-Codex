/** Conteúdo imediato de uma pasta da árvore de Notas: o que aparece ao abri-la, sem os descendentes. */
export interface FolderContents { notes: number; folders: number; total: number }

/** Conta pelas mesmas listas que a árvore desenha; anexos e dados ocultos não aparecem nela e não entram. */
export function folderContents(folder: { notes: readonly unknown[]; folders: ReadonlyMap<string, unknown> }): FolderContents {
  const notes = folder.notes.length
  const folders = folder.folders.size
  return { notes, folders, total: notes + folders }
}

/** Dica e nome acessível da bolinha, com os mesmos números que ela mostra. */
export function folderContentsLabel({ notes, folders, total }: FolderContents): string {
  const parts = [`${folders} ${folders === 1 ? "pasta" : "pastas"}`, `${notes} ${notes === 1 ? "nota" : "notas"}`]
  return `${total} ${total === 1 ? "item" : "itens"} diretamente nesta pasta: ${parts.join(" e ")}`
}
