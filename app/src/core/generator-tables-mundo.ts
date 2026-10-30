/**
 * Mais opções para os geradores de tesouro, clima, aventura, lugares, itens, facções, divindades, masmorras, lendas e
 * mercadores (beta.22). Uma opção por linha; `generator-tables.ts` junta estas listas às dele.
 */
import { lines } from "./generator-tables-pessoas"

export const MORE_COIN_AMOUNTS = [1, 2, 5, 9, 15, 21, 28, 36, 45, 60, 80, 90, 120, 250, 400, 640, 800, 1000]
export const MORE_COIN_KINDS = lines(`
moedas de electro
moedas de bronze furadas no meio
moedas de prata cunhadas por um usurpador
dobrões de ouro de navio afundado
moedas de cobre esverdeadas
peças de prata élficas, finas como folhas
moedas anãs quadradas
moedas de chumbo pintadas de ouro
pepitas de ouro em bruto
contas de vidro usadas como moeda no sul
`)

export const MORE_TRINKETS = lines(`
um pente de marfim com um dente faltando
uma luva de criança bordada
um espelho de bolso rachado
uma flauta de osso
um sino de prata sem badalo
uma caixa de música que toca uma valsa triste
um botão de casaco com brasão real
uma estatueta de sapo em jade
uma ampulheta com areia preta
um lenço com iniciais bordadas
um cachimbo de espuma do mar
uma moeda furada num cordão
um anel de noivado partido ao meio
um ídolo de pedra com três olhos
uma pedra lisa que flutua na água
um frasco de tinta que nunca seca
um selo de cera com um símbolo desconhecido
uma colher de prata entortada
um par de dados de marfim
uma vela que cheira a rosas
uma bolsa de couro com sal grosso
um mapa desenhado num guardanapo
uma chave de prata minúscula
um olho de vidro azul
uma corrente com um elo de ouro
um retrato em miniatura de uma dama
um amuleto de ferro contra fadas
uma ponta de flecha de obsidiana
um berrante de chifre de touro
uma tiara de cobre com pedras falsas
uma lupa de cristal
um cálice de madeira entalhado
uma faca de mesa com cabo de chifre
um pingente com uma mecha de cabelo
uma estrela de mar seca
uma coleção de botões de uniforme
um broche em forma de abelha
um sino de vaca de ouro
um medalhão vazio
um rosário de contas de âmbar
uma escama de dragão do tamanho de uma mão
um lacre com o selo de um bispo
uma concha que imita o mar quando encostada no ouvido
uma tesoura de prata
uma pulseira de couro trançado
um apito de osso que só os cães ouvem
uma pedra de amolar gravada com runas
uma figura de chumbo de um cavaleiro
uma garrafa com um navio dentro
uma luneta pequena
um tinteiro de cristal
um par de óculos com uma lente azul
um amuleto de dente de lobo
um nó de marinheiro feito de fio de ouro
um bracelete de prata com nomes gravados
uma máscara de festa com penas
um cálice de vidro verde
um anel com uma pedra que muda de cor
um carretel de linha dourada
uma bússola que aponta para o sul
um cristal que zumbe baixinho
um par de luvas de seda
um cinto com fivela de dragão
um amuleto de prata em forma de lua
um peão de xadrez de ébano
um saco de bolinhas de gude
uma carta de baralho de ouro
um pequeno cofre sem chave
um pente de casco de tartaruga
uma estátua de gato egípcio
um pergaminho em branco que não molha
um broche com um olho pintado
uma ponta de lança cerimonial
um apito de prata de contramestre
uma caixa de rapé com tampa esmaltada
uma pena de escrever de ganso dourada
uma tiara de flores secas
uma réplica de coroa em latão
uma placa de identificação de soldado
um ovo de pedra pintado
um sabonete perfumado embrulhado em papel fino
um relógio de bolso parado às três
uma pulseira de dentes de tubarão
uma estatueta de deusa da fertilidade
um rolo de corda de seda
um anel de sinete com uma serpente
um fósforo de alquimista que acende na água
um medalhão com o retrato de um personagem
um broche de guilda dos ourives
uma lanterna de papel dobrada
uma bolsa de tabaco de pele de foca
uma ferradura de prata
uma pedra-da-lua do tamanho de uma noz
um colar de pérolas negras com uma faltando
um cálice com a inscrição “ao traidor”
`)

export const MORE_TREASURE_EXTRAS = lines(`
um testamento que deserda o filho mais velho
uma lista de nomes riscados
um mapa estelar com uma constelação a mais
o diário de bordo de um navio pirata
uma carta de recomendação para a corte
a senha de uma reunião secreta
um recibo de compra de um escravo
um contrato de casamento nunca assinado
a planta de uma fortaleza inimiga
uma receita de poção com um ingrediente ilegível
um bilhete de amor endereçado a um padre
a localização de uma fonte de águas curativas
um mapa com um X e a palavra “não”
um retrato de família com um rosto raspado
uma carta de crédito de um banco anão
o registro de nascimento de um bastardo real
um pedido de socorro escrito com sangue
uma escritura de terras em outro reino
um salvo-conduto assinado por um rei morto
uma página arrancada de um grimório
a última vontade de um mago
uma partitura com notas impossíveis
um enigma que leva a outro tesouro
um mapa de túneis sob o castelo
uma carta de um espião para o inimigo
o nome do verdadeiro assassino
uma lista de compras de um necromante
um tratado de paz nunca enviado
a confissão de um falsificador
um passe para a biblioteca proibida
o desenho de uma máquina estranha
a chave de um cofre de banco com o número gravado
um mapa marítimo com uma ilha que não existe
um contrato com um demônio, já assinado
uma carta que prova que o prefeito é impostor
a combinação de uma fechadura de anões
um convite para o casamento de um dragão
uma promissória de cem moedas de ouro
um diário de pesquisa sobre uma doença
um contrato de mercenários com nomes conhecidos
uma carta de alforria em branco
o selo de uma guilda extinta
um mapa da rota de caravanas de ouro
um pedido de desculpas de um vilão
a genealogia de uma casa nobre com um erro proposital
a lista de membros de um culto
uma ordem de prisão contra um dos personagens
um papel com a localização de um portal
a receita de uma cerveja lendária
uma carta selada para ser aberta após a morte
o título de propriedade de uma taverna
uma lista de clientes de um assassino
um acordo de contrabando com a guarda
o horário de troca da guarda do palácio
um mapa de uma mina abandonada
uma carta de um fantasma para a esposa viva
a prova de que a relíquia do templo é falsa
uma nota com a frase “ele sabe”
um poema que é, na verdade, um código
um bilhete com a letra de um dos personagens
um mapa de onde caiu uma estrela
uma carta de baralho marcada com um nome
um documento de anistia em nome de um bandido
o plano de fuga de uma prisão
uma ordem de execução nunca cumprida
a cópia de uma chave em cera
uma carta de amor entre duas casas inimigas
o desenho de uma tatuagem que abre portas
um bilhete de passagem de navio para amanhã
uma lista de subornos pagos a um juiz
a localização do esconderijo de um dragão filhote
um livro de contas de um bordel com nomes famosos
uma lista de testemunhas mortas
o nome de um deus esquecido
um contrato de aprendiz com um mago
uma carta que pede para não confiar em ninguém
um mapa de um labirinto de sebes
o selo do tesoureiro real
um certificado de nobreza vendido
`)

