import { VaultIndex } from "./vault-index"
import { articleCardFields, categoryFacets, categoryKind, categoryNotes, categoryRoute, categorySubfolders, filterCategory } from "./wiki-category"
import { publicWikiIndex } from "./wiki-public"
const root="Wikis/Mundo/",folder=root+"Personagens"
const files={
 [folder+"/Ana.md"]:'---\ntipo: personagem\nretrato: "[[ana.png]]"\nespecie: "[[Humana]]"\nocupacao: Sacerdotisa\nafiliacao: ["[[Ordem]]"]\nstatus: Viva\naliases: [A Curandeira]\n---\n# Ana',
 [folder+"/Aliados/Bia.md"]:'---\ntipo: personagem\nstatus: Viva\nocupacao: Guarda\n---\n# Bia',
 [folder+"/Aliados/Antigos/Cássia.md"]:'---\ntipo: personagem\nstatus: Falecida\nsegredo: true\n---\n# Cássia',
 [root+"Mundo.md"]:'---\ntipo: wiki\n---\n# Mundo',
 [root+"Solta.md"]:'# Solta',
 [root+"Locais/Lugar.md"]:'# Lugar',
}
const index=new VaultIndex(Object.entries(files).map(([path,text],i)=>({path,size:text.length,mtime:i+1})),files)
const notes=categoryNotes(index.notesIn(root),folder,root,root+"Mundo.md")
const query={text:"",order:"name" as const,fields:{},subfolder:""}
describe("página de categoria",()=>{
 it("isola a pasta e as subpastas, sem incluir a página inicial na categoria raiz",()=>{
  expect(notes).toHaveLength(3)
  expect(categoryNotes(index.notesIn(root),root.slice(0,-1),root,root+"Mundo.md").map(n=>n.name)).toEqual(["Solta"])
  expect(categoryNotes(index.allNotes(),"Wikis/Outro/Personagens",root)).toHaveLength(0)
  expect(categoryRoute(folder+"/100% Líderes")).toContain("100%25%20L%C3%ADderes")
 })
 it("busca por nome, apelido ou valor e ordena nome ou edições",()=>{
  expect(filterCategory(notes,folder,{...query,text:"curandeira"}).map(n=>n.name)).toEqual(["Ana"])
  expect(filterCategory(notes,folder,{...query,text:"humana"}).map(n=>n.name)).toEqual(["Ana"])
  expect(filterCategory(notes,folder,{...query,text:"cassia"}).map(n=>n.name)).toEqual(["Cássia"])
  expect(filterCategory(notes,folder,{...query,order:"recent"}).map(n=>n.name)).toEqual(["Cássia","Bia","Ana"])
 })
 it("combina filtros de campo e subpastas sem alterar o índice",()=>{
  expect(categorySubfolders(notes,folder)).toEqual(["Aliados","Aliados/Antigos"])
  expect(filterCategory(notes,folder,{...query,subfolder:"Aliados",fields:{status:"Viva"}}).map(n=>n.name)).toEqual(["Bia"])
  expect(filterCategory(notes,folder,{...query,subfolder:"."}).map(n=>n.name)).toEqual(["Ana"])
  expect(index.size).toBe(6)
 })
 it("usa os campos dos tipos para resumo e fichinhas",()=>{
  expect(categoryKind(notes,folder)?.id).toBe("personagem")
  const info=articleCardFields(notes.find(n=>n.name==="Ana")!)
  expect(info.summary).toEqual(["Humana","Sacerdotisa"])
  expect(info.badges.map(b=>b.key)).toEqual(["status","afiliacao"])
 })
 it("omite campos com mais de oito valores e filtra 500 notas sem acessar seus textos",()=>{
  const texts=Object.fromEntries(Array.from({length:500},(_,i)=>[`${folder}/Pessoa ${String(i).padStart(3,"0")}.md`,`---\ntipo: personagem\nstatus: ${i%2?"Viva":"Falecida"}\nocupacao: Ocupação ${i}\n---\nTexto`]))
  const large=new VaultIndex(Object.entries(texts).map(([path,text],i)=>({path,size:text.length,mtime:i})),texts).allNotes()
  large.forEach(note=>Object.defineProperty(note,"text",{get(){throw new Error("A categoria não deve ler o texto da nota.")}}))
  expect(categoryFacets(large).map(f=>f.key)).toEqual(["status"])
  const found=filterCategory(large,folder,{...query,fields:{status:"Viva"}})
  expect(found).toHaveLength(250)
  expect(found.slice(0,24)).toHaveLength(24)
 })
 it("não mostra nem conta artigos secretos na projeção dos jogadores",()=>{
  const visible=publicWikiIndex(index)
  const playerNotes=categoryNotes(visible.notesIn(root),folder,root)
  expect(playerNotes.map(n=>n.name)).toEqual(["Ana","Bia"])
  expect(categoryFacets(playerNotes).find(f=>f.key==="status")?.values).toEqual(["Viva"])
 })
})
