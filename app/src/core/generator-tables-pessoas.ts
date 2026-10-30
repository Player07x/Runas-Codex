/**
 * Mais opções para os geradores de pessoas, ganchos, rumores e tavernas (beta.22: 100 vezes as 84 opções de antes da
 * beta.21). Uma opção por linha; `generator-tables.ts` junta estas listas às dele. Pares masculino/feminino vêm
 * separados por `|`.
 */

export const lines = (text: string): string[] => text.split("\n").map((line) => line.trim()).filter(Boolean)
export const pairs = (text: string): [string, string][] => lines(text).map((line) => { const [a = "", b = a] = line.split("|"); return [a.trim(), b.trim()] })

export const MORE_FEMALE_NAMES = lines(`
Adelaide
Alice
Amanda
Antónia
Augusta
Bernardete
Carlota
Cândida
Diana
Elvira
Emília
Fátima
Flávia
Francisca
Germana
Heloísa
Ivone
Josefa
Juliana
Lourdes
Lúcia
Marta
Natália
Odete
Patrícia
Quitéria
Regina
Rosália
Sílvia
Tânia
Úrsula
Valentina
Vitória
Xica
Zélia
Ermelinda
Guilhermina
Albertina
Felícia
Jandira
`)

export const MORE_MALE_NAMES = lines(`
Abel
Álvaro
Anselmo
Armando
Artur
Bartolomeu
Bernardo
Celso
Cristóvão
Custódio
Daniel
Edmundo
Elias
Emanuel
Fausto
Feliciano
Filipe
Francisco
Gabriel
Guilherme
Hélio
Hilário
Ivo
Joaquim
Jorge
Júlio
Lázaro
Leonel
Manuel
Marcelo
Mateus
Nicolau
Orlando
Paulo
Raimundo
Reinaldo
Silvestre
Tomé
Urbano
Vicente
`)

export const MORE_SURNAMES = lines(`
Abreu
Aguiar
Alvarenga
Amaral
Antunes
Azevedo
Bastos
Batista
Bezerra
Borges
Cabral
Caldeira
Câmara
Campos
Castro
Cavaco
Chaves
Couto
Damasceno
Domingues
Duarte
Encarnação
Falcato
Felgueiras
Frade
Furtado
Gama
Godinho
Gomes
Henriques
Lima
Lopes
Machado
Maia
Marinho
Martins
Mesquita
Miranda
Neto
Nunes
Oliveira
Pestana
Pinto
Prates
Quaresma
Ramos
Rodrigues
Sá
Salgado
Santos
Seabra
Silveira
Simões
Sousa
Tavora
Toledo
Valverde
Varela
Veloso
Zagalo
`)

export const MORE_PROFESSIONS = pairs(`
cervejeiro|cervejeira
vinhateiro|vinhateira
queijeiro|queijeira
açougueiro|açougueira
peleiro|peleira
seleiro|seleira
armeiro|armeira
ourives|ourives
relojoeiro|relojoeira
encadernador|encadernadora
copista|copista
iluminador|iluminadora
tintureiro|tintureira
fiandeiro|fiandeira
alfaiate|costureira
chapeleiro|chapeleira
barbeiro|barbeira
cirurgião-barbeiro|cirurgiã-barbeira
dentista de feira|dentista de feira
pregoeiro|pregoeira
arauto|arauta
mestre-escola|mestra-escola
tutor de nobres|tutora de nobres
tratador de cavalos|tratadora de cavalos
ferrador|ferradora
carroceiro|carroceira
almocreve|almocreve
estivador|estivadora
calafate|calafate
cordoeiro|cordoeira
faroleiro|faroleira
piloto de rio|piloto de rio
mergulhador de pérolas|mergulhadora de pérolas
salineiro|salineira
carvoeiro|carvoeira
resineiro|resineira
pedreiro de catedral|pedreira de catedral
escultor|escultora
pintor de retratos|pintora de retratos
ator itinerante|atriz itinerante
malabarista|malabarista
titereiro|titereira
cartomante|cartomante
carcereiro|carcereira
carrasco|carrasca
espadachim de aluguel|espadachim de aluguel
instrutor de esgrima|instrutora de esgrima
sentinela da muralha|sentinela da muralha
cobrador de pedágio|cobradora de pedágio
agiota|agiota
penhorista|penhorista
cambista|cambista
falsificador|falsificadora
receptador|receptadora
`)

