O tempo do mundo é contado nos **calendários da Wiki**: notas com um bloco `runas-calendario` (formato no tópico
Blocos especiais). Wiki › Novo artigo › Calendário cria um pronto para editar.

### Datas nas notas

- Propriedades que terminam em `_mundo` são datas do mundo: `nascimento_mundo`, `morte_mundo`, `fundacao_mundo`,
  `data_mundo` e `data_fim_mundo` (início e fim de acontecimentos e guerras).
- O formato é `"ANO-MM-DD SIGLA"`, entre aspas: `nascimento_mundo: "3597-12-18 R"`. A **sigla** diz em qual
  calendário a data está (a chave `sigla` do calendário; sem ela, as iniciais do nome).
- Na ficha, a data aparece por extenso (“18 de Cantlos de 3597 C.R.”) com a idade, a estação, a era e o tempo
  relativo em relação a **hoje no mundo**.
- Datas antigas sem sigla usam o calendário da propriedade `calendario`; Wiki › Calendário oferece **Acrescentar a
  sigla** a elas.

### A tela do calendário

Wiki › **Calendário** mostra os meses do calendário escolhido, com luas, feriados, aniversários e os acontecimentos
do dia. Com mais de um calendário, **Tornar padrão** (ao lado da lista) faz o calendário escolhido abrir ao entrar em
Calendário, nas campanhas e no Início; ele fica na propriedade `calendario: "[[Nome]]"` da nota inicial da wiki
(`Wikis/<wiki>/<wiki>.md`, criada se faltar). O padrão aparece marcado na lista.

Os aniversários de quem nasceu num calendário sincronizado também aparecem, no dia em que caem neste: “Gwyn (83 ·
R)” diz a idade e a sigla do calendário em que a pessoa nasceu (a festa é contada no calendário dela).

À direita, abas:

- **Dia**: o que acontece no dia escolhido.
- **Hoje no mundo**: a data atual da campanha; avance um dia (ou mais) conforme o jogo anda. Idades e contagens se
  atualizam.
- **Sincronizar**: diga que um dia de um calendário é o mesmo dia de outro (“1/1/4031 OC = 1/1/812 do élfico”). As
  correspondências valem nos dois sentidos e em cadeia, e permitem converter datas. Abaixo, **Conferir a
  sincronização** ajuda a achar o erro quando algo não bate:
  - **Luas**: compara as luas de mesmo nome nos dois calendários e diz quantos dias a lua cheia está fora. **Acertar
    no outro** ou **Acertar aqui** reescreve o `cheia_em` da lua, para ela ficar cheia nos mesmos dias.
  - **Aniversários**: os próximos aniversários de quem nasceu no outro calendário, para conferir se caem onde deviam.
  - **Mover a ligação**: −1 dia e +1 dia mostram a prévia (luas, aniversários e a data de hoje no outro) antes de
    **Gravar**; isso corrige uma correspondência que ficou alguns dias fora. Quando a ligação passa por um terceiro
    calendário, ajuste por lá.
- **Ajuda**: o formato do bloco.

### A linha do tempo

Wiki › **Linha do tempo** põe os acontecimentos, nascimentos, mortes, fundações e eras num eixo. Marque quais
calendários mostrar (os sincronizados ficam no mesmo eixo), filtre por tag, ajuste o zoom, use **Trilhas** para
separar por país ou personagem, ou veja em **Lista**. Acontecimentos recorrentes (festivais, eclipses) aparecem em
cada repetição.

### Mapas que mudam com o tempo

Um mapa pode ter várias imagens por era (**Crônicas**): escolha o ano do mapa e a imagem daquela época aparece.
