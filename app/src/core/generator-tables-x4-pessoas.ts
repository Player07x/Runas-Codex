/**
 * Geradores ×4 (U32, atualização 1.2.0): mais opções escritas à mão, uma por linha. `generator-tables.ts` põe cada
 * lista no fim da original (os testes usam os primeiros itens). Nada aqui é variação gerada de outra opção: onde a
 * lista é naturalmente uma peça mais outra, as duas partes são escritas à mão e só se juntam as que combinam.
 */
import { lines, pairs } from "./generator-tables-pessoas"

export const X4_DESIRES_1 = lines(`
comprar de volta a casa onde nasceu
descobrir quem envenenou o poço da aldeia
aprender a ler antes do inverno
casar com alguém de uma família inimiga
ver o mar pela primeira vez
pagar a dívida do avô com um agiota
reencontrar o irmão gêmeo levado pelos soldados
abrir uma escola para órfãos
ganhar o torneio de arco da cidade
provar que o próprio mestre é um charlatão
voltar para a terra natal antes de morrer
achar a cura para a febre que leva as crianças
ser aceito na guilda dos ourives
fugir de um casamento arranjado
recuperar a espada que penhorou bêbado
reconstruir o moinho que o rio levou
descobrir o nome verdadeiro da própria mãe
ganhar o perdão de um velho amigo
plantar um pomar que dure cem anos
trazer de volta o corpo do filho afogado
vender a taverna e sumir no mundo
desmascarar o sacerdote que rouba as oferendas
domesticar um grifo
escrever uma crônica que ninguém esqueça
derrotar o campeão da arena em luta justa
encontrar um herdeiro digno para a forja
juntar dinheiro para um navio próprio
apagar o próprio nome dos registros da guarda
devolver um livro roubado a um mosteiro
descobrir o que existe do outro lado das montanhas
tirar a família da servidão
conseguir um lugar no conselho da cidade
ter uma noite inteira de sono sem pesadelos
encontrar o tesouro que o pai jurava ter enterrado
salvar o bosque sagrado do machado do barão
conhecer a rainha pessoalmente
quebrar a maldição que cai sobre o sétimo filho
fazer as pazes com o próprio deus
ver o filho tornar-se cavaleiro
achar a estrela que caiu no pântano
mandar uma carta para alguém que já morreu
aprender a magia que matou o próprio mestre
ganhar a confiança dos elfos do bosque
dobrar a fortuna em uma só aposta
desfazer um pacto feito na juventude
morar numa torre longe de todos
ver a cidade natal livre dos ocupantes
encontrar um mapa que leve às minas perdidas
provar a inocência de um condenado
sair da sombra de um irmão famoso
ser enterrado ao lado de quem ama
abrir uma rota de comércio pelo deserto
recuperar a voz perdida numa febre
descobrir por que os pássaros fugiram da aldeia
ganhar um título de nobreza
proteger a aldeia de um dragão que dorme perto
ser lembrado numa canção de taverna
encontrar a mãe que o abandonou num convento
ensinar o ofício a alguém antes de perder a visão
roubar de volta o que um nobre tomou à força
casar a filha com um bom partido
pôr fim a uma rixa de família que dura três gerações
ver de perto um eclipse total
conhecer o autor do livro que mudou sua vida
comprar a liberdade de um amigo escravizado
descobrir quem é o informante na guilda
treinar um cão de caça perfeito
derrubar o prefeito corrupto
chegar ao topo da montanha sagrada
quitar uma promessa feita a um moribundo
fundar uma ordem de cavaleiros errantes
achar o caminho de volta a um sonho
mostrar ao pai que escolheu a profissão certa
construir uma ponte sobre o desfiladeiro
recuperar as terras tomadas pela coroa
desenhar o mapa mais preciso do reino
ter a própria loja na praça principal
afastar um espírito que assombra o celeiro
ganhar o coração de um bardo famoso
descobrir o segredo da cerveja dos monges
vingar a morte de um mentor
encontrar um lugar onde ninguém conheça seu passado
reunir a antiga companhia de aventureiros
salvar o navio da família do leilão
saber se o irmão desaparecido ainda vive
ser ouvido pelo rei uma única vez
virar o melhor cozinheiro da região
vencer a doença que come os próprios ossos
descobrir de onde vêm as moedas sem cunho
afastar os lobos do rebanho
devolver a coroa a quem é de direito
guardar dinheiro para o dote da irmã
fazer uma viagem ao reino dos anões
achar o túmulo de um herói esquecido
calar os boatos sobre o próprio passado
dar ao povo da vila um poço de água limpa
ser admitido na academia de magia
aprender a nadar antes da próxima cheia
pintar o retrato da rainha
comprar um cavalo de raça
resgatar os livros de uma biblioteca em chamas
ver o fim da guerra antes de envelhecer
mudar o próprio rosto com magia
cuidar de um dragão recém-nascido
achar um remédio para a insônia do rei
ter de volta a fé que perdeu na batalha
trocar de vida com um desconhecido
descobrir o que há no porão fechado da casa
apagar um incêndio que queima há anos sob a terra
ganhar uma aposta contra o diabo
descobrir para onde levam as escadas do poço
aprender a falar com os mortos
vingar a aldeia queimada
tirar o irmão da prisão do castelo
reunir as sete partes de um amuleto
comandar um navio de guerra
achar uma mina de prata só sua
salvar uma espécie de flor da extinção
ter um jardim no telhado da cidade
ganhar o direito de portar armas na capital
morar perto do mar com a família
encontrar uma maneira de falar com o filho que não ouve
devolver a paz a um cemitério profanado
achar quem lhe roubou a sombra
fazer a melhor espada que já existiu
pagar uma missa pela alma de um inimigo
mudar o curso do rio para salvar a colheita
ver o nome gravado numa estátua
descobrir quem são os verdadeiros pais
ser perdoado por quem traiu
ganhar fama nas lutas de taverna
achar um tradutor para um idioma morto
juntar provas contra o juiz
escapar de uma dívida com os ladrões
sair vivo de um duelo marcado para o fim do mês
conseguir a mão de alguém muito acima de sua posição
devolver a visão a um cego querido
ter uma estalagem cheia todas as noites
ensinar uma ave a falar o próprio nome
desvendar o enigma gravado na lápide do avô
abrir a porta que o pai proibiu
conhecer o mundo antes de assumir a herança
proteger um segredo até a morte
garantir que a filha herde a fazenda
achar o artista que pintou o quadro amaldiçoado
fazer um último trabalho e se aposentar
expulsar os bandidos da estrada do moinho
recuperar a medalha que ganhou na guerra
ver o rival humilhado em público
fundar uma vila nova na fronteira
descobrir por que não envelhece
tornar-se o guarda-costas da princesa
aprender a tocar o alaúde do pai
ganhar o respeito dos vizinhos
achar a ilha que aparece só em mapas antigos
convencer o conselho a reabrir a mina
voltar a ser criança por um dia
encontrar quem deixa flores no túmulo da mãe
juntar a família para uma última ceia
ganhar o suficiente para nunca mais trabalhar
salvar o mestre de uma acusação de heresia
tirar um peso da consciência
ver a irmã curada da possessão
desenterrar o baú escondido na guerra
ganhar uma cadeira no colégio dos sábios
escrever o próprio nome na história do reino
abrir uma casa de chá na estrada real
ter de volta o rosto de antes do incêndio
encontrar o caminho para o reino das fadas
convencer o filho a desistir de ser soldado
descobrir quem manda as cartas sem assinatura
fazer a colheita sem pagar o dízimo
sair da cidade sem que o chefe da guilda perceba
cuidar dos pais até o fim
ganhar um lugar à mesa do duque
descobrir a receita do pão da avó
pôr à prova uma lenda da família
apagar uma tatuagem de prisioneiro
derrotar o monstro que matou o pai
acabar com a fome na aldeia
ser chamado de mestre pelos aprendizes
recuperar a honra perdida num julgamento
saber onde o tesouro da companhia foi parar
viver em paz com o vizinho
conquistar uma estrela de prata no torneio
escapar de um voto feito num templo
achar um lugar seguro para os refugiados
ver o próprio barco singrar o rio
convencer os deuses a mandar chuva
abrir uma estrada nova pela floresta
redimir o nome do pai
encontrar o último livro de um autor proibido
fazer as pazes com o próprio corpo após a guerra
ganhar a liberdade de ir e vir sem salvo-conduto
descobrir se a magia pode trazer alguém de volta
achar um aprendiz para o ofício de relojoeiro
salvar os cavalos do estábulo do barão
apostar tudo num cavalo desconhecido
desaparecer antes que o passado o encontre
ver o próprio poema cantado na corte
consertar o sino da torre
descobrir a verdade sobre a batalha em que lutou
ficar com a guarda da relíquia do templo
arrumar um marido para a prima solteira
reabrir a velha estrada dos peregrinos
viver mais que todos os inimigos
achar a fonte que, dizem, cura qualquer ferida
aprender a montar um cavalo de guerra
ter uma casa com janelas de vidro
voltar ao campo de batalha para enterrar os amigos
convencer a guilda a aceitar mulheres
ver a filha voltar da escola de magos
descobrir o que a avó sabia sobre as fadas
pagar a fiança de um amigo
fugir com a trupe de saltimbancos
mostrar que o monstro do lago é inofensivo
cruzar o deserto a pé
conhecer o pai antes que ele morra
escapar da vigilância da família
ser o primeiro a pisar na ilha nova
descobrir quem roubou o sino da capela
virar sócio de um mercador rico
comprar um título de cavaleiro
recuperar um coração partido com uma poção
achar um lugar para enterrar o cão
ser deixado em paz pelos coletores de impostos
encontrar uma pena de fênix
ganhar o concurso de queijos da feira
morrer em paz e de velhice
plantar um carvalho onde caiu o irmão
saber o que está escrito na carta lacrada
ser útil para alguém pela primeira vez
recuperar a coleção de borboletas do pai
fazer as pazes com a guilda dos ladrões
treinar um falcão para a caça
proteger a mãe de um credor violento
ver o mundo pelos olhos de um pássaro
descobrir por que o espelho mostra outro rosto
sair do povoado sem olhar para trás
achar um noivo para quem não quer casar
trazer a primavera de volta ao vale
juntar a coragem de dizer a verdade
dar um nome à própria espada
aprender o segredo do aço azul
salvar um gigante da caçada do rei
ser respeitado pelos soldados que comanda
ganhar o processo contra o próprio irmão
ver as luzes do norte
voltar a pintar depois da morte da esposa
encontrar o pai verdadeiro do filho
fazer com que o povo esqueça uma vergonha
achar a cidade submersa
domar o rio com uma represa
ter a cabeça do lobo branco na parede
escapar da família que o quer sacerdote
convencer a rainha a perdoar os rebeldes
descobrir de onde vem a névoa que mata o gado
aprender a cantar como os elfos
ter um lugar onde envelhecer
encontrar o amuleto que a irmã perdeu no rio
apagar um registro de nascimento
trocar a espada pelo arado
ganhar o mundo e voltar rico para a aldeia
fazer justiça com as próprias mãos
salvar a própria alma de um contrato
descobrir para quem o chefe trabalha de verdade
encontrar quem ainda se lembra da antiga língua
proteger o filho de uma profecia
tirar a sorte grande na loteria do templo
ser o melhor ferreiro dos três reinos
descobrir quem pôs fogo no celeiro
ter um pouco de paz depois de anos de guerra
contar ao mundo o que viu na torre
voltar no tempo e evitar uma escolha
ver o rio limpo de novo
encontrar a chave do cofre do avô
ganhar o direito de caçar nas terras do conde
descobrir por que as crianças sonham o mesmo sonho
arranjar uma cura para a lepra do irmão
ver a irmã casada com quem ama
cruzar o mar e voltar com especiarias
vender uma relíquia sem ser enganado
aprender a lutar sem armas
ganhar o respeito do mestre-escola
tornar-se o guardião da biblioteca
manter a família unida depois da enchente
achar um lugar para o povo das montanhas
salvar o velho farol da demolição
descobrir o que foi feito do noivo desaparecido
abrir um caminho para o povo do subsolo
fazer o melhor vinho da colina
vencer o medo do escuro
achar o espírito que fala pelo poço
ter uma segunda chance com a família
conquistar a admiração de uma artista famosa
viver como nobre por uma semana
trazer o circo de volta à cidade
cumprir a última vontade de um rei
achar a própria assinatura num documento que nunca assinou
escapar de um duelo de honra sem perder a honra
ter um retrato na galeria do castelo
desfazer o casamento que a magia arranjou
descobrir quem lhe deixou uma herança
salvar o rebanho de uma praga
devolver o ouro que o pai roubou
achar o caminho até o templo nas nuvens
ser o primeiro da família a saber escrever
conhecer o fundo do lago
descobrir a origem da própria marca de nascença
ser esquecido pelos inimigos
achar um lar para os gatos da velha bruxa
ter o próprio nome numa rua
abrir uma oficina de vidro colorido
desatar o nó que prende a alma da mãe
saber se a profecia sobre si é verdadeira
ganhar o perdão do templo
trazer o irmão de volta do exército
descobrir o que as estrelas dizem sobre a colheita
fazer a viagem que o pai não fez
achar um amigo que não queira nada em troca
salvar o mercado da praça do incêndio
encontrar uma forma de enganar a morte
ver a própria aldeia no mapa do reino
ensinar o filho a caçar
conseguir uma audiência com o sumo sacerdote
proteger a floresta dos lenhadores do rei
ser o herói que a avó contava nas histórias
recuperar a carta de amor que caiu nas mãos erradas
ganhar a corrida de barcos do festival
descobrir o paradeiro de um velho companheiro de armas
fazer o rei rir
achar um meio de voltar ao corpo de antes
encontrar quem consiga ler as runas da porta
conseguir uma licença para vender na feira real
pôr ordem nos papéis da família
ver o castelo do barão em ruínas
trazer a filha de volta do reino das fadas
casar antes que o pai escolha alguém
salvar a ponte velha de ser derrubada
ser chamado para a corte como conselheiro
comer um banquete digno de rei
achar o fim do arco-íris, só para ter certeza
descobrir quem lhe salvou a vida no naufrágio
sumir com um mapa que pode iniciar uma guerra
ser o último a fechar a porta da taverna
escapar de uma família de vampiros
tornar-se imortal nas canções
plantar uvas onde só cresce pedra
achar o diário perdido de uma exploradora
fazer o povo voltar a dançar nas festas
ver o próprio filho perdoar o avô
encontrar o cavalo que fugiu na tempestade
ser lembrado como alguém bom
`)

