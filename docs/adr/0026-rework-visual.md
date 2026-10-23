# ADR 0026 — Rework visual: simples, não minimalista

- **Status:** aceita (2026-10-21)

## Contexto
O dono pediu um rework visual do app inteiro (proposta e protótipo aprovados em 21/10/2026). O problema central:
telas com muitos controles soltos, principalmente Livros (“não pode parecer um painel de avião”), cinco jeitos
diferentes de recolher painéis, migalha com caminho de arquivo e itens da auditoria de acessibilidade abertos
(título por rota, `aria-current`, foco ao navegar, contraste de bordas, texto pequeno). A direção pedida é “simples,
não minimalista”: todo recurso continua acessível, cada um num lugar fixo e previsível.

## Decisão
1. **Três camadas para cada recurso:** sempre à vista o que a tela existe para fazer; a um toque o que aparece
   quando faz sentido (barra na seleção, menu `/`, painel lateral); num menu com nome (o “⋯”) o resto. Tudo também
   pela busca (`Ctrl K`).
2. **Duas anatomias para todas as telas.** Tela de documento: barra do documento (voltar, título, modo, estado,
   painel, ⋯), conteúdo, um painel lateral com abas e barra de status. Tela de lista: cabeçalho com uma ação
   principal e o ⋯, filtros numa linha, conteúdo.
3. **Componentes padrão em `app/src/components/kit/`:** `PageHeader`, `DocumentBar`, `SaveStatus`, `OverflowMenu`
   (padrão de menu da WAI-ARIA), `PanelTabs`/`TabPanel` (padrão de abas), `Notice` e `ListRow` (altura fixa, pronta
   para listas longas). A navegação por teclado comum fica em `core/roving.ts`, com testes.
