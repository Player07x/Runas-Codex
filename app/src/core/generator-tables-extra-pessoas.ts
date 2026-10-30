/**
 * Segunda leva de opções para pessoas, ganchos, rumores e tavernas (dobro da beta.22). Uma opção por linha; pares
 * masculino/feminino separados por `|`. `generator-tables.ts` junta tudo e os testes conferem que não há repetidos.
 */
import { lines, pairs } from "./generator-tables-pessoas"

export const EXTRA_PROFESSIONS = pairs(`
acendedor de lampiões|acendedora de lampiões
amolador de facas|amoladora de facas
aguadeiro|aguadeira
alfarrabista|alfarrabista
alcaide|alcaidessa
almoxarife|almoxarife
amanuense|amanuense
arquiteto|arquiteta
arrieiro|arrieira
assador de castanhas|assadora de castanhas
avicultor|avicultora
azeiteiro|azeiteira
bailarino|bailarina
banqueiro|banqueira
bateleiro|bateleira
benzedeiro|benzedeira
boieiro|boieira
bordador|bordadeira
cabreiro|cabreira
caixeiro-viajante|caixeira-viajante
calceteiro|calceteira
caldeireiro|caldeireira
cambiador de moedas|cambiadora de moedas
cantor de igreja|cantora de igreja
capelão|capelã
carpideiro|carpideira
cartorário|cartorária
castelão|castelã
cavalariço|cavalariça
cesteiro|cesteira
charlatão|charlatã
cirieiro|cirieira
colecionador de relíquias|colecionadora de relíquias
comediante|comediante
condestável|condestável
confeiteiro|confeiteira
contador de histórias|contadora de histórias
copeiro|copeira
correeiro|correeira
cozinheiro de navio|cozinheira de navio
criador de cães|criadora de cães
cronista|cronista
cuteleiro|cuteleira
desenhista de mapas|desenhista de mapas
destilador|destiladora
diplomata|diplomata
doceiro|doceira
druida|druida
embaixador|embaixadora
embalsamador|embalsamadora
empalhador|empalhadora
encantador de serpentes|encantadora de serpentes
engenheiro de cerco|engenheira de cerco
ervanário|ervanária
esgrimista|esgrimista
estatuário|estatuária
eremita|eremita
fabricante de velas|fabricante de velas
fabricante de flechas|fabricante de flechas
feitor|feitora
fiscal da feira|fiscal da feira
floreiro|floreira
fogueteiro|fogueteira
fundidor de sinos|fundidora de sinos
gaiteiro|gaiteira
gondoleiro|gondoleira
guardião de biblioteca|guardiã de biblioteca
guarda-florestal|guarda-florestal
hortelão|horteloa
intérprete|intérprete
inventor|inventora
jardineiro|jardineira
jogral|jogralesa
juiz de torneio|juíza de torneio
latoeiro|latoeira
leiloeiro|leiloeira
leiteiro|leiteira
limpa-chaminés|limpa-chaminés
luthier|luthier
magistrado|magistrada
mago de aluguel|maga de aluguel
marceneiro|marceneira
mascate|mascate
matemático|matemática
mestre de cerimônias|mestra de cerimônias
mestre-cuca|mestra-cuca
músico de rua|música de rua
navegador|navegadora
notário|notária
ourives de prata|ourives de prata
padeiro do castelo|padeira do castelo
perfumista|perfumista
pescador de pérolas|pescadora de pérolas
porteiro da cidade|porteira da cidade
prestamista|prestamista
professor de dança|professora de dança
quiromante|quiromante
rastreador|rastreadora
remendão|remendona
retratista|retratista
saltimbanco|saltimbanca
seringueiro|seringueira
serralheiro|serralheira
sineiro|sineira
tanoeiro|tanoeira
tatuador|tatuadora
telhador|telhadora
tesoureiro|tesoureira
tropeiro|tropeira
vaqueiro|vaqueira
vendedor de relíquias falsas|vendedora de relíquias falsas
vidente|vidente
vigia noturno|vigia noturna
`)

export const EXTRA_DESIRES = lines(`
ganhar o coração de uma bardo famosa
provar que o irmão gêmeo é o culpado
reaver o barco que o pai perdeu no jogo
encontrar o mapa que a avó escondeu
ser perdoado por um deus
derrotar um rival de infância
ganhar a corrida de cavalos da colheita
descobrir o que há no fundo do lago
manter a taverna aberta mais um inverno
casar a filha com um nobre
achar um remédio para a cegueira do mestre
reconstruir o templo da aldeia
aprender magia escondido da família
abrir uma rota de comércio com os anões
apagar o próprio nome de um registro de dívidas
recuperar a honra perdida num duelo
ver o rei de perto uma vez
salvar o vilarejo de uma praga
encontrar o amor de uma carta antiga
fugir da guarda da cidade
vender a casa assombrada por bom preço
escrever o próprio nome num livro de heróis
domar o cavalo selvagem do vale
ganhar o respeito da guilda dos ferreiros
encontrar a filha que fugiu com piratas
descobrir quem envenenou o poço
proteger um segredo do conselho
voltar a ser jovem
achar uma passagem para o mundo das fadas
pagar o enterro da mãe
ser nomeado cavaleiro
quebrar um pacto feito com um demônio
encontrar a espada do primeiro rei
juntar ouro para fugir do reino
reconquistar a terra que o barão tomou
recuperar a voz perdida num feitiço
vencer o campeonato de xadrez da capital
salvar os livros de um incêndio
convencer o conselho a reabrir a ponte
voltar para a ilha onde nasceu
ver as estrelas do topo da montanha
sair da sombra do irmão mais velho
achar um tutor para o filho
encontrar o assassino do mestre
descobrir de onde vem a própria magia
proteger as abelhas do pomar
devolver um ovo de dragão à mãe
conquistar um assento na corte
salvar o casamento
viver de música
ser lembrado como um homem bom
apagar uma tatuagem de culto
acabar com a rixa entre os moleiros
fundar uma cidade nova
encontrar o último membro da família
ganhar a aposta com o diabo
mapear a costa inteira
derrubar o prefeito corrupto
devolver a coroa ao verdadeiro herdeiro
desaparecer sem deixar rastro
ver a guerra terminar
abrir uma biblioteca pública
ser aceito pela família da noiva
curar o cão de estimação
ganhar a confiança de um lobo
fazer as pazes com o pai antes que ele morra
achar a fonte do rio
provar que a lenda é verdade
entrar para a ordem dos magos
ter uma casa com jardim
encontrar a cidade perdida das lendas
salvar o amigo da forca
ganhar uma fortuna no mar
voltar a dormir sem pesadelos
encontrar um propósito
proteger a irmã de um casamento ruim
herdar a fazenda antes do primo
conhecer o mar do sul
ser o melhor arqueiro do reino
aprender a língua dos elfos
recuperar a fé
deixar um legado para os netos
ser perdoado pela aldeia
achar as asas que perdeu (diz ser um anjo)
desmascarar o próprio mestre
encontrar um lugar seguro para os refugiados
pagar a dívida de jogo do marido
viver em paz com os vizinhos orcs
encontrar o tesouro que enterrou bêbado
fazer o nome na arena
salvar a floresta de um incêndio
comprar a liberdade da irmã
ter um filho
ser enterrado na terra dos pais
derrotar o próprio medo
voltar a cantar no coral
provar a inocência do pai morto
achar o objeto que dá azar e destruí-lo
vingar a morte do cavalo
encontrar a receita perdida da avó
viajar com uma trupe de teatro
recuperar o diário roubado
proteger o segredo do mosteiro
ver o filho voltar da guerra
juntar dinheiro para comprar um barco
encontrar uma cura para a licantropia
escapar de um noivado arranjado
reunir a família no festival da colheita
derrubar a estátua do tirano
ganhar uma medalha do rei
salvar o moinho da falência
achar um herdeiro para a guilda
convencer os deuses a mandar chuva
conhecer a própria mãe
ensinar os órfãos a ler
recuperar a chave do cofre da família
abrir uma escola de esgrima
tornar-se invisível aos cobradores
voltar ao tempo em que era feliz
ser chamado de herói uma vez na vida
`)