export const X4_DESIRES_2 = lines(`
descobrir quem colocou veneno no cálice do noivado
achar um comprador para um quadro roubado
voltar a andar depois da queda do cavalo
ver a cidade iluminada por lampiões
encontrar a nascente do rio que corta o reino
ter o direito de ser enterrado no cemitério da vila
ganhar uma pena de águia do chefe da tribo
convencer o mosteiro a aceitar a irmã
achar a pedra que completa o anel da família
abrir um caminho seguro pelas minas abandonadas
salvar a reputação do teatro da cidade
voltar a falar com o irmão depois de dez anos
achar um lugar para esconder um fugitivo
comprar um sítio com riacho e pomar
descobrir o que aconteceu na noite do baile
mudar o sobrenome para fugir da má fama
ter a própria barraca de peixe no porto
ver o último dragão antes que o matem
ganhar dinheiro suficiente para estudar medicina
desfazer um feitiço de amor lançado por engano
descobrir quem é o cavaleiro sem brasão
encontrar o amigo que lhe deve a vida
juntar os ossos de um santo espalhados pelo reino
conquistar a confiança de um cavalo selvagem
voltar ao navio onde cresceu
ver o próprio nome inscrito no livro da guilda
fazer uma fortuna com a próxima colheita de lã
descobrir o que a mãe enterrou no quintal
salvar a última árvore do jardim do palácio
ganhar a guerra de preços contra o padeiro vizinho
trazer de volta as abelhas ao vale
tornar-se capitão da guarda
ser tratado como gente pelos senhores do castelo
reencontrar o primeiro amor
apagar o próprio rosto dos cartazes de procurado
ter uma estante cheia de livros
recuperar a fazenda que a enchente arruinou
conhecer um feiticeiro de verdade
descobrir se o tesouro do lago é real
achar a filha que fugiu com os ciganos do rio
voltar a confiar em alguém
fazer o povo da vila parar de rir de si
ver o túmulo do pai restaurado
ganhar o desafio dos lenhadores
achar o ourives que forjou a coroa falsa
encontrar um lugar onde a guerra não chegue
tornar-se escriba do templo
salvar o rio de uma praga de sanguessugas
descobrir por que o cão uiva para o poço
ganhar o direito de pescar no lago do senhor
achar um amuleto contra pesadelos
acabar com os roubos no celeiro
viver o bastante para ver os netos
ter um gato que o obedeça
comprar a forja do mestre que se aposenta
convencer a prima a voltar para casa
desafiar um campeão estrangeiro
saber cozinhar o prato preferido da mãe
achar o homem que vendeu a casa de sua família
fazer o filho tirar a armadura
desfazer o boato de que é bruxa
ter a última palavra numa discussão com o padre
achar quem comprou as joias da avó
ganhar a medalha do festival da colheita
escrever uma carta para a rainha e receber resposta
salvar a escola da vila do fechamento
achar a passagem para o vale escondido
voltar a sentir gosto na comida
descobrir quem lhe tirou a memória
ver o rival pedir desculpas
ser parte de uma lenda
achar o mapa celeste que guia os navegantes
comprar uma carroça e sair pelas estradas
recuperar a confiança da tropa
ter um filho que siga o ofício
encontrar uma forma de dividir a herança em paz
saber quem foi o cavaleiro que lhe salvou na infância
derrubar a muralha que separa os bairros
trazer os sinos da catedral de volta
ganhar um lugar no navio da expedição
achar a moeda de ouro que traz sorte
ser deixado sozinho com os livros
fazer o primeiro carregamento de sal chegar à capital
descobrir quem desenha símbolos estranhos nas paredes
ver o castelo da família reconstruído
tirar a coroa do usurpador
achar a resposta para o enigma da esfinge do deserto
salvar o mosteiro da ruína
ganhar a guerra contra os ratos do armazém
viver numa cidade sem muralhas
reunir dinheiro para resgatar o pai dos piratas
achar um lugar onde possa usar magia sem medo
ser coroado rei da festa da primavera
encontrar uma ponte entre os vivos e os mortos
saber quem é o dono do anel encontrado no peixe
proteger o jardim de ervas da vizinha
ter um bom enterro para o cavalo de guerra
descobrir a fórmula do fogo que não se apaga
fazer a cidade inteira provar sua torta
achar o túnel que liga a taverna ao castelo
voltar ao mosteiro onde aprendeu a ler
descobrir o que acontece com quem entra na névoa
ganhar a confiança dos anões da montanha
ter de volta o violino roubado
salvar a ponte de cordas do vale
achar uma noiva para o filho tímido
abrir um orfanato na velha caserna
saber o fim da história que a mãe não terminou de contar
encontrar o feiticeiro que transformou o irmão em sapo
tornar-se a voz do povo diante do conde
apagar o fogo da forja pela última vez
ter um navio com o nome da filha
achar um modo de pagar o resgate
salvar o próprio povo de uma fome que vem aí
ver o fim do inverno mais longo
comprar um tear novo para a oficina
descobrir quem é o mascarado do baile
tirar o pai da bebida
ganhar o festival de canções
achar a herdeira desaparecida da casa real
encontrar o lugar onde o céu toca o mar
ter uma conversa honesta com o rei
saber por que a guilda o expulsou
descobrir se a própria mulher é uma fada
ser chamado para um banquete no palácio
salvar a raposa que vive no jardim do templo
fazer a ponte entre duas famílias inimigas
tornar-se o primeiro mago da família
recuperar a lança do herói da aldeia
ver de novo a cidade onde viveu a juventude
trazer a irmã de volta do convento
achar um bom esconderijo para o ouro
descobrir de onde vem a música que ouve à noite
tornar-se dono do próprio tempo
ver a filha feliz
salvar a horta da geada
juntar as provas de que o barão é um impostor
achar o pergaminho que ensina a voar
ser lembrado pelo bem que fez em segredo
ter uma casa na beira do lago
encontrar a última gota da água da vida
conhecer as fadas do pântano
mostrar que o próprio povo não é amaldiçoado
ganhar a disputa pela mão da herdeira
descobrir o caminho que as caravanas usavam antes da areia
acabar com o contrabando no porto
trazer os mortos da guerra de volta para casa
saber o que o mestre escreveu na última página
pôr os pés numa terra que nenhum mapa mostra
ensinar a vila a se defender
ser enterrado com a espada
ver o filho crescer longe das armas
achar a filha do ferreiro que sumiu na feira
encontrar o lugar onde nasceu a estrela-guia
ganhar uma estátua na praça
achar alguém que entenda a sua língua
salvar o lago das criaturas do lodo
descobrir quem lhe mandou o presente sem nome
escapar do pagamento do pedágio da ponte
viver numa casa sem goteiras
ter um amigo de verdade na corte
recuperar o diário que a guarda confiscou
descobrir por que o rei tem medo de espelhos
achar o caminho até a cidade das torres de cristal
voltar a ser quem era antes da maldição
ganhar a proteção de um nobre
achar a ilha das tartarugas gigantes
fazer um pacto de paz com os goblins da colina
tornar-se o melhor domador de feras
ter a cabeça do assassino do irmão
ver a família toda reunida na festa do solstício
saber se ainda existe alguém da sua linhagem
salvar o ofício de cesteiro da extinção
achar uma companhia para a velhice
encontrar o lugar onde o pai escondeu a carta
viver de música
fazer o barão pagar o que deve à aldeia
voltar a ver cores depois da doença
trazer um sábio para curar a peste
recuperar a confiança do povo no templo
descobrir quem roubou os ovos do grifo
ter um bom nome entre os comerciantes
conquistar a medalha da guarda
achar o reino que existe dentro do espelho
salvar a mãe de um julgamento por bruxaria
saber quanto tempo ainda resta
cuidar de um jardim de rosas negras
tornar-se o primeiro a atravessar o glaciar
ver o mar congelado
ser aceito pelos pais da noiva
achar o assassino do bardo
desfazer o mal que fez numa noite de bebedeira
reencontrar a amiga de infância
descobrir por que o rio corre ao contrário uma vez por ano
ganhar a guerra de canções contra a vila vizinha
achar quem ensine a forjar prata lunar
viver numa casa assombrada sem ter medo
tirar as crianças das minas
ver a rainha cair
abrir uma barbearia na praça
saber o que significam os sonhos com lobos
salvar o próprio rebanho da fome
ser escolhido para guardar a chave da cidade
encontrar a pessoa que lhe escreveu a carta de amor
recuperar a memória do dia do acidente
descobrir quem pagou pela morte do prefeito
construir um barco que voe
desaparecer do mapa por um ano
encontrar o rastro do urso que matou o pai
ganhar o torneio de xadrez da universidade
ter a coragem de pedir perdão
saber onde nasce o vento do norte
achar o cântaro que nunca esvazia
fazer as pazes com a filha
tornar-se a melhor parteira do condado
trazer luz para a vila mineira
recuperar a cruz de prata da capela
salvar o povo da floresta da expulsão
ganhar um barril de vinho de cada colheita
achar um caminho até a cidade antiga sob o lago
viver uma aventura antes de casar
abrir as portas do castelo para o povo
descobrir onde foi parar o sino de bronze
ver a irmã ser coroada
encontrar o artesão que fez a caixa de música
achar quem entenda a matemática das estrelas
fazer o tribunal reconhecer a dívida do nobre
tornar-se guia de peregrinos
salvar uma criança da escravidão
ter um lugar no barco que leva ao norte
descobrir quem desviou o dinheiro da ponte
recuperar o colar que a irmã penhorou
ganhar uma chance de lutar pela própria terra
achar um feitiço que conserte coisas quebradas
saber se o marido ainda está vivo
sobreviver ao próximo inverno
ter uma ferradura de prata para o cavalo
descobrir o nome do pássaro que canta à meia-noite
voltar a ver os amigos da companhia de teatro
encontrar o portal que a avó dizia ter no bosque
ganhar o respeito de quem o chamava de covarde
achar a última cópia de um livro de receitas
salvar o velho moleiro das dívidas
fazer a melhor colheita de maçãs do condado
ver o mundo do alto de uma torre de vigia
tornar-se lenda entre os caçadores
encontrar a resposta para uma pergunta de criança
descobrir quem lhe tirou a herança
trazer o amor de volta da cidade grande
achar um modo de pagar o curandeiro
recuperar o barco afundado na tempestade
salvar a festa da colheita do cancelamento
ganhar um par de botas que não machuquem
saber a verdade sobre a lenda do lobisomem da vila
tornar-se escudeiro de um cavaleiro honrado
achar o lugar onde caem as estrelas cadentes
ter uma mesa sempre cheia
ver o próprio nome escrito nas estrelas
descobrir quem mente no conselho
fazer o povo acreditar em si de novo
recuperar a lanterna que guia os mortos
encontrar o reino dos gatos
ganhar a liberdade de escolher o próprio caminho
salvar a coleção de mapas do velho capitão
achar um meio de falar com os animais
ver a vila protegida por uma muralha
descobrir o paradeiro do tesouro dos templários do sol
tornar-se mestre de cerimônias da corte
trazer de volta a festa dos lampiões
ter uma lareira que nunca se apague
saber o que se esconde no fundo do poço dos desejos
ganhar uma boa morte em batalha
achar uma forma de dormir sem ouvir vozes
recuperar a própria sombra
encontrar o caminho de volta para a família
fazer uma peregrinação ao templo do mar
ver a primeira neve com quem ama
descobrir se pode confiar no novo senhor
salvar a ponte da cidade de um troll cobrador
`)