export const MORE_DESIRES = lines(`
ver o mar antes de morrer
achar o irmão que partiu com o exército
casar com quem a família proíbe
abrir a própria taverna
derrubar o capataz da mina
aprender a ler
voltar para a terra natal
pagar o resgate de um amigo
entrar para a guarda real
descobrir quem foram os pais
desfazer uma promessa feita bêbado
ganhar o torneio da primavera
escapar de um culto
reconstruir a casa que pegou fogo
ver um dragão de perto
juntar dinheiro para o dote da filha
encontrar a cura para uma doença rara
expulsar os cobradores da aldeia
recuperar a espada do avô
ganhar o respeito do pai
apagar uma tatuagem de prisioneiro
salvar o bosque dos lenhadores
achar um mestre que o aceite
ser perdoado pela irmã
fundar um templo
ter um dia inteiro de paz
sumir do mapa
virar nobre por casamento
provar que viu um fantasma
escrever um livro de viagens
dominar uma magia proibida
reaver um anel penhorado
proteger um segredo da rainha
voltar a tocar depois de perder dois dedos
achar o tesouro de uma lenda infantil
quitar a dívida do moinho
devolver um objeto roubado sem ser pego
reencontrar um amor de juventude
ensinar o ofício a um aprendiz digno
ver a filha formada na academia
garantir um enterro digno para o mestre
ganhar uma aposta impossível
conhecer a capital
fugir de um nobre que o persegue
domesticar um grifo
acabar com uma rixa entre famílias
recuperar a memória perdida
salvar o barco da família
ser escolhido como herdeiro
expiar um crime antigo
trazer chuva para a aldeia
encontrar um lugar onde ninguém o conheça
derrotar o campeão da arena
vender a invenção que ninguém leva a sério
ter o nome no livro dos heróis da cidade
abrir uma escola para órfãos
achar a última página de um diário
quebrar a maldição do lago
subir na hierarquia da guilda
reunir a velha companhia de aventureiros
desaparecer com o ouro do patrão
ver a cidade natal livre do tirano
achar a montaria que fugiu
conquistar uma cadeira no conselho
aprender a nadar
comer num banquete real
encontrar alguém digno de herdar a loja
desfazer um casamento por procuração
descobrir o que há atrás da porta selada
resgatar livros de uma biblioteca condenada
reaver a voz roubada por uma fada
ser aceito pelos elfos da floresta
pagar a fiança de um amigo
chegar ao fim da estrada antiga
viver o bastante para ver o neto
devolver a honra ao brasão da família
`)

export const MORE_SECRETS = lines(`
um diário com o nome de todos os seus amantes
uma segunda família em outra cidade
um irmão gêmeo que ninguém conhece
uma cicatriz de marca de escravo
um saco de moedas de um assalto antigo
um contrato com a guilda dos ladrões
o paradeiro de um príncipe desaparecido
a receita de um veneno sem cheiro
um título de nobreza falsificado
uma relíquia roubada de um templo
um passado como carrasco
uma doença que esconde de todos
um amor proibido por um inimigo
a lista de quem traiu a revolta
um ovo que esquenta à noite
uma carta de alforria falsa
a verdadeira autoria de uma canção famosa
um desertor escondido no porão
a chave do cofre do conselho
uma visão do próprio fim
um mapa tatuado nas costas
um juramento a um deus esquecido
o local onde enterrou um corpo
uma dívida de sangue com os anões
um anel que permite ouvir pensamentos
um caso com o cônjuge do prefeito
a confissão de um assassinato que não cometeu
um tesouro escondido no poço
uma fuga da prisão real
um pacto de silêncio com um dragão
a planta dos túneis sob a cidade
uma herança que pertence a outra pessoa
um filho que é, na verdade, de um nobre
o testemunho que condenou um inocente
uma língua que não deveria saber falar
uma coleção de cartas da rainha
um disfarce que usa há anos
uma marca de bruxa no ombro
a localização de uma mina de prata não registrada
uma licença de comércio comprada com suborno
o veneno que matou o antigo dono da casa
um passado no culto das sombras
um mapa estelar que aponta para uma porta
um acordo com contrabandistas do porto
uma traição ao próprio mestre
um nome em uma lista de procurados
um feitiço que guardou num frasco
um parentesco com o vilão da região
o último fragmento de uma coroa partida
um retrato de alguém que morreu há cem anos
o verdadeiro motivo da guerra
uma promessa feita a um espírito da floresta
um cão que, à noite, vira gente
um voto de vingança contra os personagens
uma visita secreta do bispo toda semana
uma moeda que sempre volta para o bolso
o paradeiro do sino roubado da capela
uma ficha de jogo que vale uma fortuna
uma ligação com a rede de espiões do reino
o selo do falecido duque
um pedaço de pergaminho com uma profecia
a cura que negou a um rival
uma carta de amor que nunca enviou
o mapa da passagem sob a muralha
um aprendiz que foi sacrificado
um nome que não pode pronunciar
um tesouro que já gastou e ninguém sabe
uma testemunha que paga para ficar calada
o diário do antigo prefeito
um encontro marcado com um lich
um gêmeo morto que fala com ele em sonho
uma garrafa com a alma de alguém
o roubo da relíquia que dizem ter sido milagre
a verdade sobre a morte do pai
a chave de um navio afundado
um pacto antigo com as fadas
uma promessa de casamento a duas pessoas
o lugar onde a rainha esconde o filho
`)