export const MORE_WEATHER: Record<string, string[]> = {
  Primavera: lines(`
Garoa que vem e vai o dia todo.
Arco-íris duplo depois da chuva da manhã.
Céu nublado e ar parado; cheiro de terra molhada.
Vento morno do sul derrete a última neve.
Tempestade rápida de granizo pequeno.
Manhã de orvalho grosso; dia ensolarado.
Neblina no rio até o meio-dia.
Rajadas de vento derrubam galhos novos.
Chuva forte à noite; rios cheios pela manhã.
Calor fora de época; insetos por toda parte.
Céu limpo e noite estrelada fria.
Nuvens baixas e chuvisco constante.
Sol entre nuvens; sombra fresca.
Trovões ao longe que nunca chegam.
Geada tardia que queima os brotos.
Chuva de pólen amarelo cobre tudo.
Vento frio do norte volta por um dia.
Tarde abafada; tempestade ao anoitecer.
Dia claro e ventoso, bom para viajar.
Lama nas estradas depois de três dias de chuva.
Céu cor de pérola e garoa fina.
Manhã fria, tarde quente, noite fria de novo.
Enchente nos campos baixos.
Bruma rosada ao nascer do sol.
Chuva de verão adiantada, quente e rápida.
`),
  Verão: lines(`
Calor seco que racha a terra.
Noite abafada; ninguém consegue dormir.
Tempestade elétrica no fim da tarde.
Sol forte e nenhuma nuvem.
Vento quente do deserto traz poeira.
Chuva quente e rápida que evapora em minutos.
Neblina de calor nas estradas.
Seca: o rio baixou um palmo.
Brisa do mar refresca a costa.
Céu alaranjado de fumaça de incêndios distantes.
Calor úmido; roupas grudam no corpo.
Noite fresca e céu cheio de estrelas cadentes.
Trovoada forte com rajadas de vento.
Manhã fresca, meio-dia escaldante.
Nuvens altas e finas; sol fraco.
Granizo grande destrói plantações.
Mormaço; o ar parece pesado.
Vento constante do oeste.
Tempestade de areia na planície.
Dia longo e claro; anoitece tarde.
Pancadas de chuva isoladas pela região.
Ar parado; o cheiro do pântano chega à vila.
Luar tão forte que dá para ler à noite.
Calor que faz o asfalto das estradas romanas brilhar.
Céu nublado e abafado; chuva que não vem.
`),
  Outono: lines(`
Vento forte arranca as folhas das árvores.
Chuva fria e persistente.
Manhã de neblina densa; não se vê a dez passos.
Céu cinzento o dia inteiro.
Sol fraco e ar fresco, bom para caminhar.
Tempestade de outono com ventos uivantes.
Noite fria com lua cheia vermelha.
Garoa gelada ao entardecer.
Folhas secas cobrem as estradas.
Vento do norte traz cheiro de neve.
Chuva forte faz o rio transbordar.
Tarde dourada e sem vento.
Nevoeiro que sobe do lago ao anoitecer.
Céu limpo e noite muito fria.
Rajadas frias e nuvens rápidas.
Chuva de granizo miúdo.
Dias curtos; escurece cedo.
Ar úmido e cheiro de lenha queimada.
Céu cor de chumbo e silêncio.
Vento que assobia nas frestas a noite toda.
Garoa fina e lama até os tornozelos.
Manhã clara e gelada.
Nuvens baixas encobrem as montanhas.
Primeira neve fina nos picos.
`),
  Inverno: lines(`
Nevasca que fecha as estradas.
Neve fofa caindo devagar.
Chuva congelante cobre tudo de gelo.
Vento gelado que corta a pele.
Neblina congelada nas árvores.
Sol fraco refletido na neve.
Noite polar; a respiração congela.
Degelo breve; lama e água por toda parte.
Tempestade de neve com raios.
Lago congelado firme o bastante para atravessar.
Granizo e vento forte.
Dia cinzento e neve suja.
Ventania que derruba telhados.
Céu estrelado e silêncio absoluto.
Geada grossa nas janelas.
Neve até os joelhos.
Avalanche nas montanhas próximas.
Garoa gelada à tarde.
Nuvens pesadas prometem neve.
Frio úmido que entra nos ossos.
Neve derretendo nos telhados; pingentes de gelo.
Manhã brilhante depois da nevasca.
Aurora colorida no céu do norte.
Ventos que trazem uivos de lobos.
`),
}

export const MORE_ENCOUNTERS = lines(`
Atravessar um rio cheio numa balsa velha
Desarmar uma armadilha numa sala que se fecha
Convencer um dragão jovem a não queimar a vila
Sobreviver a uma emboscada num desfiladeiro
Ganhar uma corrida de cavalos contra trapaceiros
Libertar prisioneiros de um acampamento de orcs
Resolver um enigma de uma esfinge
Defender uma ponte contra uma horda
Negociar com uma rainha das fadas caprichosa
Escapar de uma cidade em quarentena
Caçar uma fera que ataca à noite
Atravessar um campo minado de runas
Encontrar a saída de um labirinto vivo
Domar um cavalo selvagem para atravessar o deserto
Proteger um mago durante um ritual
Recuperar um ovo de grifo do ninho
Resistir a um cerco por uma noite
Apostar a alma num jogo de cartas com um diabo
Sobreviver a uma tempestade no mar
Descer um poço sem fundo aparente
Capturar um ladrão nos telhados
Atravessar uma floresta onde as árvores andam
Ganhar a confiança de uma tribo desconfiada
Escoltar um prisioneiro até a capital
Derrotar um campeão num duelo de honra
Salvar crianças de uma casa em chamas
Resolver um assassinato numa estalagem isolada pela neve
Encontrar um antídoto antes do fim do dia
Atravessar um pântano de mortos-vivos
Escalar um penhasco sob ataque de harpias
Desmascarar um metamorfo no conselho
Roubar um documento de um cofre vigiado
Ganhar um torneio de arco e flecha
Parar um ritual num cemitério
Atravessar uma ponte de cordas sobre um abismo
Sobreviver a uma noite numa casa assombrada
Encontrar um navio fantasma em meio ao nevoeiro
Expulsar um espírito de uma criança
Negociar a libertação de reféns com bandidos
Proteger uma aldeia de um ataque de lobos
Navegar por um rio subterrâneo
Impedir uma rebelião numa mina
Encontrar um guia nas montanhas geladas
Desativar um autômato enlouquecido
Atravessar um deserto sem água suficiente
Enfrentar um troll que cobra pedágio
Descobrir quem sabota a caravana
Atravessar o território de um gigante sem acordá-lo
Recuperar um tesouro de um naufrágio
Sobreviver a uma revolta de escravos num navio
Interromper um casamento forçado
Resgatar um nobre sequestrado por piratas
Resolver uma disputa de terras entre elfos e humanos
Atravessar um portal instável
Escapar de um terremoto numa caverna
Achar a entrada de uma tumba no deserto
Libertar um espírito preso num espelho
Ganhar uma competição de bebida contra um anão
Defender uma torre de um ataque aéreo
Atravessar a cidade durante um toque de recolher
Encontrar o traidor dentro do grupo de mercenários
Domar a fúria de um elemental de fogo
Proteger um festival de um atentado
Reunir provas para um julgamento
Fugir de um caçador de recompensas implacável
Destruir uma ponte para atrasar um exército
Convencer um conselho de anciãos teimosos
Atravessar uma nevasca até um mosteiro
Sobreviver a uma praga de insetos gigantes
Achar uma pessoa perdida numa feira enorme
Recuperar um livro de uma biblioteca viva
Despistar um exército inteiro na floresta
Libertar um dragão acorrentado
Encontrar a cura para um rei envenenado
Ganhar uma aposta contra o dono de um cassino
Impedir que uma represa estoure
Escapar de uma arena de gladiadores
Explorar uma torre que muda de andares
Dialogar com uma árvore antiga e sábia
Resolver uma rixa de gangues no porto
Atravessar um campo de batalha ativo
Recuperar um animal de estimação de um nobre
Descobrir quem envenena o poço da vila
Investigar desaparecimentos num circo
Sobreviver a um julgamento por combate
Escoltar uma noiva até o casamento
Achar a entrada de um reino subterrâneo
Interromper a coroação de um usurpador
Atravessar um mar de nuvens num navio voador
Achar o ninho de uma serpente marinha
Proteger um embaixador durante as negociações
Salvar um vilarejo de uma enchente
Enganar um demônio num contrato
Atravessar uma floresta encantada sem sair da trilha
Vencer um debate de sábios para conseguir um livro
`)