export const X4_DESIRES_3 = lines(`
ter uma cadeira na primeira fila do teatro
fazer o sapateiro devolver as botas da avó
achar os versos que faltam na canção do herói
ver o povo do vale votar em vez de obedecer
encontrar o professor que lhe ensinou as letras
mandar a mãe para longe da cidade antes da guerra
ser contratado pela companhia de mercadores do sal
ver um unicórnio, mesmo que de longe
ganhar a corrida a cavalo da feira de outono
achar o rastro da caravana sumida no deserto
salvar o próprio nome de uma calúnia
ter uma casa com porão para os vinhos
descobrir por que a ponte range quando alguém mente
ver o barão julgado pelo povo
ter um gato preto que traga sorte
recuperar o broche que perdeu no baile
encontrar o lugar exato onde a mãe nasceu
saber a verdade sobre a morte do capitão
achar um professor de esgrima que não cobre caro
fazer a paz com os espíritos da colina
abrir uma estalagem para viajantes pobres
achar um modo de engordar o gado magro
ser o padrinho do filho do melhor amigo
tirar a mãe do asilo
conquistar um território para a própria tribo
encontrar o urso dourado das lendas
ver um julgamento justo pelo menos uma vez
encontrar quem lhe deixou um bebê à porta
desfazer o noivado sem ofender ninguém
achar um lugar onde o vento não sopre
descobrir quantas vidas um gato pode ter, na prática
convencer o pai a vender a fazenda
ver a sala do trono por dentro
juntar moedas para uma prótese de prata
ter um cão que farejasse ouro
fazer as pazes com a cidade que o expulsou
ganhar a confiança dos pescadores do porto
saber se a bola de cristal mente
achar os irmãos perdidos na guerra
abrir uma tecelagem com as viúvas da vila
sair do convento sem ser caçada
ver a cidade dos anões por dentro
achar o espírito que ama a dona da casa
encontrar uma maneira de voltar para o próprio tempo
ganhar a mão de quem salvou do rio
tornar-se a guardiã do farol
saber o que dizia o bilhete queimado
ser recebido pelo povo da floresta
achar quem lhe roubou a voz de cantor
ver o fim do reinado do tirano
achar os ossos do gigante da serra
cuidar de um orfanato até o fim da vida
viajar com os ciganos do rio por um verão
encontrar a irmã que se casou com um nobre estrangeiro
ter uma oficina que nunca falte trabalho
fazer a própria fortuna vendendo gelo no verão
devolver o lobo ferido à matilha
descobrir quem mexe nos túmulos à noite
sair da sombra da mãe famosa
ser a primeira mulher no conselho
ganhar a confiança do capitão do porto
achar um lugar seguro para os livros proibidos
ter o próprio selo de lacre
ver o rival casado com outra pessoa
achar quem pagou pelo silêncio dos guardas
tornar-se o melhor caçador de recompensas
trocar a fama por um pouco de sossego
achar a própria voz depois de anos calado
encontrar alguém que leia os sinais do céu
descobrir o que há atrás da cachoeira
ver os filhos alfabetizados
encontrar o espelho onde a avó via o futuro
ganhar a próxima eleição da guilda
ter um cavalo que não tenha medo de fogo
recuperar o anel do noivado perdido no lago
salvar o povo do pântano da expulsão
ser o primeiro a ver o cometa
fazer o mago da torre cumprir a promessa
achar uma pedra que fale
descobrir o motivo da raiva do pai
ser útil ao reino sem pegar em armas
achar a própria casa no mapa velho
ganhar uma batalha sem derramar sangue
fazer a cidade lembrar dos mortos da peste
ver o castelo do inimigo de dentro
descobrir o que a cigana viu na sua mão
ter a casa cheia de netos
juntar coragem para sair da aldeia
`)

