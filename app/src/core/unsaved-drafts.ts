/**
 * Texto que não chegou ao cofre (U91): fica guardado neste aparelho, fora do cofre, até a gravação dar certo.
 * `base` é o texto do disco quando a edição começou; se o disco mudou depois, recuperar vira escolha do usuário.
 */
export interface UnsavedDraft { vault: string; path: string; base: string; text: string; at: string }

export function parseDrafts(raw: string | null): UnsavedDraft[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value.filter((item): item is UnsavedDraft => {
      const d = item as Partial<UnsavedDraft>
      return typeof d === "object" && d !== null && [d.vault, d.path, d.base, d.text, d.at].every((v) => typeof v === "string")
    })
  } catch {
    return []
  }
}

const same = (draft: UnsavedDraft, vault: string, path: string) => draft.vault === vault && draft.path === path

export function draftFor(drafts: UnsavedDraft[], vault: string, path: string): UnsavedDraft | null {
  return drafts.find((d) => same(d, vault, path)) ?? null
}

/** Um rascunho por nota: o mais novo substitui o anterior, mas guarda a base mais antiga (a do disco). */
export function withDraft(drafts: UnsavedDraft[], draft: UnsavedDraft): UnsavedDraft[] {
  const old = draftFor(drafts, draft.vault, draft.path)
  return [...drafts.filter((d) => !same(d, draft.vault, draft.path)), old ? { ...draft, base: old.base } : draft]
}

export function withoutDraft(drafts: UnsavedDraft[], vault: string, path: string): UnsavedDraft[] {
  return drafts.filter((d) => !same(d, vault, path))
}

/** O que fazer com o rascunho ao abrir a nota. */
export type DraftRecovery = "nenhum" | "descartar" | "recuperar" | "perguntar"
export function draftRecovery(draft: UnsavedDraft | null, onDisk: string): DraftRecovery {
  if (!draft) return "nenhum"
  if (draft.text === onDisk) return "descartar"
  return draft.base === onDisk ? "recuperar" : "perguntar"
}
