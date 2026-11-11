import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, extname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

// Protege a limpeza da 1.3 (U49): código que ninguém importa e imagem que nenhum documento cita não voltam a se
// acumular. Se o teste falhar, apague o arquivo ou passe a usá-lo.

const SRC = dirname(fileURLToPath(import.meta.url))
const APP = resolve(SRC, "..")
const ROOT = resolve(APP, "..")
const CODE = [".ts", ".tsx", ".css"]

function walk(dir: string, skip: (path: string) => boolean = () => false): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (skip(path)) continue
    if (statSync(path).isDirectory()) out.push(...walk(path, skip))
    else out.push(path)
  }
  return out
}

// Os auxiliares de teste (`test-helpers.ts`) só são importados pelos testes, de propósito.
const isTest = (path: string) => /(\.test\.tsx?|\.d\.ts|\/test-helpers\.ts)$/.test(path)

/** Resolve `./x`, `../y/z` como o Vite: com ou sem extensão, ou o `index` da pasta. */
function resolveImport(from: string, spec: string): string | null {
  const base = resolve(dirname(from), spec.replace(/\?.*$/, ""))
  const candidates = [base, ...CODE.map((ext) => base + ext), ...CODE.map((ext) => join(base, "index" + ext))]
  for (const path of candidates) {
    try {
      if (statSync(path).isFile()) return path
    } catch {
      // não existe: tenta o próximo
    }
  }
  return null
}

/** Os caminhos relativos que um arquivo importa (`import`, `export … from`, `import()`, `new URL()` dos workers e
 * `@import` do CSS). */
function importsOf(path: string): string[] {
  const text = readFileSync(path, "utf8")
  const specs = [
    ...text.matchAll(/(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g),
    ...text.matchAll(/new URL\(\s*["'](\.{1,2}\/[^"']+)["']/g),
    ...text.matchAll(/@import\s+(?:url\()?["'](\.{1,2}\/[^"']+)["']/g),
  ].map((match) => match[1])
  return specs.map((spec) => resolveImport(path, spec)).filter((found): found is string => found !== null)
}

describe("arquivos órfãos", () => {
  it("todo arquivo de app/src é importado por alguém (fora dos testes)", () => {
    const files = walk(SRC).filter((path) => CODE.includes(extname(path)))
    // Pontos de entrada: as três páginas do Vite e o que o desktop importa do app.
    const entries = [...readFileSync(join(APP, "index.html"), "utf8").matchAll(/src="\.\/([^"]+)"/g)]
    for (const page of ["player.html", "master.html"])
      entries.push(...readFileSync(join(APP, page), "utf8").matchAll(/src="\.\/([^"]+)"/g))
    const used = new Set(entries.map((match) => resolve(APP, match[1])))
    const importers = [
      ...files.filter((path) => !isTest(path)),
      ...walk(join(ROOT, "desktop", "src")).filter((path) => /\.tsx?$/.test(path)),
      join(APP, "vite.config.ts"),
    ]
    for (const path of importers) for (const found of importsOf(path)) used.add(found)
    const orphans = files.filter((path) => !isTest(path) && !used.has(path)).map((path) => relative(APP, path))
    expect(orphans).toEqual([])
  })

  it("toda imagem de docs/imagens é citada em algum documento", () => {
    const folder = join(ROOT, "docs", "imagens")
    const images = walk(folder).map((path) => relative(folder, path))
    const skip = (path: string) => /(^|\/)(node_modules|\.git|dist|out|release|android)$/.test(path)
    const documents = [
      ...walk(join(ROOT, "docs"), skip),
      ...readdirSync(ROOT).map((name) => join(ROOT, name)),
    ].filter((path) => /\.(md|html)$/i.test(path))
    const text = documents.map((path) => readFileSync(path, "utf8")).join("\n")
    // Vale citar a imagem pelo nome ou a pasta inteira ("as capturas estão em `docs/imagens/vtt-9/`").
    const cited = (image: string) => {
      const [folder, ...rest] = image.split("/")
      if (text.includes(rest.length ? rest.join("/") : folder)) return true
      // As pastas têm nomes simples (`livros-8b`), sem caracteres especiais de expressão regular.
      return rest.length > 0 && new RegExp(`imagens/${folder}(?![\\w-])`).test(text)
    }
    const unused = images.filter((image) => !cited(image))
    expect(unused).toEqual([])
  })
})