export const X4_SECRETS_1 = lines(`
uma segunda família na cidade vizinha
a carta que provaria a inocência do irmão
um ferimento de flecha que não cicatriza
dívidas com três agiotas diferentes
o verdadeiro nome do pai
uma chave que abre a cripta da família real
que nunca foi soldado, apenas desertor
a moeda de um tesouro que ajudou a roubar
um pacto de sangue com uma bruxa do pântano
a lista dos nomes de quem vai ser preso
que é herdeiro de um trono deposto
a cabeça de um santo numa caixa de chapéu
um livro de feitiços escrito na própria pele
que vende informações para os dois lados da guerra
um filho que nunca reconheceu
a confissão assinada de um crime que não cometeu
uma dentadura de ouro tirada de um morto
que já foi um lobisomem e não sabe se está curado
um pergaminho que prova que a ponte é do barão
uma estátua da deusa proibida no porão
que sabe onde está o rei desaparecido
um anel que mata quem o usar três dias seguidos
a herança de um tio que todos acham pobre
que matou o próprio mestre por acidente
uma passagem secreta atrás do armário
que é um espião da coroa estrangeira
um diário com os pecados de metade da cidade
uma ferida de mordida no ombro
os planos da muralha da cidade
uma noiva prometida em outro reino
que assiste às missas do culto do abismo
um mapa tatuado nas costas
um cofre cheio de cartas de amor de uma rainha
que já foi pirata
o corpo de um cobrador de impostos no poço
um saco de sementes de uma planta extinta
que não sabe ler, apesar de ser escrivão
um ovo de dragão escondido no forno
um voto de silêncio quebrado
que tem um irmão gêmeo na prisão do castelo
a assinatura falsa do conde num contrato
uma cicatriz de marca de escravo
que trai o marido com o cocheiro
uma espada que pertenceu a um traidor famoso
o selo roubado da chancelaria
que vê os mortos desde criança
um pacto com o guarda da ponte para deixar passar contrabando
os ossos do próprio pai no baú
que pagou para alguém lutar em seu lugar na guerra
uma maldição que passa para o primeiro filho
o mapa de uma mina de ouro abandonada
que é filho bastardo do bispo
a coroa de um rei bárbaro no fundo do poço
que roubou a receita de um concorrente
uma criança fada trocada no berço
a lista dos devedores do barão
que perdeu a casa da família no jogo
uma chave do tesouro da guilda
que tem medo de altura, apesar de ser telhadista
um cachimbo que sopra fumaça de sonhos
que é sócio dos contrabandistas do rio
um irmão que é monstro e vive na floresta
que fugiu de um mosteiro
uma pedra-da-lua roubada do altar
a verdadeira história da batalha da ponte
que mente sobre a idade há trinta anos
a lealdade a uma casa nobre caída
um testamento escondido no colchão
que matou um nobre em duelo proibido
uma criança escondida no sótão
as cartas trocadas com o inimigo
um frasco de veneno que não tem cheiro
que a tinta de seus quadros é feita com sangue
uma língua que fala com corvos
que o filho mais velho não é seu
a localização de um esconderijo de bandidos
que já foi noiva do rei
um tesouro de moedas que ninguém pode gastar
que guarda o coração de um gigante num pote
a promessa de entregar o primeiro filho a uma fada
que é a autora dos panfletos contra o duque
um broche de uma ordem de assassinos
que se curou de uma doença incurável
um cemitério de animais no quintal
um contrato de casamento rasgado
que já foi enterrado vivo
a única chave da prisão subterrânea
que sabe falar a língua dos demônios
uma moeda de ouro com o rosto do usurpador
que deve a vida a um vampiro
o anel de um bispo desaparecido
que sabota os barcos do concorrente
um caderno com receitas de venenos
que a avó era uma bruxa queimada na praça
um quadro roubado do palácio
que não dorme há meses
uma estátua que muda de lugar à noite
que perdeu os dentes num duelo e usa dentes de lobo
o cadáver de um cavalo de corrida
que já serviu ao exército inimigo
uma garrafa com um espírito preso
que tem o direito ao trono do vizinho
um mapa de túneis sob a cidade
que é sonâmbulo e acorda com terra nas unhas
uma nota de dívida assinada pelo prefeito
que dorme com uma faca sob o travesseiro por medo do irmão
uma pena de grifo arrancada de um filhote
que é imune a veneno
uma flauta que hipnotiza ratos
que trocou o bebê da rainha
um baú de roupas de mulher que não são da esposa
a cópia de um livro que o templo queimou
que viu o assassinato do antigo prefeito
um selo de um rei de outro tempo
que o próprio cão é um homem transformado
um saco de dentes de dragão
que está apaixonado pela esposa do patrão
um amuleto que o protege de ser visto por mortos-vivos
uma garrafa de vinho envenenado guardada para uma ocasião
que acha que é a reencarnação de um herói
um pergaminho com uma profecia sobre a cidade
uma porta no porão que dá para outro lugar
que mantém um fantasma como inquilino
que já foi casado com uma sereia
um olho de vidro que vê através das paredes
o nome do traidor que entregou a fortaleza
que nunca pagou o dízimo
uma pele de urso que vira gente na lua cheia
a ponta de uma lança sagrada
que tem uma coleção de orelhas
uma tatuagem com o símbolo do culto
um quarto onde ninguém entra há vinte anos
que já foi rico e perdeu tudo numa noite
que não sente dor
uma caixa com cinzas de alguém que não pode ser nomeado
um retrato do rei com bigode desenhado
a planta da casa do juiz
que recebe ordens de vozes no poço
uma bolsa de couro humano
que é o informante dos guardas
um cálice que transforma água em vinho, mas só às vezes
os papéis de alforria que nunca entregou
que o irmão morto ainda escreve cartas
um mapa estelar com uma estrela que não existe
que é o verdadeiro autor das canções do bardo famoso
um ninho de víboras no barril de vinho
um bebê de pedra embrulhado em panos
que foi um dos assassinos do rei velho
uma corda de enforcado guardada para dar sorte
um baralho que adivinha o futuro
que tem pavor do mar, apesar de ser marinheiro
uma armadura com o brasão de uma casa extinta
que a filha é uma princesa escondida
uma ferradura de prata de um cavalo mágico
um livro de contas falso para o coletor
que tem dois corações
a lâmina que matou o herói da cidade
que sabe onde o tesouro do templo foi parar
um mapa de onde caiu a lua antiga
um irmão que vive como mendigo de propósito
que é capaz de mudar de rosto por uma hora
que deve um favor a uma rainha das fadas
um sino de prata que chama algo do lago
uma pilha de cartas nunca enviadas
que está proibido de entrar em três cidades
que o velho moinho é uma porta para outro mundo
um contrato assinado com tinta de lula e sangue
um cachorro de ouro maciço pintado de preto
que serviu como carrasco
a pena com que se assinou a rendição
um anel de noivado que não é da noiva
que sonha com os crimes antes de acontecerem
uma colher de prata do palácio
que tem medo de que a mãe volte do túmulo
um gato que é, na verdade, um familiar de bruxa
que comprou a liberdade com uma mentira
os documentos de um navio afundado de propósito
uma flecha que nunca erra, mas só serve uma vez
que roubou as economias da igreja
uma armadilha no próprio quarto
um mapa da cidade com cruzes vermelhas
que toma uma poção para parecer mais jovem
a mão mumificada de um ladrão
que foi o último a ver a princesa desaparecida
um pacto de não agressão com um dragão
os sinos que tiraram da capela
um caderno de feitiços em código
que o marido é um espectro
a receita do vinho do mosteiro
um saco de joias costurado no casaco
que é surdo de um ouvido e finge ouvir tudo
um sapato de cristal guardado num baú
que ajudou a fundar uma seita
um cachimbo que pertenceu a um rei pirata
a localização do esconderijo da resistência
uma fé secreta num deus esquecido
que esteve presente no incêndio do mercado
uma pena de corvo que abre fechaduras
a lista de clientes de uma casa de prazeres
que tem uma filha entre os elfos
um frasco de lágrimas de sereia
que já salvou a vida do vilão da cidade
um sino de vaca que espanta mortos
uma bússola que aponta para quem a dona mais odeia
que o castelo pertence à própria família
uma camisa manchada de sangue antigo
uma promessa de vingança feita numa cela
que o mestre deixou tudo para ele, e ninguém sabe
uma escada de corda pronta para fugir
um pedaço de pergaminho com um nome riscado
que é a herdeira de uma fortuna de mercadores
uma luva com garras de ferro
uma estátua de cera de si mesmo
que viu um anjo cair
um barril de pólvora debaixo da cama
a ordem de prisão do próprio irmão
que esteve morto por três dias
um bilhete de loteria premiado nunca cobrado
uma conta de sangue num banco de anões
que é a mão por trás dos roubos da praça
um cristal que guarda a memória de um morto
a carta de um rei pedindo perdão
um machado que pertenceu a um carrasco famoso
que já tentou envenenar o patrão
um livro de genealogia adulterado
uma porta pintada na parede que às vezes se abre
que fala com as plantas e elas respondem
uma lanterna com uma fada presa
o crânio de um antepassado em cima do armário
que sabe a senha dos túneis do rei
que ama um inimigo da família
um rolo de seda de uma caravana roubada
`)

