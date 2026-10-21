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
