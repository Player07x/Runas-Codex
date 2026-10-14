import { findCodeBlocks, replaceCodeBlock, setBlockKeys, setBlockLine } from "./codeblocks"

const NOTE = "# Mapa\n\n```runas-mapa\nimagem: x.png\npinos: []\n```\n\n````md\n```runas-mapa\nnão é bloco\n```\n````\n\n```runas-calendario\n```\nfim"

describe("blocos de código", () => {
  it("acha os blocos de um tipo, fora de outros blocos", () => {
    const maps = findCodeBlocks(NOTE, "runas-mapa")
    expect(maps).toHaveLength(1)
    expect(maps[0]!.content).toBe("imagem: x.png\npinos: []")
    expect(NOTE.slice(maps[0]!.contentStart, maps[0]!.contentEnd)).toBe(maps[0]!.content)
    expect(findCodeBlocks(NOTE).map((b) => b.language)).toEqual(["runas-mapa", "md", "runas-calendario"])
    expect(findCodeBlocks(NOTE, "runas-calendario")[0]!.content).toBe("")
  })

  it("troca só o conteúdo do bloco", () => {
    const [map] = findCodeBlocks(NOTE, "runas-mapa")
    const next = replaceCodeBlock(NOTE, map!, "imagem: y.png\n")
    expect(next).toBe(NOTE.replace("imagem: x.png\npinos: []", "imagem: y.png"))
    const [cal] = findCodeBlocks(NOTE, "runas-calendario")
    expect(replaceCodeBlock(NOTE, cal!, "nome: A")).toContain("```runas-calendario\nnome: A\n```\nfim")
    expect(() => replaceCodeBlock(NOTE.replace("x.png", "z.png"), map!, "a")).toThrow("mudou")
  })

  it("mantém CRLF", () => {
    const crlf = "```runas-mapa\r\nimagem: a\r\n```\r\n"
    const [block] = findCodeBlocks(crlf, "runas-mapa")
    expect(block!.content).toBe("imagem: a")
    expect(replaceCodeBlock(crlf, block!, "imagem: b\npinos: []")).toBe("```runas-mapa\r\nimagem: b\r\npinos: []\r\n```\r\n")
  })

  it("edita chaves do YAML sem perder comentários", () => {
    const yaml = "# meu mapa\nimagem: x.png # a imagem\npinos: []\n"
    const next = setBlockKeys(yaml, { pinos: [{ nota: "[[Valdris]]", x: 0.5, y: 0.25 }] })
    expect(next).toContain("# meu mapa")
    expect(next).toContain("imagem: x.png # a imagem")
    expect(next).toContain('nota: "[[Valdris]]"')
    expect(setBlockLine("nome: A\nhoje: \"1-01-01\"\n", "hoje", '"1-01-02"')).toBe('nome: A\nhoje: "1-01-02"\n')
    expect(setBlockLine("nome: A", "hoje", '"1-01-02"')).toBe('nome: A\nhoje: "1-01-02"')
  })
})