export const EXTRA_SECRETS = lines(`
um anel que pertenceu à rainha morta
uma cicatriz de uma batalha que jura não ter lutado
um diário com profecias que se cumpriram
uma criança trocada no berço
uma conta secreta com a guilda dos banqueiros
um mapa do esconderijo do pirata Barba-de-Sal
uma carta de suicídio que nunca usou
um voto feito a um deus esquecido
uma irmã presa na torre do barão
um ovo de grifo escondido no celeiro
uma confissão assinada com sangue
um passado como bandido de estrada
uma maldição que passa para quem tocar nele
uma dívida com um vampiro
um mapa estelar tatuado no peito
um livro de feitiços escondido no forno
um tesouro enterrado no quintal da prefeitura
um filho com uma elfa
uma aliança com os goblins das colinas
a chave da cela do prisioneiro mais perigoso do reino
um veneno guardado num frasco de perfume
uma relíquia que chora à noite
um nome falso usado há vinte anos
uma visita noturna do fantasma do pai
o local do túmulo de um herói
um espelho que mostra o futuro dele
uma promessa de casamento com uma fada
uma moeda de ouro de um reino que nunca existiu
um caderno com os segredos de todos da vila
uma carta de traição da guarda real
um pacto com o rei dos ratos
um parentesco com o dragão do norte
uma doença que transforma em pedra aos poucos
um amuleto que impede de envelhecer
o roubo do cálice da catedral
um gêmeo malvado que vive na floresta
uma casa inteira escondida sob a casa
uma mão de prata no lugar da verdadeira
uma memória apagada por um mago
a morte acidental de um amigo
a localização de um portal no porão
um contrato de mercenário que ainda não cumpriu
um par de asas cortadas guardadas num baú
a cura que vendeu como milagre
a identidade do bandido mascarado
um filho que é procurado pela lei
um bilhete premiado da loteria real
um voto de silêncio quebrado
a verdadeira causa do incêndio do celeiro
um gato que fala só com ele
um caso com o cavaleiro da rainha
a ordem de execução de um inocente
o testamento verdadeiro do barão
a fórmula da pólvora dos anões
a passagem secreta para dentro do castelo
um filho bastardo do rei
um juramento de vingança contra um nobre
uma arma que matou um rei
um baú de cartas de amor proibido
a planta da prisão real
um ritual que faz chover
um coração que bate fora do peito, guardado num pote
a profecia sobre o fim da cidade
um desejo que ainda não usou
um nome escrito no livro dos mortos
um acordo com a guilda dos assassinos
o paradeiro do último unicórnio
o diário de um herói que era covarde
a origem demoníaca da própria família
um irmão que se tornou lobisomem
um tesouro roubado de um templo élfico
uma alma presa numa garrafa na estante
a culpa por uma guerra antiga
uma visita mensal a um lich
um voto feito à morte
a verdade sobre a lenda local
uma moeda que mostra a última vontade do dono
um selo real roubado
um pergaminho que apaga memórias
o verdadeiro nome do mestre da guilda
uma doença mágica contagiosa
uma rede de túneis sob a própria casa
uma promessa de lealdade a um rei deposto
o local onde a rainha esconde o tesouro
a lista de traidores da revolta
a criança que salvou e escondeu
um irmão gêmeo na prisão no lugar dele
um amor por alguém de outra espécie
uma faca que nunca erra o alvo
um medo de água que esconde de todos
o sequestro de um nobre que ele mesmo armou
um baú de ouro de um naufrágio
a assinatura falsificada num tratado
um pedaço da lua guardado numa caixa
uma marca de nascença que indica realeza
a morada de uma bruxa poderosa
um contrato de servidão com um gênio
uma criatura presa no sótão
`)

