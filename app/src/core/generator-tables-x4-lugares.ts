/**
 * Geradores ×4 (U32, atualização 1.2.0): mais opções escritas à mão, uma por linha. `generator-tables.ts` põe cada
 * lista no fim da original (os testes usam os primeiros itens). Nada aqui é variação gerada de outra opção: onde a
 * lista é naturalmente uma peça mais outra, as duas partes são escritas à mão e só se juntam as que combinam.
 */
import { lines, pairs } from "./generator-tables-pessoas"
import { combine } from "./generator-tables-x4-pessoas"

export const X4_TAVERN_NOUNS_1 = pairs(`
Lontra|f
Garça|f
Toupeira|f
Codorna|f
Arraia|f
Salamandra|f
Libélula|f
Cigarra|f
Formiga|f
Ostra|f
Sereia Cansada|f
Bruxa do Poço|f
Viúva Alegre|f
Freira Bêbada|f
Duquesa|f
Lavadeira|f
Fiandeira|f
Taberneira|f
Barqueira|f
Pastora|f
Ferradura|f
Bigorna|f
Caneca|f
Panela|f
Chaleira|f
Lamparina|f
Ampulheta|f
Bússola|f
Âncora|f
Bandeira|f
Espora|f
Flauta|f
Harpa|f
Rabeca|f
Gaita|f
Moeda|f
Chave|f
Coroa|f
Tiara|f
Máscara|f
Pena|f
Pedra|f
Estrela|f
Lua|f
Nuvem|f
Tempestade|f
Névoa|f
Fogueira|f
Brasa|f
Faísca|f
Cebola|f
Abóbora|f
Pera|f
Ameixa|f
Cereja|f
Castanha|f
Romã|f
Azeitona|f
Linguiça|f
Torta|f
Galinha Choca|f
Cabra Teimosa|f
Mula Empacada|f
Vaca Voadora|f
Égua Branca|f
Ovelha Negra|f
Porca Gorda|f
Pata Manca|f
Coruja Cega|f
Andorinha|f
Gaivota|f
Pomba|f
Gralha Falante|f
Aranha|f
Abelha Rainha|f
Truta|f
Enguia|f
Lula|f
Baleia|f
Tartaruga|f
Lebre|f
Doninha|f
Marmota|f
Serpente|f
Víbora|f
Fênix|f
Quimera|f
Harpia|f
Mantícora|f
Hidra|f
Lontra Risonha|f
Ponte Velha|f
Torre Torta|f
Porta Verde|f
Janela Azul|f
Escada|f
Muralha|f
Roda de Moinho|f
Carroça|f
Galé|f
Jangada|f
Lanterna|f
Vela|f
Rede|f
Bota|f
Luva|f
Capa|f
Bengala|f
Espada Quebrada|f
Lança|f
Adaga|f
Flecha|f
Besta|f
Funda|f
Armadura Vazia|f
Cerveja|f
Bolota|f
Folha|f
Raiz|f
Rosa|f
Margarida|f
Papoula|f
Urtiga|f
Hera|f
Videira|f
Nogueira|f
Figueira|f
Oliveira|f
Lontra|f
Texugo|m
Javali|m
Veado|m
Cervo|m
Alce|m
Bisão|m
Touro|m
Carneiro|m
Bode|m
Burro|m
Cavalo Malhado|m
Pônei|m
Galo|m
Ganso|m
Pato|m
Peru|m
Pavão|m
Faisão|m
Melro|m
Pardal|m
Sabiá|m
Rouxinol|m
Tordo|m
Falcão|m
Gavião|m
Abutre|m
Mocho|m
Morcego|m
Esquilo|m
Ouriço|m
Rato|m
Gato Preto|m
Cão Fiel|m
Lobo Cinzento|m
Urso|m
Leão|m
Tigre|m
Elefante|m
Camelo|m
Crocodilo|m
Polvo|m
Caranguejo|m
Camarão|m
Salmão|m
Arenque|m
Bacalhau|m
Tubarão|m
Golfinho|m
Dragão|m
Grifo|m
Unicórnio|m
Basilisco|m
Troll|m
Ogro|m
Gigante|m
Anão|m
Gnomo|m
Duende|m
Goblin|m
Kobold|m
Elfo|m
Fantasma|m
Esqueleto|m
Vampiro|m
Lobisomem|m
Bardo|m
Monge|m
Ermitão|m
Mercador|m
Marujo|m
Pirata|m
Ferreiro|m
Moleiro|m
Pastor|m
Caçador|m
Pescador|m
Cavaleiro|m
Escudeiro|m
Rei Deposto|m
Príncipe Perdido|m
Bispo|m
Bobo|m
Mendigo|m
Ladrão|m
Carrasco|m
Coveiro|m
Barril|m
Tonel|m
Caldeirão|m
Caneco|m
Cálice|m
Prato|m
Garfo|m
Martelo|m
Machado|m
Escudo|m
Elmo|m
Arco|m
Punhal|m
Tambor|m
Alaúde|m
Sino|m
Relógio|m
Mapa|m
Livro|m
Pergaminho|m
Tinteiro|m
Anel|m
Colar|m
Dado|m
Baralho|m
Barco|m
Navio Fantasma|m
Farol|m
Moinho|m
Poço|m
Celeiro|m
Portão|m
Castelo|m
Cometa|m
Sol|m
Trovão|m
Raio|m
Vento|m
Rio|m
Lago|m
Pântano|m
Vale|m
Monte|m
Carvalho|m
Pinheiro|m
Salgueiro|m
Cogumelo|m
Repolho|m
Nabo|m
Pão|m
Queijo|m
Presunto|m
Pernil|m
Ensopado|m
Copo|m
Gole|m
Brinde|m
`)

