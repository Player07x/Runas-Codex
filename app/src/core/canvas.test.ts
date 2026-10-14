import { addEdge, addNode, anchorPoint, canvasBounds, canvasToSave, colorCss, edgeSides, emptyCanvasText, moveNodes, nodesInside, parseCanvas, removeEdge, removeNodes, serializeCanvas, updateEdge, updateNode, type CanvasDoc } from "./canvas"

// Como o Obsidian grava: tabs, sem quebra de linha no fim, e campos de plugins que o app não conhece.
const OBSIDIAN = `{
\t"nodes":[
\t\t{"id":"a1","type":"group","x":-20,"y":-20,"width":600,"height":300,"label":"Ato 2"},
\t\t{"id":"b2","type":"file","file":"Wikis/Mundo/Aldren.md","x":0,"y":0,"width":200,"height":90,"color":"4"},
\t\t{"id":"c3","type":"text","text":"A **carta** selada","x":300,"y":0,"width":210,"height":90,"plugin-extra":{"pinned":true}}
\t],
\t"edges":[
\t\t{"id":"e1","fromNode":"b2","fromSide":"right","toNode":"c3","toSide":"left","label":"é alvo de"}
\t],
\t"metadata":{"version":"1.0-1.0"}
}`

const doc = (): CanvasDoc => {
  const parsed = parseCanvas(OBSIDIAN)
  if (!("doc" in parsed)) throw new Error(parsed.error)
  return parsed.doc
}
// Gerador previsível para os testes (congruencial linear).
const seq = () => {
  let n = 12345
  return () => (n = (n * 1103515245 + 12345) % 2147483648) / 2147483648
}

describe("quadros .canvas", () => {
  it("lê o arquivo do Obsidian e não regrava quando nada mudou", () => {
    const d = doc()
    expect(d.nodes.map((n) => n.type)).toEqual(["group", "file", "text"])
    expect(canvasToSave(OBSIDIAN, d)).toBeNull()
  })

  it("preserva campos desconhecidos (nos nós e no topo) e a indentação com tabs", () => {
    const moved = moveNodes(doc(), ["c3"], 10.4, 0)
    const saved = canvasToSave(OBSIDIAN, moved)!
    const back = JSON.parse(saved) as Record<string, unknown> & { nodes: Record<string, unknown>[] }
    expect(back.metadata).toEqual({ version: "1.0-1.0" })
    expect(back.nodes[2]).toMatchObject({ id: "c3", x: 310, "plugin-extra": { pinned: true } })
    expect(saved).toMatch(/^\{\n\t"nodes"/)
    expect(saved.endsWith("}")).toBe(true)
    // Com dois espaços e quebra de linha no fim, continua assim.
    const twoSpaces = JSON.stringify(JSON.parse(OBSIDIAN), null, 2) + "\n"
    expect(serializeCanvas(moved, twoSpaces)).toMatch(/^\{\n {2}"nodes"[\s\S]*\}\n$/)
    expect(serializeCanvas(moved, twoSpaces.replace(/\n/g, "\r\n"))).toMatch(/\r\n\}\r\n$/)
  })

  it("arquivo vazio vira quadro vazio; JSON inválido é recusado com a mensagem", () => {
    expect(parseCanvas("")).toEqual({ doc: { nodes: [], edges: [] } })
    expect(parseCanvas("{ quebrado")).toHaveProperty("error")
    expect(parseCanvas('{"nodes":[{"id":"x"}],"edges":[]}')).toHaveProperty("error")
    expect(parseCanvas('{"nodes":[],"edges":[{"id":"e","fromNode":"a"}]}')).toHaveProperty("error")
    expect(JSON.parse(emptyCanvasText())).toEqual({ nodes: [], edges: [] })
  })

  it("ids não se repetem nem com um gerador que sempre devolve o mesmo valor", () => {
    let d = doc()
    for (let i = 0; i < 3; i++) d = addNode(d, { type: "text", text: String(i), x: 0, y: 0, width: 100, height: 50 }, () => 0.5).doc
    expect(new Set(d.nodes.map((n) => n.id)).size).toBe(d.nodes.length)
  })

  it("acrescenta nós com id de 16 dígitos; grupos vão para o fundo", () => {
    const { doc: d, id } = addNode(doc(), { type: "text", text: "Novo", x: 10.6, y: 20.2, width: 250, height: 60 }, seq())
    expect(id).toMatch(/^[0-9a-f]{16}$/)
    expect(d.nodes[d.nodes.length - 1]).toEqual({ id, type: "text", text: "Novo", x: 11, y: 20, width: 250, height: 60 })
    const { doc: g, id: gid } = addNode(d, { type: "group", label: "Ato 3", x: 0, y: 400, width: 300, height: 200 }, seq())
    expect(g.nodes[0]!.id).toBe(gid)
  })

  it("mover um grupo leva junto os nós que estão dentro dele", () => {
    const d = doc()
    const group = d.nodes[0]!
    expect(nodesInside(d, group)).toEqual(["b2", "c3"])
    const moved = moveNodes(d, ["a1"], 100, 50)
    expect(moved.nodes.map((n) => [n.id, n.x, n.y])).toEqual([
      ["a1", 80, 30],
      ["b2", 100, 50],
      ["c3", 400, 50],
    ])
  })

  it("liga pelo lado mais próximo, não repete ligação e apagar o nó apaga as ligações", () => {
    const d = doc()
    const { doc: withText, id } = addNode(d, { type: "text", text: "Final", x: 300, y: 300, width: 200, height: 80 }, seq())
    const linked = addEdge(withText, "c3", id, "queimar", seq())!
    expect(linked.doc.edges[1]).toEqual({ id: linked.id, fromNode: "c3", fromSide: "bottom", toNode: id, toSide: "top", label: "queimar" })
    expect(addEdge(linked.doc, "c3", id)).toBeNull()
    expect(addEdge(linked.doc, "c3", "c3")).toBeNull()
    expect(edgeSides(d.nodes[1]!, d.nodes[2]!)).toEqual({ fromSide: "right", toSide: "left" })
    const removed = removeNodes(linked.doc, ["c3"])
    expect(removed.nodes.map((n) => n.id)).toEqual(["a1", "b2", id])
    expect(removed.edges).toEqual([])
    expect(removeEdge(linked.doc, "e1").edges).toHaveLength(1)
  })

  it("editar texto, cor e rótulo; valor vazio sai do arquivo", () => {
    const d = updateNode(doc(), "b2", { color: "" })
    expect(d.nodes[1]).not.toHaveProperty("color")
    expect(updateNode(d, "c3", { text: "Outro", width: 333.3 }).nodes[2]).toMatchObject({ text: "Outro", width: 333, "plugin-extra": { pinned: true } })
    expect(updateEdge(d, "e1", { label: "" }).edges[0]).not.toHaveProperty("label")
    expect(colorCss("4")).toBe("var(--green)")
    expect(colorCss("#ff0000")).toBe("#ff0000")
    expect(colorCss("javascript:alert(1)")).toBeUndefined()
  })

  it("pontos de ancoragem e enquadramento", () => {
    const node = doc().nodes[1]!
    expect(anchorPoint(node, "right")).toEqual({ x: 200, y: 45 })
    expect(anchorPoint(node, "top")).toEqual({ x: 100, y: 0 })
    expect(canvasBounds(doc())).toEqual({ x: -20, y: -20, width: 600, height: 300 })
    expect(canvasBounds({ nodes: [], edges: [] })).toEqual({ x: 0, y: 0, width: 800, height: 500 })
  })
})
