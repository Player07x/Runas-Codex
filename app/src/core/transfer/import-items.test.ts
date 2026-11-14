import { describe, expect, it } from "vitest"
import { strToU8 } from "fflate"
import { createTransferArchive, readTransferArchive, type TransferArchive, type TransferFile } from "./archive"
import { buildItemsImportPlan, canCopy, defaultCopyName, findIdentical, itemState, packageItems, type ItemChoice, type PackageItem } from "./import-items"
import { decodeTransferText } from "./plan"

const file = (path: string, body = `# ${path}\n`): TransferFile => ({ path, bytes: strToU8(body) })
const world = JSON.stringify({ formatVersion: 1, id: "porto-1234", title: "Porto Sombrio", createdAt: 1, updatedAt: 1 })
// Pacote como o da 1.3 (sem `itens`): wiki com imagem em Anexos, livro, mesa, campanha e uma nota solta.
const files = [
  file("Wikis/Cronos/Cronos.md", "# Cronos\n\n![[Mapa.png]]\n[[Aldeia]]\n"),
  file("Wikis/Cronos/Aldeia.md", "# Aldeia\n\n![[Brasão.png]]\n"),
  file("Wikis/Valknut/Valknut.md", "# Valknut\n\n![[Brasão.png]]\n"),
  file("Livros/Guia/Guia.md", "---\ntipo: livro\nestrutura:\n  - \"[[Prólogo]]\"\n---\n# Guia\n"),
  file("Livros/Guia/Prólogo.md"),
  file("Campanhas/Porto/Porto.md", "---\nmesa: porto-1234\n---\n# Porto\n"),
  file(".runas/mesas/porto-1234/mesa.json", world),
  file("Anexos/Imagens/Mapa.png", "mapa"),
  file("Anexos/Imagens/Brasão.png", "brasão"),
  file("Notas/Ideias.md"),
]
const pack = (list: TransferFile[] = files, items?: TransferArchive["items"]): TransferArchive => ({ title: "Cofre do João", kind: "runas", files: list, ignored: [], ...(items ? { items } : {}) })
const byId = (items: PackageItem[], id: string) => items.find(item => item.id === id)!
const entry = (path: string, body = `# ${path}\n`) => ({ path, size: strToU8(body).length, mtime: 5 })
const choose = (...pairs: [string, ItemChoice][]) => new Map(pairs)