export const MORE_TWISTS = lines(`
O vilão estava tentando salvar a cidade.
O tesouro já foi gasto há anos.
O pedido de ajuda era uma armadilha.
O mentor dos heróis é o responsável.
O monstro é, na verdade, uma pessoa amaldiçoada.
A princesa sequestrada fugiu por vontade própria.
O rei está morto há meses e ninguém sabe.
O mapa foi desenhado para enganar.
O profeta inventou a profecia.
A missão era só uma distração para outro crime.
O grupo foi contratado pelos dois lados.
O aliado está sob controle mental.
A cidade inteira está sob um feitiço.
O artefato é a prisão de um demônio.
O inimigo é um dos personagens do futuro.
A vítima ainda está viva.
O guarda-costas é o assassino.
O contratante morreu antes de contratá-los.
O ritual precisa ser completado para evitar algo pior.
A relíquia sagrada é uma arma.
O monstro é a última da espécie, com filhotes.
A carta de ajuda foi escrita pelo próprio vilão.
O lugar sagrado é construído sobre uma tumba maldita.
O tesouro está amaldiçoado e já marcou os personagens.
O suposto morto forjou a própria morte.
A recompensa é uma dívida disfarçada.
O espião era uma criança.
O dragão é o protetor da região.
O culto quer impedir o fim do mundo, não causá-lo.
O nobre que os contratou é o verdadeiro bandido.
O mago vilão é um ex-aprendiz do mentor do grupo.
A cura tem um preço terrível.
A traição foi ordenada pelo rei.
O fantasma não sabe que morreu.
O culpado é o mais simpático da vila.
O portal leva para o passado da própria cidade.
A guerra foi armada por mercadores.
A testemunha foi paga para mentir.
O vilão é irmão gêmeo de um aliado.
A espada lendária está quebrada.
O resgate exige trocar um dos personagens.
A pista final foi plantada por um rival.
A cidade não quer ser salva.
O herói lendário era um covarde.
O deus da região está morrendo.
O livro proibido é o diário de um personagem.
A fortaleza já foi tomada antes deles chegarem.
O nobre aliado deve dinheiro ao vilão.
Os bandidos são camponeses famintos.
O sábio é um impostor que leu muitos livros.
O vilão sabe tudo o que os heróis planejam.
O desaparecido não quer ser encontrado.
O demônio cumpre a palavra; o padre, não.
O casamento é um golpe de Estado.
O amuleto protetor atrai o monstro.
A estátua é um herói petrificado.
O mapa do tesouro leva à casa de um personagem.
O veneno era para outra pessoa.
O exército inimigo está fugindo de algo pior.
O sequestrador é o pai da vítima.
A recompensa vem em moedas amaldiçoadas.
A cidade fantasma é habitada por vivos escondidos.
O monstro só ataca quem mente.
O tesouro é uma criança.
O guia está levando o grupo em círculos.
O inimigo jurado pede ajuda.
O artefato não funciona sem um sacrifício.
A ponte que precisam atravessar foi construída pelo vilão.
O vilão já morreu e seu plano segue sozinho.
O traidor confessa e diz que há outro.
`)

export const MORE_PLACE_HEADS = lines(`
Enseada
Rocha
Mata
Selva
Brejo
Lameiro
Planície
Colina
Cume
Pico
Garganta
Cascata
Lago
Represa
Poço
Cruz
Cruzeiro
Marco
Moinho
Burgo
Fortaleza
Muralha
Convento
Capela
Santuário
Templo
Necrópole
Cemitério
Arco
Estrada
Trilha
Vau
Barragem
Farol
Cais
Estaleiro
Salinas
Pedreira
Mina
Forja
Feira
Mercado
Praça
Paço
Solar
Herdade
Granja
Chácara
Couto
Cerro
Lomba
Ribeirão
Riacho
Córrego
Arraial
Povoado
Recanto
Refúgio
Jardim
Pomar
Vinhedo
Olival
Souto
Carvalhal
`)

export const MORE_PLACE_TAILS = lines(`
das Andorinhas
do Javali
dos Lírios
da Bruma Rubra
das Três Irmãs
do Cavaleiro Sem Nome
das Marés
do Vento Norte
da Última Esperança
dos Esquecidos
do Sol Nascente
das Raposas
do Martelo
da Coroa Perdida
do Velho Moinho
das Lamentações
do Grifo
dos Penhascos
do Lince
das Abelhas
da Virgem Negra
do Abismo
dos Reis
do Trovão
das Cegonhas
do Mar Morto
da Garça Branca
dos Cem Olhos
do Machado
da Peste
dos Ossos
do Pastor
da Ponte Quebrada
do Santo Bebedor
da Prata
do Eremita
das Estrelas
do Cervo
das Lanternas
da Guerra Velha
do Leão Ferido
das Pombas
do Carrasco
da Rainha Louca
dos Navegantes
do Pinheiro Solitário
das Sereias
da Aurora
do Pântano Verde
das Correntes
do Último Dragão
das Cinco Torres
do Mercador
da Neblina
dos Vigias
do Cálice
da Chama Eterna
das Sombras
do Urso Pardo
dos Salgueiros
da Cruz de Pedra
do Ermitão
das Trovoadas
do Barão
da Floresta Morta
dos Peregrinos
do Coração Partido
das Garras
do Lago Gelado
da Muralha Antiga
dos Ventos Quentes
do Bispo
das Uvas
do Corvo Cego
da Lua Cheia
dos Lobos Cinzentos
do Sino Rachado
das Mil Fontes
do Escudo Partido
da Donzela
dos Contrabandistas
do Sal
das Hortênsias
do Profeta
da Pedra Que Canta
dos Gêmeos
do Fim do Mundo
das Flechas
do Touro Negro
da Esfinge
dos Afogados
`)