export const MORE_TRAITS = lines(`
termina as frases dos outros
come sempre de pé
conta tudo em moedas
tem medo de escuro e finge que não
pede desculpas por tudo
discute com a própria sombra
ri antes de contar a piada
coleciona botões
nunca se senta de costas para a porta
dá apelidos a todo mundo
cheira a comida antes de provar
fala de mortos como se estivessem vivos
cumprimenta com reverências exageradas
morde o lábio quando mente
não suporta silêncio
interrompe para contar uma história maior
oferece comida a qualquer visitante
tem pressa até para descansar
reclama do tempo em qualquer estação
fala alto com estrangeiros
mexe nos anéis sem parar
imita a voz das pessoas
nunca diz o próprio nome primeiro
cospe antes de fechar um negócio
desenha nas margens de tudo
chora com facilidade em canções
fala devagar quando está bravo
sempre tem um conselho não pedido
trata animais como gente
desconfia de quem não bebe
lembra o aniversário de todo mundo
gargalha em funerais
se gaba de parentes famosos
pede segredo para contar fofoca
não termina nenhuma tarefa
fala sozinho enquanto trabalha
tem uma resposta pronta para tudo
aceita qualquer aposta
canta desafinado e alto
sempre chega atrasado com uma desculpa nova
ajeita objetos tortos na casa dos outros
fica em silêncio quando ofendido
conta os passos ao andar
faz perguntas demais
tem sono pesado e acorda mal-humorado
gosta de tudo que é antigo
odeia magia e esconde que usa
fala com plantas
pisca para todo mundo
sempre se oferece para ajudar e some
se veste melhor do que pode pagar
lê a sorte em folhas de chá
é educado demais com quem odeia
conta vantagens de batalhas que perdeu
tem tiques quando ouve um nome específico
mastiga folhas de hortelã sem parar
tem um bordão que repete toda hora
ri de nervoso em momentos sérios
promete demais
não aceita elogios
só confia em quem já viu sangrar
dá risada de piadas que não entende
anda sempre com um amuleto na mão
trata crianças como adultos
pergunta o preço de tudo
fala com sotaque de outra região
é gentil e cruel na mesma frase
evita espelhos
nunca come carne às sextas
toca um instrumento invisível quando pensa
tem medo de pássaros
dorme com a arma debaixo do travesseiro
nunca recusa uma bebida grátis
cumpre a palavra mesmo quando custa caro
`)

export const MORE_LOOKS = lines(`
um olho de vidro azul
cabelo trançado com fitas coloridas
um nariz quebrado mais de uma vez
sardas que cobrem o rosto inteiro
uma orelha cortada
um chapéu largo demais
óculos de lentes grossas
barba trançada com contas de osso
cabeça raspada e tatuada
pele queimada de sol do mar
mãos enormes e delicadas
um brinco de pena
roupas de luto que nunca troca
uma faixa de capitão desbotada
cheiro forte de alho
um bigode encerado em pontas
um anel em cada dedo
um capuz que nunca tira
uma bengala com cabeça de cobra
pintura de guerra mal lavada
cabelo ruivo como fogo
olhos muito claros, quase brancos
um cachecol tricotado pela avó
um medalhão que aperta sempre que fala
unhas compridas e pintadas de preto
dentes limados em ponta
um pássaro no ombro
botas novas demais para a roupa
uma voz rouca de fumo de cachimbo
cabelos longos e grisalhos soltos
um manto de pele de urso
um pingente com um dente de tubarão
olheiras fundas de quem não dorme
uma armadura com um amassado no peito
a pele marcada por varíola
um vestido de baile num lugar errado
mãos trêmulas
um lenço vermelho no pescoço
tatuagens de navio nos braços
um sorriso fixo que não chega aos olhos
uma gargalhada que se ouve da rua
uma túnica de monge remendada
um elmo velho usado como chapéu
o rosto sempre sujo de fuligem
uma corrente de ouro grossa demais
cabelos azuis tingidos com anil
mangas arregaçadas e braços fortes
uma postura de quem já foi soldado
um leque que nunca fecha
uma flor seca na lapela
pés descalços em qualquer chão
um casaco com dezenas de bolsos
um cinto cheio de frascos
um broche de guilda que não é dele
o queixo erguido de quem foi nobre
voz fina que não combina com o tamanho
cicatrizes de garras no pescoço
uma luva só, na mão esquerda
as orelhas furadas em vários pontos
um cheiro de incenso que fica no ar
um cajado mais alto do que ele
um gorro de lã no verão
o cabelo preso com um osso
mãos de unhas roídas
um uniforme de guarda sem insígnias
um saco de couro sempre fechado no ombro
uma voz grave de cantor
a pele com um leve tom esverdeado
um curativo velho na testa
um avental de couro chamuscado
um sotaque carregado do norte
o andar manco de uma ferida antiga
roupas costuradas com retalhos de bandeiras
uma faca de prata presa na bota
`)

