/**
 * Segunda leva de opções para tesouro, clima, aventura, lugares, itens, facções, divindades, masmorras, lendas e
 * mercadores (dobro da beta.22). Uma opção por linha; `generator-tables.ts` junta tudo.
 */
import { lines } from "./generator-tables-pessoas"

export const EXTRA_COIN_AMOUNTS = [4, 6, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 24, 26, 27, 30, 35, 42, 48, 55, 66, 70, 85, 95, 110, 130, 175, 225, 300, 350, 450, 600, 750, 900, 1200, 1500, 2000]
export const EXTRA_COIN_KINDS = lines(`
moedas de prata com o rosto de um rei louco
dobrões espanhóis enferrujados
moedas de cobre cunhadas por anões
moedas de ouro furadas para colar
fichas de cassino de uma cidade distante
moedas de ferro do império antigo
moedas de vidro dos elfos
lascas de ouro em um saquinho de couro
anéis de prata usados como dinheiro
barras pequenas de cobre carimbadas
moedas de templo, só aceitas por sacerdotes
moedas de jade do oriente
dentes de dragão polidos, usados como moeda
moedas de ouro falsas, muito bem feitas
pérolas pequenas em uma bolsinha
`)

export const EXTRA_TRINKETS = lines(`
um ovo de pedra com runas
uma caixa de rapé de prata
uma estatueta de dragão de jade
um pente de prata com pedras azuis
um medalhão com um cacho de cabelo ruivo
uma faca de prata com cabo de marfim
um sino de cristal
uma colher de pau entalhada com uma cena de caça
um castiçal de bronze
um cachimbo de cerâmica pintado
uma bússola de latão com tampa
um par de esporas de prata
uma fivela de cinto de ouro
um broche de esmalte com uma andorinha
um leque de penas de pavão
uma caixa de costura de madrepérola
um frasco de vidro azul vazio
uma flauta de bambu
um apito de prata em forma de pássaro
um anel com um selo apagado
uma luneta de bolso
uma máscara de porcelana
um ídolo de madeira com olhos de vidro
uma pena de fênix (dizem)
um dente de tubarão gravado
uma moeda de ouro partida ao meio
um relicário vazio
uma tabuleta de argila com escrita antiga
um cristal que muda de cor
uma pedra de rio lisa e quente
uma bolsa de couro de cobra
um bracelete de cobre com runas
uma tiara de flores de prata
uma boneca de pano com olhos de botão
uma caixa de fósforos de alquimista
um baralho de cartas de marfim
uma estatueta de gato de ônix
um par de brincos de pérola
uma xícara de porcelana com a borda lascada
um prato de estanho gravado
um selo de cera dourada
uma carta de navegação em pele
uma chave grande de bronze
um cadeado sem chave
um anel de ferro com um rubi falso
uma tesoura de jardim de prata
uma escova de cabelo de cerdas de javali
uma lamparina de óleo pequena
um anel de osso entalhado
um medalhão com dois retratos
uma pulseira de contas de âmbar
um coração de vidro vermelho
uma garrafa com areia de praia
uma pena de escrever de ouro
um tinteiro em forma de crânio
uma estatueta de um cavaleiro sem cabeça
uma caixa de música com uma bailarina
um búzio rosado
uma estrela de metal de cinco pontas
uma placa de metal com um nome riscado
uma moeda de um jogo de tabuleiro
um amuleto de pata de coelho
uma figa de madeira
um terço de contas de vidro
uma gaita de boca de prata
uma corrente de relógio sem relógio
um par de dados de cristal
um anel com um olho pintado
um pequeno espelho de prata com moldura de serpentes
um saquinho de sal abençoado
uma colher de prata com brasão
uma flecha com ponta de prata
um cristal de sal rosa
um broche em forma de lua
uma faixa de seda bordada
um amuleto de ferro contra mortos-vivos
uma caneca de estanho com tampa
um isqueiro de pederneira
um pergaminho com um poema de amor
um lacre com a marca de uma garra
um pendente com uma gota de âmbar e um inseto dentro
uma bolsa de veludo com botões de prata
um peão de xadrez de cristal
um bastão de incenso de sândalo
um pequeno sino de vaca de bronze
um dedal de ouro
um cachecol de lã de alpaca
uma estatueta de sapo dourado
uma coroa de papel de um festival
um amuleto de dente de urso
uma lupa com cabo de chifre
um cartão de visita de um mago famoso
uma ferradura dourada pequena
uma pedra com um buraco no meio
um prendedor de cabelo de casco de tartaruga
uma moeda de chocolate (ainda boa)
um soldadinho de chumbo com uma perna só
uma lanterna de papel dobrável
uma caixa de chá de folhas raras
um amuleto de prata em forma de olho
uma pedra-sabão com um rosto entalhado
um par de óculos de sol de quartzo
um mapa de bordado num lenço
um anel de noivado com uma inscrição
um sinete de lacre com uma abelha
um par de luvas de couro de cabrito
uma colher de chá de ouro
um bilhete de teatro antigo
um pingente de cristal que tilinta
um diário de viagem pequeno
um cinzel de escultor de prata
`)

export const EXTRA_TREASURE_EXTRAS = lines(`
uma carta de crédito de um banco élfico
a escritura de uma mina abandonada
um mapa de uma ilha que muda de lugar
uma lista de compras de um rei
a confissão de um assassino famoso
um diário de um explorador desaparecido
uma partitura de uma canção proibida
um convite para uma reunião de bruxas
a planta da casa do prefeito
um contrato de casamento entre duas casas rivais
a senha da porta dos fundos da guilda
um bilhete com o horário de uma execução
uma carta de alforria de um dragão
um recibo de uma dívida enorme
um pedaço de mapa com metade de um tesouro
a localização de uma fonte termal mágica
um poema que revela uma passagem secreta
um decreto real nunca publicado
uma carta de amor de um vilão
uma lista de espiões da rainha
a receita de um veneno sem antídoto
uma página de um diário de bordo pirata
um mapa da rede de esgotos da cidade
uma licença para caçar no bosque real
uma nota promissória assinada por um demônio
um certificado de propriedade de um cavalo de corrida
uma carta escrita numa língua desconhecida
a localização do túmulo de um mago
um bilhete de loteria premiado do ano passado
uma carta de recomendação para a academia de magia
a combinação de um cofre de banco
uma lista de nomes com três já riscados
um mapa de constelações com uma estrela marcada
a fórmula de uma tinta invisível
um contrato de trabalho com a guilda dos ladrões
uma carta anônima ameaçando o rei
o desenho de um brasão desconhecido
uma carta selada endereçada a um personagem
a localização de um esconderijo de contrabando
um registro de nascimento falsificado
o horário das patrulhas da cidade
uma página de um livro de feitiços
uma lista de tesouros roubados de um templo
uma carta de baralho com um mapa no verso
uma autorização para entrar no palácio
um bilhete de navio pago, sem nome
a planta de uma máquina de cerco
um trecho de uma profecia
uma carta de despedida de um soldado
o testamento de um cavaleiro sem herdeiros
um mapa de uma caverna com um X vermelho
uma lista de dívidas de um nobre
a chave codificada de um diário secreto
um desenho de uma porta com runas
uma carta de um espião para o próprio irmão
um certificado de mestre ferreiro
um contrato de aluguel de um castelo
um bilhete com instruções para um ritual
uma confissão de amor nunca entregue
a localização de um portal para o reino das fadas
um mandado de prisão contra o prefeito
uma página arrancada da bíblia do templo
uma lista de mercadorias contrabandeadas
um livro-caixa de uma taverna
a genealogia de um cavalo de raça
um mapa de rotas de caravanas de escravos
um tratado comercial secreto com os orcs
um bilhete pedindo socorro de uma prisão
uma carta de um deus para um mortal (dizem)
o diário de um náufrago
um mapa de uma cidade subterrânea
uma lista de membros da guarda subornados
a fórmula de uma cerveja premiada
uma senha para falar com o rei dos ladrões
um registro de navio com uma carga misteriosa
uma carta de um filho perdido
uma conta de banco em nome de um morto
um mapa de um labirinto de espelhos
um bilhete escrito com sangue: “não confie no padre”
uma carta de baralho de ouro com um nome gravado
um papel com coordenadas de um naufrágio
`)

