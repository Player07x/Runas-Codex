import { bookmarkLabel, hasBookmark, parseBookmarks, renameInBookmarks, serializeBookmarks, toggleBookmark, type Bookmark } from "./bookmarks"

describe("favoritos", () => {
  it("lê o bookmarks.json do Obsidian, com grupos, e ignora o que não conhece", () => {
    const json = JSON.stringify({
      items: [
        { type: "file", ctime: 1, path: "Notas/Caderno.md" },
        { type: "group", ctime: 2, title: "Sessão", items: [{ type: "file", ctime: 3, path: "Notas/Aldren.md", subpath: "#Aparência" }, { type: "search", ctime: 4, query: "tag:npc" }] },
        { type: "folder", ctime: 5, path: "Notas/Lugares" },
        { type: "graph", ctime: 6, title: "Gráfico" },
        { type: "url", ctime: 7, url: "https://exemplo" },
      ],
    })
    expect(parseBookmarks(json)).toEqual([
      { type: "file", path: "Notas/Caderno.md" },
      { type: "file", path: "Notas/Aldren.md", subpath: "#Aparência" },
      { type: "search", query: "tag:npc" },
      { type: "folder", path: "Notas/Lugares" },
    ])
    expect(parseBookmarks("{quebrado")).toEqual([])
    expect(parseBookmarks(undefined)).toEqual([])
  })

  it("liga e desliga um favorito, sem repetir", () => {
    const note: Bookmark = { type: "file", path: "Notas/Caderno.md" }
    const heading: Bookmark = { type: "file", path: "Notas/Caderno.md", subpath: "#Ideias" }
    let list = toggleBookmark([], note)
    list = toggleBookmark(list, heading)
    expect(list).toHaveLength(2)
    expect(hasBookmark(list, { type: "file", path: "Notas/Caderno.md" })).toBe(true)
    list = toggleBookmark(list, note)
    expect(list).toEqual([heading])
    expect(parseBookmarks(serializeBookmarks(list))).toEqual(list)
  })

  it("dá um nome legível a cada tipo", () => {
    expect(bookmarkLabel({ type: "file", path: "Notas/Caderno.md" })).toBe("Caderno")
    expect(bookmarkLabel({ type: "file", path: "Notas/Caderno.md", subpath: "#Ideias#Pontes" })).toBe("Caderno › Ideias › Pontes")
    expect(bookmarkLabel({ type: "file", path: "Notas/mapa.canvas" })).toBe("mapa.canvas")
    expect(bookmarkLabel({ type: "folder", path: "Notas/Lugares" })).toBe("Lugares")
    expect(bookmarkLabel({ type: "search", query: "tag:npc", title: "NPCs" })).toBe("NPCs")
  })

  it("acompanha nota e pasta renomeadas", () => {
    const list: Bookmark[] = [
      { type: "file", path: "Notas/Lugares/Valdris.md" },
      { type: "folder", path: "Notas/Lugares" },
      { type: "file", path: "Notas/Lugares 2/Outra.md" },
      { type: "search", query: "path:Notas/Lugares" },
    ]
    expect(renameInBookmarks(list, "Notas/Lugares", "Notas/Mundo")).toEqual([
      { type: "file", path: "Notas/Mundo/Valdris.md" },
      { type: "folder", path: "Notas/Mundo" },
      { type: "file", path: "Notas/Lugares 2/Outra.md" },
      { type: "search", query: "path:Notas/Lugares" },
    ])
  })
})
