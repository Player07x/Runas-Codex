/**
 * Geradores ×4 (U32, atualização 1.2.0): mais opções escritas à mão, uma por linha. `generator-tables.ts` põe cada
 * lista no fim da original (os testes usam os primeiros itens). Nada aqui é variação gerada de outra opção: onde a
 * lista é naturalmente uma peça mais outra, as duas partes são escritas à mão e só se juntam as que combinam.
 */
import { lines } from "./generator-tables-pessoas"
import { combine } from "./generator-tables-x4-pessoas"


/** Emblemas de facção: o objeto e a cor ou o material, com o artigo e a concordância de cada palavra. */
const EMBLEM_NOUNS: [string, "m" | "f"][] = [
  ["Mão", "f"], ["Rosa", "f"], ["Lança", "f"], ["Chama", "f"], ["Estrela", "f"], ["Âncora", "f"], ["Chave", "f"], ["Máscara", "f"], ["Ampulheta", "f"],
  ["Balança", "f"], ["Taça", "f"], ["Pena", "f"], ["Flecha", "f"], ["Corrente", "f"], ["Lanterna", "f"], ["Foice", "f"], ["Aranha", "f"], ["Raposa", "f"],
  ["Olho", "m"], ["Punho", "m"], ["Corvo", "m"], ["Cálice", "m"], ["Martelo", "m"], ["Escorpião", "m"], ["Sol", "m"], ["Lírio", "m"], ["Machado", "m"],
  ["Elmo", "m"], ["Escudo", "m"], ["Javali", "m"], ["Touro", "m"], ["Falcão", "m"], ["Crânio", "m"], ["Anel", "m"], ["Sino", "m"], ["Trevo", "m"],
]
const EMBLEM_LOOKS = lines(`
Escarlate|Escarlate
Negro|Negra
Branco|Branca
Dourado|Dourada
Prateado|Prateada
Verde|Verde
Púrpura|Púrpura
Cinzento|Cinzenta
Partido|Partida
Flamejante|Flamejante
Sangrento|Sangrenta
Invertido|Invertida
Acorrentado|Acorrentada
Coroado|Coroada
Alado|Alada
de Ferro|de Ferro
de Osso|de Osso
de Vidro|de Vidro
de Cobre|de Cobre
de Jade|de Jade
de Ônix|de Ônix
de Sal|de Sal
de Cinzas|de Cinzas
de Espinhos|de Espinhos
`).map((line) => line.split("|"))

export const X4_FACTION_EMBLEMS_1 = EMBLEM_NOUNS.flatMap(([noun, gender]) => EMBLEM_LOOKS.map((forms) => `${gender === "f" ? "da" : "do"} ${noun} ${forms[gender === "f" ? 1 : 0]}`))

const TRINKET_OBJECTS = lines(`
um pente
uma caixinha
uma colher
um dedal
uma fivela
um apito
um castiçal pequeno
uma estatueta de gato
uma estatueta de cavalo
um botão grande
um medalhão
um porta-agulhas
um sinete
um chaveiro de três argolas
uma tabaqueira
um espelhinho
um copinho de licor
uma caneta de pena
um broche em forma de abelha
um broche em forma de folha
um pingente em forma de lua
um dado
uma peça de xadrez
um anel de criança
uma flauta pequena
um pião
uma bainha de faca
uma tampa de cantil
um sininho
uma moldura de retrato
um cachimbo pequeno
uma conta de rosário
uma ponta de flecha decorativa
um peso de papel
um prendedor de capa
`)
const TRINKET_MATERIALS = lines(`
de prata manchada
de osso entalhado
de chifre polido
de estanho amassado
de cobre esverdeado
de marfim amarelado
de vidro azul
de âmbar com um inseto dentro
de madeira escura com incrustações
de latão com iniciais gravadas
de ouro fino e gasto
de ferro negro com runas
de jade rachado
de madrepérola
de concha polida
de prata com uma pedra vermelha
de cerâmica pintada à mão
de pedra-sabão
de bronze com um brasão apagado
de ônix
de cristal de rocha
de pau-brasil
de casco de tartaruga
de osso de baleia
de prata com o nome de uma criança
de ferro com uma gota de esmalte
de ouro com uma pérola faltando
de latão com o selo de um navio
de madeira perfumada
de estanho com uma oração gravada
de cobre com marcas de dentes
`)

export const X4_TRINKETS_1 = combine(TRINKET_OBJECTS, TRINKET_MATERIALS)