export const MORE_MAGIC_ITEMS = lines(`
Manto
Broche
Tiara
Bracelete
Colar
Brinco
Pingente
Medalhão
Talismã
Orbe
Cetro
Bastão
Martelo
Maça
Mangual
Foice
Tridente
Besta
Funda
Clava
Florete
Cimitarra
Montante
Armadura
Cota de malha
Braçadeira
Grevas
Elmo alado
Óculos
Chapéu
Sandália
Bolsa
Mochila
Tapete
Pergaminho
Tinteiro
Vela
Ampulheta
Cadeado
Baralho
Harpa
Alaúde
Corneta
Garrafa
Caldeirão
Pedra
Cristal
Gema
Estatueta
Ferradura
`)

export const MORE_MAGIC_POWERS = lines(`
que permite respirar debaixo d'água
que deixa o dono flutuar como uma pena
que repele insetos e pequenas feras
que transforma água em vinho uma vez por dia
que cura pequenos ferimentos ao toque
que avisa quando há veneno na comida
que deixa os passos do dono silenciosos
que guarda o calor do sol para a noite
que faz plantas crescerem rápido
que mostra a última pessoa que tocou um objeto
que traduz qualquer língua falada
que congela o que toca por um instante
que acende fogo com uma palavra
que deixa o dono enxergar no escuro
que chama o vento por alguns minutos
que encolhe o dono ao tamanho de um rato
que faz qualquer animal seguir o dono
que muda a cor da roupa do dono
que deixa a voz do dono mais alta que um trovão
que impede o dono de se perder
que conta quantas pessoas há numa sala
que revela portas secretas
que faz chover num raio pequeno
que guarda um objeto num espaço invisível
que deixa o dono andar sobre a água
que mostra a direção do norte verdadeiro
que dá coragem a quem a segura
que acalma feras selvagens
que permite falar com os mortos por um minuto
que deixa o dono imune ao frio
que faz o dono parecer outra pessoa
que reflete magias de volta
que pesa o mesmo que uma pena
que corta pedra como se fosse queijo
que avisa quando alguém está mentindo
que mantém comida fresca para sempre
que faz o dono pular três vezes mais alto
que guarda uma lembrança e a mostra a outros
que faz as feridas do dono doerem menos
que deixa a pele dura como couro por um tempo
que faz os inimigos esquecerem o rosto do dono
que permite ouvir conversas através de paredes
que chama um cavalo espectral ao assobio
que torna o dono irresistível numa negociação
que deixa um rastro de luz que só o dono vê
que conserta objetos quebrados
que espanta mortos-vivos
que mostra o lugar onde algo foi perdido
que deixa o dono invulnerável ao fogo por um minuto
que abre portais curtos de uma sala para outra
que conta as horas exatas do dia
que faz o dono entender os pássaros
que acelera o dono como um raio por um instante
que enche de água limpa qualquer recipiente
que guarda uma magia para usar depois
que acorda o dono quando há perigo
que torna o dono mais pesado que um touro
que atrai moedas perdidas
que faz chover pétalas de flores
que prende quem toca numa teia de luz
que deixa o dono ver através de um olho de vidro distante
que muda o tempo num raio de cem passos
que protege contra pesadelos
que encontra água no deserto
que dá ao dono uma sorte absurda uma vez por dia
que faz o dono falar só a verdade
que cria uma ilusão perfeita por um minuto
que chama uma névoa espessa
que absorve venenos
que transforma o dono num corvo por uma hora
que faz o portador nunca sentir fome
que faz cordas se desamarrarem sozinhas
que torna o dono amigo de qualquer criança
que revela a idade de qualquer coisa
que faz a arma voltar para a mão
que lança raios pequenos
que faz o dono ser esquecido assim que sai da sala
que mostra o caminho mais seguro
que permite dormir uma hora e descansar uma noite
que torna invisível a quem estiver em silêncio
que dá voz a objetos por um minuto
que faz as rochas se moverem como areia
que protege contra flechas
que deixa o ar ao redor sempre fresco
que mostra a verdadeira forma de metamorfos
que amplia a força do dono numa luta
que permite atravessar paredes finas
que congela o tempo por um instante para todos menos o dono
que faz o dono sentir o que outros sentem
`)

export const MORE_MAGIC_QUIRKS = lines(`
Range como uma porta velha quando usado.
Exige que o dono diga “por favor”.
Fica gelado ao toque de nobres.
Só funciona de manhã.
Muda de dono se for esquecido numa mesa.
Brilha em verde perto de ouro.
Deixa o dono com cheiro de pão quente.
Canta baixinho quando ninguém está olhando.
Tem medo de água.
Faz o dono soluçar depois de usado.
Não gosta de anões.
Fica mais forte quando o dono está triste.
Zumbe perto de outros itens mágicos.
Deixa o cabelo do dono em pé.
Só obedece a quem sabe seu nome.
Mancha os dedos de azul.
Esquenta quando alguém fala do antigo dono.
Faz flores murcharem ao redor.
Ri baixinho quando o dono erra.
Some se for colocado no chão.
Pesa mais a cada mentira do dono.
Fica escuro durante tempestades.
Só funciona para canhotos.
Atrai a atenção de corvos.
Fala com sotaque estrangeiro.
Escreve o nome do dono em qualquer superfície próxima.
Faz o dono sonhar com batalhas antigas.
Treme quando há um morto-vivo por perto.
Só funciona se o dono estiver descalço.
Os cães latem para ele.
Fica gelado no verão e quente no inverno.
Pede para ser levado a um lugar específico.
Brilha quando o dono diz uma verdade importante.
Repete a última palavra dita perto dele.
Faz a comida do dono ficar salgada.
Exige ser apresentado a cada nova pessoa.
Odeia a luz do sol.
Só pode ser usado sete vezes; já foi usado cinco.
Deixa marcas de queimadura na mão do dono.
Atrai pequenos espíritos curiosos.
Some de vez em quando e reaparece no bolso.
Só funciona quando o dono está sozinho.
Faz o dono esquecer um detalhe pequeno a cada uso.
Grita quando é roubado.
Sente ciúme de outros itens mágicos.
Deixa um cheiro de enxofre.
Exige que o dono durma ao lado dele.
Só pode ser tocado com luvas.
Os elfos o reconhecem e ficam hostis.
Esquenta quando alguém por perto está apaixonado.
Tem uma pequena rachadura que cresce.
Faz o dono ficar com sede depois de usá-lo.
Às vezes mostra imagens de outro lugar.
Recusa-se a funcionar em templos.
Range os dentes, embora não tenha dentes.
Mudou de dono mais de cem vezes, e lembra de todos.
Desaparece se o dono quebrar uma promessa.
Brilha quando há magia proibida por perto.
Atrai mariposas à noite.
Só funciona se o dono cantarolar.
Deixa as unhas do dono pretas por um dia.
Tem uma vontade própria, e é preguiçosa.
Pisca uma luz fraca em código que ninguém entende.
Fica pesado quando o dono está com medo.
Os cavalos ficam nervosos perto dele.
Diz um provérbio a cada uso.
Brilha em dourado perto da realeza.
Só funciona na terra onde foi criado.
`)