const W = (text: string) => lines(text)
export const EXTRA_WEATHER: Record<string, string[]> = {
  Primavera: W(`
Chuva leve e cheiro de grama cortada.
Dia luminoso com nuvens altas.
Vento fresco que faz voar os chapéus.
Tempestade curta com arco-íris no fim.
Manhã de geada e tarde de sol.
Garoa fina e pássaros cantando.
Céu azul profundo e brisa morna.
Nevoeiro denso na beira do rio.
Chuva de granizo pequeno e rápido.
Dia nublado, sem vento, abafado.
Ventania que espalha pétalas de flores.
Sol forte e poças secando rápido.
Noite estrelada e fria.
Tempestade elétrica sobre as montanhas.
Chuva fina que dura a tarde toda.
Primeiro dia quente do ano.
Brisa do mar com cheiro de sal.
Nuvens escuras ameaçando, sem chuva.
Neve tardia derretendo ao meio-dia.
Céu cor de lavanda ao entardecer.
Manhã de orvalho e teias brilhando.
Chuva forte que alaga as estradas baixas.
Vento morno que traz pólen e espirros.
Dia perfeito para viajar.
Trovões distantes a noite inteira.
Céu limpo e lua crescente brilhante.
Neblina que sobe da terra molhada.
Chuva de pedra que estraga as flores.
Sol entre pancadas de chuva.
Manhã fria e cristalina.
Vento leste trazendo nuvens baixas.
Céu alaranjado de poeira do sul.
Chuva noturna que lava a cidade.
Ar úmido e pesado antes da tempestade.
Tarde ensolarada com brisa fresca.
Garoa gelada vinda do mar.
Dia ventoso com nuvens velozes.
Chuva contínua por três dias seguidos.
Sol morno e borboletas por toda parte.
Nevoeiro que esconde a estrada até o meio-dia.
`),
  Verão: W(`
Calor de derreter cera.
Tempestade de verão com raios violentos.
Céu sem nenhuma nuvem e sol inclemente.
Noite quente e cheia de vaga-lumes.
Vento seco que levanta poeira.
Chuva quente e grossa no fim da tarde.
Manhã fresca e tarde abafada.
Calor úmido de pântano.
Brisa marinha que alivia o calor.
Seca que racha as estradas.
Trovoada distante sem chuva.
Céu esbranquiçado pela fumaça.
Dia longo, com sol até tarde.
Noite estrelada e quente.
Pancada de chuva rápida e sol logo depois.
Mormaço que deixa todos sonolentos.
Granizo grosso que estraga a colheita.
Vento quente do deserto.
Nuvens altas e sol filtrado.
Calor que faz o ar tremer na estrada.
Tempestade de areia vinda das planícies.
Lua cheia enorme e laranja.
Céu limpo e muito azul.
Chuva de verão que cheira a terra quente.
Abafamento antes de uma tempestade forte.
Dia ventoso e seco.
Noite sem vento e cheia de mosquitos.
Neblina de calor sobre o lago.
Trovões a tarde inteira.
Garoa morna ao amanhecer.
Céu vermelho ao pôr do sol.
Calor que derruba os cavalos.
Ventania repentina que derruba tendas.
Chuva fina que evapora no chão quente.
Nuvens de tempestade no horizonte o dia inteiro.
Sol forte e brisa fresca à sombra.
Relâmpagos sem trovão à noite.
Dia nublado e morno.
Calor seco das montanhas.
Chuva torrencial por uma hora.
`),
  Outono: W(`
Folhas vermelhas voando com o vento.
Chuva fina e constante.
Neblina espessa ao amanhecer.
Céu cinza e frio.
Vento forte que uiva nas árvores.
Primeiras geadas nas janelas.
Tarde dourada e tranquila.
Tempestade de outono com trovões.
Garoa gelada à noite.
Céu limpo e ar cortante.
Nuvens baixas e chuva intermitente.
Vento que traz cheiro de lenha queimada.
Lua cheia de colheita, enorme e amarela.
Chuva forte que encharca as estradas.
Sol fraco entre nuvens.
Manhã de neblina e tarde de sol.
Ventania que derruba frutas das árvores.
Céu escuro o dia inteiro.
Noite fria e estrelada.
Granizo pequeno e rápido.
Primeira neve nos picos.
Chuva que vem de lado com o vento.
Dia úmido e cinzento.
Frio que entra pelas frestas.
Céu claro e folhas secas no chão.
Tempestade marítima na costa.
Chuva de folhas quando o vento sopra.
Manhã congelante, tarde amena.
Nevoeiro que dura até o anoitecer.
Vento frio do norte.
Garoa leve e silêncio.
Nuvens pesadas e ar parado.
Céu alaranjado ao entardecer.
Tempestade de vento que derruba árvores.
Chuva gelada misturada com neve.
Tarde ensolarada e fria.
Frio úmido do rio.
Geada grossa que brilha ao sol.
Nuvens que correm rápido no céu.
Dia curto e escuro.
`),
  Inverno: W(`
Neve pesada que bloqueia as portas.
Céu cinza-chumbo e silêncio.
Vento gelado que congela a barba.
Lago congelado e brilhante.
Nevasca violenta durante a noite.
Sol fraco e frio intenso.
Chuva de gelo que quebra galhos.
Neblina congelante ao amanhecer.
Noite clara e muito fria.
Neve fofa e tranquila o dia inteiro.
Degelo que transforma estradas em lama.
Vento que levanta a neve como fumaça.
Granizo e trovão de inverno.
Céu limpo e estrelas brilhantes.
Frio que faz a madeira estalar.
Tempestade de neve na montanha.
Garoa gelada e escorregadia.
Dia escuro e curto.
Nevoeiro e neve fina.
Sol brilhando na neve recém-caída.
Rio parcialmente congelado e perigoso.
Avalanche ouvida ao longe.
Ventania que apaga as tochas.
Neve molhada e pesada.
Céu rosado ao amanhecer gelado.
Frio seco e cortante.
Geada que cobre tudo de branco.
Lua cheia sobre a neve, claridade de dia.
Neve que cai devagar sem vento.
Tempestade que dura três dias.
Frio que racha pedras.
Céu nublado e ar parado.
Neve com cinzas de um vulcão distante.
Gelo fino sobre as poças.
Vento que traz uivos da floresta.
Dia de sol e frio sem vento.
Nevasca que faz perder o caminho.
Noite de aurora colorida.
Chuva gelada sobre a neve.
Calmaria branca depois da tempestade.
`),
}

export const EXTRA_ENCOUNTERS = lines(`
Resgatar um gato preso no telhado da prefeitura (que é um mago transformado)
Atravessar um campo de flores sonolentas
Ganhar uma corrida de barcos no rio
Desarmar uma bomba alquímica no mercado
Convencer um gigante a devolver o sino da igreja
Encontrar um anel perdido num lago congelado
Proteger um casamento de um ex-noivo vingativo
Escapar de uma casa que muda de cômodos
Negociar com um dragão por um ovo roubado
Sobreviver a uma noite num navio fantasma
Pegar um ladrão que pode ficar invisível
Escoltar um bardo famoso até o castelo
Recuperar um livro roubado de uma biblioteca de magos
Resolver uma briga entre duas guildas no meio da rua
Atravessar uma ponte vigiada por um troll poeta
Salvar mineiros presos num desabamento
Encontrar a saída de uma floresta encantada
Vencer um jogo de enigmas com uma fada
Proteger uma aldeia de um enxame de abelhas gigantes
Domar um grifo selvagem
Infiltrar-se num culto disfarçado de festa
Descobrir quem trocou o bebê da duquesa
Resgatar um cavalo de corrida sequestrado
Atravessar um deserto de cristal
Enfrentar um golem enlouquecido na forja
Fugir de uma prisão flutuante
Recuperar a coroa num leilão clandestino
Resolver um assassinato num trem de carruagens
Salvar uma criança de uma bruxa
Proteger uma carroça de ouro de bandidos
Encontrar um tesouro num labirinto de sebes
Vencer um torneio de justa
Convencer um conselho de anões a abrir os portões
Atravessar um mar de nevoeiro num barco a remo
Enganar um ogro faminto
Desmascarar um falso profeta
Encontrar uma cura numa ilha de mortos-vivos
Recuperar uma relíquia de dentro de um vulcão
Escapar de uma tempestade de areia
Sobreviver a um ataque de lobisomens
Libertar um espírito preso numa árvore
Escoltar refugiados pela montanha
Vencer uma disputa de culinária
Roubar o diário de um nobre durante um baile
Proteger um sábio de assassinos
Resolver a briga entre dois deuses menores
Encontrar a fonte de uma doença na água
Desfazer uma maldição de pedra
Encontrar o dono de um ovo de dragão perdido
Atravessar um rio cheio de piranhas
Deter uma rebelião de autômatos
Escapar de um castelo em chamas
Encontrar um caminho pela neve até a cabana
Sobreviver a uma emboscada de goblins
Recuperar o selo real roubado
Libertar um prisioneiro político
Proteger uma colheita de corvos gigantes
Achar um mapa escondido numa catedral
Vencer uma luta na arena sem matar ninguém
Convencer uma sereia a devolver um marinheiro
Investigar uma série de desaparecimentos no porto
Escapar de uma cidade sitiada
Sobreviver a uma noite numa floresta de sombras
Negociar a paz entre elfos e anões
Encontrar um ladrão de memórias
Recuperar uma estátua viva
Proteger um eclipse de um ritual
Atravessar uma ponte de gelo que derrete
Achar uma vila que aparece só uma vez por ano
Desarmar armadilhas numa tumba de faraó
Escapar de um labirinto subterrâneo
Encontrar a filha perdida de um nobre
Proteger um festival de um incêndio
Vencer um jogo de cartas contra a morte
Recuperar a voz de uma cantora
Achar o assassino entre os convidados de um jantar
Escoltar um carregamento de pólvora
Domar um rio enfurecido
Libertar escravos de uma mina
Encontrar a entrada de uma cidade élfica
Enfrentar um dragão de gelo
Vencer uma batalha naval
Achar um elixir para um rei moribundo
Salvar uma biblioteca de uma inundação
Capturar uma quimera viva
Sobreviver a um julgamento de bruxas
Proteger um mensageiro com informações vitais
Resgatar um amigo dos piratas
Atravessar um campo minado de magia
Encontrar a fonte da juventude
Desativar uma armadilha mortal num cofre
Convencer um fantasma a partir
Explorar um navio encalhado
Vencer uma competição de arco e flecha às cegas
Achar a saída de um sonho compartilhado
Sobreviver a um terremoto numa cidade subterrânea
Proteger um eclipse de um culto
Recuperar uma criança trocada por fadas
Escapar de uma armadilha de areia movediça
Desarmar um golem de guerra
Salvar uma floresta de lenhadores mágicos
Escoltar um cavalo sagrado até o templo
Achar o caminho num pântano de ilusões
Vencer um duelo de magos
Proteger um tesouro de ladrões invisíveis
Encontrar um navio perdido no gelo
Recuperar o coração de um gigante
Enfrentar um enxame de morcegos vampiros
Convencer um rei teimoso a fugir
Libertar um anjo aprisionado
Salvar um vilarejo de uma avalanche
Sobreviver a uma praga de ratos
Escapar de um banquete envenenado
Descobrir o segredo de uma estátua que chora
Achar um caminho seguro por terras de orcs
Recuperar um baú afundado
Proteger uma noiva de um dragão
Vencer uma corrida de cavalos voadores
Escapar de uma prisão de gelo
Achar um ladrão num mercado de mil pessoas
Desfazer um pacto demoníaco
Salvar um navio de um kraken
Proteger uma criança profetizada
Enfrentar um cavaleiro sem cabeça
Atravessar um campo de batalha assombrado
Achar a chave de uma cidade trancada
Recuperar um mapa celeste
Sobreviver a uma tempestade mágica
Proteger um tratado de paz
Enfrentar um exército de esqueletos
Recuperar a espada do rei
Convencer os mortos a voltar para os túmulos
`)

