import { appConfig, attachmentEmbed, attachmentFolder, attachmentFolderLabel, attachmentPath, availableAttachmentPath, cleanAttachmentName, imageExtension, pastedImageName, unusedAttachments } from "./attachments"
import { VaultIndex } from "./vault-index"

describe("appConfig", () => {
  it("lê a pasta de anexos e o formato de link do app.json, com os padrões do Obsidian", () => {
    expect(appConfig({})).toEqual({ attachmentFolder: "/", newLinkFormat: "shortest", useMarkdownLinks: false })
    expect(appConfig({ attachmentFolderPath: " Anexos ", newLinkFormat: "relative", useMarkdownLinks: true })).toEqual({
      attachmentFolder: "Anexos",
      newLinkFormat: "relative",
      useMarkdownLinks: true,
    })
    expect(appConfig({ attachmentFolderPath: 3, newLinkFormat: "outro" })).toEqual({ attachmentFolder: "/", newLinkFormat: "shortest", useMarkdownLinks: false })
  })
})

describe("attachmentFolder", () => {
  const note = "Wikis/Ordem x Caos/Personagens/Aldren.md"
  it("raiz do cofre, pasta fixa, pasta da nota e subpasta da nota", () => {
    expect(attachmentFolder("/", note)).toBe("")
    expect(attachmentFolder("", note)).toBe("")
    expect(attachmentFolder("Anexos/Imagens/", note)).toBe("Anexos/Imagens")
    expect(attachmentFolder("/Anexos", note)).toBe("Anexos")
    expect(attachmentFolder("./", note)).toBe("Wikis/Ordem x Caos/Personagens")
    expect(attachmentFolder("./imagens", note)).toBe("Wikis/Ordem x Caos/Personagens/imagens")
  })

  it("sem nota, `./` cai na raiz; caminho que sai do cofre é recusado", () => {
    expect(attachmentFolder("./", undefined)).toBe("")
    expect(attachmentFolder("./img", "Nota.md")).toBe("img")
    expect(attachmentFolder("../fora", note)).toBeNull()
  })
})

describe("cleanAttachmentName", () => {
  it("troca os caracteres que quebram links ou o Windows e põe a extensão em minúsculas", () => {
    expect(cleanAttachmentName("mapa do reino.png")).toBe("mapa do reino.png")
    expect(cleanAttachmentName("Mapa #1 [final]: norte?.JPG")).toBe("Mapa -1 -final-- norte-.jpg")
    expect(cleanAttachmentName("C:\\Users\\joao\\Desktop\\foto.jpeg")).toBe("foto.jpeg")
    expect(cleanAttachmentName("pasta/imagem.webp")).toBe("imagem.webp")
  })

  it("nome vazio, oculto ou reservado vira `anexo`", () => {
    expect(cleanAttachmentName(".png")).toBe("anexo.png")
    expect(cleanAttachmentName("...png")).toBe("anexo.png")
    expect(cleanAttachmentName(".oculto.gif")).toBe("oculto.gif")
    expect(cleanAttachmentName("con.png")).toBe("anexo.png")
  })
})

describe("availableAttachmentPath", () => {
  it("usa o nome livre ou numera como o Obsidian, sem diferenciar maiúsculas", () => {
    const existing = ["Anexos/mapa.png", "Anexos/Mapa 1.PNG", "Notas/mapa 2.png"]
    expect(availableAttachmentPath("Anexos", "capa.png", existing)).toBe("Anexos/capa.png")
    expect(availableAttachmentPath("Anexos", "mapa.png", existing)).toBe("Anexos/mapa 2.png")
    expect(availableAttachmentPath("", "mapa.png", existing)).toBe("mapa.png")
    expect(availableAttachmentPath("", "LEIA-ME", ["LEIA-ME"])).toBe("LEIA-ME 1")
  })
})