export const MORE_FACTION_NOUNS = lines(`
Clã
Tribo
Bando
Colégio
Academia
Escola
Sindicato
Conselho
Senado
Comitê
Templo
Culto
Igreja
Capítulo
Esquadra
Frota
Patrulha
Coro
Teia
Dinastia
`)

export const MORE_FACTION_EMBLEMS = lines(`
do Machado Duplo
da Coroa de Espinhos
do Dragão Vermelho
das Asas Negras
da Mão Cinzenta
do Escorpião
das Três Luas
do Cervo Branco
do Grifo Dourado
das Correntes Quebradas
da Fênix
do Leão Rampante
da Água Parada
do Lírio de Prata
das Cinzas
do Sol Negro
do Coração de Ferro
da Teia
da Balança
do Martelo de Bronze
da Âncora Partida
dos Sete Mares
da Pedra Fria
do Livro Fechado
da Estrela Polar
das Máscaras
do Vinho Rubro
do Javali Negro
do Trigo Dourado
da Flecha Partida
do Sino Silencioso
do Cão Fiel
das Raízes
da Noite Eterna
do Olho de Vidro
do Falcão Peregrino
da Espada Quebrada
da Mão de Prata
do Crânio Coroado
das Ondas
do Escudo Branco
da Rosa Dourada
da Montanha
do Abismo
da Lua Nova
do Pergaminho Vermelho
das Lanças
do Urso Branco
do Fogo Verde
da Pena de Ganso
dos Dois Rios
do Elmo Fechado
do Machado Vermelho
das Velas Negras
do Trono de Pedra
da Estrada Real
do Unicórnio
da Moeda de Cobre
do Tear
do Relógio
do Mar Gelado
da Ponte de Ferro
do Vento Leste
dos Corvos
do Labirinto
da Cripta
do Último Rei
`)

export const MORE_FACTION_GOALS = lines(`
derrubar a nobreza e dividir as terras
recuperar uma relíquia sagrada
abrir um portal para outro plano
controlar a produção de sal
proteger a floresta dos lenhadores
achar a fonte da juventude
dominar a guilda dos magos
escravizar os goblins das montanhas
proteger os órfãos da cidade
monopolizar o comércio de especiarias
ressuscitar um rei antigo
fundar uma nova religião
expulsar os estrangeiros
conquistar uma cadeira no conselho real
roubar o tesouro da coroa
criar uma cidade só para magos
preservar o conhecimento antigo
eliminar os mortos-vivos do reino
acordar um dragão adormecido
manter a paz entre elfos e humanos
apagar uma família nobre da história
libertar os prisioneiros políticos
descobrir o nome verdadeiro de um deus
instaurar uma república
dominar os mares do sul
proteger um herdeiro escondido
espalhar uma praga entre os inimigos
reescrever as leis do reino
construir uma torre até o céu
acabar com o tráfico de escravos
cobrar uma dívida antiga do rei
proibir a magia nas cidades
converter o reino a um deus estrangeiro
roubar o segredo dos ferreiros anões
fazer de um bastardo o novo rei
encontrar uma cidade submersa
proteger as rotas de peregrinação
destruir um artefato perigoso
controlar o mercado negro
esconder a existência de uma raça
dominar a rede de mensageiros
ganhar a guerra pela informação
criar um exército de autômatos
voltar no tempo e evitar uma tragédia
casar a filha do líder com o príncipe
transformar a capital num centro de comércio livre
juntar os fragmentos de um mapa antigo
proteger a fronteira sem ajuda do rei
vingar o massacre de uma aldeia
mapear os túneis do subterrâneo
eliminar todos os dragões
acabar com a guilda dos assassinos
dar terra aos camponeses
impor uma língua única ao reino
achar o túmulo de um herói
manter um demônio aprisionado
dominar o comércio de livros
libertar um deus aprisionado
garantir que a profecia se cumpra
criar uma escola de esgrima em cada cidade
roubar a voz de todos os bardos
proteger os animais mágicos
acabar com a influência dos elfos na corte
encontrar uma cura para a licantropia
espionar todos os reinos vizinhos
fazer a cidade esquecer um crime
reunir todas as ordens de cavalaria
controlar as estações
`)

export const MORE_FACTION_METHODS = lines(`
sermões inflamados
envenenamentos lentos
sequestros de herdeiros
festas luxuosas
espionagem com crianças de rua
contrabando por túneis
cartas anônimas
controle dos poços
compra de dívidas
pactos com criaturas
leilões fraudados
mercenários estrangeiros
seduções planejadas
ameaças pintadas nas portas
manipulação de profecias
pressão sobre os guildas
ataques disfarçados de bandidos
uso de ilusões
pombos-correio
mensagens escondidas em canções
compra de juízes e carcereiros
doações ao templo
festivais patrocinados
ensino gratuito com doutrinação
casas de jogos
venda de proteção
agentes duplos
sabotagem de navios
falsas curas
tráfico de relíquias
roubo de correspondências
peças de teatro com recados
bruxaria discreta
rumores sobre os rivais
alianças com bandidos
empréstimos a juros altos
retenção de grãos
espiões nos bordéis
reuniões em catacumbas
controle das pontes
controle das rotas de peregrinação
bilhetes de loteria viciados
cartografia secreta
assassinos treinados desde crianças
compra de terras pelos fundos
um tribunal próprio
monges guerreiros
fanatismo religioso
pesquisa de magia antiga
oferecimento de asilo a fugitivos
vigilância de estrangeiros
tatuagens de reconhecimento
dinheiro falso
casamentos estratégicos
milagres encenados
proteção a contrabandistas
`)

export const MORE_DEITY_SYLLABLES = lines(`
ab
ae
ba
ca
da
ek
fa
go
ha
il
ja
kor
la
ma
ne
no
ob
pe
qui
ri
sa
ta
um
vo
wy
xe
ys
za
ith
oth
`)

export const MORE_DEITY_DOMAINS = lines(`
da primavera
do sol nascente
das águas doces
dos ferreiros
dos mendigos
dos amantes
do parto
dos marinheiros
das encruzilhadas
do pesadelo
dos bardos
dos portais
da fortuna
da peste
da fome
dos mortos sem enterro
da caçada selvagem
das florestas
dos vulcões
do trovão
das sombras
da verdade
da mentira
do comércio
das fronteiras perdidas
dos órfãos
dos animais
dos cavalos
das abelhas
da cerveja
das tempestades de areia
do conhecimento proibido
da paciência
da coragem
da traição
das promessas
do sono
dos ventos do norte
das marés
dos ladrões honestos
da arquitetura
dos jogos de azar
da paz
`)

export const MORE_DEITY_SYMBOLS = lines(`
uma serpente mordendo a cauda
um sol com rosto
uma roda quebrada
um cajado com duas serpentes
uma balança desequilibrada
uma pena branca
uma coroa de espinhos
uma árvore com raízes no céu
uma âncora enrolada em algas
uma ampulheta
três círculos entrelaçados
uma montanha com um olho
uma flecha em chamas
uma colmeia
um caldeirão
uma mão com um olho na palma
uma lua negra
um coração de pedra
uma estrela de oito pontas
um bode de chifres longos
um cão de três cabeças
uma harpa dourada
um martelo e uma bigorna
uma máscara partida
um machado duplo
uma flor de lótus
um corvo de asas abertas
um trevo de quatro folhas
uma lágrima de prata
uma vela acesa dentro de uma lanterna
um dado de seis faces
uma escada até as nuvens
uma garra de urso
um cervo com chifres de fogo
uma onda quebrando
um escudo com uma rosa
uma coruja sobre um livro
uma coroa de trigo
uma sandália partida
um vulcão
um floco de cinza
uma bússola
um sino
um portão aberto
uma corda com sete nós
uma cabeça de touro
uma teia de aranha
um cálice virado
`)