export const X4_TAVERN_ADJECTIVES_1 = pairs(`
Sonolento|Sonolenta
Distraído|Distraída
Desconfiado|Desconfiada
Atrevido|Atrevida
Envergonhado|Envergonhada
Apaixonado|Apaixonada
Desdentado|Desdentada
Barrigudo|Barriguda
Careca|Careca
Caolho|Caolha
Manco|Manca
Gago|Gaga
Surdo|Surda
Rabugento|Rabugenta
Risonho|Risonha
Chorão|Chorona
Fujão|Fujona
Valentão|Valentona
Mentiroso|Mentirosa
Fanfarrão|Fanfarrona
Glutão|Glutona
Sedento|Sedenta
Embriagado|Embriagada
Sóbrio|Sóbria
Faminto|Faminta
Molhado|Molhada
Enlameado|Enlameada
Chamuscado|Chamuscada
Congelado|Congelada
Esquecido|Esquecida
Perdido|Perdida
Achado|Achada
Roubado|Roubada
Emprestado|Emprestada
Remendado|Remendada
Enferrujado|Enferrujada
Polido|Polida
Lascado|Lascada
Rachado|Rachada
Torto|Torta
Pintado|Pintada
Bordado|Bordada
Coroado|Coroada
Mascarado|Mascarada
Encantado|Encantada
Enfeitiçado|Enfeitiçada
Assombrado|Assombrada
Sagrado|Sagrada
Profano|Profana
Herege|Herege
Peregrino|Peregrina
Viajante|Viajante
Estrangeiro|Estrangeira
Do Norte|Do Norte
Do Sul|Do Sul
Do Porto|Do Porto
Da Ponte|Da Ponte
Do Moinho|Do Moinho
Da Colina|Da Colina
Do Pântano|Do Pântano
Da Encruzilhada|Da Encruzilhada
Do Fim do Mundo|Do Fim do Mundo
De Duas Cabeças|De Duas Cabeças
De Uma Asa Só|De Uma Asa Só
De Chapéu|De Chapéu
De Botas|De Botas
De Ouro|De Ouro
De Prata|De Prata
De Cobre|De Cobre
De Lata|De Lata
De Vidro|De Vidro
De Pedra|De Pedra
De Madeira|De Madeira
Do Rei|Do Rei
Da Rainha|Da Rainha
Do Bispo|Do Bispo
Dos Ladrões|Dos Ladrões
Dos Marujos|Dos Marujos
Dos Mortos|Dos Mortos
Das Sete Luas|Das Sete Luas
Do Último Gole|Do Último Gole
Que Ri|Que Ri
Que Dança|Que Dança
Que Canta|Que Canta
Que Dorme|Que Dorme
Que Voa|Que Voa
Sem Rabo|Sem Rabo
Sem Dono|Sem Dono
Sem Pressa|Sem Pressa
Sem Juízo|Sem Juízo
Escarlate|Escarlate
Carmesim|Carmesim
Púrpura|Púrpura
Anil|Anil
Esmeralda|Esmeralda
Cinzento|Cinzenta
Prateado|Prateada
Bronzeado|Bronzeada
Malhado|Malhada
Listrado|Listrada
Pintalgado|Pintalgada
Gordo|Gorda
Magro|Magra
Pequenino|Pequenina
Gigante|Gigante
Anão|Anã
Velhaco|Velhaca
Matreiro|Matreira
Esperto|Esperta
Tolo|Tola
Sábio|Sábia
Ingênuo|Ingênua
Teimoso|Teimosa
Generoso|Generosa
Avarento|Avarenta
Honrado|Honrada
Malvado|Malvada
Bondoso|Bondosa
Ciumento|Ciumenta
Orgulhoso|Orgulhosa
Humilde|Humilde
Corajoso|Corajosa
Medroso|Medrosa
Feliz|Feliz
Triste|Triste
Saudoso|Saudosa
Furioso|Furiosa
Calmo|Calma
Selvagem|Selvagem
Domado|Domada
Livre|Livre
Acorrentado|Acorrentada
Exilado|Exilada
Banido|Banida
Perdoado|Perdoada
Condenado|Condenada
Ressuscitado|Ressuscitada
Imortal|Imortal
Eterno|Eterna
Noturno|Noturna
Matinal|Matinal
Outonal|Outonal
Invernal|Invernal
Primaveril|Primaveril
Tropical|Tropical
Marinho|Marinha
Montanhês|Montanhesa
Ribeirinho|Ribeirinha
Fronteiriço|Fronteiriça
Real|Real
Plebeu|Plebeia
Nobre|Nobre
Falido|Falida
Rico|Rica
Pobre|Pobre
Endividado|Endividada
Abastado|Abastada
Faceiro|Faceira
Garboso|Garbosa
Elegante|Elegante
Desleixado|Desleixada
Esfarrapado|Esfarrapada
Perfumado|Perfumada
Fedorento|Fedorenta
Barulhento|Barulhenta
Silencioso|Silenciosa
Cantante|Cantante
Fumegante|Fumegante
Borbulhante|Borbulhante
Saltitante|Saltitante
Dançarino|Dançarina
Gaiteiro|Gaiteira
Ferreiro|Ferreira
Pescador|Pescadora
Caçador|Caçadora
Guerreiro|Guerreira
Andarilho|Andarilha
Sonhador|Sonhadora
Jogador|Jogadora
Trapaceiro|Trapaceira
Bebedor|Bebedora
Comilão|Comilona
Fiel|Fiel
Traidor|Traidora
Bem-Vindo|Bem-Vinda
Mal-Humorado|Mal-Humorada
Bem-Disposto|Bem-Disposta
`)


