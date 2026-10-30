/**
 * Tabelas dos geradores das Ferramentas do mundo (Wiki › Ferramentas e Campanhas › Ferramentas). Só dados: o sorteio
 * fica em `wiki-tools.ts`. Fantasia medieval em português, sem marcas nem nomes de obras de terceiros. Para acrescentar
 * opções basta pôr mais itens nas listas; os testes conferem que nenhuma lista tem repetidos.
 */

import { MORE_FEMALE_NAMES, MORE_MALE_NAMES, MORE_SURNAMES, MORE_PROFESSIONS, MORE_DESIRES, MORE_SECRETS, MORE_TRAITS, MORE_LOOKS, MORE_HOOK_EVENTS, MORE_HOOK_TURNS, MORE_RUMORS, MORE_TAVERN_NOUNS, MORE_TAVERN_ADJECTIVES, MORE_DISHES, MORE_DRINKS, MORE_TAVERN_DETAILS } from "./generator-tables-pessoas"
import { MORE_COIN_AMOUNTS, MORE_COIN_KINDS, MORE_TRINKETS, MORE_TREASURE_EXTRAS, MORE_WEATHER, MORE_ENCOUNTERS, MORE_TWISTS, MORE_PLACE_HEADS, MORE_PLACE_TAILS, MORE_MAGIC_ITEMS, MORE_MAGIC_POWERS, MORE_MAGIC_QUIRKS, MORE_FACTION_NOUNS, MORE_FACTION_EMBLEMS, MORE_FACTION_GOALS, MORE_FACTION_METHODS, MORE_DEITY_SYLLABLES, MORE_DEITY_DOMAINS, MORE_DEITY_SYMBOLS, MORE_DEITY_TENETS, MORE_DUNGEON_ROOMS, MORE_DUNGEON_FEATURES, MORE_DUNGEON_DANGERS, MORE_LEGEND_SUBJECTS, MORE_LEGEND_TRUTHS, MORE_MERCHANT_WARES, MORE_MERCHANT_QUIRKS } from "./generator-tables-mundo"

export type Gender = "m" | "f"

// ---------- Pessoas ----------

export const FEMALE_NAMES = [
  "Ana", "Beatriz", "Luísa", "Yara", "Dandara", "Inês", "Conceição", "Catarina", "Mariana", "Leonor",
  "Isabel", "Teresa", "Joana", "Margarida", "Helena", "Sofia", "Clara", "Benedita", "Rosa", "Filipa",
  "Aurora", "Iara", "Jacira", "Moema", "Potira", "Irani", "Maiara", "Jurema", "Araci", "Tainá",
  "Brites", "Guiomar", "Violante", "Mécia", "Urraca", "Sancha", "Branca", "Briolanja", "Leonarda", "Estefânia",
  "Celeste", "Graça", "Glória", "Luz", "Esperança", "Constança", "Amélia", "Olívia", "Lavínia", "Matilde",
  "Zuri", "Nala", "Ayo", "Imani", "Kaya", "Ondina", "Iolanda", "Selene", "Maia", "Íris",
  "Rafaela", "Gabriela", "Débora", "Raquel", "Judite", "Ester", "Noémia", "Rute", "Lia", "Sara",
  "Bárbara", "Cecília", "Doroteia", "Eulália", "Florbela", "Gertrudes", "Hermínia", "Isaura", "Laurinda", "Madalena",
  ...MORE_FEMALE_NAMES,
]

export const MALE_NAMES = [
  "João", "Caio", "Miguel", "Afonso", "Tiago", "Lúcio", "Rui", "Bento", "Duarte", "Nuno",
  "Henrique", "Fernão", "Gonçalo", "Martim", "Vasco", "Diogo", "Lourenço", "Pedro", "Simão", "Estêvão",
  "Ubirajara", "Iberê", "Jaci", "Caetano", "Raoni", "Tupã", "Aruã", "Piatã", "Tabajara", "Cauã",
  "Sancho", "Egas", "Mendo", "Paio", "Soeiro", "Fruela", "Ordonho", "Garcia", "Rodrigo", "Gil",
  "Benedito", "Sebastião", "Inácio", "Jerónimo", "Amaro", "Baltasar", "Belchior", "Gaspar", "Damião", "Cosme",
  "Kwame", "Jabari", "Kofi", "Ayodele", "Tendai", "Zaid", "Idris", "Malik", "Omar", "Tariq",
  "Adriano", "Basílio", "Cipriano", "Domingos", "Eusébio", "Fabrício", "Germano", "Horácio", "Isidoro", "Jordão",
  "Leandro", "Máximo", "Norberto", "Otávio", "Prudêncio", "Quintino", "Romualdo", "Salvador", "Teodoro", "Valério",
  ...MORE_MALE_NAMES,
]

export const SURNAMES = [
  "das Neves", "de Almeida", "Ferreira", "da Mata", "Bragança", "do Vale", "Moura", "Pereira", "dos Reis", "Barbosa",
  "Carvalho", "Cardoso", "Coelho", "Correia", "da Costa", "da Cunha", "Dias", "Esteves", "Fagundes", "Figueira",
  "Fonseca", "Freitas", "Gaspar", "Gouveia", "Guimarães", "Lacerda", "Lobo", "Macedo", "Magalhães", "Malheiro",
  "Matos", "Meireles", "Mendonça", "Monteiro", "Morais", "Nogueira", "Novais", "Pacheco", "Paiva", "Pimentel",
  "Pinheiro", "Queirós", "Quintela", "Rebelo", "Resende", "Ribeiro", "Rocha", "Sampaio", "Seixas", "Serrano",
  "Soares", "Tavares", "Teixeira", "Torres", "Valadares", "Valente", "Vasconcelos", "Velho", "Vieira", "Xavier",
  "do Monte", "da Serra", "do Rio", "da Fonte", "do Porto", "da Ponte", "do Outeiro", "da Ribeira", "do Pinhal", "da Lagoa",
  "Corvo", "Falcão", "Raposo", "Lobato", "Carneiro", "Pombo", "Leitão", "Cordeiro", "Pardal", "Gavião",
  "Andrada", "Arruda", "Bettencourt", "Brandão", "Camões", "Castanheira", "Cerqueira", "Coutinho", "Faria", "Garrido",
  "Jardim", "Lemos", "Loureiro", "Mascarenhas", "Medeiros", "Noronha", "Portela", "Sardinha", "Taveira", "Vilhena",
  ...MORE_SURNAMES,
]

