import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

// U44: um <button> sem type dentro de <form> é "submit" e envia o formulário (o "Dia inteiro" fechava o evento).
// Dentro de <form>, todo botão diz o que é; nos componentes compartilhados, que podem cair dentro de um formulário,
// também.
const src = fileURLToPath(new URL("..", import.meta.url))

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return files(path)
    return entry.name.endsWith(".tsx") ? [path] : []
  })
}

/** Fim da tag que começa em `start`, pulando o `>` de dentro das chaves do JSX. */
function tagEnd(text: string, start: number): number {
  let depth = 0
  for (let i = start; i < text.length; i++) {
    const char = text[i]
    if (char === "{") depth++
    else if (char === "}") depth--
    else if (char === ">" && depth === 0) return i
  }
  return text.length
}

function untypedButtons(path: string): string[] {
  const text = readFileSync(path, "utf8")
  const relative = path.slice(src.length).replaceAll("\\", "/")
  const shared = relative.startsWith("components/kit/") || relative === "components/ui.tsx"
  const forms = [...text.matchAll(/<form\b/g)].map((match) => [match.index, text.indexOf("</form>", match.index)] as const)
  const found: string[] = []
  for (const match of text.matchAll(/<button\b/g)) {
    const tag = text.slice(match.index, tagEnd(text, match.index))
    if (/\btype=/.test(tag)) continue
    const insideForm = forms.some(([start, end]) => match.index >= start && match.index <= end)
    if (shared || insideForm) found.push(`${relative}:${text.slice(0, match.index).split("\n").length}`)
  }
  return found
}

describe("botões e formulários", () => {
  it("todo botão dentro de <form> e nos componentes compartilhados tem type", () => {
    expect(files(src).flatMap(untypedButtons)).toEqual([])
  })
})
