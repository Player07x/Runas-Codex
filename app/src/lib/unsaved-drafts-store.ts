import { draftFor, parseDrafts, withDraft, withoutDraft, type UnsavedDraft } from "../core/unsaved-drafts"

/** Rascunhos não gravados ficam no armazenamento do app neste aparelho (fora do cofre), como as preferências. */
const KEY = "runas-codex:nao-gravado"

function read(): UnsavedDraft[] {
  try { return parseDrafts(localStorage.getItem(KEY)) } catch { return [] }
}

function write(drafts: UnsavedDraft[]): boolean {
  try {
    if (drafts.length) localStorage.setItem(KEY, JSON.stringify(drafts))
    else localStorage.removeItem(KEY)
    return true
  } catch {
    return false
  }
}

/** `false` quando nem o aparelho aceitou guardar (armazenamento cheio ou bloqueado). */
export function keepUnsaved(draft: UnsavedDraft): boolean {
  return write(withDraft(read(), draft))
}

export function unsavedFor(vault: string, path: string): UnsavedDraft | null {
  return draftFor(read(), vault, path)
}

export function forgetUnsaved(vault: string, path: string): void {
  const drafts = read()
  if (draftFor(drafts, vault, path)) write(withoutDraft(drafts, vault, path))
}

export function hasUnsaved(vault: string): boolean {
  return read().some((d) => d.vault === vault)
}

/** Sistema de onde vêm as mensagens de erro, para o passo a passo certo. */
export function writeSystem(kind: string): "windows" | "android" | "outro" {
  if (kind === "capacitor") return "android"
  try { return navigator.userAgent.includes("Windows") ? "windows" : "outro" } catch { return "outro" }
}