/** Profissão no masculino e no feminino, para concordar com o nome sorteado. */
export const PROFESSIONS: [string, string][] = [
  ["cartógrafo", "cartógrafa"], ["curandeiro", "curandeira"], ["mensageiro", "mensageira"], ["artesão", "artesã"], ["guarda", "guarda"],
  ["barqueiro", "barqueira"], ["ferreiro", "ferreira"], ["boticário", "boticária"], ["escriba", "escriba"], ["pastor", "pastora"],
  ["caçador", "caçadora"], ["pescador", "pescadora"], ["moleiro", "moleira"], ["padeiro", "padeira"], ["taberneiro", "taberneira"],
  ["mercador", "mercadora"], ["contrabandista", "contrabandista"], ["sacerdote", "sacerdotisa"], ["noviço", "noviça"], ["bardo", "barda"],
  ["menestrel", "menestrel"], ["ladrão", "ladra"], ["mercenário", "mercenária"], ["cavaleiro errante", "cavaleira errante"], ["escudeiro", "escudeira"],
  ["arqueiro", "arqueira"], ["coveiro", "coveira"], ["parteiro", "parteira"], ["herbalista", "herbalista"], ["alquimista", "alquimista"],
  ["astrólogo", "astróloga"], ["bibliotecário", "bibliotecária"], ["joalheiro", "joalheira"], ["tecelão", "tecelã"], ["oleiro", "oleira"],
  ["carpinteiro", "carpinteira"], ["pedreiro", "pedreira"], ["vidreiro", "vidreira"], ["curtidor", "curtidora"], ["sapateiro", "sapateira"],
  ["cocheiro", "cocheira"], ["estalajadeiro", "estalajadeira"], ["guia de montanha", "guia de montanha"], ["batedor", "batedora"], ["espião", "espiã"],
  ["coletor de impostos", "coletora de impostos"], ["juiz de aldeia", "juíza de aldeia"], ["prefeito", "prefeita"], ["capitão do porto", "capitã do porto"], ["marinheiro", "marinheira"],
  ["mineiro", "mineira"], ["lenhador", "lenhadora"], ["apicultor", "apicultora"], ["domador de feras", "domadora de feras"], ["falcoeiro", "falcoeira"],
  ["mágico de feira", "mágica de feira"], ["adivinho", "adivinha"], ["exorcista", "exorcista"], ["caçador de recompensas", "caçadora de recompensas"], ["peregrino", "peregrina"],
  ...MORE_PROFESSIONS,
]

export const DESIRES = [
  "resgatar um familiar", "pagar uma dívida", "encontrar um lugar perdido", "proteger uma promessa", "limpar o nome da família",
  "vingar um mestre assassinado", "fugir de um casamento arranjado", "recuperar uma herança roubada", "ser aceito numa guilda", "provar que não é um covarde",
  "rever o mar antes de morrer", "terminar a obra do pai", "achar a cura de uma doença rara", "conquistar o perdão de um irmão", "comprar a própria liberdade",
  "desmascarar um falso profeta", "ganhar um torneio", "esquecer um crime antigo", "abrir uma taverna própria", "descobrir quem são seus pais",
  "reconstruir a aldeia queimada", "devolver um objeto sagrado", "escrever uma crônica verdadeira", "domar uma fera lendária", "ser lembrado numa canção",
  "derrubar o senhor local", "salvar o rio da seca", "casar com alguém de outra casta", "entregar uma carta a tempo", "reencontrar um amor perdido",
  "achar o tesouro de um avô pirata", "sair de uma seita", "aprender magia proibida", "proteger um segredo de família", "cumprir um voto feito a um deus",
  "superar um rival de infância", "manter o filho longe da guerra", "decifrar um idioma esquecido", "tornar-se cavaleiro", "ver a última estrela cair",
  ...MORE_DESIRES,
]

export const SECRETS = [
  "um mapa incompleto", "uma aliança perigosa", "uma identidade antiga", "uma chave roubada", "um filho escondido",
  "uma dívida com o crime organizado", "uma maldição de família", "um pacto com uma entidade", "a verdade sobre um incêndio", "uma carta que incrimina um nobre",
  "o local de um corpo enterrado", "uma marca de prisioneiro", "um dom mágico que teme", "um irmão gêmeo desaparecido", "uma traição cometida na guerra",
  "o nome verdadeiro de um demônio", "uma relíquia falsificada", "o caminho secreto para o castelo", "uma doença contagiosa", "a autoria de uma canção famosa",
  "um diário cheio de nomes", "uma fortuna enterrada", "um juramento que quebrou", "a localização de uma mina de prata", "uma paixão proibida",
  "a fórmula de um veneno", "um passado de assassino", "uma visão do fim do mundo", "um sangue de linhagem real", "o fato de ter morrido uma vez",
  "um contrato assinado com sangue", "a culpa por uma ponte que caiu", "uma conta em nome falso", "um cofre que não sabe abrir", "uma memória que não é dele",
  "a covardia que custou uma batalha", "um amuleto que sussurra", "uma chave para uma cripta", "um espião na própria casa", "uma promessa feita a um dragão",
  ...MORE_SECRETS,
]

export const TRAITS = [
  "fala baixo e escolhe cada palavra", "ri alto de tudo, até do perigo", "desconfia de quem sorri demais", "coleciona histórias de viajantes", "nunca olha nos olhos",
  "conta mentiras pequenas por hábito", "é gentil com animais e rude com gente", "reza antes de qualquer decisão", "fala com as mãos", "cita provérbios que inventa",
  "tem medo do escuro e esconde isso", "adora apostas, mesmo perdendo", "é educado demais para ser sincero", "lembra o nome de todo mundo", "assobia quando está nervoso",
  "corrige a gramática dos outros", "fica em silêncio quando está com raiva", "promete mais do que pode cumprir", "é leal até o fim", "nunca devolve o que pega emprestado",
  "trata todos como crianças", "se ofende fácil e perdoa rápido", "anota tudo num caderninho", "conta as moedas duas vezes", "é curioso a ponto de se meter em encrenca",
  "repete a última palavra de quem fala", "tem um humor seco e cortante", "é supersticioso com números", "chora em canções tristes", "fala de si na terceira pessoa",
  "sempre come algo enquanto conversa", "dá conselhos que ninguém pediu", "não suporta barulho", "trata estranhos como velhos amigos", "esconde a mão esquerda",
  "nunca senta de costas para a porta", "fala com os mortos em voz alta", "mede as pessoas pelos sapatos", "é pontual de um jeito irritante", "detesta nobres e imita o sotaque deles",
  ...MORE_TRAITS,
]

export const LOOKS = [
  "uma cicatriz que cruza a sobrancelha", "olhos de cores diferentes", "cabelos brancos antes do tempo", "tatuagens de runas nos antebraços", "um dente de ouro",
  "roupas finas e remendadas", "um manto que já foi de outra pessoa", "mãos calejadas e unhas limpas", "um colar de dentes de lobo", "botas sempre enlameadas",
  "uma pena de corvo no chapéu", "o rosto coberto de sardas", "um tapa-olho bordado", "anéis em todos os dedos", "uma voz rouca de quem gritou muito",
  "uma bengala de madeira escura", "tranças presas com fitas coloridas", "o nariz quebrado mais de uma vez", "um sorriso sem dois dentes", "cheiro de ervas e fumaça",
  "pele marcada de sol", "um broche com um brasão raspado", "luvas que nunca tira", "olhar cansado de quem não dorme", "um lenço de seda no pescoço",
  "uma perna de pau entalhada", "cabelo raspado dos lados", "orelhas furadas com argolas de cobre", "cicatrizes de queimadura nas mãos", "o uniforme de um exército que não existe mais",
  "uma barba trançada com contas", "sobrancelhas grossas e unidas", "um gato sempre no ombro", "um pingente que brilha fraco", "dedos manchados de tinta",
  "roupas da cor do luto", "um chapéu grande demais", "uma marca de nascença em forma de lua", "um bordão com sinos pequenos", "os pés descalços em qualquer clima",
  ...MORE_LOOKS,
]

// ---------- Ganchos e rumores ----------

