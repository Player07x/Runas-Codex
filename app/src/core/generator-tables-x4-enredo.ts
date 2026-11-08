/**
 * Geradores ×4 (U32, atualização 1.2.0): mais opções escritas à mão, uma por linha. `generator-tables.ts` põe cada
 * lista no fim da original (os testes usam os primeiros itens). Nada aqui é variação gerada de outra opção: onde a
 * lista é naturalmente uma peça mais outra, as duas partes são escritas à mão e só se juntam as que combinam.
 */
import { lines } from "./generator-tables-pessoas"
import { combine } from "./generator-tables-x4-pessoas"


const TASKS = lines(`
Escoltar uma caravana de sal
Resgatar um refém dos bandidos
Entregar uma carta lacrada ao conde
Recuperar um relicário roubado
Capturar um ladrão de cavalos
Levar um prisioneiro até o tribunal
Proteger uma testemunha
Encontrar uma criança perdida
Caçar uma fera que ataca o gado
Atravessar uma ponte vigiada por um troll
Investigar luzes num moinho abandonado
Libertar um pássaro mágico de um colecionador
Negociar a paz entre duas aldeias
Roubar um livro de um mosteiro
Devolver uma estátua ao templo
Buscar um curandeiro na vila vizinha
Desarmar uma armadilha deixada na estrada
Seguir um espião até o esconderijo
Guiar peregrinos por uma passagem estreita
Recolher um imposto de um nobre teimoso
Salvar um navio encalhado
Afastar um espírito de uma casa
Encontrar a fonte de uma doença no gado
Levar uma noiva ao casamento sem atrasos
Capturar um fugitivo da prisão
Descobrir quem envenenou o poço
Recuperar o sino roubado da capela
Defender um celeiro dos goblins
Encontrar o rastro de uma caravana sumida
`)
const CIRCUMSTANCES = lines(`
sob uma tempestade
sem ser visto pela guarda
antes que a lua cheia nasça
com um rival tentando chegar primeiro
enquanto um incêndio toma a cidade
com o mapa errado
durante o festival da colheita
com um traidor no grupo
sem derramar sangue
numa noite sem luar
com metade do pagamento adiantado
seguidos por um caçador de recompensas
antes que a ponte desabe
com um cão que não obedece
com a neve chegando aos joelhos
enquanto os sinos tocam o alarme
sem saber que é uma armadilha
`)
export const X4_ENCOUNTERS_1 = combine(TASKS, CIRCUMSTANCES)

const ROLES = lines(`
O contratante
A vítima
O guia
O prefeito
A curandeira
O capitão da guarda
A herdeira
O sacerdote
A testemunha
O mercador
A criança resgatada
O velho sábio
A taberneira
O ferreiro
O monstro
O prisioneiro
A rainha
O bardo
O cocheiro
A noiva
O informante
`)
const REVEALS = lines(`
é quem está por trás de tudo.
morreu há anos e ninguém percebeu.
trabalha para o lado inimigo.
deu lugar a um impostor faz tempo.
quer o mesmo que o grupo, por outro motivo.
está sendo chantageado.
é parente de alguém do grupo.
já fez este caminho antes e mentiu sobre isso.
só existe por causa de uma maldição.
recebeu ouro para atrasar o grupo.
guarda a única pista verdadeira.
é inocente, mas todos acreditam no contrário.
sabe onde está o refém desde o começo.
vai desaparecer na próxima noite.
`)
export const X4_TWISTS_1 = combine(ROLES, REVEALS, " ")

