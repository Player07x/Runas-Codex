import { parseCalendar } from "./calendar"
import { generateWorld, GENERATOR_KINDS, parseDictionary, parseRollTable, rollTable, worldEventOn, type GeneratorKind } from "./wiki-tools"
import { inEra, mapExtrasYaml, parseMapExtras } from "./wiki-map-extras"
import { parseMap } from "./wiki"
const calendar=parseCalendar('nome: Mundo\nsemana: [A,B,C]\nmeses: [{nome: Sol, dias: 30}, {nome: Lua, dias: 20}]\n')
describe("Ferramentas de fechamento da Wiki",()=>{
 it("rola com pesos e encadeia tabelas, recusando ciclos e destinos ausentes",()=>{
  const first=parseRollTable('nome: Primeiro\nresultados: [{texto: Comum, peso: 3}, {texto: Raro, tabela: Segundo}]')
  const second=parseRollTable('nome: Segundo\nresultados: [Final]')
  expect(rollTable(first,()=>second,()=>0)).toEqual(["Comum"])
  expect(rollTable(first,()=>second,()=>.99)).toEqual(["Raro","Final"])
  expect(()=>rollTable(first,()=>undefined,()=>.99)).toThrow("não encontrada")
  expect(()=>rollTable(first,()=>first,()=>.99)).toThrow("ciclo")
  expect(()=>parseRollTable('resultados: [{texto: X, peso: -1}]')).toThrow()
 })
 it("lê palavras, traduções, pronúncia e regras sem executar o conteúdo",()=>{
  expect(parseDictionary('nome: Élfico\nregras: Vogais longas.\npalavras: [{palavra: aelin, traducao: lago, pronuncia: áe-lin}]')).toEqual({name:"Élfico",rules:"Vogais longas.",words:[{word:"aelin",translation:"lago",pronunciation:"áe-lin"}]})
  expect(()=>parseDictionary('palavras: [{palavra: a}]')).toThrow("traducao")
 })
 it("gera todas as categorias offline com sorteio determinístico injetável",()=>{
  for(const kind of Object.keys(GENERATOR_KINDS) as GeneratorKind[]) expect(generateWorld(kind,()=>.25).length).toBeGreaterThan(5)
  expect(generateWorld("aventura",()=>0)).toContain("## Encontro")
  expect(generateWorld("nome",()=>0)).toBe("Ana das Neves")
 })
 it("repete por dias do calendário fictício e respeita início, intervalo e fim",()=>{
  const data={data_mundo:"0001-01-29",recorrencia_mundo:"dias",intervalo_mundo:3,fim_recorrencia_mundo:"0001-02-05"}
  expect(worldEventOn(data,calendar,{year:1,month:2,day:2})).toBe(true)
  expect(worldEventOn(data,calendar,{year:1,month:2,day:3})).toBe(false)
  expect(worldEventOn(data,calendar,{year:1,month:2,day:8})).toBe(false)
  expect(worldEventOn(data,calendar,{year:1,month:1,day:26})).toBe(false)
 })
 it("pula dias inexistentes nas repetições mensais e aceita anos negativos",()=>{
  const data={data_mundo:"-0001-01-30",recorrencia_mundo:"meses"}
  expect(worldEventOn(data,calendar,{year:-1,month:2,day:20})).toBe(false)
  expect(worldEventOn(data,calendar,{year:0,month:1,day:30})).toBe(true)
  expect(worldEventOn({...data,recorrencia_mundo:"anos",intervalo_mundo:2},calendar,{year:1,month:1,day:30})).toBe(true)
 })
 it("lê camadas e desenhos com eras, sem alterar os mapas antigos",()=>{
  expect(parseMap('imagem: "[[mapa.png]]"')).not.toHaveProperty("images")
  const spec=parseMap('imagem: "[[mapa.png]]"\nimagens: [{nome: Antigo, imagem: "[[antes.png]]", era_inicio: -10, era_fim: 4, segredo: true}]\ndesenhos: [{tipo: rota, pontos: [{x: 0, y: 0}, {x: 1, y: 1}], cor: "#123456", texto: Estrada}]')
  expect(spec.images![0].image).toBe("antes.png")
  expect(inEra(spec.images![0],0)).toBe(true)
  expect(inEra(spec.images![0],0,true)).toBe(false)
  expect(inEra(spec.images![0],5)).toBe(false)
  const roundtrip=parseMapExtras(mapExtrasYaml(spec))
  expect(roundtrip.images).toEqual(spec.images)
  expect(roundtrip.drawings).toEqual(spec.drawings)
  expect(()=>parseMap('imagem: x\ndesenhos: [{tipo: zona, pontos: [{x: 0,y: 0}]}]')).toThrow()
 })
})