export const HOOK_EVENTS = [
  "Uma ponte desaparece", "Um sino toca sozinho", "Um emissário não chega", "A água do poço muda de cor", "Os corvos deixam a aldeia",
  "Uma criança fala uma língua antiga", "O moinho gira sem vento", "Um navio chega sem tripulação", "As estátuas da praça mudam de lugar", "A colheita apodrece numa noite",
  "Um cometa aparece de dia", "O cemitério amanhece revirado", "Um mercador vende objetos de quem ainda vive", "As velas do templo não acendem mais", "Um lobo branco segue os viajantes",
  "O rio corre ao contrário por uma hora", "Uma torre surge na colina", "Todos esquecem o nome do prefeito", "Chove cinza sobre a cidade", "Um cavaleiro morto volta para casa",
  "A fonte começa a cantar", "Um mapa novo mostra uma ilha inexistente", "Os cães uivam ao meio-dia", "Uma porta aparece num muro antigo", "O sol nasce duas vezes",
  "Um bebê nasce com uma coroa de cabelos brancos", "A floresta avança um passo por noite", "Moedas antigas aparecem nos bolsos de todos", "O espelho do salão mostra outro lugar", "O farol apaga sem motivo",
  "Uma caravana chega com um ano de atraso", "Um eclipse não termina", "As abelhas abandonam as colmeias", "Uma voz chama do fundo da mina", "O padre some no meio da missa",
  "Neve cai em pleno verão", "Uma carta chega endereçada a um morto", "O lago congela num círculo perfeito", "Um forasteiro compra todas as cordas da cidade", "Um gigante dorme na estrada",
  ...MORE_HOOK_EVENTS,
]

export const HOOK_TURNS = [
  "A aldeia pede ajuda", "Uma facção oferece recompensa", "As pistas levam às ruínas", "O fenômeno se repete a cada lua", "Um nobre proíbe qualquer investigação",
  "O templo culpa os forasteiros", "Uma velha diz que já viu isso antes", "Alguém está lucrando com o medo", "Um dos personagens sonhou com isso", "Há uma recompensa pela cabeça de quem descobrir",
  "Os animais parecem saber o caminho", "Um bardo transforma tudo em canção e atrai curiosos", "A guarda prende o primeiro suspeito que aparece", "Um mapa rasgado é achado no local", "O fenômeno começa a se espalhar",
  "Uma criança desaparece logo depois", "Um mago oferece ajuda em troca de um favor", "O prefeito pede discrição absoluta", "Um vizinho rival é acusado", "A única testemunha é um papagaio",
  "Os mortos da aldeia são os primeiros a saber", "Um culto aparece para adorar o fenômeno", "O preço do pão triplica", "Um cavaleiro jura resolver sozinho e falha", "Uma profecia antiga cita a data de hoje",
  "Um mercador estrangeiro tem a resposta, mas quer muito dinheiro", "Os jogadores são os únicos que não são afetados", "Um diário de cem anos descreve o mesmo caso", "Alguém tenta comprar o silêncio dos heróis", "A solução exige um sacrifício",
  "As autoridades negam que algo esteja acontecendo", "Uma criatura assustada é a verdadeira vítima", "O fenômeno some quando alguém mente", "Uma fera só aparece quando chove", "O responsável é amado por todos",
  "A causa está no castelo do senhor local", "Um rival dos heróis já está no caso", "Os sinos voltam a tocar a cada resposta errada", "Um espírito pede para ser enterrado de novo", "Tudo começou com um presente recebido",
  ...MORE_HOOK_TURNS,
]

export const RUMORS = [
  "Dizem que o barão paga em ouro falso e ninguém tem coragem de reclamar.", "Contam que a velha da ponte sabe o nome verdadeiro de todo mundo.",
  "Ouviram passos dentro da torre lacrada do templo.", "Um mineiro jura ter visto olhos brilhando no veio de prata.",
  "A filha do ferreiro foi vista conversando com uma raposa.", "Um navio pirata ancorou do outro lado da ilha e ninguém desceu dele.",
  "Os monges do mosteiro pararam de comer há uma semana.", "Alguém está comprando todos os gatos pretos da cidade.",
  "O poço da praça tem um degrau novo a cada manhã.", "A guarda real procura um homem de seis dedos.",
  "Há um mapa tatuado nas costas do taberneiro.", "Um lobisomem foi visto dançando no casamento do moleiro.",
  "O antigo rei não morreu: virou mendigo na porta da capela.", "Uma carroça cheia de caixões passou pela estrada à meia-noite.",
  "Na feira, um mercador vende frascos com memórias.", "O lago engole um barco por ano e devolve outro.",
  "O cometa de ontem caiu na floresta e ainda está quente.", "A guilda dos ladrões declarou trégua por medo de algo.",
  "A estátua do herói chora quando alguém mente na praça.", "Encontraram moedas de um império que nunca existiu.",
  "Um dragão velho troca segredos por canções.", "O cemitério tem uma lápide com o nome de quem ainda vive.",
  "O padre novo não aparece no espelho.", "Uma caravana inteira sumiu e os cavalos voltaram sozinhos.",
  "Dizem que quem dorme na colina acorda falando outra língua.", "O general voltou da guerra com um exército que ninguém conhece.",
  "Uma bruxa oferece curas em troca de anos de vida.", "O farol está acendendo para alguém no mar, não para os navios.",
  "A filha do conde fugiu com um bardo, e o bardo era um anão disfarçado.", "Os sinos tocaram treze vezes à meia-noite.",
  "A biblioteca da cidade ganhou um livro que se escreve sozinho.", "Um caçador matou um cervo de prata e agora não consegue dormir.",
  "Há túneis sob o mercado que levam até o castelo.", "O prefeito tem um gêmeo, e ninguém sabe qual dos dois governa.",
  "Viram fogo azul no pântano três noites seguidas.", "Um anel achado no peixe faz o dono ouvir pensamentos.",
  "Os soldados da fronteira desertaram todos no mesmo dia.", "Uma árvore do bosque sagrado deu frutos de vidro.",
  "Quem cruzar a ponte velha à meia-noite ganha um desejo e perde a sombra.", "O mestre de armas foi derrotado por uma criança.",
  "Os anões fecharam os portões da montanha e não dizem por quê.", "Um corvo deixa cartas na janela do juiz.",
  "A taverna do porto serve um vinho que faz lembrar vidas passadas.", "Um peregrino carrega uma caixa que nunca abre.",
  "O rio trouxe uma coroa enroscada nas redes.", "Os elfos foram vistos comprando ferro, coisa que nunca fazem.",
  "Uma estrela some do céu toda noite.", "O carrasco da cidade se recusou a trabalhar.",
  "Uma estrada nova apareceu no mapa do cartógrafo real.", "Dizem que a rainha mandou buscar o último dos magos.",
  ...MORE_RUMORS,
]

// ---------- Tavernas ----------

/** Substantivo e gênero, para o artigo e o adjetivo concordarem (“A Raposa Dourada”, “O Javali Dourado”). */
export const TAVERN_NOUNS: [string, Gender][] = [
  ["Raposa", "f"], ["Lua", "f"], ["Runa", "f"], ["Chama", "f"], ["Javali", "m"], ["Corvo", "m"], ["Caneco", "m"], ["Dragão", "m"], ["Sereia", "f"], ["Âncora", "f"],
  ["Coroa", "f"], ["Espada", "f"], ["Barril", "m"], ["Cavalo", "m"], ["Estrela", "f"], ["Lanterna", "f"], ["Machado", "m"], ["Urso", "m"], ["Gato", "m"], ["Coruja", "f"],
  ["Ferradura", "f"], ["Bigorna", "f"], ["Galo", "m"], ["Lobo", "m"], ["Pato", "m"], ["Cabra", "f"], ["Bota", "f"], ["Chaleira", "f"], ["Escudo", "m"], ["Sino", "m"],
  ["Rosa", "f"], ["Carvalho", "m"], ["Ponte", "f"], ["Torre", "f"], ["Pena", "f"], ["Cálice", "m"], ["Grifo", "m"], ["Tartaruga", "f"], ["Moinho", "m"], ["Caravela", "f"],
  ...MORE_TAVERN_NOUNS.map(([noun, gender]): [string, Gender] => [noun, gender === "m" ? "m" : "f"]),
]