export const MORE_HOOK_EVENTS = lines(`
Um eclipse dura o dia inteiro
Todas as velas da aldeia se apagam ao mesmo tempo
Um poço começa a sussurrar nomes
As crianças desenham a mesma porta
Um cometa verde corta o céu
Uma tempestade traz peixes do céu
O sino da capela é roubado
Um cavaleiro morto chega a cavalo
Um lobo fala na praça
A neve cai no meio do verão
A biblioteca amanhece com um livro a mais
Os mortos do cemitério estão de olhos abertos
Um gigante dorme no meio da estrada
O espelho da estalagem mostra outra sala
Todos os cães da cidade uivam ao meio-dia
Um mercador vende mapas de lugares que não existem
O farol acende uma luz vermelha
Uma árvore floresce com flores de vidro
O prefeito some deixando o jantar na mesa
Uma carta chega endereçada a um dos personagens, datada de daqui a um ano
Os pássaros voam em círculo sobre a torre
Uma ilha aparece no lago
Um terremoto abre uma escadaria na colina
Uma mulher acorda depois de dormir dez anos
A estátua do herdeiro chora sangue
O trigo cresce formando símbolos
Uma caravana inteira chega sem os cavalos
A ponte de pedra amanhece feita de madeira
Um fantasma pede para ser enterrado de novo
O vento traz uma canção que ninguém conhece
Todos esquecem o nome da cidade vizinha
Um navio de guerra ancora sem bandeira
O ferreiro forja uma espada que não quer parar de vibrar
Uma criança volta da floresta trinta anos mais velha
Uma chuva de cinzas cobre o vale
Os moinhos param ao mesmo tempo
Um mapa antigo começa a se desenhar sozinho
A rainha decreta luto sem dizer por quem
Uma torre de mago aparece onde havia um campo
As águas do porto ficam vermelhas
Um velho chega dizendo ser o rei morto
Os sonhos de toda a aldeia são iguais
Um anão desce da montanha pedindo asilo
O templo amanhece de portas lacradas por dentro
Uma luz azul dança sobre o pântano
O padeiro encontra um anel dentro do pão
O cemitério amanhece com uma cova aberta a mais
Uma tribo de goblins pede para negociar
A colheita de uvas vem com sementes de ouro
As sombras da praça apontam para o norte ao meio-dia
Um mensageiro chega ferido e morre sem falar
O rei convoca todos os aventureiros do reino
Uma aranha gigante tece teias entre as torres
A fonte da praça seca e revela uma escada
Os ratos deixam a cidade em fila
Uma carruagem negra passa toda meia-noite
Um elfo vende lembranças em frascos
As runas da muralha começam a brilhar
O lago congela em pleno verão
O bobo da corte foge levando a coroa
Um bando de corvos traz um anel até a janela
Alguém pintou um olho em todas as portas
Uma névoa espessa não deixa ninguém sair da vila
Um lenhador corta uma árvore que sangra
A guilda dos mercadores fecha as portas
Um grupo de peregrinos desaparece na estrada
As vacas dão leite azul
Uma porta aparece sozinha no meio do campo
Uma tocha passa voando sobre os telhados
O estalajadeiro jura que um hóspede saiu pela chaminé
Um mago chega procurando o próprio aprendiz
A água benta do templo ferve
Uma batalha antiga se repete no céu à noite
Uma doença faz as pessoas falarem só a verdade
O marco da fronteira é mudado de lugar
Um ovo enorme é encontrado numa caverna
Os sinos tocam a hora treze
A sombra de um dragão passa sobre a vila sem dragão nenhum
`)