export const EXTRA_TRAITS = lines(`
conta piadas no velório
cheira tudo o que pega
diz “pelos deuses” a cada frase
nunca senta numa cadeira sem testar
desconfia de quem é canhoto
segura a mão de todo mundo ao falar
fala com o cavalo como se fosse gente
ri pelo nariz
estala os dedos quando pensa
fica corado à toa
só come depois de todos
assobia a mesma música sem parar
anda sempre com uma flor atrás da orelha
conta as moedas três vezes
nunca cumprimenta primeiro
gosta de dar conselhos de amor
coleciona pedras bonitas
fala com sotaque falso de nobre
pede silêncio para ouvir os pássaros
se assusta com barulhos altos
faz tudo devagar e com cuidado
detesta mentiras e mente sem perceber
cita o falecido mestre o tempo todo
dá apelidos de animais às pessoas
lembra de dívidas de anos atrás
corre quando está atrasado, sempre
espirra quando mente
pergunta a idade de todos
conserta coisas que ninguém pediu
ri de nervoso
anota o nome de quem o ofende
dorme em qualquer lugar, a qualquer hora
desenha mapas de tudo o que vê
fala alto quando está feliz
só usa roupas de uma cor
recusa ajuda por orgulho
chora quando bebe
gosta de discutir religião
se gaba das próprias cicatrizes
come muito e não engorda
tem medo de altura e mora numa torre
toca um sino antes de falar
conta histórias de fantasmas a crianças
fala em código com os amigos
se oferece para carregar tudo
pergunta “e se fosse você?”
tem sempre uma maçã no bolso
cumprimenta os mortos no cemitério
cuida de plantas como de filhos
odeia barulho de mastigação
faz apostas por qualquer coisa
compara tudo com a guerra
nunca diz não, mas não faz
lê poesia em voz alta
morde as unhas quando perde
anda com as mãos nas costas
olha muito para o céu
fala baixo para ninguém ouvir
gosta de ser o centro das atenções
sempre leva um presente às visitas
desconfia de magos
fala com o próprio reflexo
evita pisar nas rachaduras do chão
cumpre todos os rituais religiosos à risca
nunca se despede
só confia em gatos
canta para dormir
fica agressivo com fome
se perde em qualquer cidade
lembra de todos os rostos, mas nenhum nome
fala dos sonhos como se fossem reais
nunca tira as luvas
mastiga tabaco e cospe longe
é educado demais com nobres
detesta perder em jogos
conta mentiras gloriosas sobre si
ouve mais do que fala
pede desculpas aos objetos em que tropeça
fala sozinho em outra língua
dá risada alta e contagiante
tem tiques com a orelha
come sempre a sobremesa primeiro
nunca dorme duas noites no mesmo lugar
diz o que pensa sem filtro
faz desenhos nas paredes
reclama de tudo, mas ajuda
esconde comida nos bolsos
é supersticioso com corvos
trata todos como velhos amigos
usa palavras difíceis erradas
dá risada das próprias desgraças
sempre tem um plano de fuga
adora fofoca, mas não espalha
carrega um amuleto para cada medo
fala com bebês como adultos
sabe imitar qualquer bicho
anda sempre com pressa
cheira a sabão de lavanda
tem um olhar distante
interrompe com perguntas
se irrita com pessoas lentas
dá sempre a última palavra
é carinhoso só com animais
tem um riso esganiçado
mede as palavras como ouro
detesta flores
ama tempestades
`)

export const EXTRA_LOOKS = lines(`
um nariz de batata e bochechas vermelhas
dentes perfeitos demais para a idade
um cabelo que parece nunca ter visto pente
olhos dourados como de um gato
uma barriga redonda e risonha
mãos de dedos longos e finos
uma cicatriz em forma de estrela na mão
cabelo preso num coque com agulhas de prata
uma capa de penas de corvo
roupas de couro cheias de franjas
um chapéu com uma pena enorme
botas de cano alto vermelhas
uma bengala com uma lâmina escondida
um colete com bordados de ouro
um tapa-olho de couro com uma joia
o rosto pintado de branco
uma coroa de flores secas
um manto azul com estrelas bordadas
cabelos raspados de um lado
um bigode que se mexe quando fala
olhos de cores trocadas a cada dia (diz ele)
pele marcada por tatuagens tribais
uma perna mais curta que a outra
orelhas pontudas que esconde com o capuz
uma pinta no queixo
cílios longos e escuros
uma barba que chega à cintura
um sorriso de dentes de prata
dedos cobertos de anéis de ferro
uma gargantilha de couro
um medalhão enorme no peito
roupas de três tamanhos maiores
uma armadura de couro remendada
um casaco de pele de raposa
cabelos grisalhos em tranças finas
uma cicatriz de queimadura no rosto
olhos sempre semicerrados
voz rouca e grave
um cachimbo comprido de osso
um braço de madeira articulado
óculos de aro de ouro
um véu sobre o rosto
pés enormes
cabelos encaracolados como de carneiro
uma cicatriz que atravessa os lábios
um capacete com chifres
pele muito pálida e veias azuis
olhos fundos e escuros
um sorriso torto
cabelo vermelho flamejante
um dente de lobo pendurado na orelha
um lenço de seda na cabeça
roupas sempre molhadas
uma pena de escrever atrás da orelha
mãos sujas de terra
manchas de vinho na roupa
um broche em forma de aranha
uma tatuagem de cobra no pescoço
um nariz aquilino
uma postura curvada
uma voz musical
um olhar de águia
cicatrizes de varíola nas mãos
um sorriso que mostra todos os dentes
pele bronzeada de marinheiro
cabelos brancos como neve, embora jovem
um anel em forma de crânio
uma echarpe colorida
uma pele de urso como capa
um cordão de contas de oração
uma cartola amassada
uma saia de retalhos coloridos
uma túnica de sacerdote rasgada
cabelos azuis como o mar
uma tatuagem de lágrima sob o olho
um pingente de cristal que brilha
a pele coberta de sardas e cicatrizes
um rosto que parece esculpido em pedra
um queixo fino e nariz arrebitado
os dedos manchados de alquimia
um cinto com dezenas de bolsinhas
um brinco de argola de ouro
um olho branco, cego
o rosto marcado por rugas de riso
ombros largos como uma porta
uma voz que não combina com o rosto
mãos tremendo de frio o tempo todo
cabelo raspado com uma runa desenhada
uma roupa de festa velha e puída
um avental cheio de bolsos
uma faixa de cetim na cintura
um cão enorme sempre ao lado
um cheiro de mar que nunca sai
unhas pintadas de dourado
uma pele levemente azulada
olhos que brilham no escuro
uma tiara de cobre torta
um rosto coberto de fuligem
uma risada que soa como sino
uma cicatriz de mordida no braço
cabelos longos presos com fita vermelha
dentes manchados de tabaco
um lenço amarrado no braço
`)