export const EXTRA_TWISTS = lines(`
O herói da cidade é o verdadeiro vilão.
O tesouro estava com eles o tempo todo.
O mapa leva ao lugar de onde partiram.
O contratante quer que eles falhem.
O vilão é um personagem do passado de um herói.
O monstro estava protegendo a vila.
A missão foi encomendada por um morto.
O aliado mais confiável é um espião duplo.
A princesa é a líder dos bandidos.
O dragão é a vítima.
O artefato está vivo.
O traidor é o guia.
O culpado é o próprio contratante.
O vilão quer salvar o mundo do seu jeito.
O resgate era desnecessário: a refém fugiu sozinha.
A recompensa é uma armadilha.
O inimigo está doente e precisa de ajuda.
O monstro é uma criança amaldiçoada.
A caverna é a boca de uma criatura.
O sábio é um demônio disfarçado.
O rei é um impostor.
O vilão é uma ilusão.
O portal leva ao futuro.
O tesouro é falso, mas a pista é verdadeira.
O ritual já foi completado.
O mentor morreu há anos e quem fala é um fantasma.
A arma lendária precisa de um sacrifício.
O amigo foi substituído por um metamorfo.
A cidade é uma ilusão.
O inimigo jurado é um irmão perdido.
A vítima é a culpada.
A missão é um teste de uma ordem secreta.
O vilão já venceu, e eles estão no futuro dele.
O artefato pertence a um dos personagens.
O mapa está desenhado ao contrário.
O monstro é o guardião de uma prisão.
O sequestro foi encenado.
A guerra foi causada por um mal-entendido.
O culto é inofensivo; o problema é o padre.
O assassino é inocente; foi controlado.
O herói morto está vivo e é o vilão.
O tesouro é amaldiçoado e já escolheu um dono.
O aliado precisa morrer para o plano funcionar.
O deus é uma criatura comum enganando todos.
A fortaleza está vazia há anos.
O mercador é um rei disfarçado.
A ilha é as costas de uma tartaruga gigante.
O rival ajuda em segredo.
O monstro é um animal de estimação de alguém poderoso.
A criança é a mais velha de todos.
O feitiço só funciona se o grupo falhar.
O mensageiro é o assassino.
A vila inteira é uma armadilha.
O dragão quer ser amigo.
A guerra é encenada para vender armas.
O vilão está tentando fechar um portal.
O artefato é uma chave, não uma arma.
A testemunha é um fantasma.
O amuleto atrai o perigo.
O traidor é o líder da resistência.
A cura é pior que a doença.
O santo era um ladrão.
A biblioteca guarda um prisioneiro.
O inimigo é uma versão futura do grupo.
O nobre é um orc disfarçado.
A estrela cadente é um ovo.
O culpado é o cachorro.
O mapa estava certo, o mundo é que mudou.
O pedido de ajuda vem de dentro da prisão.
A lenda foi escrita pelo vilão.
O herói lendário era uma mulher disfarçada.
O vilão é o filho do mentor.
O monstro só ataca quem tem medo.
O tesouro é uma pessoa.
A torre é um ser vivo.
A rainha é a mãe do vilão.
O feiticeiro está tentando morrer.
A missão já foi cumprida por outro grupo.
A cidade é governada por crianças.
O ladrão roubou para devolver ao dono.
O portal só leva de volta para casa.
O vilão foi um aventureiro como eles.
O sábio esqueceu tudo o que sabia.
O culto adora o próprio grupo.
`)

export const EXTRA_PLACE_HEADS = lines(`
Abismo
Açude
Alcácer
Alto
Angra
Arquipélago
Arrabalde
Atol
Bairro
Bastião
Bosquedo
Brenha
Cabeço
Caminho
Canal
Canhada
Capoeira
Castro
Catarata
Caverna
Chapada
Charco
Clareira
Coxilha
Degrau
Delta
Dique
Duna
Encosta
Escarpa
Espigão
Estreito
Fajã
Falésia
Fiorde
Fortim
Fosso
Garganta Funda
Geleira
Gruta Funda
Horto
Istmo
Jardim Suspenso
Ladeira
Lagoa Funda
Lapa
Largo
Mangue
Mar
Matagal
Mirante
Montanha
Morro
Muralha Velha
Nascente
Oásis
Ourela
Paul
Penedo
Penhasco
Península
Picoto
Pradaria
Quebrada
Rampa
Recife
Reino
Restinga
Rochedo
Rua
Savana
Sertão
Socalco
Sumidouro
Talude
Tapera
Terreiro
Tundra
Vale Fundo
Vereda
Vila Velha
Vulcão
Atoleiro
Baixada
Cachoeira
Cerrado
Corredeira
Deserto
Enseada Velha
Estuário
Fortaleza Velha
Ilhota
Lajedo
Monturo
Pântano Velho
Planura
Remanso
Salina
`)

export const EXTRA_PLACE_TAILS = lines(`
da Coruja Branca
do Rei Sem Coroa
das Águas Claras
do Sangue Antigo
das Cem Lanternas
do Dragão Vermelho
da Velha Bruxa
dos Pescadores
do Barco Afundado
das Pedras Que Falam
do Último Suspiro
da Fé Perdida
dos Ventos Uivantes
do Lobo Solitário
das Flores Mortas
do Cavaleiro Caído
da Lua Sangrenta
dos Ossos Brancos
do Ferreiro Morto
da Rainha Esquecida
dos Cem Degraus
do Ouro Maldito
das Nove Irmãs
do Bosque Escuro
da Água Salgada
dos Leões
do Corvo Negro
do Gigante Adormecido
da Estrela Polar
dos Mortos-Vivos
do Mago Louco
das Mil Ilhas
do Trovão Antigo
da Serpente Marinha
dos Sete Ventos
do Sol Negro
das Sombras Longas
do Monge Silencioso
da Fonte Seca
dos Ferreiros
do Porto Velho
das Raízes Profundas
do Navio Fantasma
da Torre Quebrada
dos Ladrões
do Juiz Enforcado
das Campainhas
do Cão Negro
da Pedra Furada
dos Enforcados Velhos
do Vale Sombrio
das Correntes Partidas
do Carvalho Antigo
da Névoa Prateada
dos Sinos Mudos
do Cálice Dourado
das Cinzas Frias
do Eremita Louco
da Ponte Velha
dos Corvos Brancos
do Lago Sem Fundo
das Fadas Dançantes
do Machado Sangrento
da Mina Abandonada
dos Reis Mortos
do Grifo Dourado
das Mil Velas
do Pastor Perdido
da Lua Partida
dos Navegantes Perdidos
do Bispo Louco
das Asas Negras
do Senhor das Moscas
da Rosa Negra
dos Tambores
do Vento Gelado
das Ruínas Antigas
do Dente de Dragão
da Montanha Partida
dos Caçadores
do Pântano Fedido
das Pedras Brancas
do Rio Vermelho
da Floresta Cantante
dos Templos
do Cemitério Velho
das Trevas
do Unicórnio Branco
da Sereia Triste
dos Anões Perdidos
do Céu Aberto
das Folhas Douradas
do Abismo Negro
da Coroa de Espinhos
dos Mercadores
do Moinho Queimado
das Abelhas de Ouro
da Última Batalha
dos Sussurros Antigos
do Lago das Fadas
das Três Torres
do Castelo Caído
da Guerra Esquecida
dos Cervos Brancos
do Pinheiral
das Águas Termais
do Vulcão Adormecido
da Rocha Negra
dos Pássaros Mudos
do Mosteiro Vazio
das Cavernas Cantantes
do Lobo Cinzento
da Feiticeira
dos Peregrinos Mortos
do Imperador
das Marés Altas
do Oráculo
da Esperança Perdida
dos Gigantes de Pedra
do Ninho de Águia
das Crianças Perdidas
do Selo Partido
da Fogueira Eterna
dos Pântanos Verdes
do Céu Vermelho
das Lanças Partidas
do Velho Farol
da Estrada Perdida
dos Fantasmas
do Rei Corvo
das Pedras Cantantes
do Inverno Eterno
da Primavera Eterna
dos Dragões Mortos
do Tesouro Escondido
das Correntezas
do Templo Afundado
da Velha Estrada
dos Tecelões
do Sal e do Sangue
das Árvores Brancas
do Cavalo Branco
da Chuva Eterna
dos Mil Olhos
do Monte Calvo
das Fogueiras
do Poço Seco
da Aranha Gigante
dos Duendes
do Cometa
das Brumas Douradas
do Rio Gelado
da Vila Queimada
dos Arqueiros
do Barão Vermelho
das Lamparinas
do Javali Branco
da Ponte dos Suspiros
dos Contrabandistas Mortos
do Altar Partido
das Coroas
do Lince Dourado
da Cidade Submersa
dos Vigias Mortos
`)

