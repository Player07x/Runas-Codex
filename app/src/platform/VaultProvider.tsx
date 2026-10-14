import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { caseCollision, nameProblem } from "../core/names"
import { setProperty as setPropertyText, type PropertyValue } from "../core/properties"
import { planFolderRename, planRename, type RenamePlan } from "../core/rename"
import { extname, joinPath } from "../core/text"
import { VaultIndex } from "../core/vault-index"
import { platform } from "./index"
import type { Platform, VaultChange, VaultEntry, VaultInfo } from "./platform"

const BATCH = 200

/**
 * O cofre aberto, para as telas: o índice (notas, links, tags) e as ações de gravação. Toda gravação passa por aqui,
 * com a versão que o app leu (se o arquivo mudou fora, a gravação é recusada) e com o índice atualizado na hora.
 */
export interface VaultState {
  platform: Platform
  info: VaultInfo | null
  index: VaultIndex | null
  /** Muda a cada alteração do índice (para `useMemo`). */
  version: number
  loading: boolean
  error?: string
  choose(): Promise<void>
  create(): Promise<void>
  setWritable(writable: boolean): Promise<void>
  reload(): Promise<void>
  /** Grava o texto completo de uma nota que já existe. */
  save(path: string, content: string): Promise<void>
  /** Cria `<pasta>/<nome>.md` e devolve o caminho. */
  createNote(folder: string, name: string, content?: string): Promise<string>
  createFolder(path: string): Promise<void>
  /** Renomeia ou move arquivo ou pasta, atualizando os links do cofre. Devolve o plano executado. */
  rename(from: string, to: string): Promise<RenamePlan>
  trash(path: string): Promise<void>
  setProperty(path: string, key: string, value: PropertyValue | undefined): Promise<void>
}

const VaultContext = createContext<VaultState | null>(null)

const isText = (path: string) => /\.(md|canvas)$/i.test(path)