const SUBJECTS = lines(`
O filho do prefeito
A filha do barão
O velho sineiro
O padre da vila
Um estrangeiro de capa verde
A parteira da vila
O moleiro
Uma noiva no dia do casamento
O coletor de impostos
O carcereiro
Uma criança de olhos brancos
O boticário
O cão do pastor
O cavalo do mensageiro
`)
const HAPPENINGS = lines(`
some sem deixar rastro
volta depois de sete anos sem envelhecer
aparece na praça com as roupas cheias de cinzas
começa a falar uma língua que ninguém conhece
acorda no lugar errado ao amanhecer
deixa um rastro de pegadas de fogo
começa a atrair lobos para a vila
traz uma carta de alguém que já morreu
some na névoa do rio
amanhece com uma marca de mão queimada
chega pedindo abrigo e não sabe quem é
`)
const THINGS = lines(`
A estátua da praça
O poço da aldeia
O sino da capela
A ponte de pedra
Um baú lacrado
O retrato do fundador
O farol do porto
O livro de contas da guilda
O espantalho do campo
O barco do pescador
`)
const THING_HAPPENINGS = lines(`
some durante a noite
amanhece de frente para o outro lado
começa a sangrar uma água escura
toca ou brilha sozinho à meia-noite
amanhece com símbolos que ninguém pintou
aparece no lugar errado ao amanhecer
`)
export const X4_HOOK_EVENTS_1 = [...combine(SUBJECTS, HAPPENINGS), ...combine(THINGS, THING_HAPPENINGS)]

const BEINGS = lines(`
Um rei
Uma rainha
Um ferreiro
Uma pastora
Um cavaleiro
Uma bruxa
Um lobo branco
Uma criança
Um monge
Um gigante
Um dragão velho
Uma sereia
Um bardo cego
Uma princesa
Um caçador
Uma tecelã
Um mendigo
Uma feiticeira
Um navegador
Uma guerreira
Um corvo falante
Um príncipe
Uma parteira
Um ladrão
Uma ermitã
Um carrasco
Uma ourives
Um moleiro
`)
const DEEDS = lines(`
que trocou o próprio nome por uma colheita
que enganou a morte num jogo de dados
que dormiu cem anos debaixo de uma ponte
que guardou o sol numa caixa durante um inverno
que casou com a filha do vento
que construiu uma torre em uma única noite
que levou a peste para longe nas costas
que roubou a voz de uma montanha
que plantou a primeira videira do vale
que afogou uma cidade por vingança
que fez um pacto com as estrelas
que pediu aos deuses um dia a mais
que salvou a aldeia com uma mentira
que nunca mais voltou do bosque
que ensinou os lobos a não uivar para a lua
que forjou uma espada com um raio
que viveu dentro de uma baleia
que contou as areias do deserto
que deixou o coração num poço
que dançou com a rainha das fadas
que achou a porta para o fundo do lago
que trocou de lugar com o próprio reflexo
`)
export const X4_LEGEND_SUBJECTS_1 = combine(BEINGS, DEEDS)

const GOSSIP_WHO = lines(`
o barão
a viúva do moleiro
o novo capitão da guarda
a filha do ferreiro
o padre da capela velha
a dona da taverna
o coletor de impostos
o eremita da colina
a parteira
o mercador de tapetes
o juiz da cidade
a bruxa do pântano
o velho marinheiro do cais
a abadessa do convento
o mestre da guilda
o carcereiro
a menina que vende flores
o duque
o boticário
o caçador de lobos
`)
const GOSSIP_WHAT = lines(`
guarda um saco de ouro debaixo do assoalho.
fala com os mortos nas noites de sexta.
é de uma família nobre que caiu em desgraça.
entra no cemitério à meia-noite.
deve dinheiro a gente muito perigosa.
tem um filho escondido na cidade vizinha.
não envelhece há vinte anos.
sabe onde está o tesouro do antigo rei.
vende segredos para os contrabandistas.
fez um pacto com algo que mora no rio.
tem casamento marcado com alguém que ninguém conhece.
anda sumindo sempre que a lua está cheia.
escreve cartas para a coroa estrangeira.
tem um quarto que ninguém pode abrir.
foi soldado e desertou na última guerra.
consegue curar febre com as mãos.
comprou metade das terras do vale em segredo.
viu o monstro do lago e nunca mais dormiu.
está juntando armas no porão.
recebe visitas de um cavaleiro sem rosto.
perdeu a sombra numa aposta.
é a pessoa que paga os bandidos da estrada.
envenenou o antigo dono da casa.
`)

export const X4_RUMORS_1 = GOSSIP_WHO.flatMap((who) => GOSSIP_WHAT.map((what) => `Dizem que ${who} ${what}`))