export const X4_SECRETS_2 = lines(`
um mapa da cripta real desenhado de memória
que perdeu a fé há anos e continua pregando
um baú com uniformes da guarda
que é o dono verdadeiro da taverna
uma garrafa com a última respiração do avô
um bilhete de resgate nunca pago
que sabe quem incendiou a biblioteca
a espada de um cavaleiro que jurou morto
um irmão que serve aos orcs da serra
que a cicatriz no rosto foi feita pela própria mãe
um rubi engolido e guardado de volta
que comprou o cargo com ouro falso
uma lápide com o próprio nome
um velho acordo com os ladrões do porto
a localização de uma fonte de água mágica
que o filho foi trocado por um changeling
uma pena de pavão que mostra mentiras
que já usou o nome de outra pessoa
um pombo-correio que leva cartas para o inimigo
que guarda um troll ferido no celeiro
uma moeda que sempre volta para o bolso
a chave de uma torre que ninguém sabe que existe
que está noivo de duas pessoas ao mesmo tempo
um broche da guarda pessoal da rainha morta
uma lista de recrutas para a rebelião
que é capaz de ler mentes quando está bêbado
um feitiço que não sabe desfazer
o corpo de um mago mumificado no armário
que sabotou a ponte que caiu
uma família de ratos que obedecem a assobios
um punhal com o selo do arcebispo
que nasceu numa noite de eclipse e nunca contou
um anel com uma agulha envenenada
que a cicatriz é de um ritual de iniciação
o verdadeiro mapa das terras do conde
que foi trocado na maternidade
uma armadura que se move sozinha
a cópia de uma chave do convento
que a própria casa foi construída sobre um cemitério
uma criança prodígio escondida da academia de magia
que deve a alma a um demônio menor
uma colher que detecta veneno
que é o último sacerdote de um deus morto
uma garrafa de tinta invisível
que vende as próprias lágrimas a alquimistas
um ninho de fadas no forno do pão
que já foi preso por traição
um jogo de dados viciados
que o pai foi o carrasco da cidade
uma relíquia que está sendo procurada pelos inquisidores
um herbário com plantas proibidas
que o velho rei é seu avô
uma armadilha para lobisomens no quintal
a carta de rendição que nunca foi entregue
que pertence a uma ordem de cavaleiros dissolvida
um quadro que envelhece no lugar dele
que nunca esqueceu o rosto do assassino da mãe
uma espada partida que espera ser forjada de novo
que tem uma conta aberta com os anões
um esqueleto de dragão bebê
que o casamento é de fachada
um saquinho de pó que faz dormir
a guarda de uma criança fada
que deixou um companheiro para morrer
um caderno de rascunhos da muralha
que sabe onde estão as joias da coroa
um espelho que mostra o passado
que conhece um atalho para o castelo
um contrato de venda da própria sombra
que foi o primeiro a fugir na batalha
uma cicatriz de queimadura em forma de mão
a lealdade a um príncipe exilado
que tem um pombal cheio de corvos treinados
uma bolsa de moedas de outro mundo
que já matou um dragão pequeno e não conta a ninguém
uma noite inteira que não consegue lembrar
um anel do selo de um morto
que esconde refugiados na adega
uma fórmula para fazer ouro que só funciona às vezes
que tem um nome secreto dado pelas fadas
uma caixinha de música que acalma feras
que é o informante dos rebeldes
o ouro dos impostos de um ano inteiro
que trocou de lugar com o próprio irmão
um ovo de basilisco
que sonha com uma cidade que não conhece
uma marca de mordida de vampiro
que guarda os ossos de um santo no travesseiro
o testamento verdadeiro do barão
uma arma que já matou um rei
que sobreviveu a um naufrágio comendo os companheiros
um baú que não abre há gerações
que o próprio cavalo é um demônio domado
uma cópia das chaves da cidade
que já foi bispo
um feitiço de esquecimento usado no próprio irmão
que tem medo da própria sombra
a confissão de um assassino guardada num livro de orações
uma carta de corso assinada pelo rei
que deve um ano de trabalho a um gnomo
um rato de estimação que entende tudo
que perdeu um olho para um corvo
uma relíquia de uma santa que nunca existiu
que mantém o antigo carcereiro como refém
o mapa de um labirinto sob a catedral
que sabe ler o idioma das runas antigas
um pedaço do manto do rei sol
que é procurado em quatro reinos
uma flecha envenenada guardada há vinte anos
que tem um tesouro enterrado em cada cidade onde morou
uma poção de amor nunca usada
que o próprio nome é inventado
um selo mágico na porta do quarto
que já trabalhou para o assassino da rainha
uma carroça cheia de armas sob o feno
que lê as cartas dos clientes
um fio de cabelo de uma fada
que a mãe é uma dríade
uma ferradura que marca o caminho de casa
a localização da última fortaleza dos rebeldes
que tem a pele coberta de escamas
um juramento de lealdade a uma deusa do mar
um saco de terra do túmulo de um profeta
que nunca contou que é rico
uma tábua com o nome dos fundadores da cidade
que pertence ao povo do subsolo
um manuscrito sobre como derrubar muralhas
que está cego de um olho e ninguém percebeu
um medalhão com o retrato de uma rainha estrangeira
um gato que pode ver espíritos
que é sócio do agiota mais odiado da cidade
uma tumba de família vazia
a promessa feita ao pai moribundo de vingá-lo
uma carta que pode derrubar o conselho
um dente de serpente marinha
que tem uma doença que contagia pelo toque
que faz parte do conselho dos ladrões
uma ilha comprada com dinheiro sujo
uma vela que nunca se apaga
que fala dormindo nomes de pessoas que não conhece
a pele de um monstro raro
que entrega os vizinhos à inquisição
um livro com o nome de todos que já morreram na cidade
uma estátua da deusa com os olhos de rubi trocados por vidro
que já viveu como animal por um ano
uma lâmina feita de osso de dragão
que é a voz por trás do oráculo da cidade
um quarto cheio de relógios parados
que o último inverno foi culpa dele
uma garrafa com um navio de verdade dentro
um pergaminho de perdão real em branco
que é o pai do bebê da filha do prefeito
uma tiara de uma princesa desaparecida
que conhece um portal para o reino dos mortos
uma família inteira de anões vivendo no porão
que nunca recebeu o batismo
uma lista de traidores que inclui o próprio nome
um sino rachado de uma igreja afundada
que perdeu um dedo numa aposta com um troll
o nome real do monstro do lago
uma faca que só corta mentirosos
que tem uma tatuagem de um navio pirata
uma amizade com o dragão da montanha
que comanda a guilda dos mendigos
uma cesta com ovos de cocatriz
que sabe como abrir a porta do tesouro sem a chave
um pacote de cartas do rei para uma amante
um baralho marcado
que já foi casado sete vezes
uma pedra que sangra
a maldição do próprio sobrenome
que não tem reflexo no espelho
um caderno de feitiços roubado da academia
uma mancha de sangue que não sai do assoalho
que é o verdadeiro herdeiro do moinho
a raiz de uma árvore que fala
que é imune ao fogo
uma colônia de abelhas mágicas
um juramento quebrado a uma ordem de paladinos
um dossiê sobre o capitão da guarda
que dorme no túmulo da família uma vez por mês
um pedaço da muralha antiga com runas
que tem um filho entre os bandidos da estrada
uma roupa de festa manchada de sangue
o lugar onde está enterrado o tesouro da guerra
que ensinou magia proibida a um aprendiz
uma porta de ferro no fundo do poço
que conhece o assassino do bardo
um pote de mel que nunca acaba
que escreve as cartas anônimas da vila
um anel de prata com uma pedra que pulsa
que o lago da vila foi uma cidade
um cão que não envelhece
a única cópia de um tratado de paz
que jurou nunca mais pegar em armas
um poço que leva a uma caverna de cristais
que esconde a verdadeira cor do cabelo
um pássaro que repete o que ouve
que é o portador de uma doença que ninguém conhece
uma carta com o selo quebrado do papa do sol
que já foi capturado por gigantes
um coração de pedra que bate
uma carteira de couro com documentos de outra pessoa
que nunca matou ninguém, apesar da fama
uma arca com peles de lobisomem
que mudou o curso de um rio por magia
que deve impostos de dez anos
um sapo que fala nomes de mortos
uma criança que pode mover objetos com a mente
que é o dono do bordel do porto
uma lâmina que pertenceu a um deus
um colar que estrangula quem mente
que sabe o que existe sob a catedral
uma maleta de disfarces
que tem uma vida dupla como cantor mascarado
uma pedra que esquenta perto de ouro
o paradeiro do primeiro rei da cidade
que guarda o diário de um demônio
uma peça de xadrez que se move sozinha
que trocou o filho por riqueza
um caixão com terra de um país distante
que é parente distante do usurpador
um farol que sinaliza para piratas
`)