const PREPS = lines(`
ensopado de
guisado de
sopa grossa de
torta de
caldo de
espetinhos de
empadão de
cozido de
fritada de
assado lento de
`)
const MEATS = lines(`
javali
coelho
lebre
carneiro
cabrito
pato
ganso
pombo
codorna
faisão
enguia
truta
carpa
bacalhau
sardinha
lula
mexilhão
caracol
rã
tripas
língua de boi
miúdos de frango
toucinho
ostra
caranguejo do rio
`)
const GREENS = lines(`
cogumelo do bosque
nabo e cenoura
lentilha
grão-de-bico
feijão-fava
abóbora
cebola roxa
alho-poró
castanha
cevada
couve
espinafre selvagem
ovos de pata
batata-doce
raiz-forte
`)
/** Espeto e assado só com carne e peixe; o resto vale para tudo. */
const MEAT_ONLY = new Set(["espetinhos de", "assado lento de"])
const MAINS = lines(`
costela de porco
peixe do dia
pão de centeio
coxa de frango
lombo de cervo
salsicha de sangue
pernil de cabrito
truta na brasa
cogumelos na manteiga
mingau de aveia
bolinhos de batata
queijo de cabra assado
ovo cozido em cerveja
pão com banha
carne-seca
pato no espeto
polvo grelhado
enguia defumada
nabo assado
torta de carne
`)
const SIDES = lines(`
com purê de nabo
com cebolas caramelizadas
com molho de cerveja preta
com pão duro para molhar
com ervas da horta
com mostarda forte
com maçã cozida
com geleia de frutas vermelhas
com repolho azedo
com pimenta do sul
com um ovo frito por cima
com mel e nozes
`)