export const EXTRA_MAGIC_ITEMS = lines(`
Algema
Âncora
Arpão
Avental
Baú
Bainha
Balança
Bandeira
Barril
Bastão de Guerra
Berrante
Bigorna
Bolsa de Moedas
Bota de Montaria
Braçal
Bracelete de Ferro
Broquel
Cabaça
Cachimbo
Cadeira
Caixa de Música
Cálice de Cristal
Caneca
Capacete
Carta de Baralho
Castiçal
Cetro de Ossos
Chicote
Chifre
Cimitarra Curva
Cinto de Couro
Colar de Dentes
Concha
Coração de Pedra
Corrente
Diadema
Disco
Escova
Esfera
Espora
Estandarte
Faca de Caça
Faixa
Flecha
Foice de Prata
Frigideira
Gaita
Gema Negra
Gorro
Grilhão
Harpa Pequena
Ídolo
Jarro
Joia
Lâmina Curta
Lanterna de Papel
Lápis
Lenço
Livro de Orações
Luneta
Machadinha
Malho
Manto de Penas
Manopla
Mapa
Máscara de Ferro
Medalha
Moeda
Mosquete
Navalha
Ocarina
Ovo
Pá
Pandeiro
Pena de Escrever
Pente
Pergaminho Selado
Pião
Picareta
Pistola
Pote
Pulseira
Punhal
Relógio
Remo
Rosário
Sabre
Saco
Sandálias
Selo
Sino Pequeno
Tambor de Guerra
Tapa-olho
Tesoura
Tiara de Ossos
Tocha
Trompa
Urna
Vara de Pescar
Vela Negra
Véu
Violino
Xícara
Zarabatana
`)

export const EXTRA_MAGIC_POWERS = lines(`
que transforma o dono em névoa por um instante
que conta a verdade sobre qualquer moeda
que faz o vinho nunca acabar
que deixa o dono falar com fantasmas
que impede de ser envenenado uma vez por dia
que encontra o caminho de qualquer labirinto
que faz chover só sobre o dono
que permite ver através de paredes de madeira
que faz o dono flutuar sobre a água
que acorda quem dorme por magia
que faz a voz do dono soar como de outro
que esquenta comida fria
que transforma pedras em pão uma vez por semana
que deixa o dono ler qualquer escrita
que guarda um raio de sol para soltar no escuro
que faz animais selvagens obedecerem
que acelera o crescimento de cabelo e barba
que faz o dono nunca se perder na neve
que revela o nome verdadeiro de uma criatura
que cria uma ponte de luz por um minuto
que faz cordas se amarrarem sozinhas
que torna o dono imune a ilusões
que mostra os sonhos de quem dorme por perto
que faz plantas murcharem ou florescerem
que reflete a luz como um espelho cegante
que transforma água em gelo ao toque
que faz um objeto pequeno voar até a mão
que permite respirar fumaça sem tossir
que deixa pegadas que somem logo depois
que faz o dono ouvir a uma milha de distância
que aumenta a força num momento de desespero
que esconde o dono de mortos-vivos
que faz o tempo passar devagar para o dono
que abre portais para um lugar já visitado
que transforma o dono em gato por uma hora
que congela o fogo
que cria uma bolha de ar debaixo d'água
que faz o portador ser esquecido por inimigos
que localiza a pessoa mais próxima em perigo
que transforma lágrimas em pérolas
que permite falar com árvores
que avisa quando alguém pensa no dono
que faz o dono se lembrar de tudo o que leu
que transforma moedas de cobre em prata por um dia
que faz armas inimigas pesarem como chumbo
que cria fogos de artifício com um estalo
que permite subir paredes como aranha
que mostra o caminho para o tesouro mais próximo
que transforma a sombra do dono em aliada
que deixa o dono mudar a cor dos olhos
que impede o dono de mentir, e de ser enganado
que cura doenças de animais
que faz soar um alarme quando roubado
que transforma o dono em pedra para se proteger
que deixa o dono andar pelo fogo
que cria um escudo de vento
que faz o dono pular de telhado em telhado
que permite ouvir a música das estrelas
que muda o clima de uma sala
que faz uma pessoa contar um segredo
que torna um mapa sempre atualizado
que deixa o dono invisível a cães
que encolhe objetos para caberem no bolso
que faz uma porta levar para outro lugar
que transforma o grito em trovão
que mostra o rosto de quem fez o objeto
que repele chuva
que faz o dono ser amado por crianças e odiado por gatos
que acende velas a distância
que faz o portador acordar descansado sempre
que deixa marcas brilhantes para seguir
que permite falar com o próprio reflexo
que transforma vinho em água (e não o contrário)
que aumenta a sorte em jogos de dados
que faz flores nascerem onde o dono pisa
que transforma o dono em sombra à meia-noite
que cria uma corda de luz
que mostra a idade verdadeira de alguém
que detecta ouro sob a terra
que protege contra maldições menores
que faz uma promessa virar contrato mágico
que deixa o dono saltar no tempo por um segundo
que transforma sons em cores
que permite segurar o fogo nas mãos
que avisa quando chove a cem léguas
que faz a comida de quem tocar ficar salgada
que transforma o portador em estátua de sal (cuidado)
que faz o dono atravessar espelhos
que acalma tempestades no mar
que chama um corvo mensageiro
que mostra o caminho mais curto até a taverna mais próxima
que cria uma lareira mágica em qualquer lugar
que deixa o dono imune ao medo
que permite trocar de lugar com quem está à vista
que faz o portador brilhar no escuro
que transforma o ouro em chumbo nas mãos de ladrões
que deixa o dono ouvir pensamentos de animais
que faz uma flecha sempre voltar
que transforma a voz em canto irresistível
que cria uma ilusão de exército
que faz a neve parar de cair
que revela o caminho de um fugitivo
que deixa o dono andar sobre nuvens baixas
que torna o portador maior por um minuto
que faz um inimigo dormir com uma canção
que transforma lama em pedra
que deixa o dono sentir mentiras como frio na pele
que faz pedras flutuarem
que traz de volta a última palavra dita por um morto
`)

export const EXTRA_MAGIC_QUIRKS = lines(`
Chora quando é usado.
Pede comida todo dia ao meio-dia.
Só funciona se o dono rir.
Tem cheiro de canela.
Perde o poder em dias de chuva.
Muda de nome a cada dono.
Cochicha piadas sem graça.
Esquenta quando há ouro por perto.
Exige um verso antes de funcionar.
Faz as velas tremerem.
Aparece sempre no último lugar procurado.
Assobia quando há perigo.
Só obedece a quem nunca matou.
Tem medo de cachorros.
Fala com voz de criança.
Dá soluços ao dono depois do uso.
Cria pequenas flores ao redor.
Brilha quando o dono está apaixonado.
Pesa o dobro nas mãos de quem mente.
Sussurra o futuro de forma confusa.
Faz o dono espirrar purpurina.
Detesta ficar no escuro.
Pede para conhecer o mar.
Só funciona às quintas-feiras.
Exige ser chamado de “senhor”.
Fica quente perto de anões.
Atrai abelhas.
Muda de cor a cada lua.
Tem uma marca de mordida.
Canta hinos fúnebres à meia-noite.
Faz o cabelo do dono cachear.
Pede desculpas depois de falhar.
Tem saudade do antigo dono e fala dele.
Fica frio perto de mentirosos.
Brilha quando alguém próximo vai morrer.
Exige ser lavado em leite.
Só funciona se o dono estiver com fome.
Faz eco das palavras do dono.
Some ao ouvir um sino.
Faz as plantas se inclinarem para ele.
Range quando é guardado.
Odeia magos e se recusa a funcionar perto deles.
Tem um rosto que muda de expressão.
Atrai moscas.
Deixa um gosto de ferro na boca.
Ri quando o dono cai.
Exige um nome novo a cada uso.
Se recusa a funcionar em igrejas.
Faz o dono sonhar com o mar.
Brilha em verde quando há veneno.
Tem uma inscrição que só aparece na lua cheia.
Esfria quando alguém fala do passado.
Treme perto de dragões.
Toca música baixinha quando ninguém fala.
Faz o dono ficar com sardas.
Escolhe o próximo dono sozinho.
Atrai olhares de gatos.
Fica pesado quando o dono está triste.
Sangra quando é quebrado.
Fala só em rimas.
Esconde-se em bolsos alheios.
Tem cheiro de mar.
Pisca quando há um segredo por perto.
Faz o dono enxergar mal de um olho por um dia.
Se recusa a ser vendido.
Volta sozinho se jogado fora.
Brilha mais forte perto do lugar onde foi criado.
Exige ser guardado numa caixa de veludo.
Fica com fome de histórias.
Faz o dono falar com sotaque.
Tem uma rachadura que se fecha com o tempo.
Só funciona se ninguém tiver visto o dono usá-lo antes.
Grita em tom agudo quando tocado por outro.
Prefere ser carregado na mão esquerda.
Esquenta perto de fogo e explode se esquecido nele.
Brilha com a luz das estrelas.
Faz os cachorros uivarem.
Pede para ser apresentado aos amigos do dono.
Tem um gosto amargo, e alguém já tentou provar.
Muda de tamanho ao longo do dia.
Rejeita donos com barba.
Repete conversas antigas em sonhos.
Fica gelado no verão.
Faz o dono ver fantasmas sem querer.
Brilha quando o dono pensa em ouro.
Fica desbotado com o tempo e volta a brilhar com elogios.
Só funciona para quem tem um segredo.
Se apega a crianças.
Tem a mania de desamarrar cadarços.
Atrai raios em tempestades.
Pede para ser enterrado com o dono.
`)