export const MORE_DEITY_TENETS = lines(`
Nunca deixe um viajante sem água.
Plante uma árvore para cada vida que tirar.
Não coma antes de oferecer à mesa dos mortos.
Fale sempre a verdade a uma criança.
Respeite o silêncio dos templos.
Proteja os segredos dos amantes.
Não durma sob o céu na lua nova.
Honre seus pais, mesmo os ruins.
Toda canção deve ter um final.
Não pise em sombras de outros.
Cumpra um juramento mesmo depois da morte.
Liberte um pássaro preso por ano.
Não atravesse rios sem pedir licença.
Toda dívida perdoada é uma bênção.
Não use fogo para destruir livros.
Ajude o ferreiro a carregar o ferro.
Não ria de um homem que reza.
Respeite o adversário vencido.
Compartilhe o pão no dia mais frio.
Não roube de quem tem menos que você.
Visite o túmulo dos esquecidos.
Não diga o nome do deus em vão.
Cante para os mortos na noite de inverno.
Não mate animais prenhes.
Não negue um último desejo.
Guarde o fogo sagrado aceso.
A palavra dada vale mais que o ouro.
Não minta para o mar.
Cuide do estrangeiro como de um irmão.
Não durma sem antes perdoar alguém.
Ofereça a primeira caneca à terra.
Nunca vire as costas a um pedido de socorro.
Ensine um ofício antes de morrer.
Não quebre um espelho sagrado.
Acenda uma vela para cada dúvida.
Não feche a porta para a tempestade.
Respeite os sonhos, que são recados.
O silêncio também é oração.
Toda fome merece alimento.
Não carregue armas em dia de festa.
Proteja quem dorme.
Use a sorte com humildade.
Nunca aposte o que não é seu.
Ajude a parir, mesmo uma inimiga.
Não corte os cabelos durante o luto.
Fale com as árvores antes de cortá-las.
Não confie em quem nunca erra.
A justiça vem antes da misericórdia.
A misericórdia vem antes da justiça.
Não dê as costas ao sol nascente.
Viaje ao menos uma vez na vida até o santuário.
Não deixe nenhum morto sem nome.
Divida a caça com o bando.
Seja hospitaleiro com os loucos.
Não cobre juros de um irmão de fé.
Pague o barqueiro, sempre.
Um segredo contado ao templo não sai dali.
Recuse a primeira oferta, aceite a terceira.
Não pise em pão caído.
Toda promessa à meia-noite é sagrada.
Não acorde um velho dormindo.
Respeite o fogo e ele respeitará você.
Lave as mãos antes de tocar um livro sagrado.
Ofereça abrigo aos animais na tempestade.
Não leve nada de um cemitério.
Não roube no dia do deus.
Cure quem pedir, mesmo sem pagamento.
Deixe sempre um prato a mais na mesa.
Não mate em nome do deus sem que ele peça.
`)

export const MORE_DUNGEON_ROOMS = lines(`
Uma sala circular com um altar no centro
Uma galeria de retratos com rostos raspados
Uma forja ainda acesa
Uma sala de banquetes com a mesa posta
Um quarto infantil com brinquedos que se movem
Uma cripta de nichos vazios
Uma ponte estreita sobre um rio subterrâneo
Um salão de espelhos
Uma sala de tortura abandonada
Uma adega cheia de barris
Uma sala de mapas com uma mesa enorme
Uma cela com um prisioneiro vivo
Um observatório com o teto aberto
Uma sala de música com instrumentos que tocam sozinhos
Um ninho de criaturas
Um tesouro guardado atrás de grades
Uma sala de banho com uma piscina quente
Uma biblioteca com livros acorrentados
Um salão de treinamento com bonecos de palha
Uma caverna natural com estalactites
Uma câmara inundada até a cintura
Um jardim subterrâneo iluminado por fungos
Um santuário a um deus esquecido
Uma sala de estátuas petrificadas
Uma câmara de ecos
Uma oficina de engrenagens
Um estábulo de criaturas estranhas
Um escritório com papéis espalhados
Uma escadaria que desce em espiral sem fim
Uma sala de cristais que refletem luz
Uma tumba de um rei com o sarcófago aberto
Uma sala de rituais com velas acesas
Uma sala com o chão de mosaico de um mapa
Um depósito cheio de caixotes
Um corredor de portas iguais
Uma câmara com um poço de lava
Um quarto de hóspedes perfeitamente arrumado
Uma sala de troféus de caça
Um museu de objetos estranhos
Uma capela de ossos
Uma sala de jogos com mesas e dados
Um salão de baile em ruínas
Uma sala de guarda com um jogo de cartas interrompido
Uma ponte levadiça sobre um fosso
Uma sala de máquinas a vapor
Um viveiro de pássaros mortos
Uma sala de relógios parados na mesma hora
Uma sala de enfermaria com macas
Uma sala com uma árvore crescendo no meio
Um fosso com estacas
Uma câmara de lamentos com paredes riscadas
Uma sala de tesouro falsa
Uma sala de vidro com algo preso dentro
Uma sala de cozinha de gigantes
Um templo invertido no teto
Uma sala com uma única cadeira e uma vela
Um corredor estreito com teto baixo
Uma sala de pedra com uma porta pintada
Uma câmara de areia que se move
Uma sala de chuva interna
Uma sala de gelo eterno
Uma sala com um trono de ossos
Um salão onde a gravidade é invertida
Uma sala de quadros que mostram o futuro
Uma sala de jaulas vazias
Uma prisão de espíritos
Um laboratório de um necromante
Uma sala de oração com tapetes
Um atelier de escultor
Uma sala de cofres
Uma sala circular com doze portas
Um quarto do tesouro de um dragão, agora vazio
Uma sala com um lago e um barco
Uma sala de armadilhas desarmadas
Uma galeria de minas com trilhos
Uma sala de reunião de cultistas
Um corredor com murais de uma guerra
Uma sala de silêncio absoluto
`)