export const X4_DISHES_1 = [...combine(PREPS, MEATS), ...combine(PREPS.filter((prep) => !MEAT_ONLY.has(prep)), GREENS)]
export const X4_DISHES_2 = combine(MAINS, SIDES)

const DRINK_BASES = lines(`
cerveja escura
cerveja clara
cerveja de trigo
hidromel
vinho tinto
vinho branco
vinho quente
sidra
perada
aguardente de cana
aguardente de ameixa
licor de ervas
chá preto
leite morno
água de cevada
`)
const DRINK_TWISTS = lines(`
com mel
com canela
com cravo e casca de laranja
com gengibre
com pimenta
com uma gota de absinto
com um ovo cru batido
com folhas de hortelã
com frutas vermelhas amassadas
com sal grosso na borda
com raspas de limão
de uma barrica de carvalho velho
da adega do mosteiro
de um barril achado na praia
da colheita do ano passado
da casa, que o dono não revela
em caneca de estanho
em copo de chifre
com fumaça de lenha
com flores de sabugueiro
com um pedaço de favo dentro
com anis
com cogumelos, para os corajosos
`)

export const X4_DRINKS_1 = combine(DRINK_BASES, DRINK_TWISTS)

/** Terminações de nome de lugar: o artigo e o adjetivo concordam com cada palavra. */
const TAIL_NOUNS: [string, "m" | "f" | "mp" | "fp"][] = [
  ["Pedra", "f"], ["Lua", "f"], ["Bruxa", "f"], ["Torre", "f"], ["Fonte", "f"], ["Cruz", "f"], ["Rainha", "f"], ["Estrada", "f"], ["Ponte", "f"],
  ["Coroa", "f"], ["Espada", "f"], ["Serpente", "f"], ["Raposa", "f"], ["Águia", "f"], ["Rocha", "f"], ["Muralha", "f"], ["Floresta", "f"], ["Colina", "f"],
  ["Lobo", "m"], ["Rei", "m"], ["Corvo", "m"], ["Carvalho", "m"], ["Gigante", "m"], ["Sino", "m"], ["Monge", "m"], ["Dragão", "m"], ["Cavaleiro", "m"],
  ["Urso", "m"], ["Cervo", "m"], ["Martelo", "m"], ["Escudo", "m"], ["Rio", "m"], ["Lago", "m"], ["Vento", "m"], ["Sol", "m"], ["Anel", "m"],
  ["Lobos", "mp"], ["Reis", "mp"], ["Corvos", "mp"], ["Mortos", "mp"], ["Sinos", "mp"], ["Monges", "mp"], ["Gigantes", "mp"], ["Ventos", "mp"], ["Ossos", "mp"],
  ["Pedras", "fp"], ["Bruxas", "fp"], ["Torres", "fp"], ["Fontes", "fp"], ["Cruzes", "fp"], ["Rainhas", "fp"], ["Espadas", "fp"], ["Serpentes", "fp"], ["Águias", "fp"],
]
const TAIL_ADJECTIVES = lines(`
Velho|Velha|Velhos|Velhas
Negro|Negra|Negros|Negras
Branco|Branca|Brancos|Brancas
Vermelho|Vermelha|Vermelhos|Vermelhas
Dourado|Dourada|Dourados|Douradas
Esquecido|Esquecida|Esquecidos|Esquecidas
Perdido|Perdida|Perdidos|Perdidas
Antigo|Antiga|Antigos|Antigas
Sagrado|Sagrada|Sagrados|Sagradas
Escondido|Escondida|Escondidos|Escondidas
Cinzento|Cinzenta|Cinzentos|Cinzentas
Silencioso|Silenciosa|Silenciosos|Silenciosas
Adormecido|Adormecida|Adormecidos|Adormecidas
Gelado|Gelada|Gelados|Geladas
Partido|Partida|Partidos|Partidas
Caído|Caída|Caídos|Caídas
Afogado|Afogada|Afogados|Afogadas
Prateado|Prateada|Prateados|Prateadas
Uivante|Uivante|Uivantes|Uivantes
Errante|Errante|Errantes|Errantes
Sombrio|Sombria|Sombrios|Sombrias
Coroado|Coroada|Coroados|Coroadas
Ferido|Ferida|Feridos|Feridas
Cantante|Cantante|Cantantes|Cantantes
Enterrado|Enterrada|Enterrados|Enterradas
`).map((line) => line.split("|"))
const ARTICLES = { m: "do", f: "da", mp: "dos", fp: "das" } as const
const FORM = { m: 0, f: 1, mp: 2, fp: 3 } as const

