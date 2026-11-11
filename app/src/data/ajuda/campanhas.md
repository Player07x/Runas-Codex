Cada campanha é uma pasta `Campanhas/<nome>/` com a nota da campanha, as sessões, as missões e o quadro. Campanhas ›
**+ Nova campanha** cria tudo; a campanha de exemplo mostra como fica.

### As abas da campanha

| Aba | O que tem |
| :-- | :-- |
| **Painel** | Próxima sessão com contagem regressiva, relógio do mundo, missões ativas, notas recentes e atalhos |
| **Sessões** | Todas as sessões com número, data e situação (planejada, realizada, cancelada) |
| **Missões** | Missões em Colunas por situação (arraste os cartões), no Mapa (arcos e dependências) ou em Relógios |
| **Elenco** | Jogadores e personagens, NPCs e facções, ligados aos artigos da Wiki |
| **Ferramentas** | Tesouro, iniciativa, encontros, segurança, gerador de aventuras e mais |
| **Quadro** | Um quadro (canvas) livre só desta campanha |

### Sessões

Uma sessão é uma nota com data real (vira um evento na Agenda), data no mundo, situação, duração e presença dos
jogadores. O botão **Painel** da sessão mostra os **Detalhes da sessão**, a **preparação** e o **resumo**:

- **Preparação guiada**: recapitulação, início forte, cenas, segredos e pistas, locais, NPCs e recompensas. Cada
  item vira uma caixa de marcar.
- **Recapitulação**: “Anteriormente…” usa o resumo da sessão anterior.
- **Resumo da sessão**: o que aconteceu, para a próxima recapitulação.
- Uma sessão planejada com data no passado ganha um aviso para você marcar como realizada ou cancelada.
- Os campos gravam ao sair e mostram **Gravado**; fechar o painel no celular também grava o que estava digitado.
- **Desde a Sessão N**, no topo da preparação: missões mexidas, pistas reveladas, NPCs novos e relógios quase cheios.
- Marcar a sessão como **realizada** pergunta se o **hoje no mundo** avança para a data no mundo dela.
- **Notas do mestre**, abaixo das sessões, são notas soltas e secretas da campanha. **+ Novo → Nota do mestre** cria
  uma de qualquer tela: dentro de uma campanha, cai nela; fora, pergunta em qual. O ⋯ de cada nota tem **Ligar a uma
  sessão…**, que grava `sessao: "[[Sessão 3]]"` na nota (ou tira o vínculo).

### Relógio do mundo

No Painel, o cartão **Relógio do mundo** mostra a hora do mundo, a data e os períodos (Dia e Noite, para começar).
Cada volta do mostrador é um período: no fim da volta o relógio passa ao próximo e, depois do último, o dia avança.
**+10 min** e **+1 h** andam pouco; **Avançar** escolhe quanto: até o próximo período, 1 dia, 1 semana, 1 mês ou até
a data da próxima sessão. No ⋯ do cartão: **Ajustar data e hora** (data, hora e período de uma vez), **Configurar o
relógio** (horas por volta, minutos por hora e os períodos, em ordem) e **Abrir o calendário**. Tudo fica no bloco
`runas-calendario` do calendário da wiki da campanha (`hora: "07:30"`, `periodo: Dia` e `relogio:`), junto do `hoje`.

### Elenco

Jogadores (pessoa, contato, personagem, retrato) e personagens sem ficha; NPCs e facções vêm da Wiki com **Acompanhar
NPC** / **Acompanhar facção**: atitude com o grupo, último encontro, o que sabe, onde está e a reputação do grupo com
a facção. **Abrir na Wiki** leva ao artigo; **Tirar da campanha** só deixa de acompanhar (o artigo fica).

### Ferramentas

- **Relógios de progresso**: contadores em segmentos para ameaças e projetos, em **Missões › Relógios** (**Novo
  relógio**; o ⋯ edita nome, partes e tipo). Ali ficam os da campanha e, embaixo, os de cada missão.
- **Ganchos, pistas e segredos** rastreados, com a sessão em que foram revelados e para quem. Uma pista pode
  **destravar uma missão** (`- [ ] O selo é falso → [[O Selo do Conde]]`): revelar a pista oferece ativar a missão.
- **Tesouro do grupo**: itens, moedas e quem carrega (o ⋯ do item edita e remove).
- **Desfazer**: apagar relógio, item do tesouro, NPC ou facção e desvincular personagem não pedem confirmação; o aviso
  traz **Desfazer** por alguns segundos.
- **Fios soltos** (Painel): missões ativas que as últimas sessões não citam, NPCs que apareceram uma vez e pistas de
  missões já encerradas.
- **Iniciativa presencial**: ordem de turnos e rodadas para jogar na mesa física; um bloco `runas-encontro` monta a
  lista.
- **Linhas** e **Véus**: os limites combinados com o grupo; a carta X manda um sinal anônimo pela sala.
- **Nova aventura**: escolha uma estrutura (masmorra em cinco salas, três atos, investigação com três pistas, roubo
  ou exploração), dê título, gancho e objetivo (o dado sorteia) e ajuste as cenas. O app cria o arco e uma missão por
  cena, já ligadas no **mapa de missões**.