export const MORE_DUNGEON_FEATURES = lines(`
O ar tem gosto de metal.
Há marcas de garras no chão.
Uma música distante ecoa.
A temperatura cai a cada passo.
Há um cadáver recente com uma tocha apagada.
As paredes estão cobertas de musgo brilhante.
Um sussurro diz o nome de um personagem.
O chão está coberto de penas.
Há uma porta sem maçaneta.
Um cheiro de pão fresco vem de algum lugar.
Há gotas de sangue levando a uma parede.
Uma estátua segura uma chave.
As sombras se movem sozinhas.
O teto está muito alto e escuro.
Há uma inscrição em uma língua antiga.
O chão é de vidro e há algo embaixo.
Um vento quente sopra de uma rachadura.
Há um baú no centro, aberto e vazio.
Uma risada infantil ecoa.
Ossos de pequenos animais cobrem o chão.
Há uma corda pendurada no teto.
As tochas são de chama azul.
Há um livro aberto sobre um pedestal.
O eco demora demais para voltar.
Há sinais de uma batalha recente.
Um relógio tiquetaqueia em algum lugar.
Há pegadas que terminam no meio da sala.
A água do chão corre para cima.
Há um mapa riscado na parede.
Um espelho mostra a sala vazia.
Teias cobrem a passagem.
Há moedas presas no teto.
Uma alavanca está meio puxada.
Há um cheiro forte de enxofre.
O chão vibra levemente.
Há uma janela para um céu que não existe.
Um retrato observa os visitantes.
Há vela recém-apagada.
Há restos de um acampamento.
As paredes estão quentes ao toque.
Um sino toca uma vez quando alguém entra.
Há uma mesa posta para quatro pessoas.
O chão é de terra solta.
Há marcas de queimadura no teto.
Uma corrente de água corre por um canal.
Há uma porta pequena demais para humanos.
Há um alçapão com cadeado novo.
Há cogumelos gigantes no canto.
Uma névoa baixa cobre o chão.
Há um aviso escrito por outro aventureiro.
Há uma estátua sem cabeça.
Há um buraco no chão com uma escada de corda.
Há um quadro torto que esconde algo.
Um gato preto observa e foge.
Há uma luz vinda de baixo das pedras.
Há poeira demais, como se ninguém entrasse há séculos.
Há poeira de menos, como se alguém limpasse sempre.
Há vozes do outro lado da parede.
Há marcas de unhas na porta, por dentro.
Uma brisa apaga as tochas de tempos em tempos.
Há um cheiro de flores mortas.
O teto pinga um líquido escuro.
Há um círculo de sal no chão.
Há armaduras vazias em fila.
Há uma criatura dormindo num canto.
Há sinais de que alguém mora ali.
Há um poço com um balde cheio.
Há um tapete de pele de urso.
Há uma lareira acesa sem lenha.
Há uma janela com grades dobradas para fora.
O chão é de tábuas que rangem.
Há uma porta com sete fechaduras.
Há uma pilha de armas quebradas.
Há uma bandeira de um exército antigo.
Há uma inscrição: “volte”.
Há um esqueleto sentado num trono.
Há uma corrente presa à parede, sem prisioneiro.
Há um cheiro de chuva.
Há uma melodia vindo de uma caixa de música.
Há uma flor viva num vaso.
`)

export const MORE_DUNGEON_DANGERS = lines(`
um mímico disfarçado de baú
uma armadilha de flechas envenenadas
um fosso escondido sob tapetes
um golem de pedra adormecido
um enxame de morcegos
uma sala que enche de areia
um espectro que suga calor
uma armadilha de rede
uma lâmina pendular
um gás que causa alucinações
um piso que eletriza
uma porta que esmaga
uma serpente gigante
um bando de goblins emboscados
uma planta que solta esporos
um cubo gelatinoso
uma armadura animada
uma runa explosiva
um espelho que prende almas
uma estátua que petrifica com o olhar
um rio de águas ácidas
uma sala de gravidade invertida
um enxame de escaravelhos
um zumbi gigante
um basilisco jovem
um fantasma que possui
uma armadilha de fogo
uma ponte que desaba
uma sala que gira
uma escuridão mágica
uma criatura invisível
um carrasco morto-vivo
um ogro faminto
um cão infernal
uma harpia
um lobisomem preso
uma ilusão de um abismo
um piso coberto de óleo
uma porta falsa que solta veneno
uma corrente de água que arrasta
uma tranca que fecha a sala
uma colônia de fungos tóxicos
um troll regenerador
um necromante fugitivo
uma sombra viva
uma múmia desperta
uma aranha que imita vozes
uma armadilha de som ensurdecedor
um esqueleto arqueiro
um vampiro dormindo
uma hidra pequena
um elemental de terra
um bando de ratos-lobo
uma estátua que sangra veneno
um labirinto de paredes móveis
um poço de piche
um gênio aprisionado e furioso
uma armadilha de gelo
um dragão filhote faminto
uma maldição ao tocar o tesouro
um banshee que grita
um enxame de sanguessugas
uma corrente de ar que empurra para um abismo
uma rocha que rola pelo corredor
um mago louco aprisionado
um gólem de carne
um cultista suicida
uma parede de espinhos
uma criatura das profundezas
`)

export const MORE_LEGEND_SUBJECTS = lines(`
Uma rainha que trocou o coração por uma pedra
Um navio que navega pelo céu na lua cheia
Um ferreiro que forjou a própria morte
Uma árvore que guarda os nomes de todos os mortos
Um lobo que foi rei por um dia
Uma torre que cresce um andar por século
Um bardo que cantou até a montanha chorar
Um pastor que enganou o diabo três vezes
Uma cidade feita de ouro que só aparece a cada cem anos
Um rio que leva os sonhos para o mar
Uma bruxa que se casou com o inverno
Um anão que cavou até o centro do mundo
Uma criança que nasceu de uma estrela
Um castelo que se move pela floresta
Uma armadura que escolhe o próximo rei
Um gigante que dorme sob a colina
Um elfo que se apaixonou por uma mortal
Um sino afundado que toca nas tempestades
Um mendigo que era um deus disfarçado
Uma espada que não pode ser desembainhada
Um caçador que perseguiu um cervo branco até o outro mundo
Um labirinto onde se encontra o próprio passado
Uma rainha que governou dos mortos
Um monge que parou o tempo para terminar uma oração
Um dragão que guardava uma biblioteca
Uma ilha que é as costas de uma tartaruga gigante
Uma princesa que preferiu o dragão ao príncipe
Um poço que atende a um desejo e cobra outro
Um general que nunca perdeu uma batalha, porque nunca lutou
Um ladrão que roubou a lua
Uma tecelã que teceu o destino do reino
Um espelho que mostra quem você poderia ter sido
Um rei que dormiu por cem anos e acordou louco
Uma floresta onde as estações não mudam
Um cavalo que corria sobre a água
Uma coroa que pesa conforme os pecados do rei
Um pescador que pescou uma sereia e a soltou
Um mago que se transformou num livro
Uma vila onde todos são a mesma pessoa
Um herói que voltou do mundo dos mortos com uma promessa
Um vale onde os ecos respondem perguntas
Uma ponte entre o mundo dos vivos e o dos mortos
Uma rainha que plantou uma floresta com lágrimas
Um anel que transforma o dono em pássaro
Um sapo que era um príncipe e preferiu continuar sapo
Um demônio que se apaixonou por uma freira
Uma estrela que caiu e virou mulher
Uma flauta que encanta os ratos e as crianças
Um rei que era, na verdade, três irmãos
Um guerreiro que lutou contra a própria sombra
Uma pedra que canta ao amanhecer
Um velho que guardava o vento num saco
Um farol que guia navios para o naufrágio
Uma cidade que esqueceu o próprio nome
Um bebê trocado por fadas que virou herói
Uma montanha que foi um gigante punido
Uma lâmpada com um gênio cansado
Uma batalha que nunca terminou
Uma estátua que ganha vida no solstício
Uma ave que renasce das cinzas a cada mil anos
Um rio de vinho que corre uma vez por ano
Um tesouro guardado por um enigma sem resposta
Um caçador de bruxas que era bruxo
Uma tempestade com o nome de uma rainha
Uma cripta onde os reis mortos jogam xadrez
Um juramento que prende as almas de um exército
Um portão que só abre para quem não quer entrar
Um bosque onde ninguém envelhece
Uma moeda que compra qualquer coisa uma vez
Uma criatura que coleciona rostos
`)