/** Adjetivo no masculino e no feminino. */
export const TAVERN_ADJECTIVES: [string, string][] = [
  ["Dourado", "Dourada"], ["Partido", "Partida"], ["Silencioso", "Silenciosa"], ["Errante", "Errante"], ["Bêbado", "Bêbada"], ["Torto", "Torta"], ["Sorridente", "Sorridente"], ["Afogado", "Afogada"],
  ["Cinzento", "Cinzenta"], ["Velho", "Velha"], ["Faminto", "Faminta"], ["Adormecido", "Adormecida"], ["Prateado", "Prateada"], ["Vermelho", "Vermelha"], ["Manco", "Manca"], ["Risonho", "Risonha"],
  ["Esquecido", "Esquecida"], ["Teimoso", "Teimosa"], ["Dançante", "Dançante"], ["Encantado", "Encantada"], ["Valente", "Valente"], ["Preguiçoso", "Preguiçosa"], ["Assustado", "Assustada"], ["Solitário", "Solitária"],
  ["Azul", "Azul"], ["Fumegante", "Fumegante"], ["Rachado", "Rachada"], ["Barbudo", "Barbuda"], ["Generoso", "Generosa"], ["Peludo", "Peluda"], ["Molhado", "Molhada"], ["Amarrado", "Amarrada"],
  ["Coroado", "Coroada"], ["Perdido", "Perdida"], ["Famoso", "Famosa"], ["Gordo", "Gorda"], ["Cego", "Cega"], ["Alegre", "Alegre"], ["Noturno", "Noturna"], ["Ruivo", "Ruiva"],
  ...MORE_TAVERN_ADJECTIVES,
]

export const DISHES = [
  "ensopado de raízes", "pão de mel e hidromel", "peixe defumado", "caldo de cogumelos", "javali assado com castanhas",
  "sopa de pedra (com o que houver)", "torta de pombo", "queijo de cabra com figos", "linguiça de caça com feijão", "bolo de milho e mel",
  "carneiro cozido em vinho", "enguias fritas", "polvo grelhado com azeite", "cozido de três carnes", "papas de aveia com nozes",
  "pão preto e banha", "frango com ervas do monte", "bacalhau com grão", "sardinhas na brasa", "caldo verde com broa",
  "empadão de coelho", "favas com chouriço", "arroz de pato", "migas de pão com alho", "castanhas assadas na hora",
  "costela de boi com mostarda", "bolinhos de peixe", "sopa fria de tomate", "trutas do riacho", "pudim de sangue",
  "lebre com cerejas", "pastéis de carne picante", "sopa de cebola gratinada", "batatas com toucinho", "pão de queijo do norte",
  "ostras do porto", "carne de urso salgada", "crepes de trigo-sarraceno", "tâmaras recheadas", "arroz-doce com canela",
  ...MORE_DISHES,
]

export const DRINKS = [
  "hidromel temperado", "cerveja escura da casa", "vinho verde da região", "sidra de maçã ácida", "aguardente de medronho",
  "chá de cascas amargas", "vinho quente com cravo", "licor de amora", "cerveja de trigo turva", "ginjinha em copo de chocolate",
  "leite de cabra com mel", "vinho do porto envelhecido", "água-ardente anã (perigosa)", "cerveja de raiz", "chá de flor de laranjeira",
  "suco de uva sem fermentar", "kefir dos pastores", "rum dos contrabandistas", "vinho élfico diluído", "infusão de cogumelo (proibida)",
  "cerveja preta com espuma de dois dedos", "aguardente de mel", "hidromel de amora", "vinho de arroz do oriente", "cerveja de centeio",
  "caldo quente para os sóbrios", "absinto verde", "vinho tinto aguado", "licor de ervas dos monges", "cerveja de gengibre",
  "sangria com frutas da estação", "chá preto com fumo", "bebida azul que ninguém sabe o nome", "vinho de figo", "cerveja que dizem ser feita por fadas",
  "conhaque de pera", "leite fermentado de égua", "água do poço sagrado (cobram)", "licor de café", "vinagre de vinho (para os caloteiros)",
  ...MORE_DRINKS,
]

export const TAVERN_DETAILS = [
  "um bardo que só toca músicas tristes", "um cachorro que rouba comida das mesas", "uma mesa reservada para um cliente que nunca vem", "um quadro de recompensas cheio de cartazes velhos", "a dona aposta queda de braço com os clientes",
  "uma lareira que nunca apaga", "um papagaio que repete segredos", "uma parede coberta de assinaturas de aventureiros", "um alçapão que todos fingem não ver", "um velho que conta a mesma história toda noite",
  "uma briga marcada para depois do jantar", "um cozinheiro que nunca sai da cozinha", "um espelho que ninguém gosta de olhar", "um torneio de dardos com apostas altas", "anões que cantam em coro",
  "uma porta dos fundos que dá no cemitério", "um quarto que custa o dobro e ninguém aluga", "um mapa da região desenhado na mesa", "um barril que dizem ter mil anos", "uma dívida pendurada num prego",
  "um padre que bebe escondido", "uma janela com vista para a forca", "um jogo de cartas que nunca termina", "um mercenário procurando contrato", "uma cadeira que dizem ser de um rei",
  "um poço dentro do salão", "uma criança que serve as mesas e sabe de tudo", "uma cabeça de troll empalhada", "a música para quando entra um estranho", "um cliente que paga em pérolas",
  "um caderno de reclamações que ninguém lê", "uma estátua de santo com uma caneca na mão", "uma placa que proíbe magia", "cheiro de pão a noite toda", "um quarto trancado por ordem do conde",
  "uma escada que range em todos os degraus", "goteiras que pingam em ritmo", "dois irmãos donos que não se falam", "um livro de hóspedes com nomes famosos", "um gato que escolhe quem pode ficar",
  ...MORE_TAVERN_DETAILS,
]

// ---------- Tesouros ----------

export const COIN_AMOUNTS = [3, 7, 12, 18, 25, 33, 40, 50, 64, 75, 100, 150, 200, 320, 500, ...MORE_COIN_AMOUNTS]
export const COIN_KINDS = ["moedas de cobre", "moedas de prata", "moedas de ouro", "moedas de um reino extinto", "lingotes pequenos de prata", ...MORE_COIN_KINDS]

export const TRINKETS = [
  "um broche com brasão", "uma bússola sem norte", "um anel de cobre", "uma carta lacrada", "um cálice de estanho amassado",
  "um dente de dragão polido", "um frasco de perfume vazio", "um medalhão com retrato de uma criança", "uma chave de ferro sem fechadura", "um dado de osso viciado",
  "uma flauta de bambu rachada", "um pente de marfim", "uma luva de seda só da mão esquerda", "um selo real quebrado", "uma pedra que fica morna na mão",
  "um mapa do céu bordado em pano", "um tinteiro de prata", "um rosário de contas de vidro", "um espelho de bolso embaçado", "uma estatueta de sapo de jade",
  "um sino pequeno sem badalo", "um livro de orações em língua esquecida", "uma moeda com duas caras", "um colar de conchas", "uma adaga cerimonial cega",
  "uma pena de grifo", "um cachimbo esculpido em forma de cabeça", "uma tiara de cobre e vidro", "um relógio de areia que corre devagar", "um par de óculos sem lentes",
  "uma caixa de música que toca uma nota só", "um saquinho de sementes desconhecidas", "um escudo pequeno com o brasão raspado", "um amuleto de olho azul", "uma lente de cristal",
  "uma pulseira de pelos de cavalo trançados", "uma vela que não derrete", "um pergaminho em branco que cheira a mar", "um baralho com uma carta a mais", "uma garra de urso montada em prata",
  "uma pedra-de-afiar de grão fino", "um ídolo de barro de três olhos", "um anel de sinete de família nobre", "um apito de osso", "uma coroa de folhas de ouro amassada",
  "uma corrente com um pingente de âmbar", "um diário com páginas arrancadas", "um frasco de tinta que muda de cor", "um cinto com fivela de prata", "um botão de casaco de um uniforme real",
  ...MORE_TRINKETS,
]