export const X4_TRAITS_1 = lines(`
ri de nervoso nas horas erradas
conta as moedas duas vezes antes de pagar
fala com os cavalos como se fossem gente
nunca senta de costas para a porta
cita provérbios que ninguém conhece
coleciona botões de casacos alheios
assobia quando mente
interrompe todo mundo para corrigir a gramática
cheira a comida antes de cada garfada
pede desculpas por tudo, até pelo tempo
dá apelidos a todos que conhece
esfrega as mãos quando pensa em dinheiro
fala de si na terceira pessoa
mexe no anel quando está com raiva
tem uma risada alta que assusta crianças
anota tudo num caderninho
desconfia de quem é educado demais
canta baixinho enquanto trabalha
morde o lábio antes de responder
fala alto com estrangeiros como se fossem surdos
nunca recusa uma aposta
guarda rancor por décadas
lembra o nome de cada pessoa que conhece
tem medo de gatos pretos
reza antes de cada refeição, mesmo na taverna
conta a mesma história de guerra toda noite
fica em silêncio quando está feliz
gesticula tanto que derruba copos
chama todo mundo de primo
odeia o cheiro de peixe
nunca diz não diretamente
fala devagar, como quem dita uma carta
tem um tique no olho quando mente
trata os criados com mais respeito que os nobres
está sempre comendo alguma coisa
coleciona penas de pássaros raros
fala em rimas quando bebe
tem pavor de água funda
dá conselhos que ninguém pediu
anda descalço sempre que pode
esconde comida nos bolsos
ri das próprias piadas antes de contar o final
fala com plantas
desmaia ao ver sangue
nunca olha nos olhos de ninguém
toca o amuleto antes de cada decisão
corrige o preço de tudo para mais caro
tem um sotaque que muda conforme o humor
não suporta silêncio
fica vermelho quando é elogiado
tem uma memória perfeita para ofensas
não sabe guardar segredos
faz contas de cabeça mais rápido que um ábaco
usa palavras difíceis de forma errada
fala com os mortos no cemitério
tem um assobio especial para chamar o cão
discute com o próprio reflexo
dorme de botas
bebe só água e olha feio para quem bebe vinho
trata qualquer criança como sobrinho
não come nada que tenha olhos
se ofende quando alguém fala do tempo
faz careta quando ouve música
desenha mapas em guardanapos
come de pé
nunca termina as frases
estala os dedos o tempo todo
gosta de ter a última palavra
chora em casamentos e ri em enterros
pede a bênção a todo velho que passa
cumprimenta as estátuas
fala baixo quando ameaça
nunca usa a mão esquerda
tem o hábito de cheirar livros velhos
conta as estrelas antes de dormir
não confia em quem não bebe
guarda as cascas de ovo
abraça todo mundo, até desconhecidos
tem as unhas sempre sujas de tinta
acha que todos estão conspirando
chama os cavalos pelo nome dos antigos reis
nunca entra numa casa pela porta dos fundos
trata a espada como uma pessoa
usa sempre a mesma roupa
fala sozinho quando conta dinheiro
odeia sinos
se curva demais ao cumprimentar
tem respostas prontas para tudo
mente sobre coisas sem importância
não aguenta ver injustiça e se mete em brigas
faz o sinal contra mau-olhado a cada estranho
dorme durante o dia
sabe imitar o canto de qualquer pássaro
come muito alho por medo de vampiros
anda sempre com um guarda-chuva
nunca aprendeu a assobiar e tenta mesmo assim
gosta de contar como as pessoas vão morrer
tem crises de riso em velórios
mexe no cabelo quando está nervoso
acha que pode prever o tempo pela dor no joelho
oferece chá a todo visitante
guarda cartas de todas as pessoas que conheceu
desafia qualquer um para uma queda de braço
pede segredo sobre coisas banais
fala com cachorros em voz de bebê
não sabe dizer a própria idade
tem o costume de bater na madeira
cospe antes de fechar um negócio
conta tudo para os gatos
evita pisar nas rachaduras do chão
discute política com qualquer um
xinga em três idiomas
tem uma voz de cantor e nunca canta
anda sempre com pressa
caminha em círculos quando pensa
fica olhando para o céu no meio da conversa
nunca bebe do mesmo copo duas vezes
se apresenta com um título que não tem
fala como se estivesse num palco
evita espelhos
tem medo de ser esquecido
come as refeições em silêncio total
gosta de consertar coisas que não estão quebradas
mexe nos objetos dos outros sem pedir
tem um caderno de poemas ruins
fala o que pensa sem medir as palavras
se veste como se fosse a um baile
odeia crianças, mas faz brinquedos para elas
anda com as mãos nas costas
ri baixo e de boca fechada
tem um cachimbo apagado sempre na boca
desconfia de quem tem dentes bonitos
repete a última palavra do outro
pede fiado e sempre paga
faz trocadilhos terríveis
odeia o próprio nome
dá de comer aos pombos da praça
se esconde quando alguém bate à porta
gosta de dormir ao relento
cumprimenta com uma reverência exagerada
fala dos falecidos como se estivessem vivos
coça a barba quando calcula
inventa histórias sobre a própria infância
não tolera desordem
deixa sempre uma moeda para os espíritos
pede conselho a uma caveira
é pontual até o segundo
nunca usa o mesmo caminho duas vezes
tem um pássaro no ombro
fala com a boca cheia
escreve cartas que nunca envia
sabe o preço de tudo e o valor de nada
nunca joga nada fora
põe sal em tudo
tem um medo irracional de ovelhas
cora quando mente
fala com a voz da mãe quando está bravo
detesta barulho de talheres
canta o hino da cidade natal quando bebe
olha para o chão ao andar
nunca agradece, mas sempre retribui
gosta de cheiro de chuva
anda com amuletos de três religiões
segura a respiração ao passar por cemitérios
não suporta que toquem em seu chapéu
afia a faca enquanto conversa
fala com estranhos como velhos amigos
desconfia de qualquer coisa de graça
morde as unhas
não sabe mentir sem gaguejar
dá gorjeta demais
se recusa a dormir em camas
fica furioso quando perde no jogo
chama os inimigos de senhor com toda a educação
anda sempre armado, até para ir ao mercado
cheira as pessoas ao cumprimentar
tem um caderno com o nome de quem lhe deve
nunca toma banho em dia de lua cheia
olha por cima do ombro a cada esquina
fala de comida o tempo todo
sabe todas as fofocas da cidade
nunca pergunta o nome de ninguém
conta piadas de enterro
tem orgulho excessivo das próprias cicatrizes
é gentil com animais e cruel com pessoas
faz tudo com a mão esquerda
gosta de dormir com a janela aberta no inverno
é incapaz de ficar parado
tem horror a dívidas
pede para ver as mãos de quem conhece
fala sempre da cidade grande onde morou
cuida das unhas como um nobre
tem um bordão para cada situação
nunca usa o nome dos deuses em vão, mas xinga muito
sorri sempre, mesmo quando ameaça
anda com um livro de orações que nunca abre
chama a espada de querida
fala do futuro como se lembrasse dele
tem uma tosse que piora quando mente
procura moedas no chão por onde passa
come só pão e queijo
nunca levanta a voz
deixa recados escritos para tudo
põe apelido nas armas
ronca tão alto que acorda a taverna
sempre sabe onde fica a saída
anda com um gato dentro do casaco
se emociona com qualquer canção
tem um medo terrível de agulhas
ri de tudo com um ar triste
come com as mãos, mesmo nos banquetes
tem um porte de soldado, mesmo sem nunca ter sido
cobra por qualquer favor
fala demais quando está com medo
faz promessas que não pode cumprir
grita com os deuses quando chove
`)

