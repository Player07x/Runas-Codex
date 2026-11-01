import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, type ChangeEvent, type FocusEvent } from "react"
import type { SessionInfo } from "../../core/campaigns"
import { useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import type { CampaignData } from "./campaign-state"

/** Ações na nota da campanha (sempre pelo `useVault()`, com a versão lida). */
export function useCampaignEdits(data: CampaignData) {
  const vault = useVault()
  const toast = useToast()
  const guard = () => {
    if (data.readOnly) {
      toast("Cofre em somente leitura: libere a gravação em Configurações.")
      return false
    }
    if (!data.campaign.home) {
      toast(`Falta a nota ${data.campaign.root}${data.campaign.name}.md da campanha.`)
      return false
    }
    return true
  }
  const run = async (action: () => Promise<void>) => {
    try {
      await action()
      return true
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err))
      return false
    }
  }
  // As duas devolvem se gravou (para o “Desfazer” e o aviso “Gravado”).
  return {
    editHome: (change: (text: string) => string) =>
      guard() ? run(() => vault.save(data.campaign.home!, change(vault.index!.note(data.campaign.home!)!.text))) : Promise.resolve(false),
    setHome: (key: string, value: string[] | string | undefined) =>
      guard() ? run(() => vault.setProperty(data.campaign.home!, key, value)) : Promise.resolve(false),
  }
}

/**
 * Apagar sem pedir confirmação, com “Desfazer” no aviso (sobras da revisão das Campanhas): guarda o texto da nota
 * antes da mudança e só o devolve se ninguém mexeu na nota depois, para o desfazer não apagar outra mudança.
 */
export function useUndoable() {
  const vault = useVault()
  const toast = useToast()
  return async (path: string, message: string, change: () => Promise<boolean | void>) => {
    const before = vault.index?.note(path)?.text
    const done = await change()
    const after = vault.index?.note(path)?.text
    if (done === false || before === undefined || after === undefined || before === after) return
    toast(message, {
      label: "Desfazer",
      run: async () => {
        if (vault.index?.note(path)?.text !== after) return toast("A nota mudou depois disso; desfaça pela própria nota.")
        try {
          await vault.save(path, before)
          toast("Desfeito.")
        } catch (err) {
          toast(err instanceof Error ? err.message : String(err))
        }
      },
    })
  }
}

/**
 * Campos que gravam ao sair (sobras da revisão das Campanhas): enquanto se digita, o campo guarda aqui a gravação
 * pendente; o blur grava e limpa. Fechar o painel, trocar de tela ou esconder o app (o celular apaga a tela) grava o
 * que ficou pendente — o React não dispara o blur de um campo que sai do documento.
 */
export interface Drafts {
  /** Guarda (ou, com `null`, esquece) a gravação pendente do campo `key`. */
  draft(key: string, save: (() => void) | null): void
  /** Grava tudo o que está pendente. */
  flush(): void
}

export const DraftsContext = createContext<Drafts>({ draft: () => {}, flush: () => {} })
export const useDraft = () => useContext(DraftsContext)

export function useDrafts(): Drafts {
  const pending = useRef(new Map<string, () => void>())
  const flush = useCallback(() => {
    const saves = [...pending.current.values()]
    pending.current.clear()
    for (const save of saves) save()
  }, [])
  const draft = useCallback((key: string, save: (() => void) | null) => {
    if (save) pending.current.set(key, save)
    else pending.current.delete(key)
  }, [])
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush()
    }
    window.addEventListener("pagehide", flush)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("pagehide", flush)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [flush])
  // Ao sair da tela.
  useLayoutEffect(() => flush, [flush])
  return { draft, flush }
}

/** Sessão em que um segredo revelado agora fica registrado: a de hoje ou a última jogada. */
export function revealSession(data: CampaignData): SessionInfo | undefined {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const played = data.sessions.filter((s) => s.date && s.date <= today && s.status !== "cancelada")
  return played[played.length - 1] ?? data.upcoming
}

type TextField = HTMLInputElement | HTMLTextAreaElement

/** Props de um campo que grava ao sair: o valor digitado fica pendente nos rascunhos até o blur (ou a saída). */
export function useBlurSave() {
  const { draft } = useDraft()
  return (key: string, commit: (value: string) => void) => ({
    onChange: (event: ChangeEvent<TextField>) => {
      const value = event.target.value
      draft(key, () => commit(value))
    },
    onBlur: (event: FocusEvent<TextField>) => {
      draft(key, null)
      commit(event.target.value)
    },
  })
}