export const MORE_HOOK_TURNS = lines(`
Um rival dos personagens também está investigando
O culpado é alguém que eles salvaram antes
O conselho oferece perdão de dívidas a quem resolver
O único guia exige um favor perigoso
Uma testemunha só fala em troca de proteção
A solução exige entrar em terras proibidas
O fenômeno está ligado a uma profecia antiga
Um bardo já espalhou uma versão falsa da história
O templo quer abafar o caso
Alguém deixa uma pista anônima na estalagem
Os guardas prendem a pessoa errada
A única pista está numa língua morta
O prazo é até a próxima lua cheia
Uma criança viu tudo e ninguém acredita
O responsável é poderoso demais para ser acusado
O caso lembra uma tragédia de cem anos atrás
Um nobre contrata os personagens em segredo
A recompensa vem de um inimigo antigo
Um mago pede uma amostra do fenômeno
Os aldeões querem queimar uma inocente
Há um diário que explica tudo, mas está trancado
A guilda dos ladrões também quer respostas
Um espírito pede ajuda para descansar
Um dos personagens é apontado como suspeito
O mesmo aconteceu na cidade vizinha na semana passada
Um mercador lucra vendendo amuletos contra o fenômeno
Quem investigou antes desapareceu
Um cavaleiro exige o direito de resolver sozinho
A rainha manda um observador acompanhar o grupo
O fenômeno piora a cada tentativa de resolvê-lo
Os anões dizem que a causa está sob a montanha
Uma bruxa oferece a resposta por um preço estranho
Uma carta pede que os personagens não se envolvam
O povo acha que é castigo divino
Os sacerdotes discordam entre si
Uma facção quer que o fenômeno continue
O mapa da região tem uma área em branco justamente ali
Um velho aventureiro aposentado sabe a verdade
A pista leva a um baile da nobreza
Alguém sabota a investigação toda noite
O único sobrevivente perdeu a memória
Uma ponte destruída isola a região
O xerife pede ajuda, mas não pode pagar
Uma criatura vem pedir proteção aos personagens
Uma moeda antiga é encontrada em cada local
O grupo recebe um aviso pintado na porta
Os animais parecem saber mais que as pessoas
O inverno vai chegar antes de qualquer solução fácil
Um contrato antigo obriga a cidade a pagar um tributo
A pista final está dentro de uma prisão
O culpado deixou uma assinatura de propósito
O mistério tem a ver com o passado de um personagem
O nobre local oferece a mão da filha como recompensa
Uma ordem de cavaleiros proíbe estrangeiros na área
Uma estrela cadente marca o lugar exato
Um enigma em versos circula entre as crianças
Um elfo diz que já viu o mesmo há quinhentos anos
Os guardas foram subornados para não ver nada
Uma caravana espera os personagens para partir
Há duas explicações e as duas parecem verdadeiras
`)

