import { describe, expect, it } from "vitest"
import { newBookText, readBook } from "./books"
import { bookEditsBeforeTrash } from "./book-removal"
import { VaultIndex } from "./vault-index"
const vault = (files: Record<string,string>) => new VaultIndex(Object.entries(files).map(([path,text])=>({path,size:text.length,mtime:1})),files)
describe("remoção de itens do livro",()=>{
 it.each(["capitulo","secao","parte"])("retira a referência de %s e preserva outros metadados e o corpo",kind=>{
  const path="Livros/Guia/Guia.md",target="Livros/Guia/Um.md"
  const original=newBookText("Guia",["[[Um]]","[[Dois]]","[[Ausente]]"])+"\nTexto preservado."
  const index=vault({[path]:original,[target]:`---\ntipo: ${kind}\n---\nUm`,"Livros/Guia/Dois.md":"Dois"})
  const [edit]=bookEditsBeforeTrash(index,target)
  expect(edit.path).toBe(path);expect(edit.before).toBe(original)
  index.set({path,size:edit.after.length,mtime:2},edit.after);index.remove(target)
  expect(readBook(index,index.note(path)!).items.map(item=>item.link)).toEqual(["[[Dois]]","[[Ausente]]"])
  expect(edit.after).toContain("Texto preservado.");expect(index.note(path)!.meta.frontmatter?.data?.tipo).toBe("livro")
 })
 it("atualiza todos os livros que referenciam o arquivo e respeita homônimos",()=>{
  const a="Livros/A/A.md",b="Livros/B/B.md",target="Livros/A/Um.md"
  const index=vault({[a]:newBookText("A",["[[Um]]","[[Livros/A/Um|Abertura]]"]),[b]:newBookText("B",["[[Um]]","[[Livros/A/Um]]"]),[target]:"A","Livros/B/Um.md":"B"})
  const edits=bookEditsBeforeTrash(index,target)
  expect(edits).toHaveLength(2)
  for(const edit of edits) index.set({path:edit.path,size:edit.after.length,mtime:2},edit.after)
  expect(readBook(index,index.note(a)!).items).toHaveLength(0)
  expect(readBook(index,index.note(b)!).items.map(item=>item.link)).toEqual(["[[Um]]"])
 })
 it("remove referências de uma pasta e não regrava livros que serão apagados juntos",()=>{
  const index=vault({"Livros/A/A.md":newBookText("A",["[[Livros/B/Parte]]"]),"Livros/B/B.md":newBookText("B",["[[Parte]]"]),"Livros/B/Parte.md":"parte"})
  expect(bookEditsBeforeTrash(index,"Livros/B").map(edit=>edit.path)).toEqual(["Livros/A/A.md"])
 })
})