export const X4_PLACE_TAILS_1 = TAIL_NOUNS.flatMap(([noun, kind]) => TAIL_ADJECTIVES.map((forms) => `${ARTICLES[kind]} ${noun} ${forms[FORM[kind]]}`))

/** Clima: como o céu amanhece e o que o dia traz; as duas partes são de cada estação. */
const season = (skies: string, events: string) => combine(lines(skies), lines(events), "; ")
export const X4_WEATHER_1: Record<string, string[]> = {
  Primavera: season(`
Manhã fresca e céu limpo
Garoa fina desde cedo
Sol tímido entre nuvens brancas
Nuvens baixas e ar úmido
Vento morno do sul
Céu de um azul lavado
Neblina rala nos campos
Pancadas de chuva rápidas
Dia ameno e luminoso
Céu encoberto e abafado
Frio leve ao amanhecer
`, `
o rio sobe com o degelo das montanhas.
as estradas de terra viram lama até a tarde.
as abelhas enxameiam nas cercas.
os pomares soltam pétalas no vento.
à tarde abre um arco-íris sobre o vale.
os sapos cantam alto quando escurece.
as andorinhas voltam aos beirais.
a geada tardia queima os brotos baixos.
o cheiro de terra molhada toma a aldeia.
os pastores sobem com o gado para os prados altos.
um trovão distante assusta os cavalos.
as noites ainda pedem lareira.
o vento derruba ninhos das árvores velhas.
os campos ficam cobertos de flores amarelas.
a névoa demora a sair do fundo do vale.
o pólen faz todo mundo espirrar.
um aguaceiro de meia hora pega os viajantes desprevenidos.
as poças refletem o céu até o fim do dia.
a lua nasce grande e alaranjada.
a primeira trovoada do ano chega ao entardecer.
os riachos cantam em todas as encostas.
os brotos de samambaia cobrem a beira do bosque.
`),
  "Verão": season(`
Sol forte desde o amanhecer
Calor parado e úmido
Céu sem uma nuvem
Mormaço pesado
Vento quente do deserto
Manhã enevoada que vira brasa
Ar seco e poeirento
Céu branco de tanto calor
Tarde abafada e cheia de mosquitos
Brisa salgada vinda do mar
Noite quente e estrelada
`, `
a água dos poços baixa um palmo.
uma tempestade de granizo cai no fim da tarde.
os cães dormem à sombra o dia inteiro.
o trigo amadurece de uma vez.
os rios ficam rasos e mostram pedras antigas.
as cigarras não param de cantar.
um incêndio pequeno queima a colina seca.
as moscas atormentam o gado.
os viajantes só andam de manhã cedo e à noite.
a cerveja esquenta antes do segundo gole.
os relâmpagos iluminam o horizonte sem chover.
o leite azeda em poucas horas.
o vento levanta redemoinhos de poeira nas estradas.
o mar fica liso como vidro.
o povo dorme nos telhados.
uma trovoada violenta derruba árvores à noite.
o calor faz o ar tremer sobre as pedras.
os vagalumes enchem os campos ao escurecer.
as frutas caem maduras demais das árvores.
os lagos atraem toda a vila para um banho.
a areia da praia queima os pés descalços.
um chuvisco morno não refresca ninguém.
`),
  Outono: season(`
Vento frio do norte
Céu cinzento e baixo
Manhã de neblina espessa
Chuva fina e teimosa
Sol pálido e sem calor
Folhas voando na ventania
Garoa gelada ao entardecer
Céu limpo e ar cortante
Nuvens pesadas sobre as montanhas
Tarde dourada e curta
Noite longa e úmida
`, `
as folhas entopem as calhas da aldeia.
as estradas viram atoleiros.
os gansos passam em bando para o sul.
a colheita das uvas corre contra a chuva.
os cogumelos brotam em todos os troncos caídos.
a primeira geada branqueia os telhados.
o rio fica turvo e veloz.
os lobos uivam mais perto da aldeia.
a fumaça das chaminés não sobe, fica rente ao chão.
o vento arranca as últimas maçãs.
os caçadores voltam com as botas encharcadas.
a névoa esconde a ponte até o meio-dia.
as noites cheiram a lenha queimada.
as castanhas caem sobre quem passa no bosque.
a lua de colheita brilha laranja sobre os campos.
um temporal derruba a cerca do moinho.
os corvos pousam aos montes nos campos colhidos.
a lama esconde buracos fundos na estrada.
os sinos da capela soam abafados na neblina.
o frio faz os velhos reclamarem dos ossos.
as primeiras chuvas lavam a poeira do verão.
a geada fina estala sob as botas.
`),
  Inverno: season(`
Frio de rachar as pedras
Neve fina caindo sem parar
Céu cor de chumbo
Vento gelado do norte
Manhã clara e congelante
Nevasca durante a madrugada
Ar parado e muito frio
Sol fraco sobre a neve
Céu estrelado e cortante
Garoa congelada
Neblina gelada nos vales
`, `
o rio congela nas margens.
os lobos descem das montanhas atrás de comida.
a neve bloqueia a passagem das montanhas.
os telhados gemem com o peso da neve.
as estradas somem sob um palmo de branco.
a lenha acaba mais cedo que o previsto.
as crianças deslizam no lago congelado.
o pão congela no caminho até a mesa.
pingentes de gelo crescem nos beirais.
um silêncio branco toma o vale.
o gado fica preso nos estábulos o dia todo.
a tinta congela no tinteiro.
as pegadas na neve contam quem passou à noite.
a respiração vira nuvem diante do rosto.
o vento assobia por todas as frestas.
os caçadores só saem com raquetes de neve.
uma avalanche distante ecoa nas montanhas.
os poços congelam e é preciso quebrar o gelo.
o fogo da taverna junta a vila inteira.
o sol se põe antes do meio da tarde.
as árvores estalam de frio na madrugada.
a neve volta a cair assim que alguém limpa a porta.
`),
}