export const EXTRA_FACTION_NOUNS = lines(`
Associação
Batalhão
Brigada
Cabala
Cartel
Comunhão
Congregação
Consórcio
Coorte
Corporação
Credo
Esquadrão
Facção
Federação
Grêmio
Hoste
Junta
Linhagem
Loja
Matilha
Milícia
Movimento
Núcleo
Ordem Secreta
Patrulha Noturna
Quadrilha
Regimento
Reunião
Rebelião
República
Seita Oculta
Tropa
`)

export const EXTRA_FACTION_EMBLEMS = lines(`
da Adaga Silenciosa
do Anel de Ferro
da Ampulheta
da Aranha Negra
do Arco Partido
da Árvore Morta
da Asa Quebrada
do Bastão Dourado
da Bússola
do Cálice de Sangue
da Caveira Sorridente
do Cervo Dourado
da Chave Negra
do Cinzel
do Círculo de Prata
da Cobra Branca
da Corrente de Ouro
do Cometa
da Concha
do Coração Partido
do Corvo Vermelho
da Cruz Negra
do Dente de Lobo
do Dragão Dourado
da Engrenagem
da Espiga
da Espora
da Estrela Cadente
da Faca Torta
do Falcão Negro
do Farol
da Ferradura
da Flor de Lótus
da Foice
da Fonte
do Fogo Azul
da Garra
do Grifo Negro
do Gato Preto
da Harpa
do Javali Branco
da Lâmpada
do Leão Dourado
do Livro Aberto
do Lírio Negro
do Lobo Branco
da Lua de Prata
da Mão Aberta
do Manto Cinza
do Mar Negro
da Máscara Dourada
do Martelo de Prata
da Mosca
da Noite Estrelada
do Olho Vermelho
da Onda
da Pena Negra
do Pergaminho
da Pedra Negra
do Pássaro de Fogo
do Polvo
da Ponte
do Punhal de Ouro
da Rosa Branca
da Roda
do Sapo Dourado
do Selo Negro
da Serpente Verde
do Sino de Prata
do Sol Dourado
da Tartaruga
da Teia Dourada
do Tigre
do Touro Vermelho
da Tocha
do Tridente
do Trevo
do Unicórnio Negro
da Urtiga
do Urso Negro
do Vento Norte
da Vela Branca
do Veneno
do Vinho Negro
da Vespa
do Machado Dourado
da Pluma
da Coroa Partida
do Lago Escuro
da Montanha Sagrada
das Cinco Pontas
do Espinho
da Estrada Sangrenta
do Escaravelho
do Barco Negro
da Corda
do Elmo Dourado
do Templo Caído
`)

export const EXTRA_FACTION_GOALS = lines(`
derrubar a guilda dos mercadores
achar a cidade perdida dos magos
proteger os dragões da extinção
dominar o comércio de pólvora
espalhar uma religião antiga
reunir os fragmentos de uma espada sagrada
destronar o conselho dos anciãos
abrir uma escola de magia para pobres
proibir a caça de unicórnios
monopolizar o comércio de vinho
encontrar o último herdeiro de um reino caído
transformar a cidade num estado livre
roubar o tesouro do dragão vermelho
banir todos os elfos do reino
proteger os segredos da ordem
casar o líder com a rainha
fundar uma colônia além-mar
controlar os portos do norte
destruir o culto rival
libertar os autômatos escravizados
encontrar a fonte da imortalidade
reunir os mortos para uma guerra
proteger o equilíbrio entre luz e trevas
expulsar os orcs das montanhas
dominar a produção de papel
construir uma frota de navios voadores
garantir que o rei nunca tenha herdeiros
espalhar a peste entre os inimigos
apagar todos os registros de um crime
criar um império de informação
abrir a passagem para o mundo inferior
guardar a última semente da árvore sagrada
achar a caixa que contém o inverno
proteger a floresta dos humanos
dominar a guilda dos ladrões
substituir o rei por um sósia
acabar com a escravidão nas minas
trazer de volta um deus esquecido
controlar a água da cidade
derrubar as muralhas da capital
reconstruir a ordem de cavaleiros
encontrar a cura para uma maldição antiga
roubar os sonhos das pessoas
escrever a história do reino do jeito deles
controlar os mercados de grãos
proteger os mortos de necromantes
recuperar terras ancestrais
dominar as rotas de seda
criar uma raça nova de criaturas
destruir todos os livros de magia
ensinar todos a ler
abrir um caminho seguro entre os reinos
espionar os magos da torre
reconstruir uma cidade destruída
proteger um portal antigo
eleger um governante do povo
roubar as estrelas do céu (dizem)
fundar uma igreja nova
controlar o tráfico de relíquias
destruir uma linhagem de vampiros
caçar todos os lobisomens
manter um dragão adormecido
derrubar uma tirania sem sangue
roubar a coroa da rainha das fadas
`)

export const EXTRA_FACTION_METHODS = lines(`
leilões de favores
duelos clandestinos
apostas viciadas
envenenamentos em banquetes
falsos milagres
contratos de servidão
espiões nas cozinhas dos nobres
cartas de amor falsificadas
sequestros de animais de estimação
venda de indulgências
tribunais de honra secretos
roubos de identidade
máscaras e disfarces
contrabando de livros
infiltração nas guildas
controle dos sinos da cidade
mensagens em canções de taverna
propinas a coletores de impostos
alianças com criaturas da floresta
sabotagem de pontes
falsificação de mapas
domínio dos correios
manipulação do clima
pactos com fantasmas
compra de votos
tratados secretos
assassinos treinados em escolas de dança
redes de mendigos espiões
mercadores itinerantes
controle de orfanatos
proteção de prostíbulos
mapas de túneis secretos
ataques a caravanas
furtos em templos
falsos sequestros
patrocínio de artistas
cobrança de pedágios ilegais
venda de proteção mágica
recrutamento de órfãos
infiltração em mosteiros
controle de fontes e poços
promessas de terra
bilhetes premiados falsos
controle das prisões
apoio a pretendentes ao trono
recompensas por cabeças
golpes em jogos de cartas
pombos-correio treinados
fabricação de relíquias
`)

export const EXTRA_DEITY_SYLLABLES = lines(`
al
as
bo
de
du
ef
ga
gi
he
in
is
ke
le
lo
mu
na
ni
ol
om
pa
po
ro
se
ti
ur
va
xi
ya
ze
gor
mal
ner
sha
thar
vel
zor
kai
lun
`)

export const EXTRA_DEITY_DOMAINS = lines(`
das marés vermelhas
dos ferreiros e das forjas
das parteiras
dos cegos
das ruínas
dos mendigos honestos
das águas termais
dos cães
dos gatos
das sementes
dos moinhos
do pão
do sal
do mel
das abelhas sagradas
das pontes
das encruzilhadas noturnas
dos espelhos
das máscaras
dos atores
dos poetas
dos carrascos
dos mercenários
das prostitutas
dos mineiros
dos pescadores
dos lenhadores
das colheitas tardias
da primeira neve
do degelo
do vento leste
das cinzas
da fumaça
dos terremotos
dos cometas
dos eclipses
do sono sem sonhos
das ilusões
das portas
das chaves
dos caminhos perdidos
das lamentações
dos risos
do vinho tinto
dos banquetes
do jejum
dos votos de silêncio
da vingança justa
do perdão
dos exilados
dos órfãos e das viúvas
das bibliotecas perdidas
da escrita
das runas
dos números
do acaso
das apostas
dos duelos
do fogo doméstico
das lareiras
das árvores antigas
dos rios subterrâneos
das cavernas
dos morcegos
das corujas
dos corvos
das serpentes
dos lobos
dos cervos
dos cavalos selvagens
do gelo eterno
das areias
dos oásis
das estrelas cadentes
das auroras
do crepúsculo
da meia-noite
`)

export const EXTRA_DEITY_SYMBOLS = lines(`
um sino rachado
uma coroa de folhas de carvalho
uma serpente em espiral
uma lua dentro de um sol
uma mão segurando uma chama
um cervo com chifres de prata
uma chave dourada
uma lágrima de sangue
um olho dentro de um triângulo
uma pena de corvo
uma ampulheta quebrada
uma rede de pescador
uma lanterna acesa
um martelo e uma pena
uma flor de sete pétalas
uma estrela cadente
um caldeirão fumegante
uma máscara dourada sorrindo
uma máscara prateada chorando
uma roda de oito raios
uma espada fincada numa pedra
um coração em chamas
uma coruja com olhos de rubi
uma abelha dourada
uma colmeia de pedra
uma espiga de trigo dourada
um pão partido
um barco de papel
uma onda enrolada
um floco de neve de seis pontas
um raio partindo uma árvore
uma árvore com raízes visíveis
um lobo uivando para a lua
um gato de três olhos
uma serpente com asas
uma balança com uma pena e um coração
uma corrente quebrada
uma vela derretida
um escudo com um olho
uma flecha apontando para cima
uma lira dourada
um cálice com uma serpente
uma pedra com um buraco
um labirinto circular
uma montanha com uma coroa
um vulcão em erupção
um sol negro
uma lua vermelha
uma mão com seis dedos
um livro fechado com cadeado
um crânio coroado de flores
uma pena em chamas
uma gota de orvalho
uma teia com uma estrela
um cavalo alado
um peixe dourado
uma âncora com asas
uma tocha invertida
uma espiral dupla
um arco-íris partido
um dente de dragão
um grão de areia gigante
uma porta entreaberta
uma escada que desce
uma ponte de pedra
um anel de fogo
um tambor de pele
um chifre de caça
uma máscara sem rosto
um bastão com uma serpente e uma pomba
`)

