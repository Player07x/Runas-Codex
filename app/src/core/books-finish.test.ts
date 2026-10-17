import { strFromU8, unzipSync } from "fflate"
import { VaultIndex } from "./vault-index"
import { bookAppendices, bookReferences, indexEntries, printOptions, scopeBookCss } from "./books-finish"
import { pageRules } from "./books-preview"
import { generateHtml, generateMarkdown, generateMarkdownZip, generateRtf } from "./export/book-extra"
import type { ExportBook } from "./export/book"
const bookPath = "Livros/Guia/Guia.md", chapterPath="Livros/Guia/Um.md", wikiPath="Wikis/Mundo/Ana.md"
function fixture() {
  const files = { [bookPath]: '---\ntipo: livro\nestrutura: ["[[Um]]"]\nindice_remissivo: true\nglossario: true\nindice_termos: [espada, oculto]\n---\n', [chapterPath]: '# Um\n\n[[Wikis/Mundo/Ana|Ana]] usa espada. ![[Anexos/a.png]]\n\n`oculto` %% oculto %%', [wikiPath]:'---\ntipo: personagem\nresumo: Uma exploradora.\n---\nTexto inteiro', "Anexos/a.png":"" }
  const index=new VaultIndex(Object.entries(files).map(([path,text])=>({path,size:text.length,mtime:1})),files)
  return {index,book:index.note(bookPath)!}
}
describe("Fechamento de livros",()=>{
  it("gera referências com capítulos e glossário pelo resumo, sem copiar o artigo inteiro",()=>{
    const {index,book}=fixture()
    expect(bookReferences(index,book)).toEqual([{path:wikiPath,title:"Ana",kind:"personagem",summary:"Uma exploradora.",chapters:[0]}])
    expect(indexEntries(index,book).map(r=>r.term)).toEqual(["Ana","espada"])
    expect(bookAppendices(index,book)[1].body).toContain("Uma exploradora.")
    expect(bookAppendices(index,book)[1].body).not.toContain("Texto inteiro")
    expect(bookReferences(index,book,{path:chapterPath,text:"Sem referências"})).toEqual([])
  })
  it("preserva o perfil de margem e limita valores de impressão",()=>{
    const {book}=fixture()
    expect(printOptions(book).margin).toBeUndefined()
    expect(pageRules("A5",printOptions(book))).toContain("margin: 13mm")
    book.meta.frontmatter!.data!.margem_mm=-10
    book.meta.frontmatter!.data!.sangria_mm=30
    book.meta.frontmatter!.data!.marcas_corte=true
    expect(pageRules("A4",printOptions(book))).toContain("margin: 0mm; bleed: 10mm; marks: crop")
  })
  it("confina o CSS ao papel e recusa recursos externos, escapes, at-rules e blocos incompletos",()=>{
    expect(scopeBookCss("h1, p { color: #123456; }")).toBe(".book-paper .book-print h1,.book-paper .book-print p{ color: #123456; }")
    for(const css of ['@import "https://x";','p{background:url(https://x)}','p{background:u\\rl(https://x)}','p{color:red','p{position:fixed}','p{color:red} body']) expect(()=>scopeBookCss(css)).toThrow()
  })
  it("exporta Markdown na ordem e ZIP com rascunho, notas citadas e anexos no caminho original",async()=>{
    const {index,book}=fixture(),text=generateMarkdown(index,book)
    expect(text.indexOf("# Guia")).toBeLessThan(text.indexOf("# Um"))
    expect(text).toContain("[[Wikis/Mundo/Ana|Ana]]")
    const bytes=Uint8Array.from([1,2,3])
    const zip=unzipSync(await generateMarkdownZip(index,book,async()=>bytes,{path:chapterPath,text:'# Novo\n![[Anexos/a.png]]'}))
    expect(strFromU8(zip[chapterPath])).toContain("# Novo")
    expect(zip["Anexos/a.png"]).toEqual(bytes)
    expect(zip[bookPath]).toBeDefined()
  })
  it("gera HTML autônomo e RTF com Unicode, formatação e imagens",()=>{
    const book: ExportBook={title:"A & B",author:"Ana",language:"pt-BR",identifier:"x",theme:"manual",size:"A4",css:"@font-face{src:url('assets/a.woff2')}",warnings:[],assets:[{name:"assets/a.png",mime:"image/png",bytes:Uint8Array.from([1,2])},{name:"assets/a.woff2",mime:"font/woff2",bytes:Uint8Array.from([3])}],sections:[{title:"Um",kind:"capitulo",path:"Um.md",nodes:[{tag:"p",attrs:{},children:["Olá {mundo} ", {tag:"strong",attrs:{},children:["forte"]}, {tag:"img",attrs:{src:"assets/a.png"},children:[]}]}]}]}
    const html=strFromU8(generateHtml(book)),rtf=strFromU8(generateRtf(book))
    expect(html).toContain("A &amp; B")
    expect(html).toContain("data:image/png;base64,AQI=")
    expect(html).toContain("data:font/woff2;base64,Aw==")
    expect(html).not.toContain('src="assets/')
    expect(rtf).toContain('\\u225?')
    expect(rtf).toContain('\\{mundo\\}')
    expect(rtf).toContain('{\\b forte}')
    expect(rtf).toContain('\\pngblip')
  })
})
