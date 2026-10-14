import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import type { Note } from "../data/types"
import { toNote } from "../lib/vault-notes"
import { platform } from "./index"
import type { Platform, VaultInfo } from "./platform"

const BATCH = 200

export interface VaultState {
  platform: Platform
  info: VaultInfo | null
  /** Notas do cofre real; `null` quando o app mostra os dados de exemplo (navegador ou nenhum cofre aberto). */
  notes: Note[] | null
  loading: boolean
  error?: string
  choose(): Promise<void>
}

const VaultContext = createContext<VaultState | null>(null)

async function loadNotes(): Promise<Note[]> {
  const entries = (await platform.listVault()).filter((entry) => entry.path.toLowerCase().endsWith(".md"))
  const notes: Note[] = []
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH)
    const texts = await platform.readTexts(batch.map((entry) => entry.path))
    for (const entry of batch) if (entry.path in texts) notes.push(toNote(entry, texts[entry.path]!))
  }
  return notes
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<VaultInfo | null>(null)
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [loading, setLoading] = useState(platform.kind !== "memory")
  const [error, setError] = useState<string>()

  const open = useCallback(async (next: VaultInfo | null) => {
    setInfo(next)
    setError(undefined)
    if (!next || platform.kind === "memory") {
      setNotes(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setNotes(await loadNotes())
    } catch (err) {
      setNotes(null)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    platform.vault().then(open, (err: unknown) => setError(String(err)))
  }, [open])

  const choose = useCallback(async () => {
    const next = await platform.chooseVault()
    if (next?.path !== info?.path) await open(next)
  }, [info, open])

  return <VaultContext.Provider value={{ platform, info, notes, loading, error, choose }}>{children}</VaultContext.Provider>
}

export function useVault(): VaultState {
  const state = useContext(VaultContext)
  if (!state) throw new Error("useVault fora do VaultProvider")
  return state
}