export const TREASURE_EXTRAS = [
  "uma dívida anotada", "um mapa de contrabandistas", "o nome de um herdeiro", "uma pista para outro esconderijo", "um bilhete de resgate nunca pago",
  "uma lista de subornos", "a planta de um cofre", "uma confissão assinada", "um convite para um baile de máscaras", "a escritura de uma casa abandonada",
  "um recibo de um agiota perigoso", "uma carta de amor sem destinatário", "a senha de uma porta secreta", "um desenho de uma criatura desconhecida", "o horário de troca da guarda",
  "uma receita de veneno", "a localização de uma tumba", "um poema que é uma charada", "um contrato de mercenários", "a lista de passageiros de um navio desaparecido",
  "um retrato do dono com um rei", "uma ordem de prisão em branco, já assinada", "o testamento de um nobre", "uma promissória de um templo", "o mapa de uma mina abandonada",
  "um pedido de socorro escrito às pressas", "uma partitura proibida", "o símbolo de uma seita", "uma carta de recomendação falsa", "o código de uma guilda",
  "a chave de um quarto de estalagem", "um bilhete de loteria da capital", "a assinatura de um mago famoso", "um calendário com uma data circulada", "um mapa estelar com uma estrela a mais",
  "o nome de um traidor", "uma promessa de casamento", "um mapa do esgoto da cidade", "a descrição de um ritual incompleto", "um aviso: não abra a próxima porta",
  ...MORE_TREASURE_EXTRAS,
]

// ---------- Clima ----------

export const WEATHER: Record<string, string[]> = {
  Primavera: [
    "Manhã fria, neblina e vento fraco.", "Chuva fina o dia todo; flores por toda parte.", "Sol morno e céu limpo.", "Pancadas de chuva no fim da tarde.", "Vento forte que espalha pólen.",
    "Garoa e arco-íris depois do almoço.", "Noite fria e estrelada.", "Céu nublado e ar abafado.", "Granizo rápido e passageiro.", "Dia ameno, bom para viajar.",
    "Neblina densa nos vales até o meio-dia.", "Chuva de primavera que alaga as trilhas.", "Brisa leve vinda do mar.", "Trovoada distante, sem chuva.", "Manhã de geada tardia que queima os brotos.",
    ...MORE_WEATHER.Primavera!,
  ],
  Verão: [
    "Calor seco e vento do oeste.", "Céu aberto e sol forte; água fica escassa.", "Tempestade de verão no fim do dia.", "Noite quente, cheia de mosquitos.", "Mormaço pesado, sem vento.",
    "Calor de rachar pedra; os animais procuram sombra.", "Brisa fresca à beira do rio.", "Nuvens altas e luz dourada.", "Trovões secos e risco de incêndio.", "Dia longo e claro, noite curta.",
    "Chuva quente que evapora logo.", "Poeira levantada por redemoinhos.", "Céu limpo e lua cheia brilhante.", "Ar úmido e pesado depois da chuva.", "Onda de calor: viagem só de madrugada.",
    ...MORE_WEATHER.Verão!,
  ],
  Outono: [
    "Chuva contínua; estradas enlameadas.", "Folhas caindo e vento frio.", "Neblina pela manhã, sol fraco à tarde.", "Tempestade se aproximando pelo litoral.", "Dia cinzento e silencioso.",
    "Garoa fria que não para.", "Ventania que derruba galhos.", "Céu limpo e ar seco, noite gelada.", "Nevoeiro que esconde a estrada.", "Primeira geada da estação.",
    "Chuva de pedra rápida.", "Sol baixo e sombras longas.", "Nuvens pesadas, mas nada de chuva.", "Frio úmido que entra nos ossos.", "Manhã clara e tarde chuvosa.",
    ...MORE_WEATHER.Outono!,
  ],
  Inverno: [
    "Noite seca e muito fria.", "Neve fina o dia inteiro.", "Nevasca: impossível viajar.", "Céu limpo e frio cortante.", "Chuva gelada que congela nas árvores.",
    "Gelo nas estradas e nos rios.", "Vento uivante das montanhas.", "Manhã de nevoeiro congelado.", "Dia curto e cinzento.", "Neve pesada que bloqueia as passagens.",
    "Sol fraco sobre a neve, que ofusca.", "Granizo e trovoada de inverno.", "Frio extremo: a água do cantil congela.", "Degelo rápido e lama até os joelhos.", "Noite clara com aurora no céu.",
    ...MORE_WEATHER.Inverno!,
  ],
}

// ---------- Aventuras ----------

export const ENCOUNTERS = [
  "Negociar uma passagem vigiada", "Atravessar ruínas antes da cheia", "Resolver uma disputa entre dois aliados", "Escoltar alguém que esconde o destino", "Sobreviver a uma noite num moinho assombrado",
  "Recuperar um objeto roubado num mercado lotado", "Convencer um troll a liberar a ponte", "Fugir de um incêndio na floresta", "Atravessar um pântano com guia duvidoso", "Proteger uma caravana de bandidos",
  "Descer um poço que não tem fundo", "Participar de um banquete onde alguém será envenenado", "Desarmar uma armadilha antiga", "Interrogar um prisioneiro que só mente", "Cruzar um rio congelado que racha",
  "Infiltrar-se num baile de máscaras", "Enfrentar um enxame de vespas gigantes", "Resolver o enigma de uma porta falante", "Salvar um navio que está afundando", "Domar um cavalo selvagem que é a única saída",
  "Esconder-se de uma patrulha numa vila hostil", "Entregar uma mensagem atravessando um campo de batalha", "Ganhar um julgamento numa corte corrupta", "Encontrar a saída de um labirinto de sebes", "Apaziguar um espírito furioso",
  "Atravessar uma ponte de cordas sob ventania", "Desfazer uma maldição antes da meia-noite", "Proteger uma testemunha até o amanhecer", "Fugir de uma prisão subterrânea", "Escalar uma torre por fora",
  "Negociar com piratas em alto-mar", "Encontrar um caminho seguro numa mina desabada", "Vencer uma corrida de barcos", "Impedir um ritual numa clareira", "Caçar uma fera que ataca o rebanho",
  "Desmascarar um impostor na corte", "Atravessar o território de uma tribo desconfiada", "Recuperar o corpo de um herói caído", "Sobreviver a uma tempestade no topo da montanha", "Libertar prisioneiros de um acampamento",
  "Ganhar a confiança de um dragão jovem", "Seguir rastros numa nevasca", "Fazer as pazes entre duas aldeias", "Defender uma torre por uma noite", "Achar a nascente de um rio envenenado",
  "Roubar um livro de uma biblioteca vigiada", "Atravessar um deserto de sal", "Acompanhar uma procissão que atrai criaturas", "Consertar uma ponte sob ataque", "Sair de um sonho compartilhado",
  ...MORE_ENCOUNTERS,
]