- **Atividades pela sala**: **Avaliação da sessão** (formulário anônimo), **Enquete de data** e o **Diário dos
  jogadores** (as entradas guardadas aparecem no fim da aba **Sessões**).
- **Criar a partir do link**: na nota da sessão, clicar num link para algo que ainda não existe (`[[Capitã Brites]]`)
  abre “Novo NPC”: escolha se é NPC, lugar, facção ou item; o NPC já entra no Elenco.
- **Estatísticas**: sessões, horas jogadas e presença.
- **Exportar diário**: Markdown, PDF ou HTML para entregar aos jogadores (com ou sem segredos).

### Tela do Mestre

Para usar durante o jogo, em tela cheia, com três colunas: **Agora** (a sessão, a iniciativa, os relógios), **Elenco**
e **Notas fixadas** (as notas que você quer à mão, como tabelas e regras). No celular, as colunas viram abas.
**Mostrar/esconder** esconde os segredos para jogar com a tela à vista. **NPC improvisado** sorteia nome (pela cultura
que você escolher), profissão, jeito, desejo e segredo; **Guardar na wiki** cria o artigo e põe o NPC no Elenco.

### Personalizar

**⋯ › Personalizar esta campanha…**: cor, ícone e imagem de capa. A cor aparece nos cartões, nas sessões e nos
eventos da Agenda.

### Elenco com muitos NPCs

Busque pelo nome, local ou facção; filtre **Todos / Apareceram / Ainda não** e pela atitude; agrupe por local, facção,
atitude ou situação. **Apareceu** é marcado sozinho quando uma nota de sessão tem link para o NPC; o botão marca à mão
quem apareceu sem link. A marca fica na nota da campanha, junto da atitude: `npcs: ["[[Conde Ormund]] (hostil,
apareceu)"]`. **Novo NPC** cria o artigo na wiki e já põe no Elenco.

**Relações** lista quem é aliado, inimigo ou membro de quem, pelas relações dos artigos da Wiki; **Gerar no Quadro**
desenha o mesmo em `Mapa de relações.canvas`, com o grupo no centro.

**Grade** e **Lista**, como nas categorias da Wiki: a lista mostra uma linha por NPC; a grade, um cartão com a imagem
do artigo (ou a inicial). Os dois têm a atitude, o “Apareceu” e o menu ⋯. A escolha fica lembrada neste aparelho.
No tamanho **pequeno**, o cartão mostra a atitude e o “apareceu” como etiquetas, e as ações (trocar a atitude, marcar
que apareceu, abrir a sessão) ficam no ⋯; nas facções, subir e baixar a reputação também vão para o ⋯.

### Mapa de missões

Em **Missões › Mapa**, cada **arco** (uma missão-mãe) aparece como um grupo com as missões dele em colunas: a missão
que **depende** de outra fica à direita, ligada por uma seta. Borda tracejada quer dizer **bloqueada** (algum
pré-requisito ainda não foi concluído). O mapa rola dentro do próprio quadro; pelo teclado, Tab passa pelas missões
na ordem dos arcos, e cada cartão diz a situação, se está bloqueada e o que ela requer. Na nota da missão:

```yaml
parte_de: "[[O Selo do Conde]]"
requer: ["[[Falar com Yara]]", "[[Achar o mapa]]"]
```

Sem `parte_de`, a ordem decide: a `2.1` fica dentro da `2` (o botão de corrente no cartão grava a ligação). **Gerar no
Quadro** cria ou atualiza `Mapa de missões.canvas`, que abre igual no Obsidian; o que você acrescentar no quadro
continua quando ele for atualizado.

Para ligar duas missões, arraste da bolinha à direita de um cartão até a missão que **depende** dela (ou toque na
bolinha e depois em **Ligar aqui**; Esc cancela). Uma missão pode ter **relógios** próprios (painel da missão ›
Novo relógio), que aparecem no cartão; quando uma ameaça enche, o app pergunta se a missão falhou. Concluir uma
missão com **recompensa** oferece mandá-la para o Tesouro do grupo. **⋯ › Mostrar aos jogadores pela sala** apresenta
só as missões que eles conhecem.

### Quadro

**Novo quadro** começa em branco ou de um modelo: **Mapa de missões**, **Mapa de relações**, **Linha do tempo** (as
sessões em ordem) ou **Investigação** (três pistas para cada conclusão). O ⋯ da barra renomeia o quadro ou o manda
para a lixeira do cofre.

### Data e hora de cada campanha

Cada campanha pode ter a sua data e a sua hora no mundo, separadas da wiki. Enquanto você não mexe, ela segue o “hoje”
do calendário da wiki (o cartão do relógio diz “segue a wiki”). Na primeira vez que você avança o relógio ou ajusta a
data pela campanha, ela passa a ter as suas (“tempo desta campanha”), gravadas na nota dela como `data_mundo`,
`hora_mundo` e `periodo_mundo`. A regra do relógio (horas, minutos e períodos) continua no calendário, porque é do
mundo. No ⋯ do relógio, **Voltar a seguir a wiki** apaga as três propriedades. Em Wiki › Calendário › Hoje no mundo
aparece a data de cada campanha que tem a sua.