async function loadIndex(): Promise<VaultIndex> {
  const entries = await platform.listVault()
  const notes = entries.filter((entry) => extname(entry.path) === ".md")
  const texts: Record<string, string> = {}
  for (let i = 0; i < notes.length; i += BATCH) {
    Object.assign(texts, await platform.readTexts(notes.slice(i, i + BATCH).map((entry) => entry.path)))
    // Devolve a vez para a interface entre os lotes (cofres grandes não travam a tela).
    await new Promise((resolve) => setTimeout(resolve))
  }
  return new VaultIndex(entries, texts)
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<VaultInfo | null>(null)
  const [index, setIndex] = useState<VaultIndex | null>(null)
  const [version, setVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const indexRef = useRef<VaultIndex | null>(null)
  const bump = useCallback(() => setVersion((v) => v + 1), [])

  const open = useCallback(async (next: VaultInfo | null) => {
    setInfo(next)
    setError(undefined)
    if (!next) {
      indexRef.current = null
      setIndex(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const loaded = await loadIndex()
      indexRef.current = loaded
      setIndex(loaded)
    } catch (err) {
      indexRef.current = null
      setIndex(null)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
      bump()
    }
  }, [bump])

  useEffect(() => {
    platform.vault().then(open, (err: unknown) => setError(String(err)))
  }, [open])

  // Mudanças feitas fora do app (Obsidian, sincronização) entram no índice na hora.
  useEffect(() => {
    if (!info) return
    return platform.watch(async (changes: VaultChange[]) => {
      const current = indexRef.current
      if (!current) return
      const changed = changes.filter((c): c is Extract<VaultChange, { type: "changed" }> => c.type === "changed")
      const texts = await platform.readTexts(changed.filter((c) => isText(c.entry.path) && extname(c.entry.path) === ".md").map((c) => c.entry.path))
      for (const change of changes) {
        if (change.type === "deleted") {
          for (const file of current.allFiles()) if (file.path === change.path || file.path.startsWith(change.path + "/")) current.remove(file.path)
        } else current.set(change.entry, texts[change.entry.path])
      }
      bump()
    })
  }, [info, bump])

  const requireIndex = useCallback((): VaultIndex => {
    if (!indexRef.current || !info) throw new Error("Nenhum cofre aberto.")
    if (info.readOnly) throw new Error("Cofre em somente leitura. Libere a gravação em Configurações › Cofre.")
    return indexRef.current
  }, [info])

  const entryOf = (index: VaultIndex, path: string): VaultEntry | undefined => index.allFiles().find((file) => file.path === path)

  const save = useCallback(
    async (path: string, content: string) => {
      const current = requireIndex()
      const expected = entryOf(current, path)
      if (!expected) throw new Error(`“${path}” não está no cofre.`)
      const entry = await platform.writeText(path, content, expected)
      current.set(entry, content)
      bump()
    },
    [requireIndex, bump],
  )

  const createNote = useCallback(
    async (folder: string, name: string, content = "") => {
      const current = requireIndex()
      const problem = nameProblem(name)
      if (problem) throw new Error(problem)
      const path = joinPath(folder, `${name}.md`)
      if (!path) throw new Error("Pasta inválida.")
      const clash = caseCollision(path, current.allFiles().map((f) => f.path))
      if (clash) throw new Error(`Já existe “${clash}”.`)
      const entry = await platform.writeText(path, content, null)
      current.set(entry, content)
      bump()
      return path
    },
    [requireIndex, bump],
  )

  const createFolder = useCallback(
    async (path: string) => {
      requireIndex()
      for (const part of path.split("/")) {
        const problem = nameProblem(part)
        if (problem) throw new Error(problem)
      }
      await platform.createFolder(path)
    },
    [requireIndex],
  )

  const rename = useCallback(
    async (from: string, to: string) => {
      const current = requireIndex()
      const isFolder = !current.hasFile(from)
      const canvasPaths = current.allFiles().filter((f) => extname(f.path) === ".canvas").map((f) => f.path)
      const canvasTexts = canvasPaths.length ? await platform.readTexts(canvasPaths) : {}
      const plan = isFolder ? planFolderRename(current, from, to, canvasTexts) : planRename(current, from, to, canvasTexts)
      // Primeiro os links (cada arquivo com a versão que o app leu), depois o arquivo em si.
      for (const edit of plan.edits) {
        const expected = entryOf(current, edit.path)
        const entry = await platform.writeText(edit.path, edit.after, expected)
        current.set(entry, extname(edit.path) === ".md" ? edit.after : undefined)
      }
      await platform.rename(from, to)
      const moved = await platform.listVault(isFolder ? to + "/" : to)
      const movedTexts = await platform.readTexts(moved.filter((e) => extname(e.path) === ".md").map((e) => e.path))
      for (const file of current.allFiles()) if (file.path === from || file.path.startsWith(from + "/")) current.remove(file.path)
      for (const entry of moved) if (entry.path === to || entry.path.startsWith(to + "/")) current.set(entry, movedTexts[entry.path])
      bump()
      return plan
    },
    [requireIndex, bump],
  )

  const trash = useCallback(
    async (path: string) => {
      const current = requireIndex()
      await platform.trash(path)
      for (const file of current.allFiles()) if (file.path === path || file.path.startsWith(path + "/")) current.remove(file.path)
      bump()
    },
    [requireIndex, bump],
  )

  const setProperty = useCallback(
    async (path: string, key: string, value: PropertyValue | undefined) => {
      const note = requireIndex().note(path)
      if (!note) throw new Error(`“${path}” não está no cofre.`)
      await save(path, setPropertyText(note.text, key, value))
    },
    [requireIndex, save],
  )

  const choose = useCallback(async () => open(await platform.chooseVault()), [open])
  const create = useCallback(async () => open(await platform.createVault()), [open])
  const setWritable = useCallback(async (writable: boolean) => setInfo(await platform.setWritable(writable)), [])
  const reload = useCallback(async () => open(await platform.vault()), [open])

  return (
    <VaultContext.Provider value={{ platform, info, index, version, loading, error, choose, create, setWritable, reload, save, createNote, createFolder, rename, trash, setProperty }}>
      {children}
    </VaultContext.Provider>
  )
}

export function useVault(): VaultState {
  const state = useContext(VaultContext)
  if (!state) throw new Error("useVault fora do VaultProvider")
  return state
}
