import { describe, expect, it } from "vitest"
import { strFromU8, unzipSync } from "fflate"
import { VaultIndex } from "../vault-index"
import { documentPaths, generateStaticSite, staticDocumentIndex } from "./documents"
import { prepareDocumentExport } from "../transfer/document"
import { generateDocx } from "./docx"
import { generateHtml, generateRtf } from "./book-extra"
import { bookExportPlan, type ExportBook, type ExportNode } from "./book"
const texts = {
  "Wikis/Mundo/Porto.md": "# Porto\n\n[[Torre]]\n\n> [!segredo]\n> O esconderijo.\n\nFim.",
  "Wikis/Mundo/Torre.md": "# Torre\n\n[[Porto]] e [[Rei]].",
  "Wikis/Mundo/Rei.md": "---\nsegredo: true\n---\nO traidor.",
  "Wikis/Mundo/Mapa.md": '```runas-mapa\nimagem: mapa.png\npinos:\n  - nota: Porto\n    x: 0.2\n    y: 0.3\n  - rotulo: Cofre oculto\n    x: 0.5\n    y: 0.5\n    segredo: true\n  - rotulo: Passagem secreta\n    x: 0.7\n    y: 0.7\n    camada: Segredos\n```\n\nDepois do mapa.',
}
const index = new VaultIndex(Object.entries(texts).map(([path,text]) => ({ path, size:text.length,mtime:1 })),texts)
const el = (tag: string, children: ExportNode[], attrs: Record<string,string> = {}): ExportNode => ({ tag, children, attrs })
const book: ExportBook = {title:"Mundo",author:"",language:"pt-BR",identifier:"mundo",theme:"minimalista",size:"A4",css:".x{color:red}",warnings:[],assets:[{name:"assets/image-1.png",mime:"image/png",bytes:new Uint8Array([1,2])}],sections:[
 {path:"Wikis/Mundo/Porto.md",title:"Porto",kind:"capitulo",nodes:[el("p",["Um ",el("a",["Torre"],{class:"wikilink",title:"Wikis/Mundo/Torre.md"})]),el("img",[],{src:"assets/image-1.png"})]},
 {path:"Wikis/Mundo/Torre.md",title:"Torre",kind:"capitulo",nodes:[el("a",["Porto"],{class:"wikilink","data-note-path":"Wikis/Mundo/Porto.md"})]},
]}
describe("X4: documentos e sites", () => {
 it("segue links sem ciclos e remove notas privadas antes de expandir a versão dos jogadores", () => {
  expect(documentPaths(index,["Wikis/Mundo/Porto.md"],false,true)).toEqual(["Wikis/Mundo/Porto.md"])
  expect(documentPaths(index,["Wikis/Mundo/Porto.md"],true,true)).toEqual(["Wikis/Mundo/Porto.md","Wikis/Mundo/Torre.md"])
  expect(documentPaths(index,["Wikis/Mundo/Porto.md"],true,false)).toContain("Wikis/Mundo/Rei.md")
 })
 it("converte mapas em imagem e lista sem pinos nem camadas secretos para jogadores", () => {
  const prepared=staticDocumentIndex(index,true), text=prepared.note("Wikis/Mundo/Mapa.md")!.text
  expect(text).toContain("![[mapa.png]]");expect(text).toContain("[[Porto]]");expect(text).toContain("Depois do mapa.")
  expect(text).not.toContain("runas-mapa");expect(text).not.toContain("Cofre oculto");expect(text).not.toContain("Passagem secreta")
  expect(index.note("Wikis/Mundo/Mapa.md")!.text).toBe(texts["Wikis/Mundo/Mapa.md"])
 })
 it("empacota uma página por nota com links recíprocos, imagens e CSS locais", () => {
  const files=unzipSync(generateStaticSite(book)), first=strFromU8(files["notas/nota-1.html"]),second=strFromU8(files["notas/nota-2.html"])
  expect(first).toContain('href="nota-2.html"');expect(second).toContain('href="nota-1.html"')
  expect(first).toContain('src="../assets/image-1.png"');expect(first).toContain('href="../book.css"')
  expect(strFromU8(files["index.html"])).toContain('href="notas/nota-1.html"');expect(files["assets/image-1.png"]).toEqual(book.assets[0].bytes)
  expect(first).toContain("default-src 'none'");expect(first).not.toContain("<script");expect(first).not.toContain('href="#/');expect(first).not.toContain("data-note-path")
 })
 it("não leva capa sintética nem notas secretas e callouts aos formatos dos jogadores", async () => {
  const paths=documentPaths(index,["Wikis/Mundo/Porto.md","Wikis/Mundo/Rei.md"],false,true)
  const prepared=prepareDocumentExport(index,paths,"Público",true,true)
  const plan=bookExportPlan(prepared.index,prepared.book)
  expect(JSON.stringify(plan)).not.toContain("esconderijo");expect(JSON.stringify(plan)).not.toContain("traidor")
  const files=unzipSync(generateStaticSite({...book,sections:[{...book.sections[0],kind:"capa"},book.sections[1]]}))
  expect(Object.keys(files).filter(p=>p.startsWith("notas/"))).toHaveLength(1)
  const clean={...book,sections:[{...book.sections[0],nodes:[el("p",[plan.sections[1].body])]}]}
  for(const output of [generateHtml(clean),generateRtf(clean)]) expect(strFromU8(output)).not.toContain("esconderijo")
  expect(strFromU8(unzipSync(await generateDocx(clean))["word/document.xml"])).not.toContain("esconderijo")
 })
})
describe("colunas automáticas dos livros",()=>{
 it.each([1,2,3,4])("DOCX preserva %i colunas e retoma uma coluna depois do trecho",async count=>{
  const columns={...book,assets:[],sections:[{...book.sections[0],nodes:[el("p",["Antes"]),el("div",[el("p",["Fluxo automático"])],{class:`md-container runas-colunas-${count}`}),el("p",["Depois"])]}]}
  const doc=strFromU8(unzipSync(await generateDocx(columns))["word/document.xml"])
  expect(doc).toContain(`w:num="${count}"`);expect(doc).toContain('w:num="1"')
  expect(doc.indexOf("Antes")).toBeLessThan(doc.indexOf("Fluxo automático"));expect(doc.indexOf("Fluxo automático")).toBeLessThan(doc.indexOf("Depois"))
  expect(strFromU8(generateRtf(columns))).toContain(`\\cols${count}`)
 })
})