const ROOMS = lines(`
Uma cripta baixa
Um corredor estreito
Uma câmara redonda
Um salão de colunas
Uma capela subterrânea
Uma cozinha abandonada
Um depósito de barris
Uma sala de tortura esquecida
Uma biblioteca alagada
Um quarto de dormir de pedra
Um poço de ventilação largo
Uma escadaria em espiral
Uma galeria de estátuas
Um arsenal saqueado
Uma prisão de celas baixas
Uma sala do trono em ruínas
Um laboratório de alquimista
Uma gruta natural
Um ossuário
Um refeitório de soldados
Uma sala de banho romana
Um templo afundado
Um túnel de mineração
Uma sala de guarda
Um jardim subterrâneo seco
Uma câmara de tesouro vazia
Um observatório sem teto
Uma oficina de anões
Um canil de pedra
Uma sala de audiências
Um salão de festas
Um mausoléu
Uma sala de mapas
Uma ponte sobre um abismo
Um santuário escondido
`)
const ROOM_DETAILS = lines(`
com o chão coberto de ossos de rato
com um altar rachado no centro
onde goteja uma água avermelhada
de paredes cobertas de musgo luminoso
com marcas de garras no teto
onde o eco repete as palavras duas vezes
com tochas que ainda queimam
com um cheiro forte de enxofre
onde o ar é estranhamente quente
com teias grossas como cortinas
com uma porta de ferro trancada por dentro
onde a poeira não tem nenhuma pegada
com inscrições numa língua morta
com uma corrente pendurada do teto
com o piso inclinado para um ralo
onde se ouve música ao longe
com móveis apodrecidos
com um buraco no chão que sopra vento frio
com velas derretidas em círculo
com um cadáver de aventureiro sentado
com o teto parcialmente desabado
onde a água chega aos joelhos
com pinturas de uma batalha antiga
com uma estátua sem cabeça
`)