describe("attachmentPath", () => {
  it("junta a pasta da configuração, o nome limpo e o número livre", () => {
    expect(attachmentPath("./", "Captura: tela.png", ["Notas/Captura- tela.png"], "Notas/Sessão.md")).toBe("Notas/Captura- tela 1.png")
    expect(attachmentPath("Anexos", "mapa.png", [], "Notas/Sessão.md")).toBe("Anexos/mapa.png")
  })

  it("explica quando a pasta de anexos sai do cofre ou é oculta", () => {
    expect(() => attachmentPath("../fora", "a.png", [])).toThrow("fora do cofre")
    expect(() => attachmentPath(".anexos", "a.png", [])).toThrow("Pasta de anexos “.anexos”")
  })
})

describe("imagem colada", () => {
  it("dá nome com data e hora e extensão pelo tipo", () => {
    expect(pastedImageName(new Date(2026, 9, 14, 9, 5, 7), ".png")).toBe("Imagem colada 20261014090507.png")
    expect(imageExtension("image/jpeg")).toBe(".jpg")
    expect(imageExtension("IMAGE/PNG")).toBe(".png")
    expect(imageExtension("image/tiff")).toBeNull()
  })
})

describe("attachmentEmbed", () => {
  const entry = (path: string) => ({ path, size: 1, mtime: 1 })
  const index = new VaultIndex([entry("Notas/Sessão.md"), entry("Notas/mapa.png"), entry("Anexos/Imagem colada 1.png"), entry("Wikis/mapa.png")], { "Notas/Sessão.md": "" })
  const app = appConfig({})

  it("wikilink com o nome curto quando é único, e caminho completo quando não é", () => {
    expect(attachmentEmbed("Anexos/Imagem colada 1.png", "Anexos/Nota.md", app, index)).toBe("![[Imagem colada 1.png]]")
    expect(attachmentEmbed("Notas/mapa.png", "Notas/Sessão.md", app, index)).toBe("![[Notas/mapa.png]]")
    expect(attachmentEmbed("Notas/mapa.png", "Notas/Sessão.md", { ...app, newLinkFormat: "absolute" }, index)).toBe("![[Notas/mapa.png]]")
  })

  it("links em Markdown: relativo e com espaços codificados", () => {
    const markdown = { ...app, useMarkdownLinks: true }
    expect(attachmentEmbed("Anexos/Imagem colada 1.png", "Notas/Sessão.md", { ...markdown, newLinkFormat: "relative" }, index)).toBe("![](../Anexos/Imagem%20colada%201.png)")
    expect(attachmentEmbed("Anexos/Imagem colada 1.png", "Notas/Sessão.md", { ...markdown, newLinkFormat: "absolute" }, index)).toBe("![](Anexos/Imagem%20colada%201.png)")
  })
})

describe("attachmentFolderLabel", () => {
  it("descreve a configuração do Obsidian", () => {
    expect(attachmentFolderLabel("/")).toBe("Raiz do cofre")
    expect(attachmentFolderLabel("./")).toBe("Mesma pasta da nota")
    expect(attachmentFolderLabel("./img")).toBe("Subpasta “img” da nota")
    expect(attachmentFolderLabel("Anexos/")).toBe("Pasta “Anexos”")
  })
})

describe("unusedAttachments", () => {
  it("lista só os anexos que nenhum texto usa, nem por link, propriedade, bloco ou quadro", () => {
    const files: Record<string, string> = {
      "Notas/A.md": "![[usada.png|direita|300]] e ![](Anexos/Com%20espaço.jpg)",
      "Wikis/Mapa.md": '```runas-mapa\nimagem: "[[mapa.png]]"\n```',
      "Livros/Livro.md": '---\ncapa: "[[capa.png]]"\n---\n',
    }
    const paths = [...Object.keys(files), "usada.png", "Anexos/Com espaço.jpg", "mapa.png", "capa.png", "no-quadro.png", "sobra.png", "Anexos/sobra.pdf", "leia.txt"]
    const index = new VaultIndex(paths.map((path) => ({ path, size: 1, mtime: 1 })), files)
    expect(unusedAttachments(index, ['{"nodes":[{"type":"file","file":"no-quadro.png"}]}'])).toEqual(["Anexos/sobra.pdf", "sobra.png"])
  })
})
