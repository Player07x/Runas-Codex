import { useEffect, useState } from "react"
import { Check } from "lucide-react"

/**
 * Retorno dos campos que gravam ao sair (sobras da revisão das Campanhas): “Gravado” aparece por alguns segundos ao
 * lado do campo que acabou de gravar. A região fica sempre no documento para o leitor de tela anunciar a mudança.
 */
export function useSavedMark() {
  const [saved, setSaved] = useState<{ key: string; at: number } | null>(null)
  useEffect(() => {
    if (!saved) return
    const timer = window.setTimeout(() => setSaved((current) => (current === saved ? null : current)), 2500)
    return () => window.clearTimeout(timer)
  }, [saved])
  return {
    /** Marca o campo depois de uma gravação bem-sucedida. */
    mark: (key: string) => setSaved({ key, at: Date.now() }),
    shown: (key: string) => saved?.key === key,
  }
}

export function SavedMark({ shown }: { shown: boolean }) {
  return (
    <span className="campaign-saved tiny" role="status">
      {shown && <><Check size={12} aria-hidden="true" /> Gravado</>}
    </span>
  )
}