export const EXTRA_DEITY_TENETS = lines(`
Nunca negue água a quem tem sede.
Respeite os mortos e eles respeitarão você.
Não durma com raiva.
Não ofereça o que não pode dar.
Trate o inimigo vencido com honra.
Não toque no fogo sagrado com mãos sujas.
Fale a verdade, mesmo quando doer.
Ajude o viajante perdido.
Não feche os olhos de um morto que ainda não foi perdoado.
Guarde um dia por semana para o silêncio.
Toda criança é sagrada.
Não roube de um templo, nem de um inimigo.
Pague o que deve antes do fim do ano.
Divida a colheita com quem passa fome.
Não acenda fogo em noite de lua nova.
Respeite o mar e ele devolverá os seus.
Não mate o que não vai comer.
A palavra de um mendigo vale tanto quanto a de um rei.
Lute somente para proteger.
Nunca ria da dor alheia.
Acenda uma lanterna para quem está no escuro.
Não durma sob o céu sem agradecer às estrelas.
O conhecimento deve ser compartilhado.
Não quebre um juramento feito diante do fogo.
Plante uma árvore quando nascer um filho.
Honre os velhos e ouça os jovens.
Não negue abrigo a um animal ferido.
Faça um sacrifício a cada vitória.
Toda mentira deve ser paga.
Não cobice o que pertence ao templo.
A música é uma oração.
Não derrame vinho no chão sem motivo.
Respeite o silêncio dos que oram.
Cumpra a vingança apenas uma vez.
Não deixe um inimigo sem enterro.
A coragem é o maior presente.
Não use a magia para o mal.
Seja hospitaleiro com o estrangeiro.
Nunca ataque pelas costas.
Agradeça cada refeição.
O sangue derramado em vão envenena a terra.
Não profane os túmulos.
O trabalho é uma forma de reza.
Toda dor tem um propósito.
A beleza deve ser cultivada.
Não esqueça os seus antepassados.
Proteja o fogo da sua casa.
Nunca venda um amigo.
O riso afasta os demônios.
A vida é um empréstimo dos deuses.
Respeite os juramentos dos outros.
Cuide dos órfãos da sua aldeia.
Não profira o nome do deus em vão.
Celebre o primeiro dia de cada estação.
O perdão é mais forte que a espada.
Não cace na época dos filhotes.
A paciência é sagrada.
Não acumule ouro enquanto houver fome.
Faça uma peregrinação antes de morrer.
A justiça deve ser cega e surda.
`)

export const EXTRA_DUNGEON_ROOMS = lines(`
Uma sala de banquete com esqueletos ainda sentados
Uma câmara de tesouro com um cofre gigante
Uma prisão com celas suspensas
Uma sala com um poço que brilha
Uma galeria de estátuas de heróis sem rosto
Uma estufa com flores carnívoras gigantes
Um templo a um deus serpente
Uma sala de máquinas de anões
Um laboratório com frascos borbulhando
Uma sala com um lago subterrâneo e uma ilha
Um salão com um trono de gelo
Uma biblioteca com escadas que se movem
Uma sala de espelhos que não refletem
Uma câmara com um relógio gigante
Uma sala de tortura com uma única cadeira
Um quarto infantil com um berço balançando
Uma cozinha enorme com caldeirões de bronze
Uma adega com barris de vinho de mil anos
Um viveiro de aranhas gigantes
Uma sala circular com uma estátua no centro
Uma câmara de rituais com um pentagrama
Um salão de baile com um piano que toca sozinho
Uma sala com o teto de vidro mostrando as estrelas
Uma forja de magia com runas no chão
Um salão de guerra com mapas na mesa
Uma sala com centenas de portas pequenas
Um quarto de dormir de um rei antigo
Uma caverna de cristais que cantam
Uma ponte de pedra sobre um abismo sem fundo
Um aquário com criaturas desconhecidas
Uma sala de jogos com um tabuleiro gigante
Um arsenal com armas mágicas presas na parede
Uma sala de troféus com cabeças de dragões
Um observatório com um telescópio enorme
Uma sala com uma árvore de ouro
Um túnel com paredes de ossos
Uma câmara com uma cachoeira interna
Uma sala de estudos de um mago louco
Um teatro com bonecos de madeira
Uma sala com um tabuleiro de xadrez vivo
Um mausoléu com dezenas de sarcófagos
Uma sala de banho romana com águas quentes
Uma galeria de quadros que mudam
Uma sala com uma porta pintada no teto
Uma câmara cheia de areia movediça
Um salão com colunas que se movem
Uma sala de jantar posta para treze
Um corredor de armaduras animadas
Uma capela de vidro colorido
Uma sala com um portal desativado
Um depósito cheio de caixões vazios
Uma sala de música com instrumentos de ossos
Uma câmara de interrogatório
Um jardim de pedra com estátuas de animais
Um salão inundado até os joelhos
Uma sala com um lago de mercúrio
Uma cripta com um sarcófago de ouro
Uma oficina de brinquedos mecânicos
Uma sala de cristal que reflete pensamentos
Um poço de serpentes
Uma sala com um gigante adormecido
Uma câmara com um altar de sacrifícios
Uma biblioteca queimada
Um estábulo de cavalos esqueléticos
Uma sala com vento eterno
Uma sala cheia de moedas no chão
Um salão de tronos de dez reis
Um quarto secreto atrás de uma estante
Uma sala de espera com bancos e um sino
Uma câmara com um dragão de pedra
Uma sala de mapas de terras desconhecidas
Um salão com um lustre gigante de cristal
Uma sala de oráculo com fumaça perfumada
Um corredor de pinturas de olhos
Um salão de chá com xícaras flutuantes
Uma câmara de gelo com corpos congelados
Uma sala com um tear gigante
Uma forja abandonada com um martelo preso na bigorna
Um salão de festas decorado como se a festa fosse hoje
Uma sala com uma escada para o nada
Uma câmara com um coração de pedra batendo
Um quarto com um único quadro de um personagem
Uma sala de arquivos com fichas de todos os aventureiros
Um ninho gigante de pássaros de fogo
Um salão de duelos com marcas de sangue
Uma cela com um prisioneiro que se diz rei
Uma sala de enigmas com uma esfinge de pedra
Um laboratório de golens
Uma sala com um rio de lava
Uma câmara de vento com um moinho
`)

export const EXTRA_DUNGEON_FEATURES = lines(`
Há uma corrente de ar quente vindo do chão.
O teto está coberto de morcegos.
Há uma mensagem: “não olhe para trás”.
As paredes estão cobertas de musgo vermelho.
Há marcas de garras gigantes nas portas.
Um cheiro de comida recém-feita.
O chão está coberto de moedas falsas.
Há um esqueleto segurando uma chave.
As tochas acendem quando alguém entra.
Há uma estátua chorando sangue.
Ouve-se música ao longe.
O chão vibra como se algo respirasse.
Há penas brancas espalhadas.
Uma névoa verde cobre o chão.
Há pegadas pequenas, como de criança.
Uma corrente de água corre pelo teto.
Há uma porta com sete fechaduras diferentes.
Um relógio bate treze vezes.
Há uma mesa posta com comida estragada.
O ar tem cheiro de ferro.
Há uma inscrição em sangue seco.
As sombras se movem contra a luz.
Há um baú aberto com uma armadilha desarmada.
Há um mapa riscado numa parede.
O chão está molhado e escorregadio.
Há cordas penduradas do teto.
O eco imita vozes conhecidas.
Há sacos de dormir abandonados.
Há uma pilha de armaduras enferrujadas.
Uma luz azul pisca na escuridão.
Há uma fonte com água cristalina.
Há moedas presas nas paredes.
Ouve-se um choro de bebê.
Há marcas de queimadura em forma de mão.
Há um gato que fala.
Uma brisa fria vem de uma fresta.
Há uma estátua com um olho de rubi faltando.
Os passos não fazem barulho.
Há uma armadilha visível demais.
Há poeira dourada no ar.
Uma tocha está acesa há séculos.
Há um alçapão sob um tapete.
Há um espelho coberto por um pano.
Há pegadas de botas indo e nenhuma voltando.
Há uma criatura presa numa gaiola.
Uma risada ecoa de vez em quando.
Há um diário aberto na última página.
Há velas derretidas formando um círculo.
Há uma escada que desce para a escuridão.
Há uma corrente presa ao chão com um elo partido.
Há um cheiro de enxofre forte.
Uma voz pede ajuda do outro lado da parede.
Há sinais de uma luta recente.
Há um quadro que observa.
Há um poço com um balde e uma corda.
Há teias com insetos enormes presos.
Há uma pilha de livros apodrecidos.
Há uma porta de ferro com marcas de unhas.
A temperatura sobe a cada passo.
Há uma placa: “cuidado com o cão”.
Há gotas de cera no chão.
Há uma flor crescendo entre as pedras.
Ouve-se o mar, embora longe da costa.
Há mosaicos mostrando uma batalha.
Há restos de uma fogueira ainda morna.
Há um esqueleto de dragão pequeno.
Há cogumelos que brilham azul.
A escuridão parece engolir a luz.
Há uma armadilha de rede acionada, vazia.
Há uma pedra que pulsa.
Há uma mesa de jogo com cartas espalhadas.
Há uma árvore crescendo do teto.
Há um sino pendurado sem badalo.
Há uma marca de mão na parede, ainda molhada.
Há um alfabeto riscado no chão.
Há uma corda de seda descendo de um buraco.
`)