4. **Painéis:** o `ResizablePanel` é o único jeito de recolher. A barra do painel mostra o nome dele e um botão; a
   navegação principal recolhe para um trilho de ícones (`collapsedMode="rail"`, `Ctrl+\`).
5. **Tokens:** texto do app a 15 px e de leitura a 16 px; nada abaixo de 12 px; foco de 3 px; estado escolhido e
   controles com borda `--line-strong` (3:1). O teste `styles/tokens.test.ts` cobra 4,5:1 para texto e 3:1 para
   bordas de controles em todas as paletas e temas.
6. **Moldura:** título da aba por tela (`core/page-title.ts`), `aria-current` na navegação, foco no título da tela
   nova (dentro do mesmo espaço, quem está no conteúdo continua onde está e a troca é anunciada), migalha com nomes
   (`lib/crumbs.ts`) e “+ Novo” com as mesmas criações dos botões de cada tela (`lib/create-request.ts`).
7. **Fases:** F1 fundações; F2 acessibilidade; F3 editor e Livros; F4 Notas, Wiki, Campanhas e Agenda (com as cores,
   capas e imagens da ADR 0027); F5 Início, Configurações, Transferir e VTT. Um PR por fase.

## Consequências
- Telas novas e reformadas usam o kit; outro cabeçalho, menu ou painel próprio precisa de justificativa no PR.
- O texto maior muda a densidade de telas que a F1 não refaz; as fases seguintes acertam cada uma.
- Os painéis antigos mudam de cara sem mudar de comportamento: a preferência de largura e de recolhido continua no
  aparelho (`runas-codex:painel:<id>`).

## F2 — acessibilidade (decisões)
- **Seção própria** em Configurações › Acessibilidade (`/config/acessibilidade`, também pela paleta), separada de
  Aparência. Grupos Leitura, Visão e Interação, prévia ao vivo e “Restaurar padrão”, que volta só o que é
  acessibilidade (paleta, tema e barra inferior ficam). Tudo no aparelho (`runas-codex:aparencia`), validado em
  `core/appearance.ts`: valor desconhecido volta ao padrão e nunca vira estilo.
- **Cada opção só age quando ligada.** No padrão, nenhuma regra nova vale e o leitor desenha como antes (regra 7). O
  “texto de leitura” é o mesmo escopo do tamanho do texto; as páginas impressas dos Livros ficam de fora.
- **Espaçamento:** “Muito amplo” usa os valores da WCAG 1.4.12 (linha 2, letras 0,12em, palavras 0,16em,
  parágrafos 2em).
- **Fonte legível:** Atkinson Hyperlegible **Next** (`@fontsource-variable/atkinson-hyperlegible-next` 5.3.0, OFL), a
  versão atual da fonte do Braille Institute, embutida no app. Ela vale para o **app inteiro**, porque quem precisa
  dela precisa também dos menus; a Garamond fica só no texto das notas.
- **Contraste alto:** texto, texto secundário e bordas neutros e mais fortes, iguais nas três paletas; fundo e cor de
  destaque continuam os da paleta. Liga sozinho com `prefers-contrast: more`. O teste de tokens cobra 7:1 no texto e
  4,5:1 nas bordas de controles.
- **Rótulos junto aos ícones:** o nome mostrado é o mesmo `aria-label` do leitor de tela, então nunca diverge. No
  celular, o nome vai embaixo do ícone e a barra do topo cresce.
- **Controles maiores** é o antigo Modo tablet, com o mesmo comportamento.
- **Barra inferior do celular (NAV-3):** quatro espaços escolhidos em Aparência; escolher um que já está na barra
  troca os dois de lugar. O padrão continua Início, Notas, Agenda e VTT.
- `ChoiceGroup` entra no kit: rádios de verdade com cara de seletor segmentado.
- Uma seção pedida pela rota recebe o foco com `data-route-focus`, antes do título da tela.

## F3a — editor compartilhado (decisões)
- **Uma barra por documento** no `NoteView` (Notas, Wiki, Campanhas e Livros): voltar · voltar/avançar · pasta e
  título · Leitura/Editar/Código · Salvo · Painel · ⋯. Os ícones soltos (link, imagem, modelo, renomear, lixeira,
  organizar, favorito, copiar, imagens, ferramentas, exportar) vão para o menu ⋯, com nome e atalho. Fixar, cor e ícone
  viram um diálogo. Conflito e erro de gravação usam o `Notice` do kit.
- **Formatação onde se usa:** barra na seleção (negrito, itálico, tachado, destaque, link e “Mais”; Alt+F10 entra nela
  pelo teclado), menu `/` com ações, comandos e o catálogo inteiro, e a galeria **Formatar** (Ctrl+/) com busca sem
  acento e abas por grupo. No celular, uma barra sobre o teclado (Formatar, `/`, negrito, itálico, link, tarefa) toma o
  lugar da barra inferior do app enquanto se escreve.
- O catálogo de formatadores sai de `screens/books/` para `core/formatters.ts` (com testes), porque o editor inteiro usa.
  A faixa fixa de Livros e o “Inserir recurso da Wiki” saem: os recursos da Wiki viram a aba Wiki da galeria e uma
  seção do menu `/` (`extraFormatters`).
- **Formatador com seleção:** a seleção entra no lugar do texto de exemplo; se o formatador não tem onde pô-la
  (quebra de página, tabela), ele entra depois dela (blocos, no fim da linha) e nunca apaga o texto selecionado.
- **Código:** Geist Mono no peso normal a 15 px, frontmatter numa faixa e no peso normal (o `---` que fecha o
  frontmatter fazia o Markdown ler as propriedades como título), comentários `%% revisão %%` em dourado, números de linha
  opcionais e barra de status com MARKDOWN, linha e coluna. O leitor compartilhado não muda (regra 7).
- **Modo lembrado por espaço** (`runas-codex:modo-nota:<espaço>`); Ctrl+E alterna Leitura e Editar, Ctrl+Shift+E entra
  e sai do Código, Ctrl+/ abre a galeria. Os três entram na lista de atalhos editáveis.
- Os smokes do desktop passam a renomear e abrir o histórico pelo menu ⋯; o caminho da nota continua no `title` do
  `.editor-status` (agora o título da barra) e a contagem em `.note-word-count` (agora na barra de status).

## F3b — Livros (decisões)
- **Três modos** no lugar dos sete botões: Escrever, Organizar (Estrutura e Cortiça numa visão só, em cartões ou lista) e
  Prévia (onde mora Exportar). Foco é a única ação solta. Metadados, Exportar, Novo capítulo, máquina de escrever e
  snapshots ficam no menu ⋯ do livro.
- **Sumário recolhível** com status por ponto (pronto, revisão, rascunho; o nome vai junto para o leitor de tela),
  palavras por capítulo, “Novo capítulo” no fim e “Fora do livro” recolhido com contador.
- **Linha do capítulo** acima da página (tipo · status · palavras · resumo) no lugar do quadro de propriedades; clicar
  abre a aba Capítulo do Apoio.
- **Apoio** fechado por padrão, em três abas: Referências (busca na Wiki sem acento, mais citados primeiro, Citar e
  Transcluir), Revisão (os `%% revisão %%` do capítulo, com Ir e Remover, e os snapshots) e Capítulo (tipo, status,
  resumo; grava o texto em edição antes, para não virar conflito). A leitura e a remoção dos comentários estão em
  `core/books-review.ts`, com testes.
- Na barra da seleção, Livros acrescenta **Comentar** (o comentário entra depois do trecho) e **Citar da Wiki** (abre as
  Referências com o trecho como busca). O capítulo usa a variante “livro” do `NoteView`: modo **Visual ⇄ Código** na
  barra de status, estado e menu do capítulo na barra do livro, contagem de palavras igual à do sumário.
- **Organizar:** arrastar pelo ⠿, menu de cada capítulo (Abrir, Subir, Descer) e Alt+↑/↓ no capítulo focado; a posição
  nova é anunciada e o foco acompanha o capítulo.
- Ao entrar num livro, a navegação do app recolhe para o trilho (e volta ao sair). No celular: barra de uma linha,
  texto na largura toda, sumário e Apoio por cima da página (um por vez), Organizar e Prévia no fim do sumário.
- `ResizablePanel` ganha `setPanelCollapsed`, que recolhe ou expande de vez (alternar duas vezes desfazia o pedido).
- **Excluir livro** (decisão do dono em 22/10): manda a nota do livro e os capítulos para a lixeira do cofre, com
  confirmação. Ficam os capítulos de fora da pasta do livro e os que outro livro também usa.

## F4a — Notas (decisões)
- **Cabeçalho da lista (NOT-1):** título, “+ Nova nota” e um menu ⋯ com nome em cada ação (nova pasta, nota do dia,
  nota aleatória, gráfico, buscar e substituir, exportar, lixeira, bloquear). A ordem fica ao lado da busca, com o
  nome da ordem atual no rótulo. No celular, o botão flutuante cria a nota.
- **Painel da nota** com as abas do kit (Links, Propriedades, Sumário, Gráfico), com contador no nome acessível.
- **Gráfico acessível (NOT-3):** a página do gráfico ganha “Lista”, uma tabela com cada nota, quantas ligações tem e com
  quem, e um botão para abrir (as 500 mais ligadas; os filtros valem). O gráfico local mostra as notas ligadas como
  botões embaixo do desenho.
- **Fileira de abas das notas** continua mesmo com uma nota só: ela guarda ações que não têm outro lugar (abrir em
  janela, fixar, dividir, workspaces). Some quando essas ações tiverem lugar fixo.

## F4b — Wiki (decisões)
- **Barra da Wiki (WIK-1):** a troca de wiki vira menu de verdade; as telas que não cabem vão para “Mais”, medido pelo
  espaço (`kit/useFitCount`), em vez de serem cortadas; Exportar e Nova wiki no ⋯ da Wiki. As telas têm `aria-current`.
- **Artigo (WIK-6):** o painel lateral vira abas — Ficha (com Mostrar pela sala e mídia), Relações, Citado em e Links —
  com contadores. A ficha continua sendo a aba aberta por padrão.
- **Categoria (WIK-7):** “Novo …” é a ação principal; Exportar categoria no ⋯.
- **Calendário (WIK-2):** a coluna da direita vira abas (Dia, Hoje no mundo, Sincronizar, Ajuda); “+1 dia” fica no
  cabeçalho, ao lado de Hoje.
- **Linha do tempo (WIK-3):** uma linha de controles (Calendários e Filtros recolhidos, zoom, Ajustar à tela, Lista);
  Crônicas recolhida; vista em tabela; rótulos perto da borda direita mudam de lado.
- **Relações (WIK-4):** a teia diplomática enquadra ao abrir e ganha a tabela “quem · relação · com quem”, com a cor num
  ponto ao lado do nome (as cores fixas da teia não passariam de contraste como texto).
- **Ferramentas (WIK-5):** geradores numa lista à esquerda e o resultado à direita, do tamanho dele.

## F4c — Campanhas (decisões)
- **Barra da campanha (CAM-2):** a mesma da Wiki — troca de campanha por menu (com “Todas as campanhas”), as telas que
  não cabem vão para “Mais”, `aria-current` na tela aberta e “Tela do Mestre” no fim.
- **Sessões e próxima sessão (CAM-3):** planejada em dourado, jogada em verde, cancelada apagada, igual no painel, na
  lista e na linha do tempo. Na lista de sessões, “+ Nova sessão” é a ação principal e as exportações do diário vão
  para o ⋯.
- **Missões (CAM-4):** colunas com largura mínima; quando não cabem, a barra de rolagem fica à vista e uma sombra marca
  o lado que continua. No celular, uma coluna por vez, escolhida num seletor com a contagem de cada uma.
- **Elenco (CAM-5):** cada NPC e facção tem um ⋯ (Abrir na Wiki, Tirar da campanha) no lugar da lixeira solta. Os
  cartões dos personagens dos jogadores ficam como estavam.
- **Ferramentas (CAM-6):** lista à esquerda e só a ferramenta escolhida à direita; a última fica lembrada no aparelho.
- **Quadro (CAM-7), em todos os `.canvas`:** o cartão guarda o tamanho do arquivo (como no Obsidian) e não cresce
  sozinho ao abrir, para não cobrir os vizinhos nem gravar sem pedido. Quando o texto não cabe aparece “continua…”;
  depois de escrever num cartão ele cresce até 520 px para o texto caber, e “Ajustar altura” mostra tudo do cartão
  escolhido. Os cartões entram no Tab, as setas movem os selecionados (Shift: 50 px), Enter edita ou abre a nota e o
  foco traz para a vista o cartão que estava fora dela. As amostras de cor já tinham 24 px (X8).
- **Tela do Mestre (CAM-8):** deixa de ser janela sobre a página e ocupa a tela inteira, em três colunas com rolagem
  própria: Agora (próxima sessão, pistas guardadas, iniciativa presencial, relógios e dados), Elenco (personagens,
  NPCs e facções) e Notas fixadas, uma por aba e inteira. No celular, uma coluna por vez, nas abas de cima. Esc fecha.
- **Painel no celular (CAM-9):** próxima sessão, relógios, missões ativas, segredos e pistas, elenco, limites e linha do
  tempo; as estatísticas vão para o fim, recolhidas. A ordem muda no HTML (não só no CSS), para o leitor de tela e o
  Tab seguirem o que se vê.

## F4d — Agenda (decisões)
A proposta (AGE-1 a AGE-11) está no documento do rework, com maquetes. Os itens AGE-1 a AGE-3 são os de 21/10.
- **Cabeçalho (AGE-3):** `PageHeader` com o título “Agenda”, “+ Evento” como ação principal e um ⋯ com Enquete de
  data, Tempo livre, Importar .ics e Exportar .ics (os quatro também na busca `Ctrl K`, por `lib/agenda-request.ts`).
  Logo abaixo, uma linha com ‹ Hoje ›, o período num título anunciado ao mudar e o seletor de visão. Sai o caminho
  “N evento(s) em Agenda/”. A Enquete fica no ⋯, como na proposta (o dono pediu em 22/10 para concluir a F4 sem responder a esta pergunta; dá
  para trazê-la de volta como segundo botão no PR).
- **Mês navegável (AGE-1, AGE-2):** grade de datas da WAI-ARIA, com linhas e uma parada de Tab. Setas andam um dia
  ou uma semana, Home/End vão ao domingo e ao sábado, PageUp/PageDown trocam de mês (com Shift, de ano) e o foco
  acompanha a grade quando o mês muda; Enter abre o dia no painel. A conta está em `core/agenda-grid.ts`, com testes.
  Cada dia tem nome completo (“quinta-feira, 22 de outubro de 2026, hoje, 4 eventos, 2h livres”) e `aria-selected`.
  No evento, o título vem antes da hora, e a hora some numa célula estreita (consulta de contêiner); o “+N” vira
  botão que abre o dia. Os eventos ficam fora do Tab: a aba Dia lista os mesmos como botões.
- **Painel em abas (AGE-4):** Dia (eventos, tempo livre, tarefas do dia e “+ Evento neste dia”), Evento (abre ao
  escolher um evento) e Tarefas (as com prazo, com contador). A aba Dia ou Tarefas fica lembrada no aparelho
  (`runas-codex:agenda-aba`).
- **Evento (AGE-5):** “Abrir sessão” é a ação principal quando há sessão (sem ela, “Editar”); “Abrir nota” e
  “Editar” à vista; Pular esta data e Mandar para a lixeira no ⋯ do evento. O caminho do arquivo fica na dica do
  “Abrir nota”. Sessão ligada mostra o estado (planejada, realizada, cancelada) em texto.
- **Semana e Dia (AGE-6):** nada abaixo de 12 px; cada bloco com nome completo; numa faixa com mais de três
  eventos lado a lado (seis na visão Dia), os de sobra viram “+N”. Cada coluna é uma parada de Tab: setas escolhem a
  hora e o dia, Enter cria o evento na hora escolhida. A disposição (`layoutDay`) foi para o núcleo, com testes.
- **Lista (AGE-7):** `ListRow` do kit, um título por dia e “Mostrar mais 60 dias” no fim.
- **Diálogo (AGE-8):** Quando e Avisos abertos; Detalhes, Sessão e Preparação recolhidos e marcados como opcionais,
  abrindo sozinhos quando já têm valor. Cores como rádios de verdade, com nome. O erro usa o `Notice`, fica ligado ao
  campo (`aria-describedby`, `aria-invalid`) e o campo recebe o foco. Nenhum campo saiu e a nota gravada é a mesma.
- **Lembretes (AGE-9):** o cartão fixo sai; um `Notice` aparece só quando falta permissão (notificações no
  navegador, alarmes na hora exata no Android). A explicação de cada plataforma virou a dica do campo Lembrete.
- **Celular (AGE-10):** até 860 px o painel começa fechado e sobe por cima do calendário ao escolher um dia ou
  evento; Esc fecha. Botão flutuante “+ Evento”, que some com o painel aberto.
- **Cores (AGE-11):** hoje e a linha da hora atual na cor de destaque, não em vermelho (ADR 0001). Sessão sem cor
  própria em dourado; a cor da campanha entra com a personalização (ADR 0027). Segue a proposta, ainda sem resposta
  explícita do dono: evento na cor da campanha e o estado da sessão escrito ao lado.

## F5 — Início, Configurações, Transferir e VTT (decisões)
- **Próxima sessão de uma fonte só (INI-1):** `core/next-session.ts` responde ao Início, ao painel da campanha e à Tela
  do Mestre. Entram as sessões planejadas (pela data da nota) e os eventos de sessão da Agenda; um evento ligado a uma
  sessão conta uma vez só; vence a mais próxima, e a sessão sem data fica por último. A campanha de um evento sai da
  sessão ligada (`sessao` ou `evento`) ou, sem ligação, do título “Sessão N — Campanha” (a mesma regra da Agenda, ADR
  0027). Um evento sem nota de sessão aparece como próxima sessão, com “Criar a nota da sessão”.
- **Sessão com data passada (CAM-1):** sessão com `status: planejada` e data anterior a hoje vira um aviso no painel
  e na Tela do Mestre, com “Marcar como realizada”, “Cancelada” e “Remarcar” (abre a sessão). Sem `status`, a data já
  decide (realizada), como antes.
- **Início (INI-1 a INI-4):** destaque compacto, um estado por vez (próxima sessão com quando, contagem, preparação e
  presença; ou “Nenhuma sessão marcada” com o próximo passo), na cor e com o brasão da campanha. Espaços sem números.
  “Retome o fio” mostra o título (o `title` do evento, o `# título` ou o nome sem a data na frente), o espaço e
  “editada há…”. Nada abaixo de 12 px.
- **Centelhas (INI-2):** gravam em `Notas/Entrada.md` (`core/sparks.ts`), uma ideia por item de lista com a hora. A
  ideia usada fica riscada (`~~…~~`), que não vira tarefa do Tasks; “Limpar as usadas” tira as riscadas; remover e
  limpar podem ser desfeitos logo em seguida.
- **Configurações (CFG-1):** índice de seções ao lado (Cofre, Backups, Obsidian e anexos, Aparência, Acessibilidade,
  Editor e atalhos, Agenda e tarefas, Sala do VTT, Privacidade e atualizações, Ajuda e exemplos), com todas as seções
  na página no computador; no celular, `/config` é a lista e `/config/<seção>` mostra só ela. Backups ganhou seção
  própria (o backup de texto e o caminho para o pacote do cofre). Nenhuma opção saiu.
- **Transferir (TRF-1, TRF-2):** primeiro “O que você quer fazer?” em três cartões (Levar para outro aparelho, Gerar
  documento ou site, Pasta para o Obsidian), depois só o formulário escolhido, com um resumo antes de salvar. Um botão
  principal por formulário, no canto inferior direito (no celular, na largura toda). `/transferir/importar` abre na
  importação. O smoke de transferência (`desktop/src/main/transfer-smoke.ts`) passou a escolher o cartão antes de cada
  formulário.
- **VTT (VTT-1):** cartões maiores, “Mesas recentes” embaixo (as quatro abertas por último), o aviso de rede como
  `Notice` em texto normal e um ⋯ com Importar mesa e Exportar mesas (que levam a Importar e exportar). A regra fixa
  continua: só Criar Sala e Entrar Sala como escolhas.
- **Lugares de Ajuda, Backups e Importar mesa:** seções “Ajuda e exemplos” e “Backups” nas Configurações e cartão
  “Mesas do VTT” em Transferir, também pela busca `Ctrl K`. Um painel de ajuda por tela fica para a C9, que escreve o
  conteúdo: um botão de ajuda sem texto contrariaria a regra 10.
- A contagem da Wiki na navegação deixou de contar a nota da categoria (`tipo: categoria`).