export const EXTRA_HOOK_EVENTS = lines(`
Um eclipse revela uma segunda lua
O rio leva um bilhete numa garrafa
Todos os relógios da cidade param
Uma estrela some do céu
Os mortos do campo de batalha se levantam
Um nevoeiro com cheiro de rosas cobre a vila
O poço começa a dar vinho
Um homem sem rosto entra na taverna
Uma ponte aparece durante a noite
O sino da torre começa a tocar ao contrário
Um dragão de papel voa sobre a cidade
As árvores da praça dão frutos de vidro
Um mapa aparece pintado no muro da prefeitura
Os peixes saltam para fora do rio
Uma criança acorda falando uma língua morta
Todas as portas da vila amanhecem trancadas por fora
Uma chuva de estrelas cadentes cai no lago
A estátua do herói aponta para o norte
Um navio fantasma é visto no horizonte
A neve cai vermelha
Um gigante de pedra acorda na montanha
As galinhas param de pôr ovos
Um livro em branco começa a se escrever
Os cães da cidade seguem uma pessoa estranha
Uma tempestade não sai de cima da vila
Os sinos do templo derretem
Um cometa passa tão perto que se ouve
A colheita cresce em uma noite
Um arco-íris preto aparece depois da chuva
Os ratos falam com o padeiro
A água do mar sobe e não desce
Um baú surge no meio da praça
Um homem chega dizendo vir do futuro
As crianças somem e voltam sem lembrar
Uma torre cai sem ninguém tocar nela
Os mortos aparecem nos espelhos
Uma montanha nova surge no horizonte
O vento canta uma canção de ninar
Os pássaros formam uma palavra no céu
Uma fonte começa a curar doentes
Os mineiros acham uma cidade sob a mina
Um rei estrangeiro pede asilo
Um cavaleiro desafia a cidade inteira
As lanternas acendem sozinhas
A lua fica parada no céu
Um selo antigo se rompe no mosteiro
Um mercador vende garrafas com tempestades
A floresta avança sobre a estrada
Um dragão é visto bebendo no lago
Os mortos do cemitério trocam de túmulo
Um terremoto revela uma porta de bronze
Um bebê nasce com olhos de ouro
Um mago enlouquece no meio da praça
As cartas do correio chegam em branco
Um cão de três cabeças guarda a ponte
Os moradores esquecem o próprio nome
Uma voz chama do fundo do poço
As cores somem da cidade
Um barco de ossos chega ao porto
Um anjo cai no meio do campo
O espelho do castelo se quebra sozinho
Uma tempestade traz neve de cinzas
Os sinos tocam em todas as aldeias ao mesmo tempo
Um velho morre e deixa tudo para um personagem
Um eremita desce da montanha gritando
As ovelhas aparecem pintadas de azul
O rio seca de repente
Um castelo flutua sobre o lago
A rainha desaparece do baile
Um homem de lata pede ajuda
Uma árvore antiga começa a falar
Um ovo enorme choca no templo
Uma guerra de gangues explode no porto
Os sonhos começam a vazar para a realidade
Uma estrada aparece onde havia um penhasco
O prefeito é encontrado petrificado
Uma moeda nova circula com o rosto de um personagem
Os sinos de vento param de tocar
Uma mulher chega com uma criança e um aviso
Um batalhão inteiro some na névoa
A cidade inteira sonha com fogo
Um vulcão adormecido solta fumaça
Um tesouro de moedas aparece no rio
Um cavalo sem cavaleiro chega com uma carta
Os mortos pedem justiça numa noite de lua cheia
`)

export const EXTRA_HOOK_TURNS = lines(`
O responsável é alguém da família de um personagem
O templo oferece uma bênção em troca de ajuda
Uma criatura antiga pede uma trégua
O fenômeno atrai caçadores de tesouro
Um sábio diz que tudo começou há mil anos
Um nobre jura que é obra dos inimigos
O povo exige que alguém pague pelo ocorrido
Uma bruxa diz que o grupo é a causa
Um mapa antigo mostra o caminho
O fenômeno está se espalhando para outras cidades
Os guardas proíbem qualquer um de sair
Um mensageiro do rei chega pedindo segredo
Uma recompensa de terras é oferecida
O culpado deixou uma pista de propósito
Um fantasma oferece ajuda em troca de um favor
A única testemunha é uma criança
Um mercador oferece um item que pode ajudar
O caminho passa pela terra dos elfos
Um rival antigo está envolvido
Um juramento antigo obriga o grupo a ajudar
Uma ordem religiosa quer o fenômeno como prova divina
Os anões cobram caro pela informação
O tempo para resolver é de três dias
Um dragão também está interessado
A pista leva ao fundo do mar
A causa é uma relíquia que todos querem
Um feitiço antigo precisa ser desfeito
Um aliado inesperado aparece na hora certa
O rei oferece um título a quem resolver
Uma profecia fala do grupo
O fenômeno é um aviso de algo pior
Uma guilda de ladrões oferece informações
Um nobre esconde o que sabe
Um personagem tem um sonho revelador
As criaturas da floresta pedem ajuda
A cidade vizinha culpa esta
O inverno impede a viagem
A resposta está numa biblioteca proibida
Um velho mapa está rasgado ao meio
Um culto se aproveita do medo
O culpado já está morto
Um sacerdote pede que ninguém interfira
Um cavaleiro desonrado quer limpar o nome
A pista é um enigma em versos
Uma família poderosa contrata o grupo em segredo
As consequências atingem a família de um personagem
O fenômeno pode ser usado como arma
Um mago oferece ajuda, mas tem segundas intenções
A investigação precisa ser feita à noite
Um inimigo antigo volta para ajudar
Uma criança perdida é a chave
Os mortos sabem a resposta
A pista leva a uma prisão abandonada
Um contrato antigo amarra a cidade
O grupo é acusado do crime
Uma fada oferece um atalho perigoso
O culpado tem imunidade diplomática
A solução está do outro lado da fronteira
O fenômeno tem um padrão astronômico
Um diário revela a verdade pela metade
O povo prefere não saber
Um desafio de honra é a única saída
A resposta custa uma memória
Um traidor está entre os aliados
Os animais fogem para o mesmo lugar
O culpado pede perdão antes de ser descoberto
Um juiz exige provas impossíveis
O caminho exige atravessar o pântano
Um eclipse marca o prazo final
`)