export const MORE_LEGEND_TRUTHS = lines(`
É verdade, e a criatura ainda está viva.
A história foi invertida: o herói era o vilão.
Existe uma prova escondida no castelo.
É a lembrança distorcida de uma guerra real.
Os dois lados da história estão certos.
Um culto mantém a lenda viva para lucrar.
O final verdadeiro é proibido de contar.
A lenda descreve um ritual em código.
O lugar existe, mas é outro lugar.
O personagem principal era uma mulher.
A lenda foi escrita para assustar crianças, e funcionou bem demais.
Tudo é verdade, mas aconteceu ontem.
É uma profecia disfarçada de lenda.
O tesouro da lenda está num museu, e ninguém percebeu.
Foi um acidente que virou milagre.
O vilão da lenda tem descendentes na cidade.
Os bardos mudaram o nome para evitar uma vingança.
O monstro era um animal comum e assustado.
A lenda esconde a localização de uma porta.
É a história de outro mundo.
Aconteceu exatamente assim, e vai acontecer de novo.
A lenda é um mapa, se lida ao contrário.
Um personagem da lenda é o avô de um dos heróis.
Foi inventada por um bêbado e virou religião.
O herói morreu no meio da história; o resto é invenção.
A lenda é verdade, mas a moral é falsa.
Existe uma canção que conta a parte que falta.
Um sábio guarda o manuscrito original.
O nome do herói foi apagado por um rei invejoso.
A lenda é um aviso contra um mal que está voltando.
A criatura da lenda é a protetora da cidade.
O fim da lenda depende de quem conta.
A lenda se repete a cada geração com novos nomes.
O lugar da lenda foi soterrado por um terremoto.
É a história de um crime nunca punido.
A igreja proibiu a lenda por um motivo.
A criança da lenda cresceu e virou o vilão.
O objeto da lenda está em posse de um mercador.
A lenda foi escrita por quem a viveu, e mente por vergonha.
Tudo aconteceu, menos a parte da magia.
A magia é real; as pessoas é que nunca existiram.
Há três versões, e a mais estranha é a verdadeira.
A lenda é uma piada antiga levada a sério.
O tesouro da lenda era conhecimento, não ouro.
Os animais da região lembram a verdade.
É a história da fundação da cidade, mal contada.
A lenda foi um disfarce para um tratado secreto.
Um dragão contou essa história, e dragões mentem.
A lenda é um julgamento: quem a ouve vira testemunha.
O herói da lenda ainda espera alguém para terminar a missão.
`)

export const MORE_MERCHANT_WARES = lines(`
pergaminhos de magia de terceira mão
espadas com histórias inventadas
poções de cores suspeitas
capas impermeáveis de pele de foca
lanternas que não apagam com vento
botas de couro de dragão (provavelmente lagarto)
mapas do tesouro em série
ervas medicinais secas
chás de terras distantes
instrumentos musicais exóticos
dados e baralhos
perfumes de flores raras
tinta e pergaminho de qualidade
roupas de nobres usadas
selas e arreios
peles de animais raros
frutas secas e castanhas
queijos curados de montanha
vinho em odres
pedras preciosas sem procedência
ferramentas de ladrão em caixas de costura
óculos e lentes
miniaturas de soldados de chumbo
brinquedos mecânicos
relógios de bolso
mapas de constelações
ovos de criaturas
filhotes de cães de caça
sabonetes perfumados
tapetes bordados
louças pintadas
facas de cozinha anãs
cestos e cordames
velas aromáticas
sinos e campainhas
estatuetas de deuses
livros de receitas
remédios para dor de dente
óleos para armas
venenos rotulados como “remédio para ratos”
tônicos que prometem juventude
cabelos postiços e perucas
pentes e espelhos
chapéus extravagantes
máscaras de festa
fogos de artifício
sementes de flores raras
pássaros cantores em gaiolas
pedras de amolar
bússolas
ampulhetas
caixas com fundo falso
bolsas com cadeado
botas com compartimento secreto
cartas de tarô
incenso de templos distantes
tecidos de seda
carne-seca e biscoitos de viagem
sal grosso e especiarias
mel silvestre
tabaco de cachimbo
cachimbos de barro e madeira
garrafas de bebida rara
licores de frutas
esculturas de marfim
joias de prata
anéis com pedras falsas
espadas de treino de madeira
escudos pintados
arcos e flechas
mapas de rotas de comércio
traduções de livros estrangeiros
contratos de aprendizagem
informações (cobra caro)
lembranças de batalhas famosas
ossos de santos
tintas para tatuagem
amostras de pó de fada
`)

export const MORE_MERCHANT_QUIRKS = lines(`
conta a origem de cada item com detalhes inventados
pede para o cliente adivinhar o preço
tem um macaco que guarda o dinheiro
fecha a banca se ouvir um sino
vende tudo pela metade a quem tiver olhos verdes
nunca diz o próprio nome
chora quando vende algo de que gosta
oferece chá antes de qualquer negócio
anota tudo num livro gigante
cobra em moedas estrangeiras
dá conselhos amorosos de graça
recusa negócios com elfos
faz o cliente jurar que não vai revender
desconfia de quem paga sem regatear
canta enquanto embrulha os produtos
só vende de noite
está sempre de mudança para outra cidade
tem uma filha que faz as contas melhor que ele
coleciona os botões dos clientes
diz que tudo é a última peça
mantém uma lista de clientes proibidos
pede referências de clientes novos
nunca olha nos olhos ao dar o preço
mostra primeiro o item mais caro
tem uma tatuagem de cada cidade em que vendeu
dá um item a mais para crianças
pesa tudo numa balança claramente viciada
dá descontos em dias de chuva
só aceita moedas limpas
tem um sócio que é um fantasma
pede ajuda para carregar a mercadoria
conta piadas ruins sem parar
compara tudo com a cidade natal
exige silêncio enquanto o cliente escolhe
faz o cliente provar antes de comprar
quer saber a história de cada cliente
dá recibos escritos em versos
fecha negócio com um aperto de mão cuspida
tem uma carroça que parece maior por dentro
vende fiado só para quem ele chama de primo
espirra sempre que mente
diz que um rei já comprou dele
vende com o desconto do dia, que muda toda hora
tem um papagaio que avisa quando o cliente rouba
só vende uma peça por cliente
pede que o cliente cante para ganhar desconto
cobra para mostrar os itens da caixa trancada
troca de humor conforme a lua
diz que tudo é encantado
dá garantia de um dia
é surdo, ou finge ser
dá um brinde que é, na verdade, valioso
tem uma loja que só aparece para quem precisa
não vende a quem estiver armado
diz o futuro de quem compra algo caro
sempre tem exatamente o que o cliente precisa
nunca tem troco
oferece um sorteio no fim do dia
`)
