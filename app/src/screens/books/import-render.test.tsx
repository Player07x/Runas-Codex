import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { Markdown } from "../../components/Markdown"
import { importHomebrewery } from "../../core/books-import/homebrewery"

it("desenha os callouts após a quebra de coluna, sem mostrar marcações como texto", () => {
  const source = readFileSync(new URL("../../core/books-import/fixtures/homebrewery.md", import.meta.url), "utf8")
  const book = importHomebrewery(source, { title: "Torre", headingLevel: 1 })
  const html = renderToStaticMarkup(<Markdown source={book.chapters[0].markdown} />)
  for (const type of ["nota", "descritivo", "statblock", "largo", "colunas"]) expect(html).toContain(`data-callout="${type}"`)
  expect(html).not.toContain("[!statblock]")
  expect(html).toContain("<table>")
})
