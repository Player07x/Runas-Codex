import { renderToStaticMarkup } from "react-dom/server"
import { Markdown } from "../components/Markdown"
import { registerTaskToggle, TaskCheckboxContext, toggledTaskLines } from "./extensions"
import { checkboxLines } from "./task-checkboxes"

const render = (source: string, handlerSource?: string) =>
  renderToStaticMarkup(
    <TaskCheckboxContext.Provider value={handlerSource === undefined ? null : { source: handlerSource, onToggle: () => undefined }}>
      <Markdown source={source} />
    </TaskCheckboxContext.Provider>,
  )

describe("caixas de tarefa no leitor", () => {
  it("estados com outro caractere viram caixa marcada, com data-task como no Obsidian", () => {
    const html = render("- [ ] a fazer\n- [x] feita\n- [/] em andamento\n- [-] cancelada\n- [ab] não é tarefa")
    expect(html.match(/type="checkbox"/g)).toHaveLength(4)
    expect(html).toContain('data-task=" "')
    expect(html).toContain('data-task="/"')
    expect(html).toContain('data-task="-"')
    expect(html).toContain("em andamento")
    expect(html).not.toContain("[/]")
    expect(html).toContain("[ab] não é tarefa")
  })

  it("as caixas só ficam clicáveis quando a tela diz que o texto é o dela", () => {
    const source = "- [ ] um\n> [!nota]\n> - [x] dois"
    expect(render(source).match(/disabled=""/g)).toHaveLength(2)
    expect(render(source, "outro texto")).toContain('disabled=""')
    expect(render(source, source)).not.toContain('disabled=""')
  })

  it("acha as linhas das caixas fora do frontmatter, de código e de comentários", () => {
    const text = "---\nl:\n  - [ ] não\n---\n- [ ] um\n```\n- [ ] código\n```\n%% - [ ] comentário %%\n  * [/] dois\n> 1. [x] três"
    expect(checkboxLines(text)).toEqual([4, 9, 10])
  })

  it("sem módulo registrado, o clique só alterna; com módulo, a linha passa por ele", () => {
    expect(toggledTaskLines("  - [ ] a")).toEqual(["  - [x] a"])
    expect(toggledTaskLines("- [/] a")).toEqual(["- [ ] a"])
    registerTaskToggle((line) => [line + " ✅", "nova"])
    expect(toggledTaskLines("- [ ] a")).toEqual(["- [ ] a ✅", "nova"])
    registerTaskToggle(null)
  })
})