export const MORE_RUMORS = lines(`
Dizem que o novo capitão da guarda nunca dorme.
Contam que a filha do moleiro fala com os lobos.
Um caçador jura que o urso da serra usa coroa.
Ouviram cantoria debaixo da ponte velha toda madrugada.
A taverneira esconde um cofre debaixo do balcão, e ninguém sabe o que tem dentro.
Dizem que o bispo perdeu a fé e só finge rezar.
O ferreiro vende espadas que se partem na primeira luta.
Há quem diga que o lago tem fundo de ouro.
Um nobre falido vai leiloar o castelo da família.
Corre que um dragão comprou terras ao norte, por meio de um procurador.
Os anões da colina pararam de vender ferro para a cidade.
Um barco pesqueiro voltou com uma rede cheia de ossos.
Dizem que a rainha tem uma irmã gêmea presa na torre.
O médico da vila cura qualquer doença, mas cobra em segredos.
Contam que o velho moinho é a entrada de um labirinto.
A guilda dos tecelões está tramando contra o prefeito.
O cão do prefeito encontrou uma mão humana no jardim.
Um bardo morreu no meio de uma canção e a música continuou.
Os soldados da fronteira estão desertando em grupos.
Dizem que o príncipe foi trocado no berço.
A última caravana do sul chegou com metade dos homens.
Há uma recompensa pela cabeça de um gato preto de olhos dourados.
Corre que um mago compra cabelos de ruivas.
Dizem que o poço da praça já engoliu três bêbados.
Um aprendiz de alquimista explodiu meia rua e sumiu.
Os sinos da catedral foram fundidos com moedas roubadas.
A estalagem do cruzamento nunca tem quartos vagos, mas também nunca tem hóspedes.
Contam que o carrasco poupa quem sabe uma canção específica.
Uma viúva rica procura um marido que não tenha medo de fantasmas.
O mercado negro está vendendo ovos de grifo.
Dizem que a torre do mago está à venda por uma ninharia.
Os pescadores não saem mais na lua nova.
O irmão do duque voltou da guerra diferente.
Alguém anda pagando bem por mapas antigos.
Dizem que o bosque cresce um passo por noite em direção à vila.
A biblioteca do mosteiro tem um livro que mata quem lê.
O capitão do porto aceita qualquer carga, desde que não perguntem.
Corre que a guerra vai recomeçar antes do inverno.
Uma companhia de teatro viaja com um prisioneiro numa jaula.
Dizem que o tesouro do rei antigo está sob a prefeitura.
O vinho deste ano dá sonhos estranhos.
Uma bruxa foi vista comprando sal em grande quantidade.
Os elfos fecharam a estrada da floresta sem explicação.
Um dos conselheiros paga para sumir com documentos.
Dizem que a chuva de ontem foi chamada por alguém.
O cemitério está ficando sem lugar, e ninguém morreu.
A ponte do norte vai ser cobrada a partir do mês que vem.
Contam que o estalajadeiro já foi um famoso assassino.
Há goblins trabalhando nas minas por salário.
Dizem que o espelho do salão do prefeito mostra o futuro.
Alguém deixou um bebê na porta do templo com um anel real.
A guarda está procurando uma mulher de capa verde.
Corre que a peste voltou nas aldeias do vale.
Um cavaleiro desafia qualquer um na ponte e nunca perdeu.
Dizem que a chave do cofre da cidade foi engolida por um ganso.
Os mineiros encontraram uma porta de pedra com runas.
Um astrólogo previu a queda da cidade para o próximo verão.
A estátua do fundador perdeu a cabeça e ninguém viu como.
Dizem que a feira deste ano vai ter um leilão de escravos, às escondidas.
Um náufrago chegou contando de uma ilha que anda.
Os guardas da muralha jogam dados com alguém que só aparece à noite.
Corre que o prefeito come carne crua.
Uma gangue de crianças anda roubando só sapatos.
Dizem que o rio guarda os afogados num palácio no fundo.
O sacerdote expulsou um demônio e o demônio pediu desculpas.
Os coelhos do campo estão maiores que cães.
Dizem que o velho eremita é um rei exilado.
Um contrabandista promete atravessar a fronteira em uma noite.
A academia de magia está recrutando às pressas.
Alguém está comprando todos os cavalos da região.
Dizem que a montanha ronca nas noites frias.
O selo da cidade foi roubado e um falso está circulando.
Corre que a irmã da taverneira é uma fada.
Os ciganos levaram embora a tempestade da última vez.
Dizem que a moeda nova é amaldiçoada.
O prefeito proibiu cantar depois do anoitecer.
Uma casa no fim da rua acende as luzes sem ninguém dentro.
Corre que o exército do vizinho está cavando túneis.
Uma barca de luto desce o rio sem remador.
Dizem que a velha da floresta troca bebês por colheitas.
Um gigante foi visto pedindo informações na estrada.
A taverna do porto serve uma bebida que faz esquecer um dia.
Corre que os sinos tocam sozinhos quando um traidor entra na igreja.
Dizem que quem dorme no celeiro do Joaquim acorda em outro lugar.
Um anão ofereceu ouro por informações sobre um martelo perdido.
Os padres estão cavando atrás do altar.
Dizem que o nevoeiro do pântano tem vozes de crianças.
O filho do ferreiro foi aceito numa ordem secreta.
Corre que o novo imposto vai financiar uma frota.
Uma árvore do bosque dá frutos com rostos.
Dizem que o mapa do tesouro do pirata Barba-de-Sal está tatuado num cão.
Um velho soldado jura que viu o rei morto numa taverna.
A filha do conde fugiu com um cavalariço, ou foi o que disseram.
Dizem que uma estrela caiu no lago e ainda brilha lá.
O dono da estalagem do sul não deixa ninguém entrar na adega.
Corre que o próximo campeão do torneio já foi comprado.
Um navio afundado reapareceu na enseada, inteiro.
Dizem que a escola das freiras ensina esgrima à noite.
Os lobos do inverno passado não foram embora.
Corre que um grupo de aventureiros entrou na cripta e só voltou o cachorro.
`)

