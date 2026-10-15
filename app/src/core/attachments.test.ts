import { appConfig, attachmentFolder, attachmentPath, availableAttachmentPath, cleanAttachmentName } from "./attachments"

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
