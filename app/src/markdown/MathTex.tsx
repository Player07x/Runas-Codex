import { useEffect, useState } from "react"

type Katex = typeof import("katex").default

/** O KaTeX (e as fontes dele) só é carregado na primeira fórmula que aparece. */
let katex: Katex | null = null
let loading: Promise<Katex> | null = null

function loadKatex(): Promise<Katex> {
  loading ??= Promise.all([import("katex"), import("katex/dist/katex.min.css")]).then(([module]) => (katex = module.default))
  return loading
}

function render(tex: string, display: boolean): string {
  return katex!.renderToString(tex, { displayMode: display, throwOnError: false, strict: "ignore", trust: false, output: "htmlAndMathml" })
}

/** Fórmula LaTeX (`$…$` na linha, `$$…$$` em bloco), desenhada pelo KaTeX como no Obsidian. */
export function MathTex({ tex, display }: { tex: string; display: boolean }) {
  const [, setReady] = useState(Boolean(katex))
  useEffect(() => {
    if (!katex) void loadKatex().then(() => setReady(true))
  }, [])
  const Tag = display ? "div" : "span"
  if (!katex) return <Tag className={`math ${display ? "math-display" : "math-inline"} loading`}>{tex}</Tag>
  // O HTML vem do KaTeX (com `trust: false`, ele não gera links nem estilos vindos do texto).
  return <Tag className={`math ${display ? "math-display" : "math-inline"}`} dangerouslySetInnerHTML={{ __html: render(tex, display) }} />
}
