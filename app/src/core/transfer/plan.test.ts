import { describe, expect, it } from "vitest"
import { strToU8 } from "fflate"
import { VaultIndex } from "../vault-index"
import { buildImportPlan, decodeTransferText, sameTransferVersion, selectTransferPaths } from "./plan"
import type { TransferArchive, TransferFile } from "./archive"
const file = (path: string, body = "# Nota\n") => ({ path, bytes: strToU8(body) })
const archive = (...files: TransferFile[]): TransferArchive => ({ title: "Meu cofre", kind: "runas", files, ignored: [] })
const entry = (path: string, mtime = 10, size = 7) => ({ path, size, mtime })
describe("planejamento das transferências", () => {
  it("recusa arquivos avulsos com o mesmo nome ou com caminhos incompatíveis", () => {
    expect(() => buildImportPlan(archive(file("Notas/a.md"), file("Notas/A.md")), [], "merge")).toThrow("repete")
    expect(() => buildImportPlan(archive(file("Notas/a.md"), file("Notas/a.md/b.md")), [], "merge")).toThrow("ocupa")
  })
  it("mescla criando somente arquivos novos e informa os conflitos", () => {
    const plan = buildImportPlan(archive(file("Notas/a.md"), file("Notas/b.md")), [entry("Notas/a.md")], "merge")
    expect(plan.skipped).toEqual(["Notas/a.md"])
    expect(plan.writes).toEqual([{ ...file("Notas/b.md"), expected: null }])
    expect(plan.replacements).toEqual([])
  })
  it("substitui com a versão da prévia, incluindo caixa real do arquivo existente", () => {
    const previous = entry("Notas/A.md")
    const plan = buildImportPlan(archive(file("notas/a.md")), [previous], "replace")
    expect(plan.writes[0]).toMatchObject({ path: "Notas/A.md", expected: previous })
    previous.mtime += 5
    expect(plan.writes[0]!.expected!.mtime).toBe(10)
    expect(sameTransferVersion(previous, plan.writes[0]!.expected)).toBe(false)
    previous.size++
    expect(sameTransferVersion(previous, plan.writes[0]!.expected)).toBe(false)
  })
  it("recusa arquivo sobre pasta e pasta sobre arquivo", () => {
    expect(() => buildImportPlan(archive(file("Notas/a.md")), [entry("Notas")], "replace")).toThrow("ocupa a pasta")
    expect(() => buildImportPlan(archive(file("Notas")), [entry("Notas/a.md")], "replace")).toThrow("pasta existente")
  })
  it("mantém a caixa das pastas existentes ao criar arquivos", () => {
    expect(buildImportPlan(archive(file("notas/b.md")), [entry("Notas/a.md")], "merge").writes[0]!.path).toBe("Notas/b.md")
  })
  it("duplica sem misturar wikis/campanhas e remapeia links, subcaminhos e anexos", () => {
    const input = archive(file("Wikis/Valdris/Porto.md", "\ufeff# Porto\r\n[[Wikis/Valdris/Rei#História|o rei]] ![[Anexos/mapa.png]]\r\n"), file("Wikis/Valdris/Rei.md"), file("Anexos/mapa.png", "png"))
    const plan = buildImportPlan(input, [entry("Wikis/Valdris/Porto.md")], "duplicate")
    expect(plan.writes.every(write => write.expected === null)).toBe(true)
    const porto = plan.writes.find(write => write.path.endsWith("Porto.md"))!
    expect(porto.path).toBe("Wikis/Valdris (importado)/Porto.md")
    const text = decodeTransferText(porto.bytes)
    expect(text).toContain("[[Wikis/Valdris (importado)/Rei#História|o rei]]")
    expect(text).toContain("![[Anexos/Importado - Meu cofre/mapa.png]]")
    expect(text.startsWith("\ufeff")).toBe(true)
    expect(text.endsWith("\r\n")).toBe(true)
  })
  it("cria novo ID e pasta para duplicar uma mesa e publica o manifesto por último", () => {
    const manifest = JSON.stringify({ formatVersion: 1, id: "velho", title: "Porto", createdAt: 1, updatedAt: 1 })
    const input = archive(file(".runas/mesas/porto-velho/mesa.json", manifest), file(".runas/mesas/porto-velho/outros.json", "[]"), file("Notas/Mesa.md", "---\nmesa: velho\n---"))
    const plan = buildImportPlan(input, [], "duplicate", () => "novo1234")
    expect(plan.writes.at(-1)!.path).toBe(".runas/mesas/porto-copia-novo1234/mesa.json")
    expect(JSON.parse(decodeTransferText(plan.writes.at(-1)!.bytes)).id).toBe("novo1234")
    expect(decodeTransferText(plan.writes.find(write => write.path.endsWith("Mesa.md"))!.bytes)).toContain("mesa: novo1234")
  })
  it("não mescla pedaços de uma mesa já existente nem aceita mesa sem manifesto", () => {
    const input = archive(file(".runas/mesas/porto-velho/mesa.json", JSON.stringify({ formatVersion: 1, id: "velho", title: "Porto" })), file(".runas/mesas/porto-velho/cenas/nova.json", "[]"))
    expect(buildImportPlan(input, [entry(input.files[0]!.path)], "merge").writes).toEqual([])
    expect(() => buildImportPlan(archive(input.files[1]!), [], "merge")).toThrow("incompleta")
  })
  it("anexos acompanham notas e notas ligadas são opcionais, inclusive com ciclos", () => {
    const texts = { "Notas/a.md": "[[b]] ![[mapa.png]]", "Notas/b.md": "[[a]]" }
    const entries = [...Object.keys(texts).map(path => entry(path)), entry("Anexos/mapa.png")]
    const index = new VaultIndex(entries, texts)
    expect(selectTransferPaths(index, entries, ["Notas/a.md"], false, false)).toEqual(["Anexos/mapa.png", "Notas/a.md"])
    expect(selectTransferPaths(index, entries, ["Notas/a.md"], true, false)).toHaveLength(3)
  })
  it("leva os eventos que apontam à sessão e os dados da mesa ligada à campanha", () => {
    const texts = { "Campanhas/Porto/Porto.md": "---\nmesa: abcdefgh-1234\n---\n", "Campanhas/Porto/Sessão.md": "# Sessão", "Agenda/Sábado.md": '---\nsessao: "[[Campanhas/Porto/Sessão]]"\n---\n' }
    const entries = [...Object.keys(texts).map(path => entry(path)), entry(".runas/mesas/porto-abcdefgh/mesa.json"), entry(".runas/mesas/outra/mesa.json")]
    const paths = selectTransferPaths(new VaultIndex(entries, texts), entries, ["Campanhas/Porto"], true, false, new Map([["abcdefgh-1234", ".runas/mesas/porto-abcdefgh"]]))
    expect(paths).toHaveLength(4)
    expect(paths).toContain("Agenda/Sábado.md")
    expect(paths).not.toContain(".runas/mesas/outra/mesa.json")
  })
  it("não substitui texto inválido nem aceita criação sobre um arquivo que apareceu depois", () => {
    expect(() => buildImportPlan(archive({ path: "Notas/a.md", bytes: new Uint8Array([255]) }), [], "merge")).toThrow("UTF-8")
    expect(sameTransferVersion(entry("Notas/a.md"), null)).toBe(false)
    expect(sameTransferVersion(undefined, entry("Notas/a.md"))).toBe(false)
  })
})