export const EXTRA_RUMORS = lines(`
Dizem que o novo prior come carne em dia santo.
Contam que a filha do ferreiro beijou um elfo.
Um caçador jura ter visto um cervo de prata.
Ouviram que o prefeito vai vender o moinho comunitário.
A taverneira do porto foi pirata, dizem.
Dizem que há uma porta no cemitério que só abre na lua nova.
O conde está doente e esconde de todos.
A guarda vai dobrar os impostos depois da colheita.
Um mago chegou e alugou a casa assombrada.
Dizem que as fadas roubaram o bebê da costureira.
O velho pescador viu uma sereia ontem à noite.
Contam que o rei vai casar com uma princesa estrangeira.
A estrada do sul está infestada de bandidos.
Dizem que o mosteiro esconde um dragão no porão.
O padre bebe o vinho da missa.
A ponte velha vai cair no próximo inverno.
Um cavaleiro negro foi visto na fronteira.
Dizem que a bruxa do pântano é a mãe do prefeito.
Os anões encontraram ouro na colina e não contaram a ninguém.
A feira vai trazer um urso dançarino este ano.
Um bebê nasceu falando na aldeia vizinha.
Dizem que o poço da praça é amaldiçoado.
O moleiro esconde dinheiro no saco de farinha.
Contam que a capitã da guarda é filha bastarda do duque.
O cemitério está com túmulos abertos.
Dizem que quem bebe da fonte velha esquece o próprio nome.
Um navio cheio de ouro afundou na baía.
O mago da torre procura um aprendiz.
Contam que o barão vende armas aos orcs.
A taverna do cruzamento serve carne de cavalo.
Dizem que os lobos da serra têm um rei.
O sino da capela tocou sozinho à meia-noite.
Uma caravana de especiarias vai chegar amanhã.
Dizem que o bispo tem um filho escondido.
O rio vai transbordar com o degelo.
Um ladrão famoso está escondido na cidade.
Contam que o carrasco nunca erra, porque é cego.
A guilda dos tecelões vai entrar em greve.
Dizem que há um tesouro sob o altar.
O velho do farol fala com as gaivotas.
Um mercenário procura gente para uma missão perigosa.
Contam que a princesa fugiu do castelo.
Os goblins estão roubando galinhas toda noite.
Dizem que o rei morreu e ninguém contou.
A estalagem do norte tem um quarto onde ninguém dorme.
Um bardo compôs uma canção sobre o grupo.
Dizem que o lago esconde uma cidade afundada.
O ferreiro forjou uma espada que canta.
Contam que a rainha tem uma gêmea idêntica.
A peste voltou ao porto, dizem os marinheiros.
O conselho vai expulsar os estrangeiros.
Um dragão foi visto voando para o oeste.
Dizem que a velha da ponte é uma deusa disfarçada.
O padeiro faz pão que cura gripe.
Contam que um gigante dorme sob a colina.
A filha do moleiro foi prometida a um troll.
Dizem que o espelho da taverna mostra os mortos.
O duque mandou prender todos os bardos.
Contam que a floresta engoliu uma caravana inteira.
O prefeito fez um pacto com um demônio, dizem.
Uma estrela caiu perto da fazenda dos Moura.
Os cavalos da cavalaria estão ficando doentes.
Dizem que há uma passagem secreta sob a prefeitura.
O curandeiro vende venenos à noite.
Contam que o mosteiro paga bem por relíquias antigas.
Um eremita sabe onde está a coroa perdida.
Dizem que as abelhas do pomar fazem mel dourado de verdade.
O capitão do porto deixa contrabandistas passarem.
Contam que a bruxa morreu, mas a casa dela continua acesa.
O inverno deste ano vai ser o pior em cem anos.
Dizem que o mago da torre foi transformado em sapo.
Um cavaleiro procura quem roubou o escudo da família.
Contam que o rei manda espiões disfarçados de mendigos.
A ponte do norte foi tomada por um troll.
Dizem que o cemitério tem um guardião sem cabeça.
O conde vai dar um baile de máscaras.
Contam que a taverneira lê o futuro nas canecas.
Um mercador quer comprar todos os gatos da cidade.
Dizem que o lago congelado mostra o rosto de quem morreu nele.
Os pescadores pegaram um peixe com uma chave na barriga.
Contam que a guilda dos alquimistas explodiu de novo.
Dizem que o barão nunca dorme e anda de noite pelos telhados.
A filha do prefeito quer ser aventureira.
Um velho mapa está à venda no mercado negro.
Dizem que o templo novo foi construído sobre um cemitério.
O estalajadeiro pagou uma fortuna por um ovo de dragão (falso).
Contam que a floresta tem uma árvore que realiza desejos.
Dizem que os mortos de uma batalha antiga marcham na lua cheia.
O cavalariço viu um unicórnio no estábulo.
Contam que os sinos foram roubados por fadas.
Dizem que a prisão tem um prisioneiro que não envelhece.
Um mago está pagando por sangue de dragão.
Contam que o rio fala com quem dorme na margem.
O carrasco se aposentou e ninguém quer o cargo.
Dizem que há uma bruxa boa na colina, e ela está doente.
A rainha das fadas vai visitar a aldeia no solstício.
Contam que os ladrões da cidade têm um rei.
Um navio de guerra foi visto sem bandeira.
Dizem que a nova moeda foi cunhada com prata de túmulo.
O mosteiro proibiu a entrada de mulheres, dizem, por causa de um segredo.
Contam que o farol apagou e um navio bateu nas pedras.
Dizem que quem dormir na torre ganha um dom.
Uma companhia de saltimbancos chegou com uma jaula coberta.
Contam que o ferreiro bate na bigorna até de madrugada, e ninguém sabe o que forja.
Dizem que a cidade vizinha foi engolida por uma névoa.
O duque prometeu ouro a quem matar o lobo branco.
`)