export const MORE_TAVERN_NOUNS = pairs(`
Gaivota|f
Truta|f
Cegonha|f
Pomba|f
Abelha|f
Baleia|f
Lontra|f
Toupeira|f
Garça|f
Lebre|f
Mula|f
Ovelha|f
Taça|f
Garrafa|f
Pipa|f
Forja|f
Roda|f
Harpa|f
Gaita|f
Cebola|f
Abóbora|f
Castanha|f
Maçã|f
Pera|f
Tocha|f
Ganso|m
Bode|m
Touro|m
Texugo|m
Lagarto|m
Sapo|m
Peixe|m
Tritão|m
Gigante|m
Anão|m
Pirata|m
Monge|m
Bardo|m
Chapéu|m
Martelo|m
Elmo|m
Barco|m
Farol|m
Cogumelo|m
Repolho|m
Queijo|m
Leitão|m
Cachimbo|m
`)

export const MORE_TAVERN_ADJECTIVES = pairs(`
Cansado|Cansada
Careca|Careca
Desdentado|Desdentada
Esfomeado|Esfomeada
Fujão|Fujona
Honesto|Honesta
Insone|Insone
Ligeiro|Ligeira
Maluco|Maluca
Negro|Negra
Orgulhoso|Orgulhosa
Real|Real
Rouco|Rouca
Sábio|Sábia
Saltitante|Saltitante
Tranquilo|Tranquila
Verde|Verde
Zarolho|Zarolha
Branco|Branca
Coxo|Coxa
Dançarino|Dançarina
Distraído|Distraída
Enforcado|Enforcada
Feliz|Feliz
Gelado|Gelada
Guloso|Gulosa
Jovem|Jovem
Libertino|Libertina
Mentiroso|Mentirosa
Misterioso|Misteriosa
Pálido|Pálida
Pintado|Pintada
Quebrado|Quebrada
Roubado|Roubada
Sangrento|Sangrenta
Sem Rabo|Sem Rabo
Tagarela|Tagarela
Tímido|Tímida
Trovador|Trovadora
Uivante|Uivante
Viajante|Viajante
Vesgo|Vesga
Cantante|Cantante
Falante|Falante
Furioso|Furiosa
Leal|Leal
Sortudo|Sortuda
`)

export const MORE_DISHES = lines(`
sopa de abóbora com sementes torradas
coelho ao vinho
bacalhau com batatas e cebola
caldo verde com chouriço
feijoada de javali
pão de centeio com banha
truta grelhada com ervas
empadão de carneiro
cabrito assado no forno a lenha
polvo cozido com azeite
migas com carne de porco
açorda de alho e coentro
ensopado de enguia
espetinhos de cogumelo silvestre
mingau de aveia com mel
torresmo e broa de milho
costela de vaca na cerveja
salsichas de sangue com maçã
pastel de carne picante
lentilhas com toucinho
carne-seca com abóbora
ovos de pata cozidos
peixe frito em folha de bananeira
cozido de grão-de-bico
favas com hortelã
pato com laranja amarga
queijo derretido com pão duro
frango com ameixas
lombo de porco com castanhas
tripas à moda da casa
caranguejo cozido em água do mar
moqueca de peixe de rio
cuscuz de milho com ovo
canja de galinha caipira
carneiro com cevada
pombo recheado com pinhões
salada de rabanete e agrião
bolinhos de bacalhau
pão de queijo de forno
batata-doce assada nas cinzas
mexilhões ao vinho branco
sopa de peixe do pescador
espetada de lula
ensopado de veado
almôndegas com molho de tomate
torta de alho-poró
morcela com purê
porco no espeto com mel
carne de sol com mandioca
caldeirada de mariscos
risoto de cogumelos
sopa de ervilhas secas
pão com azeite e alho
codorna assada
coxa de ganso confitada
peixe salgado com batata
torta de maçã com canela
pudim de pão
filhós com açúcar
bolo de castanha
pera cozida no vinho
compota de figo com queijo
bolo de fubá
broas de mel
sonhos de massa frita
mel em favo com nozes
bife de cavalo (não pergunte)
lagarto assado, prato do dia
cobra frita, especialidade do cozinheiro
ovos de codorna em conserva
cebolas assadas inteiras
paçoca de carne-seca
ensopado misterioso do caldeirão eterno
pão preto e queijo azul
salmão defumado com creme
`)

