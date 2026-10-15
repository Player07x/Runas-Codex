import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { contextMenuTemplate, DICTIONARY_FILE, needsCopy, type MenuParams } from "../src/main/spellcheck"

const folder = join(__dirname, "..", "resources", "dicionarios")

describe("dicionário do corretor (sem rede)", () => {
  it("o arquivo embutido é o do LEIA-ME (mesmo SHA-256) e é um dicionário do Chromium", () => {
    const bytes = readFileSync(join(folder, DICTIONARY_FILE))
    const readme = readFileSync(join(folder, "LEIA-ME.md"), "utf8")
    expect(bytes.subarray(0, 4).toString("latin1")).toBe("BDic")
    expect(readme).toContain(createHash("sha256").update(bytes).digest("hex"))
    expect(readFileSync(join(folder, "LICENCA-LGPL-2.1.txt"), "utf8")).toContain("GNU LESSER GENERAL PUBLIC LICENSE")
  })

  it("copia quando falta ou quando o do perfil é outro, e não regrava o igual", () => {
    const bundled = new Uint8Array([1, 2, 3])
    expect(needsCopy(bundled, null)).toBe(true)
    expect(needsCopy(bundled, new Uint8Array([1, 2]))).toBe(true)
    expect(needsCopy(bundled, new Uint8Array([1, 2, 4]))).toBe(true)
    expect(needsCopy(bundled, new Uint8Array([1, 2, 3]))).toBe(false)
  })

  it("o clique direito mostra as sugestões, adicionar ao dicionário e as ações de texto", () => {
    const flags = { canCut: true, canCopy: true, canPaste: true, canUndo: true, canRedo: true, canDelete: true, canSelectAll: true, canEditRichly: false }
    const done: string[] = []
    const actions = { replace: (w: string) => done.push(`trocar:${w}`), addWord: (w: string) => done.push(`dicionário:${w}`) }
    const wrong: MenuParams = { misspelledWord: "palavrra", dictionarySuggestions: ["palavra", "palavras"], isEditable: true, editFlags: flags, selectionText: "" }
    const items = contextMenuTemplate(wrong, actions)
    expect(items.map((i) => i.label ?? i.type)).toEqual(["palavra", "palavras", "Adicionar “palavrra” ao dicionário", "separator", "Recortar", "Copiar", "Colar", "Selecionar tudo"])
    items[0]!.click!({} as never, undefined, {} as never)
    items[2]!.click!({} as never, undefined, {} as never)
    expect(done).toEqual(["trocar:palavra", "dicionário:palavrra"])
    expect(contextMenuTemplate({ ...wrong, dictionarySuggestions: [] }, actions)[0]).toMatchObject({ label: "Sem sugestões", enabled: false })
    // Fora de campo de texto: só "Copiar" com seleção; sem seleção, nenhum menu.
    expect(contextMenuTemplate({ ...wrong, misspelledWord: "", isEditable: false, selectionText: "trecho" }, actions).map((i) => i.label)).toEqual(["Copiar"])
    expect(contextMenuTemplate({ ...wrong, misspelledWord: "", isEditable: false, selectionText: "" }, actions)).toEqual([])
  })
})