export const TWISTS = [
  "O contratante omitiu uma dívida.", "O suposto inimigo quer negociar.", "A relíquia é uma cópia; o original já partiu.", "O vilão é parente de um dos heróis.", "A vítima armou tudo.",
  "A recompensa é falsa.", "O guia trabalha para o outro lado.", "O monstro protege algo valioso.", "O mapa leva a um lugar que já foi saqueado.", "O aliado mais fiel é um espião.",
  "O tempo está correndo mais rápido do que parecia.", "A cidade inteira sabia e não contou.", "O verdadeiro alvo é o grupo.", "A profecia fala de outra pessoa.", "A missão é um teste de uma guilda.",
  "O tesouro está amaldiçoado.", "O inimigo morreu há anos; alguém usa o nome dele.", "O nobre que ajuda é o culpado.", "A criatura é uma pessoa transformada.", "O resgate não quer ser resgatado.",
  "A ponte de volta foi destruída.", "Há outro grupo de aventureiros no mesmo trabalho.", "O deus local exige uma oferenda que ninguém quer dar.", "O livro de feitiços está incompleto.", "A carta foi escrita pelo próprio destinatário.",
  "O informante mentiu para proteger a família.", "O vilão tem razão em parte.", "O lugar é sagrado para outro povo.", "Um dos heróis já esteve aqui e não lembra.", "A chave abre outra porta.",
  ...MORE_TWISTS,
]

// ---------- Lugares ----------

export const PLACE_HEADS = [
  "Vale", "Pedra", "Porto", "Ponte", "Torre", "Monte", "Vila", "Castelo", "Fonte", "Bosque",
  "Lagoa", "Serra", "Campo", "Forte", "Ermida", "Quinta", "Ribeira", "Outeiro", "Penha", "Passo",
  "Praia", "Ilha", "Cabo", "Baía", "Charneca", "Várzea", "Cova", "Gruta", "Barranco", "Planalto",
  "Abadia", "Cidadela", "Mosteiro", "Aldeia", "Encruzilhada", "Ruínas", "Floresta", "Pântano", "Desfiladeiro", "Atalaia",
  ...MORE_PLACE_HEADS,
]

export const PLACE_TAILS = [
  "das Brumas", "do Corvo", "das Cinzas", "da Lua Velha", "dos Sinos", "do Lobo Branco", "das Sete Pedras", "do Rei Caído", "da Água Negra", "dos Enforcados",
  "do Sol Poente", "das Bruxas", "do Carvalho Partido", "das Viúvas", "do Dragão Adormecido", "da Neve Eterna", "dos Ventos", "do Ferro", "das Almas", "do Silêncio",
  "da Esperança", "do Último Passo", "das Rosas", "do Gigante", "das Lágrimas", "do Pescador", "da Coroa", "dos Anões", "do Espinho", "da Estrela Cadente",
  "dos Mil Degraus", "do Eco", "da Serpente", "das Velas", "do Juramento", "dos Corvos", "da Fome", "do Ouro Perdido", "das Fadas", "do Norte",
  ...MORE_PLACE_TAILS,
]

// ---------- Itens mágicos ----------

export const MAGIC_ITEMS = [
  "Espada", "Adaga", "Lança", "Machado", "Arco", "Escudo", "Elmo", "Capa", "Anel", "Amuleto",
  "Bota", "Luva", "Cinto", "Cajado", "Varinha", "Lanterna", "Bússola", "Cálice", "Flauta", "Tambor",
  "Livro", "Espelho", "Coroa", "Máscara", "Corda", "Chave", "Frasco", "Dado", "Pena", "Sino",
  ...MORE_MAGIC_ITEMS,
]

export const MAGIC_POWERS = [
  "que brilha perto de mentiras", "que deixa o dono invisível por um minuto", "que fala com animais", "que aponta para o que o dono mais deseja", "que nunca erra o primeiro golpe",
  "que mantém o dono aquecido em qualquer frio", "que mostra o caminho de volta para casa", "que guarda uma voz por um dia", "que acende sozinha no escuro", "que abre qualquer fechadura uma vez por lua",
  "que cura um ferimento leve por dia", "que deixa respirar debaixo d'água", "que repele mortos-vivos", "que traduz qualquer idioma falado", "que faz o dono flutuar devagar",
  "que avisa quando há veneno por perto", "que guarda um feitiço para depois", "que deixa os passos em silêncio", "que muda de forma conforme a necessidade", "que chama uma rajada de vento",
  "que faz plantas crescerem ao redor", "que acalma qualquer fera", "que mostra lembranças de quem a tocou antes", "que congela a água que toca", "que esconde o dono de vidência",
  "que ilumina como o sol por um instante", "que devolve flechas a quem atirou", "que dá coragem a quem estiver perto", "que faz o dono entender sonhos", "que guarda o calor de uma fogueira",
  ...MORE_MAGIC_POWERS,
]

export const MAGIC_QUIRKS = [
  "Sussurra o nome do antigo dono à noite.", "Fica pesada perto de igrejas.", "Só funciona para quem canta.", "Cheira a chuva o tempo todo.", "Aquece quando um inimigo se aproxima.",
  "Faz o dono espirrar ao usá-la.", "Tem uma inscrição que muda todo dia.", "Os gatos a evitam.", "Brilha fraco na lua cheia.", "Exige ser polida todo dia, ou para de funcionar.",
  "O dono passa a sonhar com o mar.", "Fica fria em mãos de mentirosos.", "Deixa uma marca na pele de quem a usa.", "Às vezes ri sozinha.", "Atrai borboletas.",
  "Muda de cor conforme o humor do dono.", "Chora gotas de orvalho ao amanhecer.", "Só pode ser usada com a mão esquerda.", "Esquece o dono se ficar um dia longe dele.", "Assobia antes de uma tempestade.",
  "Escurece quando alguém morre perto.", "Deixa o dono com fome o tempo todo.", "Fica invisível quando ninguém olha.", "Pede uma moeda de ouro por uso.", "Tem ciúmes de outros itens mágicos.",
  "Range como uma porta velha.", "Faz o dono falar em rimas por uma hora.", "Pesa o dobro nas segundas.", "Mostra o reflexo de outra pessoa.", "Recusa-se a ser vendida.",
  ...MORE_MAGIC_QUIRKS,
]

// ---------- Facções ----------

export const FACTION_NOUNS = [
  "Ordem", "Círculo", "Irmandade", "Liga", "Companhia", "Guilda", "Conclave", "Confraria", "Juramento", "Mão",
  "Véu", "Coroa", "Escudo", "Lâmina", "Chama", "Concílio", "Casa", "Pacto", "Legião", "Assembleia",
  "Fraternidade", "Sociedade", "Seita", "Aliança", "Vigília", "Guarda", "Corte", "Rede", "Sombra", "Família",
  ...MORE_FACTION_NOUNS,
]

export const FACTION_EMBLEMS = [
  "da Rosa Negra", "do Olho Aberto", "das Mãos Limpas", "do Sol Cinzento", "da Última Vela", "do Corvo Branco", "dos Sete Selos", "da Âncora", "do Lobo Faminto", "da Chave de Prata",
  "do Punho de Ferro", "das Folhas Secas", "da Lua Partida", "do Cálice", "da Estrada Longa", "dos Sussurros", "da Pena Vermelha", "do Trono Vazio", "da Aurora", "da Serpente Dourada",
  "do Martelo", "das Correntes", "do Fogo Antigo", "da Torre Caída", "dos Esquecidos", "do Grifo", "da Coruja", "do Carvalho", "das Moedas", "da Maré",
  ...MORE_FACTION_EMBLEMS,
]