const SYMBOL_THINGS: [string, "m" | "f"][] = [
  ["um sol", "m"], ["uma lua crescente", "f"], ["uma mão aberta", "f"], ["um olho", "m"], ["uma espiga", "f"], ["uma chave", "f"],
  ["uma roda", "f"], ["uma árvore", "f"], ["uma onda", "f"], ["uma montanha", "f"], ["uma chama", "f"], ["uma estrela de sete pontas", "f"],
  ["um coração", "m"], ["uma serpente enrolada", "f"], ["uma coruja", "f"], ["um martelo", "m"], ["uma foice", "f"], ["um cálice", "m"],
  ["uma ampulheta", "f"], ["um sino", "m"],
]
const SYMBOL_DETAILS = lines(`
dentro de um círculo|dentro de um círculo
coroado de espinhos|coroada de espinhos
cortado ao meio|cortada ao meio
cercado por sete pontos|cercada por sete pontos
sobre um campo negro|sobre um campo negro
pintado com cinzas|pintada com cinzas
gravado em prata|gravada em prata
desenhado com uma só linha|desenhada com uma só linha
com uma lágrima embaixo|com uma lágrima embaixo
com raízes que descem|com raízes que descem
envolto em correntes|envolta em correntes
atravessado por uma lança|atravessada por uma lança
entre duas mãos|entre duas mãos
de cabeça para baixo|de cabeça para baixo
dentro de um triângulo|dentro de um triângulo
feito de pequenas pedras|feita de pequenas pedras
riscado em vermelho|riscada em vermelho
cercado de chamas|cercada de chamas
sobre ondas|sobre ondas
com asas abertas|com asas abertas
desenhado em ouro sobre azul|desenhada em ouro sobre azul
com uma estrela no centro|com uma estrela no centro
partido em quatro|partida em quatro
cercado por um anel de nós|cercada por um anel de nós
sobre uma escada|sobre uma escada
coberto por um véu|coberta por um véu
`).map((line) => line.split("|"))
export const X4_DEITY_SYMBOLS_1 = SYMBOL_THINGS.flatMap(([thing, gender]) => SYMBOL_DETAILS.map((forms) => `${thing} ${forms[gender === "f" ? 1 : 0]}`))

export const X4_COIN_AMOUNTS_1 = [1, 2, 5, 9, 15, 21, 23, 28, 29, 31, 32, 34, 36, 37, 38, 39, 41, 43, 44, 45, 46, 47, 49, 51, 52, 53, 54, 56, 57, 58, 59, 60, 61, 62, 63, 65, 67, 68, 69, 71, 72, 73, 74, 76, 77, 78, 79, 80, 81, 82, 83, 84, 86, 87, 88, 89, 90, 91, 92, 93, 94, 96, 97, 98, 99, 101, 105, 108, 111, 112, 115, 120, 121, 125, 128, 135, 140, 144, 145, 155, 160, 165, 166, 170, 180, 185, 190, 195, 199, 210, 215, 220, 230, 240, 250, 256, 260, 270, 275, 280, 290, 310, 330, 333, 340, 360, 365, 375, 380, 390, 400, 410, 420, 425, 430, 440, 460, 470, 475, 480, 490, 510, 520, 525, 540, 550, 560, 575, 580, 625, 640, 650, 666, 675, 680, 700, 720, 725, 777, 800, 825, 850, 875, 888, 950, 960, 999, 1000, 1024, 1100, 1111, 1250, 1300, 1400, 1600, 1700, 1750, 1800, 1900, 2200, 2400, 2500, 2750, 3000, 3333, 3500, 4000, 4500, 5000, 6000, 7000, 7777, 8000, 9000, 10000]

const COIN_TYPES = lines(`
moedas de prata
moedas de ouro
moedas de cobre
moedas de bronze
peças de estanho
`)
const COIN_MARKS = lines(`
com a efígie de uma rainha esquecida
cunhadas num reino do deserto
com um furo no meio
riscadas por um cambista desconfiado
de um tesouro de piratas
com o selo de um banco de anões
cobertas de limo do fundo do mar
de um templo saqueado
gastas a ponto de perder o desenho
com marcas de dentes
de uma cidade que afundou
com runas élficas na borda
amarradas num cordão de couro
ainda brilhando como novas
de uma guerra antiga
cunhadas com o rosto do usurpador
dentro de uma meia velha
num saquinho com o nome de alguém
`)

export const X4_COIN_KINDS_1 = combine(COIN_TYPES, COIN_MARKS)

const SIGNALS = lines(`
que brilha
que esquenta
que esfria até doer
que vibra baixinho
que sussurra um aviso
que fica pesado
que muda de cor
que solta faíscas
que range como madeira velha
que cheira a enxofre
que fica coberto de geada
que canta uma nota aguda
que pulsa como um coração
que solta uma fumaça azul
que fica transparente
`)
const WHEN = lines(`
perto de mortos-vivos
quando alguém mente
diante de veneno
quando um inimigo se aproxima
perto de ouro enterrado
na presença de fadas
quando o dono está em perigo
perto de portas secretas
quando alguém pronuncia o nome do antigo dono
diante de magia de ilusão
quando a lua está cheia
perto de água potável
quando um demônio está por perto
ao cruzar uma fronteira
quando alguém o cobiça
perto de armadilhas
quando chove
diante de um juramento quebrado
quando o dono sonha
perto de quem já matou alguém
`)

export const X4_MAGIC_POWERS_1 = combine(SIGNALS, WHEN)