export const EXTRA_TAVERN_NOUNS = pairs(`
Cegonha Real|f
Gralha|f
Carpa|f
Raposa Velha|f
Truta Saltadora|f
Coruja Branca|f
Panela|f
Bigorna de Ouro|f
Âncora Torta|f
Lanterna Verde|f
Flauta|f
Lira|f
Viola|f
Corneta|f
Moeda|f
Chave|f
Lua Cheia|f
Estrela Cadente|f
Papoula|f
Hera|f
Uva|f
Azeitona|f
Pinha|f
Noz|f
Romã|f
Cereja|f
Ameixa|f
Sardinha|f
Lula|f
Baleia Branca|f
Galinha|f
Vaca|f
Égua|f
Mula Teimosa|f
Doninha|f
Lesma|f
Formiga|f
Aranha|f
Libélula|f
Borboleta|f
Lagosta|f
Ostra|f
Concha|f
Pérola|f
Coroa de Ferro|f
Tiara|f
Adaga|f
Lança|f
Flecha|f
Besta|f
Taberna|f
Ceia|f
Fogueira|f
Brasa|f
Fumaça|f
Neblina|f
Tempestade|f
Abacaxi|m
Abeto|m
Alaúde|m
Anel|m
Arco|m
Barão|m
Bispo|m
Bode Velho|m
Bufão|m
Burro|m
Cajado|m
Camelo|m
Caracol|m
Castor|m
Cavaleiro|m
Cervo|m
Chifre|m
Cisne|m
Cogumelo Roxo|m
Corcel|m
Crânio|m
Cuco|m
Dado|m
Diabo|m
Elmo Velho|m
Escaravelho|m
Esquilo|m
Faisão|m
Falcão|m
Feiticeiro|m
Ferreiro|m
Frade|m
Furão|m
Gaiteiro|m
Gnomo|m
Grou|m
Javali Negro|m
Lagostim|m
Leão|m
Leitão Assado|m
Lúcio|m
Macaco|m
Marinheiro|m
Mendigo|m
Morcego|m
Mosquito|m
Navio|m
Ogro|m
Ouriço|m
Papagaio|m
Pardal|m
Pavão|m
Pelicano|m
Peregrino|m
Pescador|m
Pinheiro|m
Polvo|m
Porco|m
Rato|m
Rei|m
Rouxinol|m
Salmão|m
Sapateiro|m
Tambor|m
Texugo Gordo|m
Tigre|m
Troll|m
Unicórnio|m
Veado|m
Viajante|m
Violino|m
`)

export const EXTRA_TAVERN_ADJECTIVES = pairs(`
Abençoado|Abençoada
Aflito|Aflita
Afortunado|Afortunada
Amaldiçoado|Amaldiçoada
Amarelo|Amarela
Amarrotado|Amarrotada
Antigo|Antiga
Apaixonado|Apaixonada
Ardente|Ardente
Arrependido|Arrependida
Assado|Assada
Astuto|Astuta
Atrasado|Atrasada
Barulhento|Barulhenta
Bravo|Brava
Brilhante|Brilhante
Caolho|Caolha
Celeste|Celeste
Cintilante|Cintilante
Corajoso|Corajosa
Cruel|Cruel
Curioso|Curiosa
Danado|Danada
Delicado|Delicada
Derretido|Derretida
Desconfiado|Desconfiada
Desmaiado|Desmaiada
Distante|Distante
Doce|Doce
Dorminhoco|Dorminhoca
Elegante|Elegante
Emplumado|Emplumada
Enfeitiçado|Enfeitiçada
Escondido|Escondida
Esperto|Esperta
Estrelado|Estrelada
Eterno|Eterna
Fantasma|Fantasma
Faminto de Ouro|Faminta de Ouro
Feroz|Feroz
Fiel|Fiel
Flamejante|Flamejante
Frio|Fria
Gentil|Gentil
Gigante|Gigante
Glorioso|Gloriosa
Gorducho|Gorducha
Imperial|Imperial
Invisível|Invisível
Ladino|Ladina
Lendário|Lendária
Lento|Lenta
Lunar|Lunar
Magro|Magra
Malvado|Malvada
Manhoso|Manhosa
Maroto|Marota
Mascarado|Mascarada
Miúdo|Miúda
Mudo|Muda
Nobre|Nobre
Ousado|Ousada
Pequeno|Pequena
Perfumado|Perfumada
Petulante|Petulante
Pintalgado|Pintalgada
Poderoso|Poderosa
Pomposo|Pomposa
Prateado de Lua|Prateada de Lua
Profundo|Profunda
Púrpura|Púrpura
Raivoso|Raivosa
Rápido|Rápida
Ranzinza|Ranzinza
Raro|Rara
Rebelde|Rebelde
Remendado|Remendada
Resmungão|Resmungona
Rico|Rica
Risonho de Ouro|Risonha de Ouro
Roliço|Roliça
Rosado|Rosada
Rubro|Rubra
Rústico|Rústica
Safado|Safada
Sagrado|Sagrada
Salgado|Salgada
Sedento|Sedenta
Selvagem|Selvagem
Sereno|Serena
Sombrio|Sombria
Sonhador|Sonhadora
Sorrateiro|Sorrateira
Tatuado|Tatuada
Tonto|Tonta
Travesso|Travessa
Triste|Triste
Turvo|Turva
Ébrio|Ébria
Último|Última
Vaidoso|Vaidosa
Velhaco|Velhaca
Venenoso|Venenosa
Vingativo|Vingativa
Voador|Voadora
Zangado|Zangada
Dourado de Mel|Dourada de Mel
Encharcado|Encharcada
Engasgado|Engasgada
Sem Dente|Sem Dente
De Três Patas|De Três Patas
Da Meia-Noite|Da Meia-Noite
`)