export const FACTION_GOALS = [
  "controlar o comércio do porto", "devolver o trono a uma linhagem esquecida", "destruir toda a magia", "proteger um segredo antigo", "vingar uma traição",
  "acabar com a escravidão", "encontrar um deus perdido", "dominar as rotas de contrabando", "impedir uma profecia", "unir as cidades livres",
  "derrubar a igreja oficial", "guardar as fronteiras de uma ameaça que ninguém vê", "reunir as peças de uma arma lendária", "comprar a nobreza aos poucos", "salvar a floresta antiga",
  "registrar toda a história verdadeira", "abrir um portal para outro mundo", "manter a paz a qualquer custo", "eliminar os dragões restantes", "enriquecer os fundadores",
  "libertar um prisioneiro famoso", "fundar uma cidade nova", "proteger os viajantes da estrada", "recuperar terras tomadas", "despertar um gigante adormecido",
  "acabar com a guilda rival", "esconder uma criança escolhida", "reformar as leis do reino", "controlar as minas de prata", "vigiar os magos",
  ...MORE_FACTION_GOALS,
]

export const FACTION_METHODS = [
  "chantagem", "casamentos arranjados", "contratos impossíveis de recusar", "espiões em todas as tavernas", "caridade com segundas intenções",
  "assassinatos discretos", "boatos bem plantados", "suborno de juízes", "milícias armadas", "magia proibida",
  "pregação nas praças", "falsificação de documentos", "controle do preço do pão", "sequestros", "alianças com criaturas",
  "dívidas que nunca acabam", "duelos de honra", "intimidação aberta", "teatro e canções", "infiltração na guarda",
  "comércio de relíquias", "sabotagem", "votos em conselhos comprados", "redes de mendigos informantes", "monopólio de remédios",
  "rituais coletivos", "jornais clandestinos", "alianças com piratas", "torneios patrocinados", "bibliotecas secretas",
  ...MORE_FACTION_METHODS,
]

// ---------- Divindades ----------

export const DEITY_SYLLABLES = ["ar", "bel", "cor", "dra", "el", "fen", "gal", "hor", "ir", "ka", "lum", "mor", "nai", "or", "pra", "qua", "ra", "sil", "tor", "ul", "val", "xa", "yr", "zar", "the", "mi", "an", "os", "ve", "lys", ...MORE_DEITY_SYLLABLES]

export const DEITY_DOMAINS = [
  "das colheitas", "da guerra justa", "dos mares", "da morte serena", "dos viajantes", "do fogo da forja", "da lua", "dos segredos", "da cura", "das tempestades",
  "da sorte", "das fronteiras", "do vinho e das festas", "da memória", "dos ladrões", "das bibliotecas", "da caça", "dos juramentos", "do inverno", "das crianças",
  "da vingança", "dos sonhos", "das montanhas", "dos rios", "da música", "dos portões", "da loucura", "do amanhecer", "da justiça cega", "das estrelas",
  ...MORE_DEITY_DOMAINS,
]

export const DEITY_SYMBOLS = [
  "uma espiga dourada", "uma espada quebrada", "uma onda com três cristas", "uma vela apagada", "uma sandália alada", "um martelo em brasa", "uma lua crescente", "uma chave fechada num olho", "uma mão aberta", "um raio sobre uma torre",
  "uma moeda girando", "um muro de pedra", "um cálice transbordando", "um nó sem fim", "uma máscara sorridente", "um livro aberto", "uma lança e um cervo", "duas mãos apertadas", "um floco de neve", "um berço",
  "uma adaga gotejando", "um olho fechado", "um pico nevado", "um peixe prateado", "uma lira", "um arco de pedra", "uma espiral", "um galo cantando", "uma balança vendada", "sete estrelas",
  ...MORE_DEITY_SYMBOLS,
]

export const DEITY_TENETS = [
  "Nunca negue abrigo a quem bate à porta.", "Toda dívida deve ser paga, até com os inimigos.", "Não minta sob o céu aberto.", "Devolva à terra um pouco do que tirar dela.", "Proteja os mais fracos, mesmo contra a lei.",
  "Não derrame sangue em dia sagrado.", "Guarde os segredos que lhe confiarem.", "Celebre os mortos todo ano.", "Ensine o que sabe a quem pedir.", "Nunca recuse um desafio justo.",
  "Não queime livros.", "Liberte um animal preso por ano.", "Cumpra todo juramento, por pior que seja.", "Compartilhe o pão com o estranho.", "Não durma sem olhar as estrelas.",
  "A vingança é um dever, não um prazer.", "Respeite as fronteiras dos outros.", "Não acumule mais do que pode carregar.", "Cante para os que partem.", "Perdoe três vezes; na quarta, lute.",
  "Não toque em ouro de túmulo.", "Acenda uma vela por quem morreu sozinho.", "Siga a estrada até o fim.", "A loucura também é uma forma de verdade.", "Não feche portas para sempre.",
  "Honre o trabalho das mãos.", "Proteja as crianças dos outros como as suas.", "Não faça promessas de noite.", "Respeite a água: ela lembra.", "Aceite o destino, mas negocie.",
  ...MORE_DEITY_TENETS,
]

// ---------- Masmorras ----------

export const DUNGEON_ROOMS = [
  "Um salão de pilares com metade do teto caído", "Uma capela com bancos virados", "Uma biblioteca alagada", "Uma cozinha com caldeirões ainda mornos", "Um corredor de estátuas que olham para o mesmo ponto",
  "Uma prisão de celas abertas", "Um poço circular com escada em espiral", "Uma sala do trono sem trono", "Um laboratório de alquimia saqueado", "Um dormitório de beliches apodrecidos",
  "Uma câmara de tumbas na parede", "Uma ponte sobre um abismo", "Um jardim subterrâneo de cogumelos gigantes", "Um arsenal com armas enferrujadas", "Uma sala de banquete servida para ninguém",
  "Um observatório com teto de cristal rachado", "Uma forja com fogo que não apaga", "Uma sala de espelhos", "Uma cripta com um sarcófago aberto", "Uma galeria de retratos rasgados",
  "Um templo a um deus esquecido", "Uma sala de tortura coberta de poeira", "Uma cisterna de água parada", "Um quarto de criança intacto", "Um salão de baile com instrumentos tocando sozinhos",
  "Um depósito de barris de vinho", "Um mausoléu de anões", "Uma sala com um mapa enorme no chão", "Um corredor estreito que desce sem fim", "Uma câmara circular com sete portas",
  "Uma estufa de plantas carnívoras", "Uma sala de aula com quadros-negros rabiscados", "Um ninho de criatura grande", "Uma sala do tesouro já esvaziada", "Uma câmara de rituais com círculo pintado",
  "Uma oficina de relojoeiro", "Um salão de guardas com a mesa posta", "Uma passagem secreta atrás de uma lareira", "Uma gruta natural com um lago escuro", "Uma sala com o chão de areia movediça",
  ...MORE_DUNGEON_ROOMS,
]

export const DUNGEON_FEATURES = [
  "Há pegadas frescas na poeira.", "Uma corrente de ar vem de uma parede.", "Ouve-se água pingando em ritmo.", "As tochas estão acesas.", "O cheiro é de flores, não de mofo.",
  "Há uma mensagem riscada na parede.", "Um esqueleto segura um bilhete.", "O eco devolve palavras erradas.", "O chão está morno.", "Moedas espalhadas formam uma seta.",
  "Uma porta está trancada por dentro.", "Teias cobrem a saída.", "Uma música baixa vem de longe.", "Os móveis estão pregados no teto.", "Há marcas de garras na porta.",
  "Uma estátua segura uma chave de verdade.", "Fumaça sai de uma rachadura.", "Um gato observa da prateleira.", "Há um alçapão sob o tapete.", "Uma vela acende quando alguém entra.",
  "As paredes estão cobertas de runas.", "Há um mapa desenhado com sangue.", "A sala está mais fria que o resto.", "Ossos de animais estão empilhados com cuidado.", "Um sino pequeno pende do teto.",
  "Uma voz chama um dos heróis pelo nome.", "Pétalas cobrem o chão.", "Há sinais de acampamento recente.", "Uma fonte jorra vinho.", "O teto é baixo demais para ficar em pé.",
  "As sombras se mexem um pouco atrasadas.", "Há um baú com fechadura de enigma.", "Raízes atravessam as paredes.", "Um quadro mostra a própria sala no futuro.", "Há gravetos arrumados para uma fogueira.",
  "Uma porta tem uma maçaneta de cada lado.", "O chão tem placas de pressão visíveis.", "Há inscrições em três idiomas.", "Uma armadura vazia está sentada à mesa.", "A luz vem de cogumelos no teto.",
  ...MORE_DUNGEON_FEATURES,
]