export const EXTRA_DUNGEON_DANGERS = lines(`
um esqueleto de mago que lança feitiços
um piso falso sobre um fosso de espinhos
uma porta que esmaga quem passa devagar
um enxame de vespas mágicas
um basilisco escondido no escuro
um lodo verde que corrói armadura
um fantasma que possui o mais fraco
um golem de ferro adormecido
uma aranha que tece ilusões
um gás que faz rir até desmaiar
uma ponte que se dissolve
uma sala que enche de água
um teto de espinhos que desce
um mímico em forma de porta
um cão de fogo
uma cobra de duas cabeças
um elemental de água furioso
uma harpia faminta
uma múmia rainha
um vampiro jovem
um troll das cavernas
um guerreiro esqueleto com escudo
uma armadilha de fogo que dispara ao abrir o baú
um enigma mortal
um espelho que solta um sósia hostil
uma criatura feita de sombras
um ogro bêbado
uma tribo de kobolds com armadilhas
um minotauro perdido
um dragão negro jovem
uma colônia de ratos-zumbis
um demônio menor aprisionado
uma fada vingativa
uma armadilha de areia movediça
um corredor que gira
uma rocha gigante rolando
um poço que puxa quem chega perto
um espírito de criança chorando que ataca
um cavaleiro sem cabeça
um gárgula que finge ser estátua
um polvo gigante num lago subterrâneo
um bando de goblins ladrões
uma maldição que tira a voz
um gás que adormece por dias
um piso elétrico
uma gaiola que cai do teto
um elemental de fogo
um lich em descanso
uma hidra de três cabeças
uma armadura amaldiçoada que se veste sozinha
um corredor de lâminas giratórias
um necromante e seus servos
um bando de lobos fantasmas
um dragão de ossos
uma serpente marinha num poço
um morcego gigante
um espírito que rouba memórias
um anão louco com explosivos
um enxame de escaravelhos carnívoros
uma estátua de gárgula que grita
uma árvore que ataca com galhos
um guardião de pedra que pede uma senha
um bando de esqueletos arqueiros
uma armadilha de som
um orc xamã
um verme gigante
uma inundação súbita
uma tempestade dentro da sala
um labirinto de ilusões
um verme da carne
uma armadilha de gás ácido
uma boneca assassina
um mimetizador de vozes
um eco que fere
uma criatura que só se vê no espelho
`)

export const EXTRA_LEGEND_SUBJECTS = lines(`
Um cavaleiro que se apaixonou por uma estrela
Uma cidade que dorme cem anos e acorda um dia
Um navio que navega pelos rios do céu
Uma bruxa que roubou a primavera
Um gigante que construiu as montanhas
Uma rainha que se transformou em árvore
Um dragão que perdeu o fogo
Um bardo que encantou a própria morte
Uma ilha que aparece em noites de lua cheia
Uma floresta que guarda as almas dos heróis
Um lobo que guiou um exército
Uma princesa que roubou um trono de outro reino
Um mendigo que tinha a chave do céu
Um ladrão que roubou o coração de um deus
Um lago que mostra a verdade a quem olha
Uma torre construída por um único homem
Uma espada que chora quando mata
Uma coroa feita de lágrimas
Um rei que governou sem nunca falar
Um monge que viveu mil anos
Um sapo que era o deus da chuva
Um corvo que sabia todos os segredos
Uma mulher que costurou a noite
Uma criança que desafiou o mar
Um cavalo que nunca morria
Uma flauta que fazia dançar os mortos
Uma caverna que leva ao centro da terra
Um herói que lutou contra o sol
Uma cidade construída sobre as costas de uma baleia
Um mago que guardou o tempo numa ampulheta
Uma árvore que dá frutos de ouro uma vez por século
Um rio que nasceu das lágrimas de uma deusa
Uma montanha que engoliu um exército
Um pássaro que trazia a primavera
Uma estátua que ganha vida para proteger a cidade
Um pescador que pescou a lua
Um cavaleiro que guardou uma ponte por cem anos
Uma deusa que se casou com um mortal
Uma guerra entre o vento e o mar
Um anel que dá o poder de falar com animais
Um castelo construído em uma noite
Um homem que vendeu a própria sombra
Uma mulher que dança com o fogo
Um bosque onde o tempo para
Uma cidade de cristal sob o deserto
Um rei que trocou o reino por uma canção
Um ferreiro que forjou uma estrela
Uma princesa que dormiu dentro de uma maçã
Um caçador que caçou um deus
Um cão que esperou o dono por cem anos
Um poço que leva a outro mundo
Um eremita que conversava com a lua
Uma tempestade que tinha nome e vontade
Uma pedra que caiu do céu e falava
Um trono que escolhe o rei
Uma criança nascida de uma flor
Um povo que vive sob o lago
Um palácio feito de nuvens
Um demônio que queria ser humano
Um anjo que perdeu as asas por amor
Um herói que nunca existiu
Um mapa que mostra o caminho para casa
Um sino que só toca quando alguém mente
Uma tartaruga que carrega o mundo
Um cavaleiro de gelo que protege o inverno
Uma deusa que dorme no fundo do mar
Uma cidade que foi apagada da história
Um tesouro guardado por um enigma infantil
Um jardim que só floresce na escuridão
Um grifo que serviu a um rei mendigo
Uma lança que nunca erra
Um véu que esconde o fim do mundo
Uma batalha vencida por crianças
Uma rainha que governou dos sonhos
Um lago de fogo que guarda um segredo
`)

export const EXTRA_LEGEND_TRUTHS = lines(`
É verdade, mas a criatura já morreu de velhice.
Só uma parte é verdade: a que ninguém acredita.
A lenda foi contada ao contrário.
É uma história de amor disfarçada de guerra.
Foi um castigo para quem ousou contar a verdade.
O herói existiu, mas era um vilão.
Um bardo inventou tudo para pagar uma dívida.
Os detalhes estão escondidos num vitral da catedral.
A lenda tem um final diferente em cada aldeia.
O objeto da lenda está no museu do rei.
A história aconteceu, mas em outro mundo.
O protagonista ainda conta a história nas tavernas.
A lenda é um mapa para quem souber ler.
A verdade foi apagada pela igreja.
Tudo aconteceu, mas a magia era truque.
O vilão da lenda era um aliado mal compreendido.
A lenda esconde uma receita.
A história é real e está prestes a se repetir.
O lugar existe, mas mudou de nome.
A lenda foi inventada por crianças e virou verdade.
Uma das versões é uma armadilha para curiosos.
A lenda é uma advertência sobre uma doença.
O que parece magia foi uma inundação.
A lenda é real, mas os nomes foram trocados.
A criatura da lenda vive na própria cidade.
O fim feliz foi acrescentado por um rei.
A lenda é um código usado por espiões.
Os sábios guardam a parte proibida.
A história é verdadeira, mas aconteceu ontem em outro lugar.
O objeto da lenda está nas mãos de um mendigo.
A lenda aponta para um tesouro já roubado.
É um mito criado para proteger um lugar sagrado.
A lenda guarda o nome verdadeiro de um demônio.
Uma família nobre mantém a lenda viva por interesse.
A história real é mais estranha que a lenda.
O herói foi uma mulher que se disfarçou de homem.
Tudo começou com uma piada.
A lenda foi escrita para assustar ladrões.
Há uma testemunha viva, muito velha.
O povo da lenda vive escondido até hoje.
A lenda é uma profecia que ainda não se cumpriu.
`)

export const EXTRA_MERCHANT_WARES = lines(`
amuletos de proteção contra fadas
penas de grifo
ovos de serpente
sementes de árvores gigantes
garrafas de luz das estrelas
espelhos de bolso encantados
tinta de polvo
cordas de cabelo de sereia
escamas de dragão de segunda mão
mapas desenhados à mão
botas que nunca se molham
capas de chuva de couro
facas de cozinha élficas
panelas que não queimam
lanternas de vagalume
óculos para ver no escuro
chás que fazem sonhar
velas que espantam mosquitos
sabonetes de lavanda
cachimbos de raiz de urze
dados encantados (viciados)
estatuetas de deuses estrangeiros
tapetes de lã de cabra
cobertores de pele de urso
sacos de dormir impermeáveis
cantis de couro
rações de viagem
bússolas que apontam para o tesouro (dizem)
ferramentas de anões
pregos de prata
balas de funda de chumbo
flechas com penas de ganso
arcos de teixo
espadas curtas de qualidade duvidosa
escudos de madeira pintados
elmos de couro
luvas de esgrima
cintos com bolsos secretos
anéis com veneno
perfumes de rosas do deserto
pós de maquiagem élfica
remédios para tosse
pomadas para queimaduras
xaropes de mel e limão
ervas para dor de dente
poções de amor (falsas)
poções de cura (verdadeiras, caras)
mel de abelhas de fogo
queijos que fedem muito
salsichas defumadas
pães de viagem que duram meses
frutas secas exóticas
nozes de terras distantes
especiarias picantes do oriente
sal negro de vulcão
açúcar em pedras
cacau em grão
café em grão torrado
tabaco de cachimbo aromático
cervejas em barril pequeno
licores de frutas raras
doces cristalizados
brinquedos de madeira
fantoches de pano
instrumentos de sopro
tambores de pele de cabra
cordas de alaúde
pergaminhos em branco
penas de escrever
tintas coloridas
almanaques com profecias
romances proibidos
relógios de areia
lupas de cristal
balanças de prata
cadeados que só abrem com música
gaiolas para pássaros
coleiras para cães de caça
ferraduras de prata
estribos de bronze
mantas para cavalos
barracas de lona
redes de dormir
redes de pesca
anzóis de osso
iscas que brilham
armadilhas para coelhos
armadilhas para lobisomens (ainda não testadas)
`)

