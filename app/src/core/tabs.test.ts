import { activate, closeOthers, closePane, closeTab, currentPath, emptyLayout, moveTab, openHere, openInNewTab, parseLayout, parseWorkspaces, pruneLayout, renameInLayout, split, togglePin, toggleStacked, workspaceNames, type TabLayout } from "./tabs"

const paths = (layout: TabLayout) => layout.panes.map((p) => p.tabs.map((t) => t.path.replace(/\.md$/, "")).join(" "))

describe("abas e painéis", () => {
  it("abrir troca a aba ativa; a fixada não é trocada; a que já está aberta só é ativada", () => {
    let l = openHere(emptyLayout(), "A.md")
    l = openHere(l, "B.md")
    expect(paths(l)).toEqual(["B"])
    l = togglePin(l, 0, 0)
    l = openHere(l, "C.md")
    expect(paths(l)).toEqual(["B C"])
    l = openInNewTab(l, "D.md")
    expect([paths(l), currentPath(l)]).toEqual([["B C D"], "D.md"])
    l = openHere(l, "B.md")
    expect([paths(l), currentPath(l)]).toEqual([["B C D"], "B.md"])
  })

  it("dividir abre um painel ao lado, até três; depois usa o vizinho", () => {
    let l = openHere(emptyLayout(), "A.md")
    l = split(l, "B.md", "lado")
    expect([paths(l), l.focus, l.split]).toEqual([["A", "B"], 1, "lado"])
    l = split(l, "C.md", "baixo")
    expect([paths(l), l.focus, l.split]).toEqual([["A", "B", "C"], 2, "baixo"])
    l = split(l, "D.md", "lado")
    expect([paths(l), l.focus]).toEqual([["A", "D", "C"], 1])
  })

  it("fechar a aba ativa ativa a vizinha; o painel vazio some", () => {
    let l = openInNewTab(openInNewTab(openHere(emptyLayout(), "A.md"), "B.md"), "C.md")
    l = closeTab(l, 0, 2)
    expect([paths(l), currentPath(l)]).toEqual([["A B"], "B.md"])
    l = closeTab(l, 0, 0)
    expect([paths(l), currentPath(l)]).toEqual([["B"], "B.md"])
    l = split(l, "X.md", "lado")
    l = closeTab(l, 1, 0)
    expect([paths(l), l.focus]).toEqual([["B"], 0])
    l = closeTab(l, 0, 0)
    expect([paths(l), currentPath(l)]).toEqual([[""], undefined])
  })

  it("fechar as outras deixa as fixadas", () => {
    let l = openInNewTab(openInNewTab(openHere(emptyLayout(), "A.md"), "B.md"), "C.md")
    l = togglePin(l, 0, 0)
    l = closeOthers(l, 0, 2)
    expect([paths(l), currentPath(l)]).toEqual([["A C"], "C.md"])
  })

  it("arrastar aba: reordena no painel e passa para outro", () => {
    let l = openInNewTab(openInNewTab(openHere(emptyLayout(), "A.md"), "B.md"), "C.md")
    l = moveTab(l, { pane: 0, index: 0 }, { pane: 0, index: 3 })
    expect([paths(l), currentPath(l)]).toEqual([["B C A"], "A.md"])
    l = split(l, "X.md", "lado")
    l = moveTab(l, { pane: 0, index: 1 }, { pane: 1, index: 0 })
    expect([paths(l), l.focus, currentPath(l)]).toEqual([["B A", "C X"], 1, "C.md"])
    l = moveTab(l, { pane: 1, index: 1 }, { pane: 0, index: 2 })
    l = moveTab(l, { pane: 1, index: 0 }, { pane: 0, index: 0 })
    expect([paths(l), l.focus]).toEqual([["C B A X"], 0])
  })

  it("ativar, fechar painel, empilhar, renomear e tirar o que sumiu", () => {
    let l = split(openHere(emptyLayout(), "Notas/A.md"), "Notas/Velha/B.md", "lado")
    l = activate(l, 0, 0)
    expect(l.focus).toBe(0)
    l = toggleStacked(l, 0)
    expect(l.panes[0]!.stacked).toBe(true)
    l = renameInLayout(l, "Notas/Velha", "Notas/Nova")
    expect(l.panes[1]!.tabs[0]!.path).toBe("Notas/Nova/B.md")
    l = pruneLayout(l, (p) => p !== "Notas/A.md")
    expect([l.panes.length, currentPath(l)]).toEqual([1, "Notas/Nova/B.md"])
    expect(closePane(l, 0)).toBe(l)
  })

  it("lê o arranjo gravado e descarta o que não serve", () => {
    const l = split(togglePin(openHere(emptyLayout(), "A.md"), 0, 0), "B.md", "baixo")
    expect(parseLayout(JSON.stringify(l))).toEqual(l)
    expect(parseLayout("{quebrado")).toEqual(emptyLayout())
    expect(parseLayout(JSON.stringify({ panes: [{ tabs: [{ path: "A.md" }, { nada: 1 }], active: 7 }], focus: 4 }))).toEqual({ panes: [{ tabs: [{ path: "A.md" }], active: 0 }], focus: 0, split: "lado" })
  })
})

describe("workspaces", () => {
  it("guarda e lê arranjos por nome, descartando o que não serve", () => {
    const layout = split(openHere(emptyLayout(), "A.md"), "B.md", "lado")
    const saved = { Sessão: { layout, rightPanel: true, savedAt: 5 }, Escrita: { layout: emptyLayout(), rightPanel: false, savedAt: 6 } }
    const read = parseWorkspaces(JSON.stringify({ ...saved, " ": { layout } }))
    expect(read).toEqual(saved)
    expect(workspaceNames(read)).toEqual(["Escrita", "Sessão"])
    expect(parseWorkspaces("{quebrado")).toEqual({})
  })
})
