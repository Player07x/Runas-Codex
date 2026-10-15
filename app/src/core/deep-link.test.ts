import { deepLinkFor, notePathFromArgv, notePathFromUrl } from "./deep-link"

describe("endereço runas:// para abrir uma nota de fora", () => {
  it("ida e volta, com acentos e espaços", () => {
    const url = deepLinkFor("Wikis/Ordem x Caos/Personagens/Aldren Vael.md")
    expect(url).toBe("runas://abrir?nota=Wikis%2FOrdem%20x%20Caos%2FPersonagens%2FAldren%20Vael.md")
    expect(notePathFromUrl(url)).toBe("Wikis/Ordem x Caos/Personagens/Aldren Vael.md")
    expect(notePathFromUrl(deepLinkFor("Notas/Sessão 12.md"))).toBe("Notas/Sessão 12.md")
  })

  it("aceita sem a extensão, com barra no começo e quadros .canvas", () => {
    expect(notePathFromUrl("runas://abrir?nota=Notas/Caderno")).toBe("Notas/Caderno.md")
    expect(notePathFromUrl("runas://abrir/?nota=%2FNotas%2FCaderno.md")).toBe("Notas/Caderno.md")
    expect(notePathFromUrl("runas://abrir?nota=Campanhas/Quadro.canvas")).toBe("Campanhas/Quadro.canvas")
  })

  it("recusa o que sairia do cofre ou não é do app", () => {
    for (const bad of ["runas://abrir?nota=../segredo.md", "runas://abrir?nota=Notas/../../x.md", "runas://abrir?nota=C:/Windows/x.md", "runas://abrir", "runas://apagar?nota=Notas/x.md", "obsidian://open?file=x", "isto não é endereço"]) {
      expect(notePathFromUrl(bad)).toBeNull()
    }
  })

  it("acha o endereço na linha de comando (Windows e Linux)", () => {
    expect(notePathFromArgv(["/opt/Runas-Codex/runas-codex", "--no-sandbox", "runas://abrir?nota=Notas%2FCaderno.md"])).toBe("Notas/Caderno.md")
    expect(notePathFromArgv(["runas-codex.exe", "--smoke"])).toBeNull()
  })
})
