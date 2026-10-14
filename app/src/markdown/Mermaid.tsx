import { useEffect, useState } from "react"
import { Workflow } from "lucide-react"

type MermaidApi = typeof import("mermaid").default

let mermaid: Promise<MermaidApi> | null = null
let counter = 0

function loadMermaid(): Promise<MermaidApi> {
  mermaid ??= import("mermaid").then((module) => module.default)
  return mermaid
}

const theme = () => (document.documentElement.dataset.theme === "light" ? "default" : "dark")

/** Diagrama Mermaid (```mermaid), carregado só quando a nota tem um. */
export function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>()
  const [error, setError] = useState<string>()
  useEffect(() => {
    let alive = true
    loadMermaid()
      .then(async (api) => {
        // `strict`: sem cliques com script e sem HTML nos rótulos (o SVG passa pelo DOMPurify do próprio Mermaid).
        api.initialize({ startOnLoad: false, securityLevel: "strict", theme: theme(), fontFamily: "Geist Variable, system-ui, sans-serif" })
        const { svg } = await api.render(`mermaid-${++counter}`, code)
        if (alive) setSvg(svg)
      })
      .catch((err: unknown) => alive && setError(err instanceof Error ? err.message : String(err)))
    return () => {
      alive = false
    }
  }, [code])
  if (error)
    return (
      <div className="mermaid-error">
        <span className="row small" style={{ color: "var(--red)" }}>
          <Workflow size={15} /> Diagrama com erro: {error.split("\n")[0]}
        </span>
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    )
  if (!svg)
    return (
      <div className="mermaid loading row muted small">
        <Workflow size={15} /> Desenhando o diagrama…
      </div>
    )
  return <div className="mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
}