export const EXTRA_DISHES = lines(`
ensopado de cordeiro com hortelã
truta assada em folha de parreira
galinha ao molho pardo
pão de alho com queijo de ovelha
sopa de castanhas com creme
espetinho de coração de boi
leitão à pururuca
bacalhau à moda do pescador
caldo de mocotó
feijão-tropeiro
cozido de inverno com sete carnes
salada de beterraba e nozes
torta de rins e cerveja
peixe-espada grelhado
bolo de carne com ovos
favas guisadas com chouriço
arroz de polvo
codornas no espeto
paella de mariscos
sopa de alho-poró e batata
cogumelos recheados com queijo
bife de javali com pimenta
lombo de veado com amoras
salmão com mostarda e mel
carneiro assado com alecrim
sopa de lentilha com linguiça
torta de frango e cogumelos
pão de cebola caramelizada
ovos mexidos com ervas
coelho em vinho tinto
picanha de búfalo
caldo de peixe com açafrão
fígado acebolado
nabos assados com mel
abóbora recheada com carne
canjica com amendoim
pamonha com queijo
cuscuz de peixe
mingau de milho com canela
bolo de mandioca
pudim de leite com caramelo
manjar de coco
torta de limão
pastéis de nata
quindim
bolo de laranja
compota de abóbora com coco
pêssegos em calda
bolinhos de chuva
rabanadas com mel
bolo de nozes e café
panquecas de trigo sarraceno
tortilha de batata
empanadas de carne
croquetes de javali
sopa de feijão-preto
sopa de mariscos
caldo de pedra com tudo
ensopado de cabrito com batata
carne de porco com maçã
salsichão grelhado com mostarda
chouriço flambado na aguardente
tábua de queijos e frutas secas
presunto curado com melão
fígado de ganso no pão
pato assado com mel
pombo em crosta de sal
peru recheado de festa
camarão no alho
lagosta grelhada (cara)
ostras frescas com limão
sardinha em escabeche
anchovas em azeite
caranguejo recheado
mexilhões com cebola
sopa de algas
peixe salgado e seco ao sol
carne de urso (não pergunte de onde)
ensopado de cobra-d'água
lagarto no espeto
gafanhotos torrados (especialidade)
mingau de aveia com uvas-passas
pão de frutas secas
pão de mel com especiarias
broa de centeio com sementes
torta de amora silvestre
torta de maçã com queijo
bolo de cenoura com chocolate
biscoitos de gengibre
creme de leite com frutas vermelhas
sorvete de neve com xarope (só no inverno)
favo de mel com queijo fresco
frutas cristalizadas
castanhas assadas na brasa
pipoca com manteiga
amendoim torrado com sal
azeitonas temperadas
picles de pepino
cebolinhas em conserva
sopa fria de pepino
salada de grão-de-bico
couve refogada com toucinho
batatas ao murro
batata-doce frita
mandioca frita com sal grosso
polenta frita
arroz-doce com leite de amêndoas
mel com nozes e figo
ensopado de feijão-branco com mocotó
carne-seca desfiada com cebola
ensopado de cogumelos da floresta
sopa de cevada com carne
`)

export const EXTRA_DRINKS = lines(`
cerveja de abóbora
cerveja de mel e lavanda
cerveja escura de aveia
cerveja clara de verão
cerveja de cereja
cerveja de castanha
cerveja de urtiga
cerveja de pinho
hidromel de flor de laranjeira
hidromel com especiarias
hidromel seco
hidromel com maçã
vinho tinto de garrafão
vinho branco frisante
vinho rosé da colina
vinho de sobremesa
vinho de mel
vinho de framboesa
vinho de groselha
vinho de flor de sabugueiro
vinho de mesa aguado
vinho caro da adega do conde
sidra seca
sidra doce com canela
sidra de marmelo
licor de amêndoa
licor de avelã
licor de menta
licor de rosas
licor de mirtilo
licor de mel e pimenta
licor de figo
licor de canela
licor de chocolate
aguardente de ameixa
aguardente de cereja
aguardente de batata
aguardente de zimbro
aguardente velha de barril
bebida de cacto fermentado
leite de jumenta
leite de ovelha
leite com chocolate quente
leite com mel e açafrão
chá de hibisco
chá de erva-doce
chá de cidreira
chá verde
chá de canela e cravo
chá de casca de laranja
chá de flor de tília
chá de gengibre com limão
chá de folhas de amora
infusão de alecrim
infusão de sálvia
infusão de cogumelo (para quem tem coragem)
café com canela
café com rapadura
café com aguardente
chocolate com pimenta
suco de maçã
suco de pera
suco de laranja
suco de romã
suco de amora
limonada com mel
água com gás de fonte vulcânica
água aromatizada com pepino
garapa de cana
kvass de pão preto
cerveja de arroz
saquê quente
vinho de palma fermentado
pulque espesso
cerveja de banana
licor de ovo
gemada quente
ponche de rum
grogue de marinheiro
bebida verde dos alquimistas
poção duvidosa da casa
cerveja dos monges trapistas
`)

export const EXTRA_TAVERN_DETAILS = lines(`
um mural de espadas quebradas de antigos clientes
um cão de caça que dorme diante da lareira
uma lousa com as dívidas dos fregueses
uma mesa reservada para os mortos
uma caixa de música que toca ao abrir a porta
um anão bêbado que desafia todos no braço de ferro
um quadro de uma sereia que parece se mexer
uma porta secreta atrás do barril de vinho
uma estátua de um herói vestida com roupas velhas
uma janela de onde se vê o cemitério
um gato preto que escolhe quem pode ficar
um cardápio que muda conforme o humor do dono
um palco para duelos de poesia
um poço de desejos cheio de moedas
uma cabeça de dragão empalhada (de madeira)
uma garçonete que lê pensamentos (ou finge)
um realejo encantado que toca qualquer canção
uma lareira em forma de boca de monstro
uma mesa com um tabuleiro gravado
um sino para chamar o dono
um papagaio que xinga em três línguas
uma pilha de capas esquecidas
um quarto que custa uma história em vez de moedas
um barril de cerveja que nunca esvazia
um dono que coleciona dentes de clientes brigões
uma parede de cartas de amor nunca entregues
um bardo cego que conhece todas as canções
uma escada para uma torre de observação
uma árvore oca usada como adega
um aquário com uma enguia elétrica
uma galinha que põe ovos de ouro (pintados)
uma mesa de jogo com dados de osso
uma lareira onde se assam castanhas
um retrato do dono quando jovem e bonito
uma caixa de achados e perdidos cheia de coisas estranhas
um sino que toca quando entra um mago
um cozinheiro troll muito educado
uma armadura vazia que serve de cabide
uma coleção de canecas de todos os reinos
um barril que é, na verdade, uma porta
uma cadeira que ninguém ousa sentar
um espelho que deixa as pessoas mais bonitas
uma parede com marcas da altura das crianças da vila
um quadro de avisos de procurados com um rosto riscado
um dono que fala só por gestos
um piano de cauda trazido por anões
um gongo para anunciar brigas
um tapete de pele de urso que rosna quando pisado (dizem)
uma máquina de cerveja inventada por um gnomo
um varal de bandeiras de navios
uma placa avisando que dragões pagam o dobro
um balcão de mármore roubado de um templo
um porão onde se faz luta de galos
uma mesa reservada para o fantasma do fundador
um grupo de velhas jogando cartas e trapaceando
um menino que engraxa botas por uma moeda
um tocador de alaúde que só sabe três músicas
uma lareira tão grande que cabe uma pessoa
um pombal no telhado para mensagens
uma bebida grátis para quem conta uma mentira boa
um garçom elfo que não sorri nunca
um cachorro que busca bebidas
um mural de caretas desenhadas pelos fregueses
um cofre na parede onde se guardam apostas
uma cama de palha nos fundos para bêbados
uma bancada de anões fumando cachimbo
uma janela com vitral de batalha
um velho marinheiro com um mapa que ninguém entende
um barril de picles que fede
um varal de alho pendurado no teto
um dono que é ex-gladiador
um tabuleiro de dardos com o rosto do coletor de impostos
um cartaz de “proibido dragões”
um caldeirão de sopa que ferve dia e noite
uma bandeira de um reino que não existe mais
um sino de navio na porta
uma porta para o estábulo dentro do salão
um palhaço triste que serve mesas
uma cadeira de balanço que balança sozinha
um teto baixo onde todos batem a cabeça
um vaso de flores que nunca murcha
um balcão marcado com os nomes de quem morreu
uma coleção de chapéus de clientes
um grupo de mercenários em silêncio num canto
uma criança que vende flores entre as mesas
uma velha que costura no canto e ouve tudo
um mapa da cidade com alfinetes em lugares estranhos
um tambor de guerra pendurado na parede
um piso que range em frente à porta da adega
um galo de briga campeão em exposição
um quadro do rei de cabeça para baixo
uma placa com regras de etiqueta para orcs
um barril de água benta (dizem)
uma estante de livros trocados por bebida
um jogo de cartas com um baralho de tarô
um dono com um macaco no ombro
um banquinho alto para halflings
uma mesa com algemas presas, de quando era prisão
uma lareira com o brasão de uma casa extinta
um canto onde se fazem orações pelos marinheiros
`)

