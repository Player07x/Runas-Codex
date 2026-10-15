import { fencedBlocks, keepOriginal, quotedBlocks, replaceBlocks } from "./blocks"

describe("blocos cercados para a migração", () => {
  it("acha o bloco com as cercas e o conteúdo exatos", () => {
    const text = "# Mapa\n\n```leaflet\nid: a\nimage: [[x.png]]\n```\n\nfim\n"
    const [block] = fencedBlocks(text)
    expect(block!.language).toBe("leaflet")
    expect(block!.content).toBe("id: a\nimage: [[x.png]]")
    expect(text.slice(block!.start, block!.end)).toBe("```leaflet\nid: a\nimage: [[x.png]]\n```")
    expect(block!.line).toBe(2)
  })

  it("respeita CRLF, cercas de til e cercas maiores", () => {
    const text = "a\r\n~~~~statblock\r\nname: Rato\r\n~~~\r\n~~~~\r\nb"
    const [block] = fencedBlocks(text)
    expect(block!.content).toBe("name: Rato\r\n~~~")
    expect(text.slice(block!.start, block!.end)).toBe("~~~~statblock\r\nname: Rato\r\n~~~\r\n~~~~")
  })

  it("não conta blocos dentro de %%comentários%% nem blocos sem nome", () => {
    const text = "%%\n```leaflet\nid: velho\n```\n%%\n\n```\nsem nome\n```\n\n%% nota %% ```leaflet\n\n```statblock\nname: A\n```\n"
    expect(fencedBlocks(text).map((b) => b.language)).toEqual(["statblock"])
  })

  it("%% dentro de código não abre comentário", () => {
    const text = "`%%`\n\n```encounter\ncreatures: [Goblin]\n```\n"
    expect(fencedBlocks(text)).toHaveLength(1)
  })

  it("bloco sem cerca de fechamento não conta", () => {
    expect(fencedBlocks("```leaflet\nid: a\n")).toHaveLength(0)
  })

  it("conta os blocos dentro de citações, para o aviso", () => {
    const counts = quotedBlocks("> [!note]\n> ```statblock\n> name: A\n> ```\n>> ~~~leaflet\n", ["statblock", "leaflet"])
    expect(Object.fromEntries(counts)).toEqual({ statblock: 1, leaflet: 1 })
  })

  it("troca só os blocos e mantém as quebras de linha do arquivo", () => {
    const text = "um\r\n```leaflet\r\nid: a\r\n```\r\ndois\r\n```statblock\r\nname: B\r\n```\r\ntrês"
    const blocks = fencedBlocks(text)
    const out = replaceBlocks(text, [
      { block: blocks[0]!, text: "```runas-mapa\nimagem: x\n```" },
      { block: blocks[1]!, text: "> [!statblock] B" },
    ])
    expect(out).toBe("um\r\n```runas-mapa\r\nimagem: x\r\n```\r\ndois\r\n> [!statblock] B\r\ntrês")
  })

  it("guarda o bloco original num comentário que o leitor não mostra", () => {
    const text = "```statblock\nname: A\n```"
    const [block] = fencedBlocks(text)
    const kept = keepOriginal(text, block!, "Fantasy Statblocks")
    expect(kept).toBe("%% Bloco original do Fantasy Statblocks, guardado pela migração do Runas-Codex:\n```statblock\nname: A\n```\n%%")
    expect(fencedBlocks(kept)).toHaveLength(0)
  })
})
