import { VaultIndex } from "./vault-index"
import { activeFilters, articleCardFields, categoryFields, categoryKind, categoryNotes, categoryRoute, categorySubfolders, chosenFilters, customKindsIn, filterCategory } from "./wiki-category"
import { articleKind, setCustomKinds } from "./wiki"
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
 it("nos filtros automáticos omite campos com mais de oito valores e filtra 500 notas sem acessar seus textos",()=>{
  const texts=Object.fromEntries(Array.from({length:500},(_,i)=>[`${folder}/Pessoa ${String(i).padStart(3,"0")}.md`,`---\ntipo: personagem\nstatus: ${i%2?"Viva":"Falecida"}\nocupacao: Ocupação ${i}\n---\nTexto`]))
  const large=new VaultIndex(Object.entries(texts).map(([path,text],i)=>({path,size:text.length,mtime:i})),texts).allNotes()
  large.forEach(note=>Object.defineProperty(note,"text",{get(){throw new Error("A categoria não deve ler o texto da nota.")}}))
  expect(activeFilters(categoryFields(large),null).map(f=>f.key)).toEqual(["status"])
  const found=filterCategory(large,folder,{...query,fields:{status:"Viva"}})
  expect(found).toHaveLength(250)
  expect(found.slice(0,24)).toHaveLength(24)
 })
 it("não mostra nem conta artigos secretos na projeção dos jogadores",()=>{
  const visible=publicWikiIndex(index)
  const playerNotes=categoryNotes(visible.notesIn(root),folder,root)
  expect(playerNotes.map(n=>n.name)).toEqual(["Ana","Bia"])
  expect(categoryFields(playerNotes).find(f=>f.key==="status")?.values).toEqual([{text:"Viva",count:2}])
 })
})
describe("filtros escolhidos na categoria",()=>{
 const texts={
  [folder+"/Arak.md"]:'---\ntipo: personagem\nretrato: "[[Arak.png]]"\nespecie: "[[Divindade]]"\nocupacao: Deus dos Segredos\nnascimento_mundo: "3597-12-18 R"\nafiliacao: ["[[Valknut]]", "[[Centelha]]"]\nstatus: Desconhecido\nnivel: 12\n---\n# Arak',
  [folder+"/Petar.md"]:'---\ntipo: personagem\nretrato: "[[Imagem Petar.png]]"\nespecie: "[[Humano]]"\nocupacao: Primeiro Vampiro\nafiliacao: ["[[Valknut]]"]\nstatus: Vivo\nresidencia: ""\nmontaria: Cavalo\n---\n# Petar',
  [folder+"/Lin.md"]:'---\ntipo: personagem\nespecie: "[[Humano]]"\nstatus: Vivo\nmontaria: Lobo\n---\n# Lin',
 }
 const idx=new VaultIndex(Object.entries(texts).map(([path,text],i)=>({path,size:text.length,mtime:i+1})),texts)
 const fields=categoryFields(idx.allNotes())
 const field=(key:string)=>fields.find(f=>f.key===key)!
 it("aceita só campos de um valor de texto, com o motivo dos que ficam de fora",()=>{
  expect(field("retrato").problem).toBe("imagem")
  expect(field("nascimento_mundo").problem).toBe("data")
  expect(field("nivel").problem).toBe("numero")
  expect(field("afiliacao")).toMatchObject({problem:"varios",example:"Arak"})
  expect(field("residencia").problem).toBe("vazio")
  expect(field("especie").values).toEqual([{text:"Divindade",count:1},{text:"Humano",count:2}])
  expect(field("montaria")).toMatchObject({label:"Montaria",values:[{text:"Cavalo",count:1},{text:"Lobo",count:1}]})
  expect(fields.map(f=>f.key).slice(0,3)).toEqual(["retrato","especie","ocupacao"])
  expect(fields.some(f=>f.key==="tipo")).toBe(false)
 })
 it("mostra os escolhidos na ordem gravada e ignora os que não servem",()=>{
  expect(chosenFilters({filtros:["status","especie","retrato"]})).toEqual(["status","especie","retrato"])
  expect(chosenFilters({})).toBeNull()
  expect(chosenFilters({filtros:[]})).toEqual([])
  expect(activeFilters(fields,["status","especie","retrato"]).map(f=>f.key)).toEqual(["status","especie"])
  expect(activeFilters(fields,[])).toEqual([])
  expect(activeFilters(fields,null).map(f=>f.key)).toEqual(["especie","ocupacao","status","montaria"])
 })
 it("filtra pelo texto do link e pela lista de um item só",()=>{
  const notes=idx.allNotes()
  expect(filterCategory(notes,folder,{...query,fields:{especie:"Humano"}}).map(n=>n.name)).toEqual(["Lin","Petar"])
  expect(filterCategory(notes,folder,{...query,fields:{status:"Vivo",montaria:"Lobo"}}).map(n=>n.name)).toEqual(["Lin"])
 })
})
describe("categoria criada pelo usuário",()=>{
 const texts={
  "Wikis/Mundo/Monstros/Monstros.md":'---\ntipo: categoria\nartigo: Monstro\ncampos:\n  - Imagem (imagem)\n  - Habitat (link)\n  - Descoberta (data)\n  - Perigo\n---\n# Monstros',
  "Wikis/Mundo/Monstros/Lobo de Cinzas.md":'---\ntipo: monstro\nperigo: Alto\n---\n# Lobo de Cinzas',
  "Wikis/Mundo/Heróis/Heróis.md":'---\ntipo: categoria\nartigo: Personagem\ncampos: [Força]\n---\n# Heróis',
  "Wikis/Mundo/Plantas/Plantas.md":'---\ntipo: categoria\ncor: verde\n---\n# Plantas',
 }
 const idx=new VaultIndex(Object.entries(texts).map(([path,text],i)=>({path,size:text.length,mtime:i+1})),texts)
 afterEach(()=>setCustomKinds([]))
 it("lê o tipo da nota da categoria e o registra para a Wiki inteira",()=>{
  const kinds=customKindsIn(idx)
  expect(kinds.map(k=>k.id)).toEqual(["monstro"])
  expect(kinds[0]).toMatchObject({label:"Monstro",folder:"Monstros",root:"Wikis/Mundo/",sections:["Descrição","História"]})
  expect(kinds[0]!.fields.map(f=>[f.key,f.kind])).toEqual([["imagem","imagem"],["habitat","link"],["descoberta_mundo","data"],["perigo","texto"]])
  expect(articleKind("monstro")).toBeUndefined()
  setCustomKinds(kinds)
  expect(articleKind("Monstro")?.label).toBe("Monstro")
  const monsters=categoryNotes(idx.notesIn("Wikis/Mundo/"),"Wikis/Mundo/Monstros","Wikis/Mundo/")
  expect(categoryKind(monsters.filter(n=>n.name!=="Monstros"),"Wikis/Mundo/Monstros")?.id).toBe("monstro")
  expect(categoryKind([],"Wikis/Mundo/Monstros")?.id).toBe("monstro")
 })
})
