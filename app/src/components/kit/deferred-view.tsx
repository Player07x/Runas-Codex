import { useEffect, useState, type ComponentType, type ReactNode } from "react"

/** Mantém o aviso de carregamento somente até o módulo local estar pronto. */
export function deferredView<Props extends object>(
  load: () => Promise<ComponentType<Props>>,
  pending: (props: Props) => ReactNode,
) {
  let ready: ComponentType<Props> | undefined
  let loading: Promise<ComponentType<Props>> | undefined

  function preload() {
    loading ??= load().then((component) => {
      ready = component
      return component
    }, (error: unknown) => {
      loading = undefined
      throw error
    })
    return loading
  }

  function DeferredView(props: Props) {
    const [View, setView] = useState(() => ready)
    const [failed, setFailed] = useState(false)
    useEffect(() => {
      if (View || failed) return
      let active = true
      void preload().then(
        (component) => { if (active) setView(() => component) },
        () => { if (active) setFailed(true) },
      )
      return () => { active = false }
    }, [View, failed])

    if (View) return <View {...props} />
    if (failed) return <div className="page">
      <p role="alert">Não foi possível carregar este conteúdo.</p>
      <button type="button" className="btn" onClick={() => setFailed(false)}>Tentar novamente</button>
    </div>
    return pending(props)
  }

  return Object.assign(DeferredView, { preload })
}
