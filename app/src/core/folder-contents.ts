/** Conteúdo imediato de uma pasta; os arquivos dos descendentes não entram outra vez na pasta-mãe. */
export interface FolderContents { files: number; folders: number; total: number }

/** Uma passagem pelos caminhos do índice, incluindo anexos e pastas vazias criadas nesta sessão. */
export function folderContents(files: readonly string[], extraFolders: readonly string[] = []): Map<string, FolderContents> {
  const entries = new Map<string, { files: Set<string>; folders: Set<string> }>()
  const entry = (path: string) => {
    let value = entries.get(path)
    if (!value) { value = { files: new Set(), folders: new Set() }; entries.set(path, value) }
    return value
  }
  const partsOf = (path: string) => path.replace(/\\/g, "/").split("/").filter(Boolean)
  const addFolder = (parts: string[]) => {
    let parent = ""
    entry(parent)
    for (const part of parts) {
      entry(parent).folders.add(part)
      parent = parent ? `${parent}/${part}` : part
      entry(parent)
    }
    return entry(parent)
  }
  for (const path of files) {
    const parts = partsOf(path)
    if (!parts.length || parts.some(part => part.startsWith("."))) continue
    const name = parts.pop()!
    addFolder(parts).files.add(name)
  }
  for (const path of extraFolders) {
    const parts = partsOf(path)
    if (!parts.some(part => part.startsWith("."))) addFolder(parts)
  }
  return new Map([...entries].map(([path, value]) => [path, { files: value.files.size, folders: value.folders.size, total: value.files.size + value.folders.size }]))
}
