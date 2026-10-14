import { isValidTag, maskNonContent, parseFrontmatter, parseNote } from "./parse"
import { detectFormat, fromEditorText, joinPath, relativePath, textToSave, toEditorText } from "./text"

describe("parseFrontmatter", () => {
  it("lê o YAML e as posições, com BOM e CRLF", () => {
    const text = "﻿---\r\ntags: [a, b]\r\ntitulo: Olá\r\n---\r\n# Corpo\r\n"
    const fm = parseFrontmatter(text)!
    expect(fm.data).toEqual({ tags: ["a", "b"], titulo: "Olá" })
    expect(text.slice(fm.yamlStart, fm.yamlEnd)).toBe("tags: [a, b]\r\ntitulo: Olá")
    expect(text.slice(fm.end)).toBe("# Corpo\r\n")
  })

  it("aceita frontmatter vazio e marca YAML inválido sem quebrar", () => {
    expect(parseFrontmatter("---\n---\ntexto")!.data).toEqual({})
    const broken = parseFrontmatter("---\ntags: [a\n---\n")!
    expect(broken.data).toBeNull()
    expect(broken.error).toBeTruthy()
  })

  it("só vale no começo do arquivo", () => {
    expect(parseFrontmatter("\n---\na: 1\n---\n")).toBeNull()
  })
})

describe("maskNonContent", () => {
  it("apaga código, comentários e matemática mantendo o tamanho", () => {
    const text = "a [[x]]\n```\n[[y]]\n```\n`[[z]]` %%[[w]]%% $$[[v]]$$ <!-- [[u]] -->"
    const masked = maskNonContent(text)
    expect(masked).toHaveLength(text.length)
    expect(masked).toContain("[[x]]")
    for (const name of ["y", "z", "w", "v", "u"]) expect(masked).not.toContain(`[[${name}]]`)
  })

  it("fecha a cerca só com o mesmo caractere e tamanho igual ou maior", () => {
    const masked = maskNonContent("````\n```\n[[dentro]]\n````\n[[fora]]")
    expect(masked).not.toContain("[[dentro]]")
    expect(masked).toContain("[[fora]]")
  })
})

describe("parseNote: links", () => {
  it("lê todas as formas de wikilink", () => {
    const text = "[[Nota]] [[Pasta/Nota.md|apelido]] [[Nota#Título#Sub]] [[Nota#^bloco]] [[#Local]] ![[mapa.png|400]]"
    const links = parseNote(text).links
    expect(links.map((l) => [l.target, l.subpath, l.alias, l.embed])).toEqual([
      ["Nota", undefined, undefined, false],
      ["Pasta/Nota.md", undefined, "apelido", false],
      ["Nota", "#Título#Sub", undefined, false],
      ["Nota", "#^bloco", undefined, false],
      ["", "#Local", undefined, false],
      ["mapa.png", undefined, "400", true],
    ])
    for (const link of links) expect(text.slice(link.start, link.end)).toBe(link.raw)
  })

  it("aceita a barra escapada das tabelas", () => {
    expect(parseNote("| [[Nota\\|apelido]] |").links[0]).toMatchObject({ target: "Nota", alias: "apelido" })
  })

  it("lê links markdown relativos, com <espaços> e codificados, e ignora URLs", () => {
    const links = parseNote("[a](Pasta/Nota.md) [b](<Outra pasta/Com espaço.md>) [c](Com%20espa%C3%A7o.md#Sec) [d](https://x.com) ![e](img/f.png)").links
    expect(links.map((l) => [l.target, l.subpath ?? "", l.angle ?? false, l.encoded ?? false, l.embed])).toEqual([
      ["Pasta/Nota.md", "", false, false, false],
      ["Outra pasta/Com espaço.md", "", true, false, false],
      ["Com espaço.md", "#Sec", false, true, false],
      ["img/f.png", "", false, false, true],
    ])
  })

  it("acha wikilinks nas propriedades e ignora código", () => {
    const text = "---\nlocal: \"[[Valdris]]\"\n---\n`[[não]]`\n[[sim]]\n"
    const links = parseNote(text).links
    expect(links.map((l) => [l.target, l.inFrontmatter])).toEqual([
      ["Valdris", true],
      ["sim", false],
    ])
  })
})

describe("parseNote: tags, apelidos, títulos e blocos", () => {
  it("junta tags do frontmatter e do texto, sem números puros, código ou URLs", () => {
    const text = "---\ntags:\n  - npc\n  - '#local/cidade'\ntag: antiga\n---\n# Título\nTexto #npc #Sessão #1492 #1492a `#codigo` http://x.com/#ancora #a/b\n"
    expect(parseNote(text).tags).toEqual(["npc", "local/cidade", "Sessão", "1492a", "a/b"])
  })

  it("aceita tags em texto separado por vírgula e a chave antiga `tag`", () => {
    expect(parseNote("---\ntag: a, b\n---\n").tags).toEqual(["a", "b"])
  })

  it("lê apelidos em lista ou texto", () => {
    expect(parseNote("---\naliases: [O Cinzento, Aldren]\n---\n").aliases).toEqual(["O Cinzento", "Aldren"])
    expect(parseNote("---\nalias: Velho\n---\n").aliases).toEqual(["Velho"])
  })

  it("lê títulos e IDs de bloco fora do código", () => {
    const meta = parseNote("# Um\n## Dois ##\n```\n# não\n```\nParágrafo ^abc-1\n")
    expect(meta.headings).toEqual([
      { level: 1, text: "Um", line: 0 },
      { level: 2, text: "Dois", line: 1 },
    ])
    expect(meta.blocks).toEqual(["abc-1"])
  })

  it("valida tags como o Obsidian", () => {
    expect(isValidTag("1492")).toBe(false)
    expect(isValidTag("y1492")).toBe(true)
    expect(isValidTag("local/cidade")).toBe(true)
    expect(isValidTag("com espaço")).toBe(false)
  })
})

describe("text", () => {
  it("preserva CRLF e BOM ida e volta", () => {
    const original = "﻿a\r\nb\r\n"
    const format = detectFormat(original)
    expect(format).toEqual({ bom: true, eol: "\r\n" })
    expect(fromEditorText(toEditorText(original), format)).toBe(original)
  })

  it("não grava o que não mudou", () => {
    expect(textToSave("a\r\nb", "a\nb")).toBeNull()
    expect(textToSave("a\r\nb", "a\nc")).toBe("a\r\nc")
  })

  it("monta caminhos relativos", () => {
    expect(joinPath("Wikis/OxC", "../Notas/./a.md")).toBe("Wikis/Notas/a.md")
    expect(joinPath("a", "../../b")).toBeNull()
    expect(relativePath("Wikis/OxC", "Wikis/Notas/a.md")).toBe("../Notas/a.md")
    expect(relativePath("", "a/b.md")).toBe("a/b.md")
    expect(relativePath("a/b", "a/b/c.md")).toBe("c.md")
  })
})

describe("parseNote: notas com frontmatter", () => {
  it("numera títulos pela linha do arquivo", () => {
    expect(parseNote("---\na: 1\n---\n# Título\n").headings).toEqual([{ level: 1, text: "Título", line: 3 }])
  })
})
