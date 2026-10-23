import { articleCategory, campaignLook, campaignOfPath, categoryLook, categoryNotePath, imageTarget, isCategoryNote, lookOf, lookProperties } from "./personalization"
import { parseTone } from "./tones"
import { VaultIndex } from "./vault-index"

const vault = (files: Record<string, string>) => new VaultIndex(Object.entries(files).map(([path, text]) => ({ path, size: text.length, mtime: 1 })), files)

describe("personalização de campanhas e categorias", () => {
  it("lê cor, ícone, capa e descrição da nota", () => {
    const look = lookOf({ cor: "Brasa", icone: "coroa", capa: "[[Imagens/valdris.png|Valdris]]", descricao: " Quem vive no condado " })
    expect(look.tone?.id).toBe("brasa")
    expect(look.emblem).toBe("coroa")
    expect(look.cover).toBe("Imagens/valdris.png")
    expect(look.description).toBe("Quem vive no condado")
    expect(lookOf(undefined)).toEqual({ tone: null, emblem: null, cover: null })
  })

  it("aceita a capa como embed, texto simples ou lista", () => {
    expect(imageTarget("![[capa.jpg]]")).toBe("capa.jpg")
    expect(imageTarget("Anexos/capa.webp")).toBe("Anexos/capa.webp")
    expect(imageTarget(["[[a.png]]", "[[b.png]]"])).toBe("a.png")
    expect(imageTarget("")).toBeNull()
  })

  it("acha a campanha pelo caminho e lê a nota dela", () => {
    const index = vault({ "Campanhas/Valdris/Valdris.md": "---\ncor: jade\nicone: castelo\n---\n" })
    expect(campaignOfPath("Campanhas/Valdris/Sessões/Sessão 12.md")).toBe("Valdris")
    expect(campaignOfPath("Agenda/x.md")).toBeNull()
    expect(campaignLook(index, "Valdris").tone?.id).toBe("jade")
    expect(campaignLook(index, "Outra").tone).toBeNull()
  })

  it("só a nota com tipo: categoria personaliza a pasta", () => {
    const index = vault({
      "Wikis/Mundo/Personagens/Personagens.md": "---\ntipo: categoria\ncor: ametista\nicone: pessoa\n---\n",
      "Wikis/Mundo/Locais/Locais.md": "---\ntipo: local\ncor: jade\n---\n",
    })
    expect(categoryNotePath("Wikis/Mundo/Personagens")).toBe("Wikis/Mundo/Personagens/Personagens.md")
    expect(categoryLook(index, "Wikis/Mundo/Personagens").tone?.id).toBe("ametista")
    expect(categoryLook(index, "Wikis/Mundo/Locais").tone).toBeNull()
    expect(isCategoryNote(index.note("Wikis/Mundo/Personagens/Personagens.md")!)).toBe(true)
    expect(isCategoryNote(index.note("Wikis/Mundo/Locais/Locais.md")!)).toBe(false)
  })

  it("a categoria do artigo é a primeira pasta dentro da wiki", () => {
    expect(articleCategory("Wikis/Mundo/Personagens/Nobres/Ormund.md", "Wikis/Mundo/")).toBe("Wikis/Mundo/Personagens")
    expect(articleCategory("Wikis/Mundo/Solto.md", "Wikis/Mundo/")).toBeNull()
    expect(articleCategory("Notas/x.md", "Wikis/Mundo")).toBeNull()
  })

  it("monta as propriedades a gravar, trocando só a classe do tom", () => {
    const entries = lookProperties({ tone: parseTone("ceu"), emblem: "lua", cover: "capa.png", description: "" }, { cssclasses: ["larga", "runas-cor-brasa"] }, true)
    expect(Object.fromEntries(entries)).toEqual({ cor: "ceu", icone: "lua", capa: "[[capa.png]]", cssclasses: ["larga", "runas-cor-ceu"], descricao: undefined })
    const cleared = Object.fromEntries(lookProperties({ tone: null, emblem: null, cover: null }, { cssclasses: ["runas-cor-ceu"] }, false))
    expect(cleared).toEqual({ cor: undefined, icone: undefined, capa: undefined, cssclasses: undefined })
  })
})