export const MORE_DRINKS = lines(`
cerveja ruiva de cevada
cerveja preta com gosto de café
hidromel com pimenta
vinho tinto encorpado da serra
vinho branco gelado da adega
sidra de pera
aguardente de cana
grogue quente com mel
leite de cabra morno
leite com mel e canela
chá de camomila
chá preto com fumaça
infusão de urtiga
água de fonte com hortelã
suco de uva fresco
refresco de limão com gengibre
cerveja de mel
cerveja verde de lúpulo fresco
kefir fermentado
vinho de arroz
vinho de ameixa
vinho de dente-de-leão
licor de laranja
bagaceira forte
genebra com zimbro
rum escuro dos piratas
cachaça com mel e limão
quentão com especiarias
ponche de frutas
chocolate quente espesso
café forte em xícara de barro
licor de leite
hidromel envelhecido em barril de carvalho
cerveja de centeio azeda
água ardente de figo
vinho espumante de festa
cerveja de trigo com casca de laranja
cerveja preta dos anões
vinho élfico de flores
caldo de cana
leite de amêndoas
chá de jasmim
vinho temperado com mel e louro
licor de cereja amarga
hidromel com frutas vermelhas
cerveja escura com espuma grossa
aguardente de pera
licor de anis
bebida azul que o dono não explica
destilado de cogumelo
água de coco
garapa fermentada
vinho de palma
cerveja de milho
licor de mel silvestre
`)

export const MORE_TAVERN_DETAILS = lines(`
um gato gordo que dorme no balcão
um baú trancado que serve de mesa
um tabuleiro de xadrez com uma partida que dura anos
um dono que nunca tira o chapéu
uma garçonete que sabe o nome de todos os clientes
um pianista cego que toca qualquer pedido
uma cabeça de troll empalhada na parede
uma porta dos fundos que dá para o cemitério
um quarto que ninguém aluga
uma goteira que pinga sempre no mesmo copo
um mural de procurados com um rosto conhecido
uma mesa de apostas de queda de braço
um anão que limpa copos e escuta tudo
um relógio de parede que anda para trás
uma galinha que circula pelo salão
um quadro do fundador com olhos que seguem
um bêbado que só fala em versos
um mapa da região pintado no teto
uma janela que dá para uma paisagem que não é a de fora
uma escada que range em notas musicais
um balcão feito de casco de navio
um dono que serve de graça a quem conta uma boa história
uma lista de dívidas pregada na porta
um aquário com um peixe que encara os clientes
um armário de troféus de caça bizarros
uma lareira com caldeirão de sopa eterna
um grupo de velhos jogando dados há horas
um palco onde qualquer um pode cantar
uma cozinheira que é ex-aventureira
um dono que guarda armas dos clientes atrás do balcão
um cardápio escrito em três línguas
um pombo-correio que entrega recados
um cachorro de três patas que recebe os clientes
uma cortina que esconde uma mesa de jogo ilegal
um sino que toca quando um mentiroso entra
um muro de canecas pessoais dos clientes fiéis
um viajante que dorme na mesma mesa há dias
uma parede de garrafas vazias de anos de festas
uma escada para um sótão onde ninguém sobe
um elfo que toca flauta no canto
uma lousa com as apostas da próxima luta
uma tabuleta de madeira com regras estranhas da casa
um jogo de dardos com alvo em forma de rosto do prefeito
uma grande mesa redonda com uma cadeira quebrada
uma árvore crescendo no meio do salão
uma fonte de vinho que só funciona em dias de festa
um barril com uma torneira que ninguém pode abrir
um corvo que imita o dono
um baú de objetos esquecidos pelos clientes
uma sala nos fundos para reuniões secretas
um cheiro permanente de canela
um dono que exige que todos tirem as botas
uma janela com vidro colorido de uma capela antiga
um porão onde se ouve água correndo
um mendigo que todos alimentam e ninguém sabe o nome
uma mesa com marcas de facas cravadas
uma cama de feno nos fundos para os sem dinheiro
uma estátua de santo vestida de pirata
um livro de visitas com assinaturas de lendas
um galo que canta a cada brinde
uma briga marcada para toda sexta
uma mesa onde só sentam mulheres armadas
um quadro de avisos com recados de amor
uma rede de pesca pendurada com conchas
uma placa avisando “proibido magia”, toda chamuscada
um bardo aprendiz que erra todas as notas
um trono de madeira para o campeão de bebida
uma dona que lê a mão dos clientes
um retrato coberto com um pano preto
um anão que dorme dentro de um barril
uma criança que vende bilhetes de rifa
um velho cavaleiro contando a mesma batalha
uma moeda pregada no balcão que ninguém consegue arrancar
uma rachadura na parede de onde sai vento quente
um grupo de monges que bebe em silêncio
uma panela de feijão que nunca esvazia
uma escada em caracol que leva a uma torre minúscula
um mural de nomes de quem morreu em aventuras
`)
