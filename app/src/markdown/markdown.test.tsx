import { renderToStaticMarkup } from "react-dom/server"
import { Markdown } from "../components/Markdown"
import { VaultIndex } from "../core/vault-index"
import { DEMO_ASSETS, DEMO_TEXT_FILES } from "../data/demo-vault"
import { NoteSetContext } from "../lib/note-set"
import { vaultNoteSet } from "../lib/vault-notes"
import { isRenderedCodeBlock, registerCodeBlock } from "./extensions"

const FROM = "Notas/Formatadores.md"
const index = new VaultIndex(
  [...Object.keys(DEMO_TEXT_FILES), ...Object.keys(DEMO_ASSETS)].map((path) => ({ path, size: 1, mtime: 1 })),
  DEMO_TEXT_FILES,
)
const set = vaultNoteSet(index, FROM, {}, { fileUrl: (path) => DEMO_ASSETS[path] ?? null, openFile: async () => undefined })

function render(source: string): string {
  return renderToStaticMarkup(
    <NoteSetContext.Provider value={set}>
      <Markdown source={source} space="notas" />
    </NoteSetContext.Provider>,
  )
}

describe("Markdown (dialeto)", () => {
  it("wikilinks resolvidos, quebrados e para títulos da própria nota", () => {
    const html = render("[[Caderno]] [[Caderno#Ideias|com título]] [[Não existe]] [[#Topo]]")
    expect(html).toContain('class="wikilink  "')
    expect(html).toContain(">com título</a>")
    expect(html).toContain('class="wikilink broken ')
    expect(html).toContain(">Topo</a>")
  })

  it("tags válidas viram tag; números e código não", () => {
    const html = render("#npc/vilao e #1492 e `#codigo` e C#sharp")
    expect(html).toContain(">#npc/vilao</a>")
    expect(html).not.toContain(">#1492</a>")
    expect(html).not.toContain(">#codigo</a>")
    expect(html).not.toContain(">#sharp</a>")
  })

  it("destaque, inclusive em volta de outros trechos, e == sem par fica como texto", () => {
    expect(render("um ==destaque== aqui")).toContain("<mark>destaque</mark>")
    expect(render("==**forte**==")).toContain("<mark><strong>forte</strong></mark>")
    expect(render("a == b")).toContain("a == b")
  })

  it("comentários somem; código e matemática ficam intactos", () => {
    const html = render("antes %%oculto%% depois\n\n`==não==` e $x$")
    expect(html).not.toContain("oculto")
    expect(html).toContain("<code>==não==</code>")
    expect(html).toContain("math-inline")
  })

  it("notas de rodapé normais e inline", () => {
    const html = render("Texto[^1] e inline.^[Escrita aqui.]\n\n[^1]: Nota um.")
    expect(html).toContain("Nota um.")
    expect(html).toContain("Escrita aqui.")
    expect(html).toContain('class="footnotes"')
  })

  it("callouts com tipo, título, dobra e aninhamento; segredo some na versão dos jogadores", () => {
    const html = render("> [!aviso]- Cuidado\n> texto\n\n> [!dica] Fora\n> > [!nota] Dentro\n> > x")
    expect(html).toContain('class="callout aviso')
    expect(html).toContain("Cuidado")
    expect(html).not.toContain(">texto<") // dobrado
    expect(html).toContain("Dentro")
    const players = renderToStaticMarkup(<Markdown source={"> [!segredo]\n> o vilão é o rei"} showSecrets={false} />)
    expect(players).not.toContain("vilão")
  })

  it("colunas, bloco largo e contêineres", () => {
    expect(render("> [!colunas|3]\n> a\n> <div class=\"quebra-coluna\"></div>\n>\n> b")).toContain('class="md-colunas" style="--colunas:3"')
    expect(render("> [!largo]\n> a")).toContain('class="md-largo"')
    expect(render("::: nota\nDentro\n:::")).toContain('class="md-container nota"')
  })

  it("HTML do dialeto passa; script e eventos não", () => {
    const html = render('<span style="color:#8b1e1e" class="versalete">x</span> <u>s</u> <kbd>K</kbd> <sup>1</sup>\n\n<script>alert(1)</script><img src="x.png" onerror="alert(1)">')
    expect(html).toContain('style="color:#8b1e1e"')
    expect(html).toContain('class="versalete"')
    expect(html).toContain("<u>s</u>")
    expect(html).toContain("<kbd>K</kbd>")
    expect(html).not.toContain("<script")
    expect(html).not.toContain("onerror")
  })

  it("tabelas com alinhamento, células mescladas e classes", () => {
    expect(render("| a | b |\n|:-:|--:|\n| 1 | 2 |")).toContain('<th style="text-align:center">a</th>')
    const html = render('<table class="listrada"><tr><td colspan="2">x</td></tr></table>')
    expect(html).toMatch(/colspan="2"/i)
    expect(html).toContain('class="listrada"')
  })

  it("lista de definição, abreviação, emoji, classes e ^bloco", () => {
    const html = render("*[PdM]: Personagem do mestre\n\nTermo\n: Definição\n\nUm PdM :espada: aqui. {.centro}\n\nParágrafo marcado. ^meu-bloco")
    expect(html).toContain("<dl><dt>Termo</dt><dd>Definição</dd></dl>")
    expect(html).toContain('<abbr title="Personagem do mestre">PdM</abbr>')
    expect(html).toContain("🗡️")
    expect(html).toContain('<p class="centro">')
    expect(html).toContain('data-block="meu-bloco"')
    expect(html).not.toContain("^meu-bloco")
    expect(html).not.toContain("*[PdM]")
  })

  it("código com realce, Mermaid e sumário", () => {
    expect(render("```ts\nconst x = 1\n```")).toContain("hljs-keyword")
    expect(render("```mermaid\ngraph LR\n a --> b\n```")).toContain("Desenhando o diagrama")
    const toc = render("# Um\n## Dois\n```table-of-contents\n```")
    expect(toc).toContain('class="md-sumario"')
    expect(toc).toContain(">Dois</a>")
  })

  it("embeds: imagem com tamanho, transclusão de seção e de bloco, laço e anexo ausente", () => {
    expect(render("![[runa.png|64]]")).toMatch(/<img class="embed-image" src="[^"]*runa[^"]*" alt="runa.png" width="64"/)
    const section = render("![[Caderno#Ideias]]")
    expect(section).toContain('class="embed-note"')
    expect(section).toContain("lua cheia")
    expect(section).not.toContain("Pensar em")
    expect(render("![[Caderno#^ponte]]")).toContain("Uma ponte que só aparece na lua cheia")
    expect(render("![[mapa.pdf]]")).toContain("embed-missing broken")
    // A nota de teste inclui a si mesma? Não: mas uma nota que se inclui para no segundo nível.
    const self = vaultNoteSet(new VaultIndex([{ path: "Eu.md", size: 1, mtime: 1 }], { "Eu.md": "a ![[Eu]]" }), "Eu.md")
    const html = renderToStaticMarkup(
      <NoteSetContext.Provider value={self}>
        <Markdown source="a ![[Eu]]" />
      </NoteSetContext.Provider>,
    )
    expect(html.match(/embed-note/g)?.length).toBe(1)
  })

  it("imagens da internet não carregam (app offline)", () => {
    const html = render("![logo](https://example.com/logo.png)")
    expect(html).not.toContain("<img")
    expect(html).toContain("o app é offline")
  })

  it("a nota de teste dos formatadores renderiza sem erro", () => {
    const html = render(DEMO_TEXT_FILES["Notas/Formatadores.md"]!.replace(/^---[\s\S]*?---\n/, ""))
    expect(html).toContain("Formatadores do Runas-Codex")
    expect(html).toContain("md-colunas")
    expect(html).toContain("statblock")
  })

  it("blocos de código registrados por outros módulos são desenhados pelo componente deles", () => {
    registerCodeBlock(["teste-bloco"], ({ code, language }) => <div className="bloco-teste">{`${language}: ${code}`}</div>)
    expect(isRenderedCodeBlock("Teste-Bloco")).toBe(true)
    expect(render("```teste-bloco\nlinha 1\nlinha 2\n```")).toContain('<div class="bloco-teste">teste-bloco: linha 1\nlinha 2</div>')
    expect(render("```ts\nconst a = 1\n```")).toContain("<pre>")
  })
})