/**
 * Algumas listas são, por natureza, uma peça mais outra (uma marca e o lugar do corpo, um objeto e o material). Nelas
 * as duas partes são escritas à mão e só se juntam as que combinam; cada resultado é uma opção diferente.
 */
export const combine = (heads: string[], tails: string[], join = " "): string[] => heads.flatMap((head) => tails.map((tail) => `${head}${join}${tail}`))

const MARKS = lines(`
uma cicatriz fina
uma cicatriz de queimadura
uma tatuagem de âncora
uma tatuagem de corvo
uma tatuagem de serpente
uma tatuagem de rosa
uma tatuagem de olho aberto
uma tatuagem de lua crescente
uma tatuagem de chave
uma tatuagem de caveira sorridente
uma tatuagem de runas desbotadas
uma tatuagem com o nome de alguém
uma mancha de nascença em forma de folha
uma mancha de nascença vermelha
uma verruga peluda
uma marca de ferro em brasa
uma cicatriz de mordida
uma cicatriz em forma de cruz
uma pinta escura
um corte mal costurado
uma tatuagem de navio
uma tatuagem de escorpião
uma tatuagem de estrela de oito pontas
uma mancha de tinta que não sai
`)
const BODY = lines(`
no queixo
na bochecha esquerda
no pescoço
na nuca
no antebraço
nas costas da mão
no dorso da mão direita
no ombro
acima da sobrancelha
atrás da orelha
no pulso
na testa
no peito, que aparece pela gola
no dedo anelar
na palma da mão
na têmpora
`)

export const X4_LOOKS_1 = combine(MARKS, BODY)

export const X4_LOOKS_2 = lines(`
cabelo branco desde muito jovem
olhos de cores diferentes
um nariz quebrado mais de uma vez
dentes de ouro na frente
sobrancelhas grossas que se juntam
uma orelha com a ponta cortada
mãos calejadas de remar
um bigode encerado nas pontas
cabelo trançado com contas de vidro
uma barba ruiva até o peito
um chapéu de abas largas com uma pena
um casaco remendado de cinco cores
botas novas demais para o resto da roupa
um colar de dentes de lobo
um tapa-olho de couro bordado
um sorriso sem os dentes da frente
unhas pintadas de preto
pele queimada de sol e sal
cabeça raspada e brilhante
cachos ruivos presos num lenço
uma bengala com cabo de prata
um manto de peles de raposa
óculos de lentes grossas e redondas
uma perna de pau entalhada
cabelo grisalho preso num coque
um olhar fixo que não pisca
mãos sempre enfaixadas
uma voz rouca de quem gritou demais
roupas pretas de luto antigo
um cinto cheio de bolsinhos
um brinco de argola numa orelha só
um rosto marcado de varíola
cílios longos e olhos tristes
cabelo comprido e mal cortado
um gorro de lã com orelhas
anéis em todos os dedos
um avental manchado de sangue de açougue
um capuz que nunca tira
dedos manchados de tinta
uma pele muito pálida, quase azul
um sorriso largo e sincero
cabelo raspado dos lados
roupas finas e gastas de um nobre arruinado
um cheiro forte de ervas
uma capa de viagem com lama até os joelhos
uma armadura de couro velha demais
mãos pequenas e rápidas
um corpo enorme e uma voz baixinha
o rosto sempre sujo de fuligem
um lenço de seda no pescoço
uma coroa de flores secas na cabeça
olhos fundos de quem não dorme
uma tosse que nunca passa
cabelo preso com uma faca
roupas de cores vivas e desbotadas
uma mão de ferro
pés descalços e calejados
uma cara de bebê apesar da idade
um sorriso torto
um pescoço cheio de amuletos
sardas por todo o rosto
cabelo prateado e pele morena
um nariz adunco
as costas curvadas como um anzol
um olhar de águia
uma barriga redonda e risonha
uma jaqueta de couro cheia de tachas
roupas de sacerdote sob um casaco de soldado
cabelos azulados por alguma tintura
uma faixa de luto no braço
dentes limados em ponta
um gorro de marinheiro
uma luva só, sempre na mão direita
um brasão costurado ao contrário no peito
orelhas de abano
olhos amarelos como os de um gato
uma voz aguda que não combina com o tamanho
um rosto sem rugas e mãos de velho
o cabelo cortado com faca
um cachecol de tricô que alguém fez com amor
botas de montaria muito engraxadas
uma capa vermelha desbotada
roupas de camponês e modos de nobre
o rosto pintado de branco
uma flor sempre presa na lapela
um olho vazado e uma pálpebra costurada
um corte de cabelo militar
uma cicatriz que faz um sorriso permanente
um rosto magro e anguloso
pulseiras de couro até os cotovelos
um chapéu pontudo de feltro
um cajado com sinos
um olhar sonolento
uma postura de quem carrega peso
`)

export const X4_PROFESSIONS_1 = pairs(`
amolador de facas|amoladora de facas
apicultor|apicultora
arqueiro da guarda|arqueira da guarda
armeiro|armeira
arreeiro|arreeira
astrólogo|astróloga
bibliotecário|bibliotecária
cervejeiro|cervejeira
charuteiro|charuteira
cirurgião-barbeiro|cirurgiã-barbeira
cocheiro|cocheira
coletor de impostos|coletora de impostos
confeiteiro|confeiteira
coveiro|coveira
criador de cavalos|criadora de cavalos
curtidor de couro|curtidora de couro
domador de feras|domadora de feras
encadernador|encadernadora
entalhador|entalhadora
falcoeiro|falcoeira
fazendeiro|fazendeira
fiandeiro|fiandeira
funileiro|funileira
guarda-caça|guarda-caça
guia de montanha|guia de montanha
herborista|herborista
iluminador de manuscritos|iluminadora de manuscritos
joalheiro|joalheira
lenhador|lenhadora
lavadeiro|lavadeira
leiloeiro|leiloeira
luthier|luthier
malabarista|malabarista
marceneiro|marceneira
mestre de obras|mestra de obras
mineiro|mineira
oleiro|oleira
ourives|ourives
parteiro|parteira
perfumista|perfumista
pintor de igrejas|pintora de igrejas
pregoeiro|pregoeira
queijeiro|queijeira
relojoeiro|relojoeira
remendão|remendona
salineiro|salineira
seleiro|seleira
serralheiro|serralheira
sineiro|sineira
tanoeiro|tanoeira
tecelão|tecelã
telhadista|telhadista
tintureiro|tintureira
tosquiador|tosquiadora
tropeiro|tropeira
vidraceiro|vidraceira
vinhateiro|vinhateira
alquimista ambulante|alquimista ambulante
apanhador de sanguessugas|apanhadora de sanguessugas
caçador de ratos|caçadora de ratos
caçador de recompensas|caçadora de recompensas
caçador de bruxas|caçadora de bruxas
cartomante|cartomante
carteiro real|carteira real
cronista da corte|cronista da corte
contador de histórias|contadora de histórias
espião aposentado|espiã aposentada
exorcista|exorcista
faroleiro|faroleira
fabricante de velas|fabricante de velas
fabricante de brinquedos|fabricante de brinquedos
fabricante de mapas|fabricante de mapas
fabricante de flechas|fabricante de flechas
guardião de biblioteca|guardiã de biblioteca
guardião de cripta|guardiã de cripta
lutador de arena|lutadora de arena
mestre de esgrima|mestra de esgrima
negociante de relíquias|negociante de relíquias
pescador de pérolas|pescadora de pérolas
professor de dança|professora de dança
rastreador|rastreadora
sapador|sapadora
taxidermista|taxidermista
tradutor|tradutora
vendedor de amuletos|vendedora de amuletos
vigia de muralha|vigia de muralha
zelador do templo|zeladora do templo
acrobata|acrobata
adestrador de cães|adestradora de cães
agrimensor|agrimensora
alfaiate|alfaiata
almocreve|almocreve
amanuense|amanuense
apostador profissional|apostadora profissional
arquivista|arquivista
arrumador de defuntos|arrumadora de defuntos
assador de castanhas|assadora de castanhas
barbeiro|barbeira
benzedeiro|benzedeira
boticário ambulante|boticária ambulante
calceteiro|calceteira
cambista|cambista
canteiro|canteira
carpinteiro naval|carpinteira naval
carroceiro|carroceira
catador de cogumelos|catadora de cogumelos
chaveiro|chaveira
cordoeiro|cordoeira
cozinheiro de navio|cozinheira de navio
curandeiro de cavalos|curandeira de cavalos
desenhista de brasões|desenhista de brasões
destilador|destiladora
escultor|escultora
estalajadeiro|estalajadeira
estivador|estivadora
feirante|feirante
ferrador|ferradora
forneiro|forneira
garimpeiro|garimpeira
gravador de moedas|gravadora de moedas
guarda de ponte|guarda de ponte
hortelão|horteloa
intérprete|intérprete
jardineiro do palácio|jardineira do palácio
limpador de chaminés|limpadora de chaminés
mascate|mascate
mensageiro a cavalo|mensageira a cavalo
mestre de cerimônias|mestra de cerimônias
mestre de cães|mestra de cães
moedeiro|moedeira
músico de rua|música de rua
navegador|navegadora
notário|notária
ourives de prata|ourives de prata
pajem|pajem
peleteiro|peleteira
pintor de retratos|pintora de retratos
porteiro do castelo|porteira do castelo
prestamista|prestamista
quiromante|quiromante
recitador|recitadora
remador de galé|remadora de galé
salteador arrependido|salteadora arrependida
sangrador|sangradora
sapateiro|sapateira
soprador de vidro|sopradora de vidro
tabelião|tabeliã
tamborileiro|tamborileira
torneiro|torneira
tratador de grifos|tratadora de grifos
vendedor de mapas falsos|vendedora de mapas falsos
vendedor de relíquias falsas|vendedora de relíquias falsas
vidente de feira|vidente de feira
viajante a soldo|viajante a soldo
vinagreiro|vinagreira
xerife do condado|xerife do condado
aguadeiro|aguadeira
bordadeiro|bordadeira
camareiro|camareira
carcereiro|carcereira
cavalariço|cavalariça
chapeleiro|chapeleira
contrabandista de livros|contrabandista de livros
copista|copista
cozinheiro da corte|cozinheira da corte
eremita|eremita
espadachim de aluguel|espadachim de aluguel
estudante de magia|estudante de magia
fabricante de máscaras|fabricante de máscaras
feiticeiro de aldeia|feiticeira de aldeia
fundidor de sinos|fundidora de sinos
ilusionista|ilusionista
inventor|inventora
leiteiro|leiteira
mendigo profissional|mendiga profissional
monge copista|monja copista
oráculo de aldeia|oráculo de aldeia
peregrino|peregrina
pescador de enguias|pescadora de enguias
pirata aposentado|pirata aposentada
porqueiro|porqueira
quitandeiro|quitandeira
sacristão|sacristã
sentinela|sentinela
sinaleiro|sinaleira
taberneiro do porto|taberneira do porto
tocador de gaita|tocadora de gaita
vaqueiro|vaqueira
vendedor de sonhos|vendedora de sonhos
ventríloquo|ventríloqua
zoólogo amador|zoóloga amadora
caçador de dragões aposentado|caçadora de dragões aposentada
domador de serpentes|domadora de serpentes
ladrão de túmulos|ladra de túmulos
mestre de navio|mestra de navio
cartógrafo do rei|cartógrafa do rei
corsário|corsária
druida|druida
herdeiro deserdado|herdeira deserdada
lanterneiro|lanterneira
moleiro de vento|moleira de vento
pastor de cabras|pastora de cabras
pescador de baleias|pescadora de baleias
recolhedor de ossos|recolhedora de ossos
semeador|semeadora
vigário|vigária
`)