describe("importar por itens (U53)", () => {
  it("deduz os itens pelas pastas num pacote sem itens (1.3, Obsidian)", () => {
    const items = packageItems(pack())
    expect(items.map(item => item.id)).toEqual(["wiki:Cronos", "wiki:Valknut", "livro:Livros/Guia/Guia.md", "mesa:.runas/mesas/porto-1234", "campanha:Porto", "pasta:Anexos", "pasta:Notas"])
    expect(byId(items, "wiki:Cronos")).toMatchObject({ own: ["Wikis/Cronos/Cronos.md", "Wikis/Cronos/Aldeia.md"], uses: ["Anexos/Imagens/Brasão.png", "Anexos/Imagens/Mapa.png"] })
    expect(byId(items, "mesa:.runas/mesas/porto-1234").name).toBe("Porto Sombrio")
    // Todo arquivo do pacote é de algum item.
    const own = new Set(items.flatMap(item => item.own))
    for (const item of files) expect(own.has(item.path)).toBe(true)
  })

  it("usa os itens do manifesto e o leitor aceita o campo novo", async () => {
    const spec = [{ tipo: "wiki" as const, nome: "Cronos", raizes: ["Wikis/Cronos"], caminhos: ["Wikis/Cronos/Cronos.md", "Wikis/Cronos/Aldeia.md", "Anexos/Imagens/Mapa.png", "Sumiu.md"] }]
    const read = await readTransferArchive(await createTransferArchive("Cofre", files, "runas", undefined, spec))
    expect(read.items).toEqual(spec)
    const items = packageItems(read)
    expect(items[0]).toMatchObject({ id: "pacote:0", name: "Cronos", own: ["Wikis/Cronos/Cronos.md", "Wikis/Cronos/Aldeia.md"], uses: ["Anexos/Imagens/Mapa.png"] })
    // O que o manifesto não cobre continua aparecendo, deduzido.
    expect(items.map(item => item.id)).toContain("wiki:Valknut")
  })

  it("ignora itens malformados no manifesto e volta a deduzir", async () => {
    const bytes = await createTransferArchive("Cofre", files, "runas", undefined, [{ tipo: "nave" as never, nome: "X", raizes: [], caminhos: [] }])
    expect((await readTransferArchive(bytes)).items).toBeUndefined()
  })

  it("diz se o item é novo ou já existe, com iguais e diferentes", async () => {
    const existing = [entry("Wikis/Cronos/Cronos.md", "# Cronos\n\n![[Mapa.png]]\n[[Aldeia]]\n"), entry("Wikis/Cronos/Aldeia.md", "# Outra aldeia, maior\n")]
    const vault: Record<string, Uint8Array> = { "Wikis/Cronos/Cronos.md": files[0]!.bytes, "Wikis/Cronos/Aldeia.md": strToU8("# Outra aldeia, maior\n") }
    const identical = await findIdentical(pack(), existing, async path => vault[path]!)
    expect([...identical]).toEqual(["Wikis/Cronos/Cronos.md"])
    const items = packageItems(pack())
    expect(itemState(byId(items, "wiki:Cronos"), existing, identical)).toEqual({ exists: true, fresh: 0, same: 1, changed: 1 })
    expect(itemState(byId(items, "wiki:Valknut"), existing, identical)).toEqual({ exists: false, fresh: 1, same: 0, changed: 0 })
    expect(itemState(byId(items, "mesa:.runas/mesas/porto-1234"), [entry(".runas/mesas/porto-1234/cenas/a.json")], identical).exists).toBe(true)
  })

  it("só o item marcado entra, com os anexos que ele usa", () => {
    const items = packageItems(pack())
    const plan = buildItemsImportPlan(pack(), [], items, choose(["wiki:Valknut", { strategy: "merge" }]), new Set())
    expect(plan.writes.map(write => write.path).sort()).toEqual(["Anexos/Imagens/Brasão.png", "Wikis/Valknut/Valknut.md"])
  })

  it("substituir troca só os arquivos diferentes; o anexo de fora só entra se faltar", () => {
    const items = packageItems(pack())
    const existing = [entry("Wikis/Cronos/Cronos.md"), entry("Wikis/Cronos/Aldeia.md"), entry("Anexos/Imagens/Mapa.png")]
    const plan = buildItemsImportPlan(pack(), existing, items, choose(["wiki:Cronos", { strategy: "replace" }]), new Set(["Wikis/Cronos/Cronos.md"]))
    expect(plan.writes.map(write => write.path).sort()).toEqual(["Anexos/Imagens/Brasão.png", "Wikis/Cronos/Aldeia.md"])
    expect(plan.replacements.map(item => item.path)).toEqual(["Wikis/Cronos/Aldeia.md"])
    expect(plan.identical).toEqual(["Wikis/Cronos/Cronos.md"])
    expect(plan.skipped).toContain("Anexos/Imagens/Mapa.png")
  })

  it("importa a wiki como cópia com o nome escolhido, links ajustados e a página inicial renomeada", () => {
    const items = packageItems(pack()), cronos = byId(items, "wiki:Cronos")
    expect(canCopy(cronos)).toBe(true)
    expect(defaultCopyName(cronos)).toBe("Cronos (cópia)")
    const existing = [entry("Wikis/Cronos/Cronos.md"), entry("Anexos/Imagens/Mapa.png")]
    const plan = buildItemsImportPlan(pack(), existing, items, choose(["wiki:Cronos", { strategy: "duplicate", name: "Cronos 2" }]), new Set())
    expect(plan.destinations).toEqual({ "wiki:Cronos": "Wikis/Cronos 2" })
    expect(plan.writes.map(write => write.path).sort()).toEqual(["Anexos/Imagens/Brasão.png", "Wikis/Cronos 2/Aldeia.md", "Wikis/Cronos 2/Cronos 2.md"])
    const home = decodeTransferText(plan.writes.find(write => write.path.endsWith("Cronos 2.md"))!.bytes)
    expect(home).toContain("[[Wikis/Cronos 2/Aldeia]]")
    // A imagem compartilhada não é copiada: o link continua achando a que já está no cofre.
    expect(home).toContain("![[Mapa.png]]")
    expect(() => buildItemsImportPlan(pack(), existing, items, choose(["wiki:Cronos", { strategy: "duplicate", name: "a/b" }]), new Set())).toThrow("Nome da cópia")
  })

  it("a cópia da mesa ganha outro id, outra pasta e o nome escolhido", () => {
    const items = packageItems(pack()), mesa = byId(items, "mesa:.runas/mesas/porto-1234")
    const plan = buildItemsImportPlan(pack(), [entry(".runas/mesas/porto-1234/mesa.json", world)], items, choose([mesa.id, { strategy: "duplicate", name: "Porto Novo" }]), new Set(), () => "novo5678")
    const manifest = plan.writes.at(-1)!
    expect(manifest.path).toBe(".runas/mesas/porto-novo-novo5678/mesa.json")
    expect(JSON.parse(decodeTransferText(manifest.bytes))).toMatchObject({ id: "novo5678", title: "Porto Novo" })
    expect(plan.destinations[mesa.id]).toBe(".runas/mesas/porto-novo-novo5678")
  })

  it("junta ações diferentes em itens diferentes", () => {
    const items = packageItems(pack())
    const existing = [entry("Wikis/Cronos/Cronos.md"), entry("Notas/Ideias.md", "# antiga\n")]
    const plan = buildItemsImportPlan(pack(), existing, items, choose(["wiki:Cronos", { strategy: "duplicate", name: "Cronos 2" }], ["pasta:Notas", { strategy: "replace" }], ["wiki:Valknut", { strategy: "merge" }]), new Set())
    const paths = plan.writes.map(write => write.path)
    expect(paths).toContain("Notas/Ideias.md")
    expect(paths).toContain("Wikis/Valknut/Valknut.md")
    expect(paths).toContain("Wikis/Cronos 2/Aldeia.md")
    expect(paths).not.toContain("Wikis/Cronos/Cronos.md")
    expect(paths.filter(path => path.endsWith("Brasão.png"))).toEqual(["Anexos/Imagens/Brasão.png"])
    expect(plan.replacements.map(item => item.path)).toEqual(["Notas/Ideias.md"])
  })

  it("a Agenda e os arquivos soltos não viram cópia com nome", () => {
    const items = packageItems(pack([...files, file("Agenda/2026-11-20 Sessão.md"), file("LEIA-ME.md")]))
    expect(canCopy(byId(items, "agenda"))).toBe(false)
    expect(canCopy(byId(items, "outros:"))).toBe(false)
  })
})