export const DUNGEON_DANGERS = [
  "uma armadilha de lâminas no corredor", "gás sonífero ao abrir o baú", "um piso que desaba", "ratos gigantes famintos", "um esqueleto guardião",
  "um limo que dissolve metal", "uma aranha do tamanho de um cavalo", "um espírito ciumento", "uma inundação que começa devagar", "uma estátua que ataca quem passa",
  "dardos envenenados nas paredes", "um teto que desce", "morcegos que apagam as tochas", "um mímico disfarçado de porta", "um cultista escondido",
  "um ogro dormindo", "fogo que sai do chão", "uma ilusão de saída", "um golem de barro", "um enxame de besouros carniceiros",
  "um fantasma que imita vozes", "uma maldição ao pegar o ouro", "uma escada que leva sempre ao mesmo lugar", "um troll ferido e furioso", "uma criatura que vê pelo som",
  "pedras que rolam pela rampa", "um portal instável", "uma serpente gigante no lago", "fungos que soltam esporos alucinógenos", "nada: o perigo está na próxima sala",
  ...MORE_DUNGEON_DANGERS,
]

// ---------- Lendas ----------

export const LEGEND_SUBJECTS = [
  "Um rei que vendeu a própria sombra", "Uma cidade que afundou numa noite", "Uma espada forjada com uma estrela", "Dois irmãos que dividiram o céu", "Uma bruxa que guardava o inverno numa caixa",
  "Um cavaleiro que nunca tirou o elmo", "Um dragão que se apaixonou por uma pastora", "Uma ponte construída por demônios", "Um sino que acorda os mortos", "Um lago que guarda as lágrimas do mundo",
  "Uma árvore que cresceu do coração de um herói", "Um navio que navega entre os mundos", "Uma coroa que escolhe o rei", "Um anão que roubou a primeira chama", "Um lobo que engoliu a lua",
  "Uma rainha que jogou xadrez com a morte", "Um bardo cuja canção parou uma guerra", "Uma montanha que já foi gigante", "Um espelho que prendeu um deus", "Uma estrada que nunca termina",
  "Um menino que conversava com o vento", "Um tesouro que só aparece em eclipses", "Uma torre que cresce a cada mentira", "Um povo que vive debaixo do rio", "Um juramento feito no fim do mundo",
  "Uma flor que nasce uma vez por século", "Um exército que dorme sob a colina", "Um pássaro de fogo que renasce na cinza", "Uma biblioteca guardada por esfinges", "Um cometa que traz um novo deus",
  ...MORE_LEGEND_SUBJECTS,
]

export const LEGEND_TRUTHS = [
  "Metade é verdade; a outra metade foi inventada para esconder um crime.", "Aconteceu, mas com outra pessoa.", "Tudo é verdade, menos o final feliz.", "Foi inventada por um nobre para justificar o trono.", "É um aviso disfarçado de história.",
  "Os detalhes batem com um mapa guardado no templo.", "Ninguém lembra que a lenda tem uma segunda parte.", "Os sábios dizem que é metáfora; os camponeses, que é história.", "Um dos personagens ainda está vivo.", "A versão dos anões é bem diferente.",
  "O lugar da lenda existe e está perto daqui.", "A lenda se repete a cada geração.", "Uma seita acredita nela ao pé da letra.", "O herói da lenda era, na verdade, o vilão.", "A lenda foi escrita depois, para explicar ruínas antigas.",
  "Um objeto da lenda está à venda no mercado.", "Contar a lenda inteira traz azar.", "Ela só é contada a crianças em noites de lua nova.", "Os elfos riem de quem acredita nela.", "A última vez que alguém investigou, não voltou.",
  "A lenda tem um enigma escondido no texto.", "A música da lenda é proibida na capital.", "Um cronista jura ter visto o fim da história.", "O nome do herói foi apagado de propósito.", "A lenda é uma profecia que ainda não aconteceu.",
  "Os dados não batem: alguém mudou a data.", "Ela começou como piada de taverna.", "Há um túmulo com o nome do protagonista.", "Um animal da lenda foi visto este ano.", "Ninguém sabe; e isso é o mais perigoso.",
  ...MORE_LEGEND_TRUTHS,
]

// ---------- Mercadores ----------

export const MERCHANT_WARES = [
  "especiarias do sul", "tecidos tingidos com conchas", "mapas de lugares que ninguém visitou", "remédios de eficácia duvidosa", "armas de segunda mão",
  "relíquias de santos (falsas)", "animais exóticos em gaiolas", "livros raros", "sementes de plantas mágicas", "joias de vidro que parecem diamantes",
  "botas que nunca furam", "perfumes de flores extintas", "ferramentas de anão", "instrumentos musicais", "velas que queimam por um mês",
  "cordas de seda élfica", "frascos de luz engarrafada", "amuletos contra mau-olhado", "chás de todas as partes", "pedras preciosas brutas",
  "peles de feras raras", "brinquedos de corda", "vinhos de safras antigas", "pergaminhos em branco de qualidade", "tintas de cores impossíveis",
  "lanternas de papel", "selas de couro trabalhado", "fechaduras impossíveis de abrir", "cartas de tarô pintadas à mão", "ossos de criaturas para alquimia",
  "queijos que andam sozinhos", "mel de abelhas gigantes", "facas de cozinha encantadas", "roupas que mudam com a estação", "bússolas para lugares específicos",
  "sabões de cheiro forte", "moedas antigas para colecionadores", "venenos (só para ratos, ele jura)", "estátuas pequenas de deuses", "segredos, vendidos ao pé do ouvido",
  ...MORE_MERCHANT_WARES,
]

export const MERCHANT_QUIRKS = [
  "aceita trocas, não moedas", "só vende para quem conta uma história", "regateia por esporte", "dá um desconto a quem o faz rir", "não vende nada antes do almoço",
  "tem um sócio invisível que consulta em voz alta", "jura que tudo pertenceu a um rei", "oferece um brinde suspeito", "cobra mais de quem usa armadura", "só fala por rimas",
  "aceita pagamento em favores", "está fugindo de credores", "esqueceu de onde veio metade do estoque", "tem medo de magos", "anota o nome de todos os clientes",
  "dá conselhos de vida junto com o troco", "vende mais barato em dia de chuva", "tem um cão que morde caloteiros", "está apaixonado por uma cliente", "conhece todas as estradas secretas",
  "é na verdade um nobre disfarçado", "sempre diz que é a última unidade", "carrega a loja nas costas", "não vende para elfos", "garante tudo, mas nunca está no mesmo lugar duas vezes",
  "quer comprar algo que os heróis carregam", "paga bem por notícias", "tem uma filha que faz as contas", "conta histórias de terror para os clientes", "aceita apostas no preço",
  ...MORE_MERCHANT_QUIRKS,
]