const WARES = lines(`
tecidos de lã
peças de seda
facas de cozinha
potes de mel
sementes de hortaliça
ferraduras
pregos de ferro
botões de osso
fitas coloridas
cordas de cânhamo
sabão de cinzas
velas de sebo
pentes de chifre
agulhas e linhas
garrafas de vidro
mapas de estrada
livros usados
tintas para tecido
especiarias moídas
peixe salgado
queijos curados
frutas secas
couro curtido
botas remendadas
chapéus de palha
cestos de vime
panelas de cobre
lanternas de lata
amuletos de sorte
ervas medicinais
pedras de amolar
brinquedos de madeira
instrumentos de corda
penas de escrever
pergaminhos em branco
sal grosso
chás de ervas
bálsamos para feridas
vinhos baratos
tapetes pequenos
cachimbos de barro
anzóis e redes
selas usadas
espelhos de bolso
relíquias de santos
`)
const ORIGINS = lines(`
da costa leste
das ilhas do sul
das montanhas dos anões
de uma caravana desaparecida
do mercado negro do porto
de um convento falido
da capital
das aldeias do pântano
de um navio naufragado
do outro lado do deserto
de um castelo saqueado
das feiras do norte
de procedência duvidosa
de um reino que já não existe
`)

export const X4_MERCHANT_WARES_1 = combine(WARES, ORIGINS)

export const X4_MERCHANT_QUIRKS_1 = lines(`
pesa tudo numa balança que sempre favorece o freguês
recita a origem de cada peça como se fosse um poema
só vende a quem souber dizer uma piada
pede o nome do cliente para anotar num livro grosso
dá um brinde a cada compra, mesmo que inútil
nunca aceita a primeira oferta, nem a própria
fecha a barraca quando chove sem avisar ninguém
fala mal de todos os outros mercadores da feira
tem um papagaio que anuncia os preços
cobra mais caro de quem tem botas novas
fica ofendido quando alguém pede desconto
oferece chá enquanto o cliente pensa
jura que cada objeto pertenceu a um rei
morde as moedas para ver se são verdadeiras
deixa as crianças levarem doces de graça
anota as dívidas na parede com carvão
nunca diz o preço antes de olhar o freguês de cima a baixo
troca qualquer coisa por notícias de outras cidades
canta para atrair clientes, e canta mal
tem um cão que rosna para caloteiros
põe o dedo na boca e levanta para sentir o vento antes de vender
vende fiado só para quem tem cara de honesto
só abre a barraca depois do meio-dia
leva tudo numa carroça puxada por um bode
diz que a mercadoria está encantada sem que esteja
garante devolução, mas nunca está no mesmo lugar
dá descontos a quem chega montado em mula
recusa-se a vender em dias de lua nova
paga em moedas estrangeiras quando dá troco
faz contas em voz alta e erra de propósito
afirma que já esteve em todos os reinos do mapa
tem medo de clientes com chapéu
embrulha tudo em páginas de livros velhos
dá conselhos amorosos junto com o troco
tem uma tabela de preços diferente para elfos e anões
pede para o cliente tocar num amuleto antes de pagar
nunca olha nos olhos ao dizer o preço
oferece garantia de cem anos em tudo
faz careta a cada moeda de cobre
vende só o que cabe numa mão
conhece o preço de tudo no mercado de cabeça
faz o cliente esperar enquanto termina de comer
tem sempre uma história triste para justificar o preço
pede referência de outro cliente antes de vender coisa cara
grita os preços tão alto que a praça inteira ouve
fecha negócio com um aperto de mão e um gole de aguardente
recusa dinheiro de guarda e de padre
tem uma filha que cuida das contas e corrige o pai em público
vende a mesma peça duas vezes se puder
oferece o artigo mais caro primeiro, sempre
tem uma voz rouca de tanto anunciar
não vende para quem pechincha demais
dá um abraço em cada cliente que volta
cobra pela informação, não pela mercadoria
fala só por gestos e cartazes
tem um assistente que é um goblin muito educado
vende com uma lupa para o freguês conferir a qualidade
nunca sai de trás da banca, nem para pegar o que caiu
só aceita pagamento antes do sol se pôr
inventa nomes impressionantes para coisas comuns
recebe os clientes com a mesma frase há trinta anos
paga uma rodada a quem gasta muito
tem um caderno com o gosto de cada freguês
fica desconfiado de quem paga sem reclamar
promete trazer o que faltar na próxima lua
viaja com a família inteira na carroça
diz que os preços mudam com o humor dos deuses
segura a mercadoria até o último segundo, como quem se despede
tem um sino na porta que toca sozinho quando entra um ladrão
aceita poemas como pagamento em dias de festa
põe preço em tudo, até no banco onde senta
mede tudo com o próprio braço
anuncia que está falindo há dez anos
desconfia de moedas novas demais
cheira cada moeda que recebe
oferece um copo de vinho para fechar negócio grande
mantém um baú trancado com o que não está à venda
diz que cada peça tem alma e pede que cuidem bem dela
faz o freguês jurar que não vai revender
nunca vende a última unidade
pergunta para que o cliente vai usar e às vezes se recusa a vender
espalha incenso na barraca para disfarçar o cheiro de mofo
tem uma risada contagiante que ajuda a vender
fecha a loja para rezar três vezes ao dia
vende a peso de ouro coisas que achou no lixo
dá de presente um nó de corda para dar sorte
anota no braço quem lhe deve
paga os ladrõezinhos da praça para vigiar a barraca
afirma ser parente de um mercador famoso
pede ajuda ao cliente para carregar caixas
manda recados por pombo para outros mercadores
abaixa o preço se o cliente elogiar o bigode
nunca vende para quem chega com pressa
tem um contrato com cada vendedor da cidade
confunde o nome de todos os clientes
faz o troco em balas de goma
garante que nada do que vende é roubado, sem que ninguém pergunte
promete milagres e entrega coisas boas
mantém a barraca mais arrumada da feira
deixa o cliente experimentar tudo
fecha o negócio só depois de um jogo de dados
chora ao vender a peça preferida
tem uma rival na barraca em frente
assobia uma melodia diferente para cada mercadoria
vende embrulhado em seda até o que é barato
sempre pergunta se o cliente quer comprar mais uma coisa
`)
