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