export const EXTRA_MERCHANT_QUIRKS = lines(`
fala com os produtos como se fossem filhos
dá nome a cada mercadoria
só aceita pagamento em moedas antigas
pesa tudo na palma da mão
morde as moedas para conferir
chora quando perde uma venda
oferece um copo de vinho a cada cliente
conta piadas sobre outros mercadores
faz um desconto se o cliente souber cantar
grita os preços como um leiloeiro
fala baixinho como se fosse segredo
desconfia de todos que usam capa
exige que o cliente toque o produto antes de comprar
só vende para quem sabe o nome do seu cavalo
escreve o recibo em uma língua estranha
dá um troco a mais, de propósito
nunca olha o dinheiro
tem um sócio que é um papagaio
trabalha com uma luneta para ver ladrões
pergunta a profissão de cada cliente
é cego e reconhece moedas pelo som
tem a loja numa carroça puxada por um urso
não aceita regatear
tem um cachorro que late para quem vai roubar
usa uma balança mágica que não mente
vende tudo com uma história trágica
conta os passos dos clientes
fecha a loja quando chove
abre a loja só de madrugada
faz o cliente jurar segredo sobre o preço
acredita que tudo tem espírito
dá conselhos de vida com cada produto
tem uma lista de clientes favoritos pendurada
cobra mais de nobres
cobra menos de crianças
recusa vender para quem está triste
faz truques de mágica para distrair
vende a crédito e cobra com juros absurdos
tem uma filha que manda em tudo
jura que foi aventureiro
conhece todo mundo da cidade
ofende os clientes e eles voltam
anota tudo num livro de couro
só fala em terceira pessoa
cumprimenta cada cliente com uma reverência
dá presentes inúteis
nunca dá recibo
tem tatuagens de todos os portos
fala de política o tempo todo
canta enquanto pesa as mercadorias
coleciona moedas raras
dá desconto a quem já morreu uma vez (diz ele)
`)

export const EXTRA2_PLACE_TAILS = lines(`
da Velha Coroa
do Escudo Branco
das Raposas Ruivas
do Moinho Encantado
da Torre Sem Porta
dos Cem Lobos
do Lago Sereno
das Colinas Douradas
do Vau Gelado
da Colheita Farta
dos Sinos de Prata
do Rio Sinuoso
das Videiras
do Chapéu de Pedra
da Bruxa Velha
dos Pinheiros Negros
do Cavaleiro Verde
das Tochas
do Morro Calvo
da Corça Branca
dos Dois Irmãos
do Prado Florido
das Neves Eternas
do Gigante Morto
da Chuva Fina
dos Penhascos Brancos
do Mar de Sal
das Árvores Antigas
do Rei Pescador
da Pedra Sagrada
dos Cavalos Selvagens
do Lume Eterno
das Gaivotas
do Porto Esquecido
da Rainha Branca
dos Ventos Frios
do Oráculo Cego
das Mil Rosas
do Bosque Encantado
da Fonte Encantada
dos Moinhos
do Céu Estrelado
das Garças
do Lobo Ferido
da Sereia Dourada
dos Cardeais
do Martelo de Ouro
das Pedras Rolantes
do Arco-Íris
da Lua Nova
dos Trovões
do Sol de Inverno
das Ervas Daninhas
do Corvo Falante
da Árvore Oca
dos Barões
do Vinho Doce
das Lontras
do Coração de Leão
da Neve Vermelha
dos Andarilhos
do Escorpião
das Tempestades
do Fogo Azul
da Serpente Alada
dos Feiticeiros
do Trigo Dourado
das Cegonhas Brancas
do Último Rei
da Montanha Azul
dos Mares do Sul
do Pássaro Cantor
das Nascentes
do Velho Carvalho
da Lagoa Escura
dos Sete Lagos
do Grande Cervo
das Fadas Tristes
do Homem Verde
da Cruz Partida
dos Lobos Negros
do Pântano Sombrio
das Corujas
do Trono Partido
da Coroa Dourada
dos Ventos do Leste
do Mago Cinzento
das Brasas
do Rio de Prata
da Ilha Perdida
dos Ferreiros Anões
do Gelo Azul
das Lebres
do Pomar
da Videira Antiga
dos Campanários
do Javali Dourado
das Mil Fontes Claras
do Penhasco Vermelho
da Floresta Negra
`)

export const EXTRA2_TRINKETS = lines(`
um amuleto de vidro com uma flor prensada
uma moeda de bronze com um furo quadrado
uma caixinha de prata com um grilo seco
um selo de anel com um corvo
uma estatueta de barro de uma deusa grávida
uma pulseira de couro com um dente de leão
um pente de osso com runas
uma colher de chifre
um broche de cobre em forma de folha
uma corrente de prata com um elo de ouro
um frasco de areia de três cores
uma chave de ferro com cabeça de leão
um anel de estanho com uma pedra verde
um cálice pequeno de prata amassado
uma figura de cera de um cavaleiro
um búzio com um mapa riscado
uma pena de pavão presa num laço
um saco de bolinhas de vidro coloridas
um medalhão de latão com a foto de um gato (pintada)
um leque de papel com um poema
uma bússola de bolso que gira devagar
um amuleto de prata em forma de mão
um chocalho de criança de prata
um apito de madeira entalhado
uma boneca de palha vestida de rainha
um anel de ouro fino demais para um dedo humano
um lenço de seda com manchas de sangue antigas
uma tabuinha de cera com uma lista
um pequeno sino de vento de conchas
uma ponta de lança de bronze
um olho de vidro verde
um carimbo de madeira com um brasão
uma vela de cera de abelha perfumada
uma estrela de mar de prata
um par de dados de chifre
uma caixa de rapé com um retrato
um ídolo de pedra com um sorriso estranho
um tinteiro portátil de latão
uma tesourinha de unhas de prata
um par de brincos de concha
uma garrafinha de óleo perfumado
um amuleto de ferro com sete furos
um fuso de fiar de osso
uma bainha de faca bordada
um retrato pequeno de um nobre esquecido
uma moeda com um buraco e um fio vermelho
um broche em forma de chave
uma estatueta de ferro de um urso
um cristal de quartzo leitoso
uma caixa de costura de madeira entalhada
`)

export const EXTRA2_FACTION_EMBLEMS = lines(`
da Agulha de Prata
do Anzol Dourado
da Andorinha
do Arpão
da Balança Quebrada
do Barril
da Bigorna Rubra
do Bode Negro
da Borboleta Azul
do Cachimbo
da Cabra Branca
do Cajado Partido
da Campânula
do Capuz Vermelho
da Carruagem
do Castelo Negro
da Cegonha
do Cisne Negro
da Colmeia
do Colar de Ossos
da Cotovia
do Crisântemo
da Dama Branca
do Dado Viciado
da Espada Curta
do Espelho Partido
da Faca de Prata
do Feixe de Trigo
da Flauta
do Gavião
da Gralha
do Grão de Areia
da Lança Dourada
do Lenço Vermelho
da Lira Partida
do Macaco
da Maçã Dourada
do Moinho
da Moeda Furada
do Navio Fantasma
da Noz
do Olho Fechado
da Ostra
do Pavão
da Pedra da Lua
do Peixe Dourado
da Pena Branca
do Pinheiro
da Raposa Branca
do Relâmpago
da Ripa
do Sapo Negro
da Seta Dourada
do Sino Rachado
da Taça Partida
do Tambor
da Tesoura
do Texugo
da Torre Branca
do Trigo Negro
da Truta
do Vaga-lume
da Videira
do Violino
da Vela Negra
do Zangão
da Âncora Negra
do Cachorro Louco
da Coroa de Ferro
do Dragão Branco
`)

export const EXTRA2_DEITY_DOMAINS = lines(`
dos mensageiros
das estalagens
dos viajantes perdidos
das tempestades de neve
dos barqueiros
das últimas palavras
das promessas quebradas
dos tesouros enterrados
das pedras preciosas
dos ferreiros anões
dos lagos gelados
das flores do campo
dos vinhedos
dos jogos de dados
das máscaras de festa
das cidades em ruínas
dos navios perdidos
das cicatrizes
das lágrimas
dos risos de criança
dos sinos
das bandeiras
dos juramentos de sangue
das fronteiras do mundo
dos sonhos proféticos
das crianças perdidas
dos ventos do sul
das noites sem lua
dos pastores
das colmeias
dos tecelões
dos espelhos partidos
dos labirintos
das sementes enterradas
das fogueiras de inverno
dos náufragos
das lamparinas
dos caçadores de monstros
das bruxas boas
`)