export const EXTRA_FEMALE_NAMES = lines(`
Abigail Adalgisa Adélia Adriana Agnes Albina Alda Alessandra Alexandra Alzira Amália Ambrosina Anabela Anália Angélica Antonieta Aparecida Ariane Arlete Armanda Assunção Benta Berenice Bernardina Brígida Camila  Carla Carmela Carmen Carminda Cassilda Célia Cidália Cinira Clarice Cláudia Clotilde  Cristina Dalila Daniela Delfina Deolinda Diná Dolores Dulce Edite Eduarda Elaine Eleonora Eliane Elisa Elisabete Elza Emengarda  Esmeralda Eugénia Eunice Eva Fabiana Felismina Fernanda Filomena Flora Florinda Francelina  Gilda Gisela Graziela Guida Hortênsia Idalina Ifigénia Ilda Inácia Irene Isadora Jacinta Januária Jéssica Joaquina Jordana Jovita Júlia Juvelina Laura Leocádia Leonilde Letícia Lídia Ligia Lília Lorena Lucília Ludovina Luzia Manuela Marcela Marcelina  Maria  Marília  Maurícia Mercês Miquelina Natércia Nazaré  Odília Olinda Palmira Paulina Pérola Piedade Priscila  Raimunda Rebeca  Rosalina Rosário  Sabina Salomé  Simone Sónia Susana  Teodora Ursulina Valéria Vânia Verónica Virgínia Viviane Zulmira
`.trim().split(/\s+/).join("\n"))

export const EXTRA_MALE_NAMES = lines(`
Abílio Adalberto Adão Adelino Agostinho Aires Albano Alberto Alcides Alexandre Alfredo Alípio Amadeu Américo Anacleto André Ângelo Aníbal Antero Antão Aristides Arlindo Armindo Augusto Aurélio Avelino Barnabé Belarmino Benjamim Bernardino Boaventura Brás Caetano_José Calisto Camilo Carlos Casimiro Celestino César Cirilo Cláudio Clemente Constantino Crispim Delfim Dinis Diamantino Edgar Eduardo Eleutério Elísio Emílio Ernesto Eugénio Evaristo Fábio Feliciano_José Fernando Firmino Flávio Florêncio Frederico Fulgêncio Gabriel_José Gaudêncio Gentil Gerardo Gervásio Gilberto Glória Gregório Guido Gustavo Heitor Henrique_José Hermano Hilário_José Hipólito Honório Hugo Humberto Ilídio Isaac Jacinto Jaime Januário Jeremias Joel Jonas Josué Juliano Justino Laurindo Leonardo Libório Lino Lucas Luciano Ludgero Luís Macário Marcos Mário Maurício Moisés Narciso Natanael Nélson Nicodemos Norberto_José Olegário Óscar Patrício Plácido Querubim Rafael Ramiro Raul Renato Ricardo Roberto Rogério Rómulo Rosário Rubens Sabino Saturnino Sérgio Severino Sidónio Tadeu Telmo Teófilo Valentim Venâncio Virgílio Vítor Zacarias
`.trim().split(/\s+/).filter((name) => !name.includes("_") && name !== "Glória" && name !== "Rosário").join("\n"))

export const EXTRA_SURNAMES = lines(`
Abrantes Aguiar_Lopes Albuquerque Alencar Almada Alvim Amorim Andrade Anjos Araújo Arouca Assunção Ataíde Baptista Barreto Barros Belém Bentes Bocage Botelho Bulhões Cabrita Caldas Calheiros Camacho Canto Capelo Carmo Carreira Carrilho Cascais Castelo Cavalcanti Chagas Conceição Cordeiro_Lopes Cotrim Cruz Dantas Delgado Diniz Dória Estrela Évora Fagundes_Lima Falcão_Mendes Farias Faro Feijó Fialho Figueiredo Fontes Fragoso Franco Gaio Galvão Garcês Góis Gonçalves Gonzaga Graça Guedes Hipólito Jordão Lago Lamego Leal Leite Leme Lira Lobato_Reis Lousada Lucena Luz Madeira Mafra Malta Mamede Marques Mascarenhas_Reis Matias Meira Mello Mendes Mira Moniz Monforte Montenegro Mota Neves Nóbrega Ornelas Osório Palhares Peixoto Penha Pires Prado Quadros Queiroga Rangel Raposo_Lima Reis_Moura Ribas Rios Sacramento Saldanha Salvador Santana Sarmento Seixas_Lopes Sequeira Silva Sobral Tavares_Lima Teles Tinoco Trindade Valadão Vale Vargas Vasques Ventura Vidal Vilela Viana Zuzarte
`.trim().split(/\s+/).filter((name) => !name.includes("_")).join("\n"))
