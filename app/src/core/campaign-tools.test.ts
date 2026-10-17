import { publicWikiIndex } from "./wiki-public"
import { advanceInitiative, initiativeFromEncounter, initiativeYaml, parseInitiative, parseTreasury, treasuryYaml } from "./campaign-tools"
import { cropPixels, pinchCanvas, selectCanvasBox } from "./canvas-tools"
import { publicArticleText } from "./public-article"
import { VaultIndex } from "./vault-index"
describe("Ferramentas de campanha e quadro",()=>{
 it("preserva tesouro e moedas livres num bloco YAML",()=>{const data={coins:"12 po + 3 peças de prata",items:[{id:"um",name:"Mapa: antigo",quantity:2.5,holder:"[[Ana]]",notes:"Fragil\nNão molhar"}]};expect(parseTreasury(treasuryYaml(data))).toEqual(data);expect(()=>parseTreasury('itens: [{nome: X, quantidade: -1}]')).toThrow()})
 it("ordena iniciativa, avança turnos/rodadas e conserva o estado no YAML",()=>{const state=parseInitiative('rodada: 1\nparticipantes: [{id: a, nome: Ana, iniciativa: 8}, {id: b, nome: Bia, iniciativa: 15}]');expect(state.participants.map(p=>p.name)).toEqual(["Bia","Ana"]);const next=advanceInitiative(advanceInitiative(state));expect(next.round).toBe(2);expect(next.active).toBe("b");expect(advanceInitiative(next,-1).round).toBe(1);expect(parseInitiative(initiativeYaml(next))).toEqual(next)})
 it("importa encontros com quantidades e ocultos sem alterar o bloco original",()=>{const state=initiativeFromEncounter('combatentes: [{nome: Lobo, quantidade: 2, iniciativa: 3, oculto: true}]',()=>0);expect(state.participants).toHaveLength(2);expect(state.participants[0]).toMatchObject({name:"Lobo 1",value:4,hidden:true})})
 it("mantém a âncora de zoom na pinça e limita a escala",()=>{expect(pinchCanvas({x:0,y:0,zoom:1},{x:0,y:0},{x:100,y:0},{x:0,y:0},{x:200,y:0})).toEqual({x:0,y:0,zoom:2});expect(pinchCanvas({x:0,y:0,zoom:1},{x:0,y:0},{x:1,y:0},{x:0,y:0},{x:1000,y:0}).zoom).toBe(2.5)})
 it("seleciona cartões por retângulo nas duas direções e valida o recorte",()=>{const nodes=[{id:"a",type:"text",x:10,y:10,width:10,height:10},{id:"b",type:"text",x:50,y:50,width:10,height:10}];expect(selectCanvasBox(nodes,{x:30,y:30},{x:0,y:0})).toEqual(["a"]);expect(cropPixels(200,100,{x:10,y:20,width:50,height:50})).toEqual({x:20,y:20,width:100,height:50});expect(()=>cropPixels(200,100,{x:90,y:0,width:20,height:100})).toThrow()})
 it("retira segredos, continuação de citação, propriedades, código e transclusões antes de compartilhar",()=>{
 const files={"Wikis/Mundo/Artigo.md":'---\ntipo: local\nsegredo_interno: proibido\n---\n# Público\n\n> [!segredo]\n> oculto\ncontinuação oculta\n\n> ainda oculto\n\nParágrafo público. ![[Privado]] [[Privado|rótulo privado]]\n\n~~~runas-mapa\npinos_secretos: escondido\n~~~\n%% comentário oculto %%',"Wikis/Mundo/Privado.md":'---\nsegredo: true\nsegredo_para: [Ana]\n---\nReservado para Ana.'}
 const index=new VaultIndex(Object.entries(files).map(([path,text])=>({path,mtime:1,size:text.length})),files),note=index.note("Wikis/Mundo/Artigo.md")!,text=publicArticleText(index,note)
 expect(text).toContain("Parágrafo público")
 for(const secret of ["proibido","oculto","escondido","rótulo privado"])expect(text).not.toContain(secret)
 expect(text).toContain("[referência privada]")
 expect(()=>publicArticleText(index,index.note("Wikis/Mundo/Privado.md")!)).toThrow("segredo")
 expect(publicArticleText(index,index.note("Wikis/Mundo/Privado.md")!,"Ana")).toContain("Reservado para Ana")
 })
 it("compartilha somente o callout destinado ao jogador escolhido",()=>{const path="Wikis/Mundo/X.md",text='Público\n\n> [!segredo|Ana]\n> Para Ana.\n\n> [!segredo|Bia]\n> Para Bia.\n\nFim.';const index=new VaultIndex([{path,mtime:1,size:text.length}],{[path]:text});const result=publicArticleText(index,index.note(path)!,"Ana");expect(result).toContain("Para Ana");expect(result).not.toContain("Para Bia");expect(result).toContain("Fim.")})
})

it("a prévia pública da Wiki não indexa artigos privados nem links de callouts secretos",()=>{
 const files={"Wikis/X/A.md":'Público\n\n> [!segredo]\n> [[Wikis/X/B]] é o traidor.\n\nReferência: [[Wikis/X/B]].',"Wikis/X/B.md":'---\nsegredo: true\n---\nPrivado'}
 const index=new VaultIndex(Object.entries(files).map(([path,text])=>({path,size:text.length,mtime:1})),files),projection=publicWikiIndex(index)
 expect(projection.note("Wikis/X/B.md")).toBeUndefined()
 expect(projection.note("Wikis/X/A.md")!.text).not.toContain("traidor")
 expect(projection.outgoing("Wikis/X/A.md")).toHaveLength(0)
 expect(index.note("Wikis/X/A.md")!.text).toContain("traidor")
})