export const X4_DUNGEON_ROOMS_1 = combine(ROOMS, ROOM_DETAILS)

const TRAPS = lines(`
uma armadilha de lanças
um alçapão sobre estacas
uma lâmina pendular
uma nuvem de gás sonífero
uma rede com pesos de chumbo
um jato de ácido
uma chuva de dardos envenenados
uma parede móvel
uma pedra rolante
um fosso oculto
uma runa de fogo
uma porta-armadilha
um vaso cheio de besouros
uma comporta de inundação
uma grade levadiça
um espelho de raios
um sino dos mortos
uma estátua arqueira
uma escada falsa
um piso de areia movediça
`)
const TRIGGERS = lines(`
que dispara ao pisar na terceira laje
que se arma quando alguém fala alto
que se liga à maçaneta da porta
que dispara quando a tocha se apaga
que fica sob um tapete podre
que reage ao toque do ouro
que dispara ao abrir o baú
que um fio quase invisível aciona
que só funciona para quem não diz a senha
que dispara quando o último do grupo passa
que depende de um contrapeso no teto
que se arma ao meio-dia e à meia-noite
que fica atrás de uma inscrição falsa
que dispara se alguém tentar desarmá-la sem a chave
`)

export const X4_DUNGEON_DANGERS_1 = combine(TRAPS, TRIGGERS)

const SIGNS = lines(`
Há pegadas frescas de botas pequenas
Há gotas de cera ainda mole
Há um cheiro doce de incenso
Há marcas de sangue arrastado
Há um círculo de sal desfeito
Há penas pretas espalhadas
Há uma moeda de prata esquecida
Há um bilhete amassado
Há restos de uma fogueira morna
Há riscos de giz contando dias
Há uma flecha cravada na parede
Há um rastro de lodo brilhante
Há ossos roídos recentemente
Há uma corda cortada
Há um anel de ferro chumbado no chão
Há musgo arrancado em forma de mão
Há um pedaço de mapa preso por uma faca
Há cinzas com o desenho de um símbolo
Há um odor de cachorro molhado
Há um sapato de criança
`)
const SPOTS = lines(`
junto à porta.
no canto mais escuro.
ao pé da escada.
sob a mesa tombada.
perto da única saída.
em volta do altar.
na beira do poço.
ao lado de uma estátua.
entre as colunas.
no meio do corredor.
`)

export const X4_DUNGEON_FEATURES_1 = combine(SIGNS, SPOTS)
