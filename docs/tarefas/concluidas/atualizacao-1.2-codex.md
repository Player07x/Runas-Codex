# Atualização 1.2.0 — passagem para o Codex (modelo GPT-6.1 Sol, raciocínio High)

Escrito pelo Claude em 08/11/2026, a pedido do João. Você continua a execução do plano da 1.2.0 de onde o Claude
parou: primeiro termina a tela do mapa (PRs J, K e L, juntos), depois faz os PRs que faltam. O Claude revisa o mapa
quando você terminar.

## Antes de começar (leia inteiro)

1. `AGENTS.md` (regras do repositório) — vale tudo, principalmente as regras 1 a 10 e “Arquivos compartilhados”.
2. `docs/tarefas/concluidas/atualizacao-1.2.md` — o plano aprovado: regras **D1–D17**, “Revisão de design” (o que estava errado
   nas telas da versão 1), a lista de itens U16–U34 e a seção “PRs, na ordem”, com um parágrafo de código e um de
   **Tela** para cada PR.
3. `docs/tarefas/concluidas/atualizacao-1.2-maquetes.html` — a **maquete versão 2, aprovada pelo João em 08/11**. Ela é a
   referência visual: abra no navegador (arquivo estático, sem rede). Cada tela traz no topo os PRs dela e, no fim, “O
   que mudou da versão 1” e “Decidido”. Quando o plano e a maquete não bastarem, pergunte ao João; não invente.
4. `docs/ux-ui-acessibilidade.md` — critérios de aceite de UX e acessibilidade.
5. `docs/04-testes-pendentes.md` — no fim, as seções da 1.2.0 que já existem (B, F, H) mostram o nível de detalhe
   esperado.

## Onde trabalhar e o que não fazer

- Trabalhe **só** no worktree `/home/joao-antonio/Documentos/GitHub/.worktrees/runas-codex-1.2` (branch
  `tarefas/atualizacao-1.2`). Todo o trabalho dos PRs B, F, H e do mapa está lá **sem commit**; não existe em outro
  lugar. A referência `rascunho/1.2-telas-codex` (commit `9ea3c0e`) guarda as suas telas da versão 1, se precisar
  comparar.
- **Não faça commit, push nem PR, e não mescle nada**, até o João pedir. Nada de `git stash`, `git checkout -- .`,
  `git reset` ou `git clean` neste worktree: apagaria trabalho que só existe ali.
- Não mexa na pasta principal `~/Documentos/GitHub/Runas-Codex`, nem no cofre real do João
  (`/home/joao-antonio/Documentos/Runas-Codex`).
- Nenhuma dependência nova (se for indispensável, pergunte antes). Nenhuma chamada de rede nova (regra 6).
- Arquivos compartilhados: **só acrescente** no fim. Exceção já feita pelo Claude: `desktop/src/main/smoke.ts` (o
  smoke do relógio, PR F) foi editado, não só acrescentado; isso será explicado no PR F.
- Como tudo está no mesmo worktree e depois vira um PR por fase, **anote os arquivos de cada PR** (ver “Andamento”
  abaixo). Não misture dois PRs no mesmo arquivo sem anotar.

## Ambiente e verificação (todo PR)

```bash
export PATH=~/.local/opt/node/bin:$PATH
cd /home/joao-antonio/Documentos/GitHub/.worktrees/runas-codex-1.2
npm run typecheck        # demora: dê até 10 minutos
npm test
npm run build
npm run desktop:build
cd desktop && xvfb-run -a npx electron . --smoke --vault="$PWD/tests/cofre-exemplo"
cd desktop && xvfb-run -a npx electron . --smoke --write --vault="$PWD/tests/cofre-exemplo"
```

- Para os testes de um arquivo: `cd app && npx vitest run src/core/<arquivo>.test.ts`.
- Tela no navegador: `npm run dev -- --port 5206` no worktree (o cofre de exemplo é em memória e volta ao estado
  inicial quando a página recarrega).
- **Toda tela nova ou mudada**: confira com 1280 px e com 320 px de largura, no tema escuro e no claro, só com o
  teclado (Tab, setas, Enter, Esc, e o foco volta para onde estava), e ponha lado a lado com a tela da maquete. Tire
  imagens dos dois tamanhos e guarde em `docs/tarefas/prints-1.2/<pr>-<tela>-<largura>.png` (para os PRs e a revisão).
- O console do navegador não pode ter erro nem aviso do React.

## As telas: o que mais deu errado na versão 1 (não repita)

As regras completas são D1–D17 do plano. As que a versão 1 quebrou:

- **Só peças do kit** (`app/src/components/kit/`: `PageHeader`, `DocumentBar`, `SaveStatus`, `Notice`, `ListRow`,
  `ChoiceGroup`, `PanelTabs`/`TabPanel`, `OverflowMenu`, `FormGrid`/`FormField`, `NoteCombobox`/`NoteListField`,
  `CoverImagePicker`, `Crest`/`NoteCrest`, `WorldDateField`) e o `ResizablePanel` + `usePanelToggle` para painel
  lateral. Não crie outro cabeçalho, menu, aba ou painel.
- **Uma ação principal por tela** (botão `primary`); o resto vai para o ⋯. Nada de “Salvar” onde a tela grava sozinha
  (mostre o `SaveStatus`).
- **Formulários alinhados**: todo formulário usa `FormGrid` + `FormField` (os rótulos, campos e dicas alinham por
  subgrid). Campos curtos primeiro, dois por fileira; os largos (`wide`) depois; imagens por último. Sem caixa em volta
  da ficha. (Pedido do João: “alinhamento demonstra constância no design”.)
- **Nomes, não caminhos**: nunca mostre `[[ ]]`, `.md` ou `Pasta/Sub/Nota`; use o título da nota.
- **Cor tem função**: segredo é violeta **com** cadeado **e** a palavra “Segredo”; vermelho só para perigo e erro.
  Cores só pelas variáveis de `app/src/styles/tokens.css`.
- **Texto de 12 px ou mais**, sem `opacity` em texto (use `--muted`/`--faint`); contraste dos dois temas (o teste
  `styles/tokens.test.ts` cobra).
- **Celular**: a partir de 320 px sem rolagem para os lados; alvos de 44 px até 860 px ou com toque (`pointer:
  coarse`), 24 px no mínimo no computador; a barra inferior do app não é coberta.
- **Teclado**: tudo o que o ponteiro faz tem alternativa (lista, botão “no meio da vista”, setas); listas e grupos de
  botões com uma parada de Tab e setas (padrões da WAI-ARIA); `aria-current` no item atual; título por rota.
- **Estados completos**: vazio, carregando, erro, somente leitura e versão dos jogadores, cada um com texto que diz o
  que fazer.
- **Nada simulado e nada removido** (regra 10, D14): botão que não funciona não entra; função que já existe não some.
- CSS novo num arquivo do módulo (ex.: `map.css`), não em `wiki.css`; tire as regras mortas que a tela nova deixa.
- Foco: não dependa de `requestAnimationFrame` para pôr o foco; use um `useEffect` depois da mudança de estado.

## 1. Terminar o mapa (PRs J, K e L juntos) — U17 a U21

Plano: parágrafos **J**, **K** e **L** de `atualizacao-1.2.md`. Maquete: **Tela 01 · Wiki › Mapas**.

**Já feito pelo Claude (testado, não mexa sem motivo):**

- `app/src/core/map-geometry.ts` + teste: `rectPolygon`, `ellipsePolygon`, `insertVertex`, `midpoint`,
  `removeVertex`, `translatePoints`, `nudgePoint`, `pointInPolygon`, `nearestInDirection`, `bounds`.
- `app/src/core/wiki-map-extras.ts` reescrito: áreas ganham `opacidade`, `borda` (continua, tracejada, nenhuma),
  `nota` e `forma` (retangulo, elipse, livre); só gravados quando têm valor (mapa antigo fica igual). Teste em
  `wiki-map-extras.test.ts`.
- `app/src/core/wiki.ts`: `mapSpecKeys(antes, depois)` (só as chaves que mudaram vão para `setBlockKeys`) e
  `pinForPlayers(pino, resolve)` (some o pino secreto, o de camada de segredos e o de nota que os jogadores não veem).
  `core/export/documents.ts` passou a usar `pinForPlayers` (o nome de nota secreta não vaza no documento dos
  jogadores; teste em `documents.test.ts`).
- Telas novas, ainda **sem compilar** (é aqui que você entra): `screens/wiki/MapCanvas.tsx` (a superfície: imagem,
  camadas de imagem, SVG no tamanho da imagem com `vector-effect: non-scaling-stroke`, pinos, alças de vértice,
  régua, barra de opções da ferramenta, teclado), `MapRail.tsx` (barra de ferramentas), `MapPanel.tsx` (abas Pinos,
  Áreas, Camadas, Mapa), `PinPopover.tsx` (popover do pino), `map-views.ts` (o que aparece agora) e `WikiMap.tsx`
  reescrito (bloco na nota, lista com capa, tela do mapa com `DocumentBar`, trilho, mapa e `ResizablePanel`
  `wiki-mapa`).

**Decisões do Claude que diferem do texto do plano (registre na ADR 0036 e no PR):**

- O trilho tem **seis** ferramentas (Mover, Pino, Área, Rota, Rótulo, Medir), não quatro: rotas e rótulos existem
  desde a C6a e não podem sumir (regra 10).
- A forma da área (Retângulo, Elipse, Livre) é escolhida na **barra de opções da ferramenta**, no topo do mapa
  (`ChoiceGroup`), e não num menu no botão do trilho; começa em Retângulo e é lembrada
  (`runas-codex:mapa-forma-area`).
- A aba Áreas lista e edita Áreas, Rotas e Rótulos (com “Nova área/rota/rótulo” no meio da vista).
- A aba Mapa ganhou a **escala da régua** (pixels, distância, unidade, viagem por dia), que antes só existia no YAML.
- Nas alças de vértice, como nos pinos: as setas escolhem a alça, **Alt+setas movem** (Shift: 5 %), Enter na alça
  do meio insere o ponto, Delete apaga o vértice, Esc termina.

**O que falta:**

1. `MapCanvas.tsx`: aceitar as props que o `WikiMap.tsx` já passa e o componente ainda não tem:
   - `popoverAt?: MapPoint | null` — ponto onde o popover fica (hoje a posição é calculada pela `selection`; use
     `popoverAt` quando vier, para o pino novo também);
   - `ghostAt?: MapPoint | null` — desenhar um pino-fantasma tracejado onde o pino novo vai ficar;
   - `onDrawingChange(index, points, how: "move" | "edit")` — `"move"` ao arrastar a forma inteira, `"edit"` nas
     alças (ponteiro e teclado). O `WikiMap` usa isso para a forma virar `livre` só quando os vértices mudam.
   - O texto `sr-only` de ajuda do mapa precisa dizer também “Alt+setas movem o pino”.
2. Criar `app/src/screens/wiki/map.css` (o `WikiMap.tsx` já importa). Procure os `className` usados nos seis arquivos
   acima. O essencial:
   - `.map-screen` é uma grade: a `DocumentBar` e os avisos (`.map-notice`) na largura toda; embaixo,
     trilho | mapa | painel, com o painel em `var(--panel-wiki-mapa, 340px)` (o `ResizablePanel` põe essa variável
     no pai). O mapa ocupa a altura que sobra (`min-height: 0`).
   - Até 860 px: uma coluna; o trilho vira uma faixa no **topo** do mapa (ícone com nome embaixo, 44 px); o painel
     some e, com `.map-screen.show-panel`, sobe por cima do mapa como folha inferior, acima da barra inferior do app
     (veja `relations.css`, que já faz isso).
   - `.map-popover-wrap` usa `left: var(--px); top: var(--py)`; até 560 px vira folha inferior dentro do mapa.
   - Pino: o título da nota numa etiqueta legível sobre qualquer imagem; `.secret` violeta com cadeado e borda
     tracejada; `.broken` com aviso que não seja só cor; `.active` em ciano. Alças: área de toque de 24 px (44 px
     com `pointer: coarse`), desenhadas menores.
   - `.map-keyhint` aparece só quando o mapa tem foco do teclado (`.map-box:focus-visible`).
   - Lista de mapas (`.map-cards`, `.map-card`, `.map-card-band`): capa numa faixa no topo, sem texto por cima; sem
     imagem (`.plain`), o brasão centrado.
   - Com movimento reduzido, nada animado (D16).
3. Apagar `screens/wiki/MapView.tsx` e `screens/wiki/MapImageSettings.tsx` (confira com `grep` que nada mais os
   importa) e as regras de mapa de `wiki.css`: o bloco `/* Mapa */` antigo (`.map-body`, `.map-canvas`,
   `.map-compass`, `.map-panel`…), as regras `.map-screen` … `.map-block-open`, `.map-images-settings`/
   `.map-drawing-tools`/`.map-toolbar label` e o bloco `/* Atualização 1.2 (Codex): mapa — sai no PR J … */`. Antes,
   confira com `grep` se alguma classe é usada fora do mapa (`.map-canvas` não é a `.campaign-questmap-canvas`).
4. `WikiMap.tsx`: tirar o `export { MapIcon }` do fim e o import que só existia para ele.
5. Pela regra 1, a lógica pura não fica em `screens/`: mova `map-views.ts` para `app/src/core/map-views.ts`, sem
   importar nada de `.tsx` (traga os tipos para lá e use uma função própria no lugar de `noteLabel`), e escreva o
   teste (`map-views.test.ts`): versão dos jogadores esconde pino secreto, de camada de segredos e de nota secreta;
   camada escondida tira pino e desenho do mapa mas não da lista; eras; contagem das camadas.
6. Rodar a verificação completa. O smoke conta `.map-pin` (2 ou mais) e lê `.map-world img`: mantenha as classes.
7. Conferir na tela, com o teclado e nos dois tamanhos, pelo menos:
   - trilho (uma parada de Tab, setas); mapa (setas movem, + e − aproximam, 0 enquadra);
   - pinos: Tab chega a um pino só, setas vão ao vizinho, Enter abre o popover, Alt+setas movem, Delete apaga com
     “Desfazer”;
   - popover: Nota pelo `NoteCombobox`; “Criar “X”…” abre o Novo artigo e liga o pino na nota criada; Rótulo só sem
     nota; Esc fecha e devolve o foco ao pino; “Pôr pino no meio da vista” na aba Pinos;
   - áreas: retângulo, elipse e livre (Concluir, Desfazer ponto, tocar no primeiro ponto fecha); arrastar a área; as
     alças pelo ponteiro e pelo teclado; editor da aba Áreas (cor com os 12 nomes de tons, preenchimento, borda,
     nota, eras, segredo); rota e rótulo;
   - Camadas (mostrar e esconder, nova camada); Mapa (trocar a imagem pelo `CoverImagePicker`, escala, crônicas);
   - Painel: aberto no computador, fechado até 860 px, lembrado; o mapa não pula ao abrir e fechar;
   - ⋯ do mapa: Abrir a nota do mapa, versão dos jogadores (some pino secreto e o de nota secreta), Trocar a imagem…,
     nomes das ferramentas; somente leitura (só Mover e Medir);
   - o mapa dentro da nota (bloco `runas-mapa`) continua abrindo o pino e a nota.
8. Ajuda: atualizar a parte de mapas de `app/src/data/ajuda/wiki-mapas.md` (só editar os tópicos que existem).
   `docs/04-testes-pendentes.md`: acrescentar no fim “Atualização 1.2.0 · Mapas (PRs J, K, L; U17–U21)” com o que o
   João confere à mão.
9. Parar no fim do mapa, preencher o “Andamento” e escrever no chat: o que foi feito, como verificou e o que ficou sem
   verificar. Depois siga para os próximos PRs; o Claude revisa o mapa em paralelo, então **não volte a mexer nos
   arquivos do mapa** sem combinar.

## 2. Os PRs que faltam, nesta ordem

Para cada um: o parágrafo do PR em `atualizacao-1.2.md` (código e **Tela**), a tela da maquete com aquele PR no topo,
testes em português ao lado do código, ajuda, `docs/04` e o “Andamento”.

| PR | Item | Resumo | Atenção |
|---|---|---|---|
| C | U23 | Capa da mesa no VTT (Criar Sala) | IPC novo: `ipc.ts`/`preload` só acrescentar; Android; smoke `vttWorldCover`. Raciocínio Extra High se travar. |
| D | pronto (Claude, sem commit) | `vtt/shared/scene.ts`, `vtt/shared/player.ts` + teste, `core/wiki-token.ts` + teste, `vtt/wiki-tokens.ts` + teste (`wikiTokenSource`, mapas sem token fora), `vtt/library-actions.ts` (`WIKI_TOKEN_DRAG_TYPE`), `vtt/panels/LibraryPanel.tsx`, `vtt/panels/WikiTokenPicker.tsx` (novo), `vtt/canvas/SceneCanvas.tsx`, `vtt/vtt.css`, ajuda `vtt.md`, `docs/04` | o alvo da imagem virou caminho do cofre; arrastar “Da wiki” para o mapa põe o token onde cai (navegador); 3 testes de `wiki-tokens` | o ⋯ da nota no token e o “Trocar nota…” (painel do navegador escondido, o Pixi não desenha) |
| E | pronto (Claude, sem commit) | `core/grid-rows.ts` + teste, `components/kit/useGridColumns.ts`, `core/campaigns.ts` + teste, `WikiCategory.tsx`, `CastView.tsx` (seções NPCs e Facções, sem abas; cartão Pequeno com etiquetas e ⋯), `campaigns.css`, ajuda `campanhas.md`, `docs/04` | `fullRows`/`nextLimit` com testes; no tamanho Pequeno, atitude e “apareceu” em etiquetas e o resto no ⋯; facção pequena com subir/baixar no ⋯ (navegador) | 320 px e tema claro |
| G | pronto (Claude, sem commit) | `core/campaigns.ts` + teste, `SessionView.tsx` (“Ligar a uma sessão…”), `CampaignsScreen.tsx` (escolher a campanha), `lib/create-request.ts` + teste (`createRoute`, `forwardCreate`), `components/Shell.tsx` (item “Nota do mestre”), `campaigns.css`, ajuda `campanhas.md`, `docs/04` | `fixadas` por link (teste); + Novo › Nota do mestre dentro e fora da campanha; “Ligar a uma sessão…” grava `sessao` (navegador); 3 testes de `createRoute` | smoke |
| I1, I2 | pronto (Claude, sem commit) | `core/generator-tables-x4-pessoas.ts`, `-x4-lugares.ts`, `-x4-enredo.ts`, `-x4-mundo.ts`, `core/generator-tables-x4.ts`, `core/generator-tables.ts` (`extend`, `LISTS`), `core/wiki-tools.test.ts`, `docs/04` | escritas à mão e compostas com concordância; 8.599 → cerca de 21.000 opções (o dono disse que bastava, ADR 0036); teste sem repetidos; nomes das culturas iguais | leitura de amostras pelo dono |
| M | U26, U27 | Ferramentas: resultado vai para a categoria certa; lista e Recentes alinhados | `generateDetailed` com a mesma ordem de sorteio de `generateWorld` (teste de igualdade). |
| N | pronto (Claude, sem commit) | `core/wiki-token.ts` + teste (`tokenFromSaved`, `savedTokenFileName`), `screens/wiki/Infobox.tsx` (“Importar de um token salvo…”), `wiki.css`, `core/wiki-category.ts`, ajuda `wiki.md`, `docs/04` | grava tudo numa só `save` com fila; importar de token salvo copia a imagem para os anexos e liga o token da Biblioteca à nota (navegador) | Obsidian, Android |
| O | U25 | Árvore genealógica refeita | Mesmo esqueleto das Relações (PR H, já pronto em `WikiRelations.tsx`/`relations.css`; o `FamilyTreeView` antigo ficou lá para você trocar). Extra High no layout. |
| P | U24, U34 | Diálogo Novo NPC e Nova facção | “Sortear” nunca apaga o que foi digitado; usa o `generateDetailed` do M. |

Depois deles:

- **PR A (U16)**: está em outro branch, `editor/u16-clique-propriedades` (PR rascunho #112, smoke falhando). Crie um
  worktree próprio para ele (`git worktree add ../runas-codex-u16 editor/u16-clique-propriedades`, numa pasta fora
  de `/tmp`), descubra por que o smoke falha e corrija. Sem push até o João pedir.
- **ADR 0036** (`docs/adr/0036-…md`, no estilo das outras): registra as decisões de formato e de design da 1.2.0 que
  estão em “Do Claude, de formato” e na revisão de design do plano, a aprovação das maquetes v2 em 08/11, a opção de
  “Importar de novo da nota” e as decisões do mapa listadas acima.

## Andamento (mantenha esta seção atualizada)

Ao terminar cada PR, atualize a tabela: estado, arquivos tocados (para separar os PRs depois), como verificou e o que
ficou sem verificar. As listas de B, F e H foram feitas de memória: confira com `git status` e `git diff --stat` e
corrija a tabela no começo.

| PR | Estado | Arquivos | Verificação | Sem verificar |
|---|---|---|---|---|
| B | pronto (Claude, sem commit) | `NewArticleDialog.tsx`, `new-article.css`, `FichaFields.tsx`, `core/wiki-ficha.ts`, `kit/NoteCombobox.tsx`, `kit/FormField.tsx`, `wiki.css`, ajuda `wiki.md`, `docs/04` | navegador 1280 e 320 px | smokes no Electron |
| F | pronto (Claude, sem commit) | `core/world-clock.ts`, `core/calendar.ts`, `world-today.ts`, `WorldClockCard.tsx`, `QuestClocks.tsx`, `QuestBoard.tsx`, `QuestMap.tsx`, `CampaignDashboard.tsx`, `DashboardCards.tsx`, `ClocksEditor.tsx`, `core/campaigns.ts`, `campaigns.css`, `smoke.ts`, ajuda `campanhas.md`, `docs/04` | 15 testes; navegador 1280 e 320 px | smokes no Electron |
| H | pronto (Claude, sem commit) | `core/wiki.ts` (`relationEdges`), `core/relation-layout.ts`, `WikiRelations.tsx`, `relations.css`, `WikiArticle.tsx`, `wiki.css`, ajuda `wiki-mapas.md`, `docs/04` | 7 testes; navegador 1280 e 320 px | smokes no Electron |
| J, K, L | pronto para revisão (Codex, sem commit) | `MapCanvas.tsx`, `MapPanel.tsx`, `MapRail.tsx`, `PinPopover.tsx`, `WikiMap.tsx`, `map.css`, `core/map-views.ts` + teste, `core/map-geometry.ts` + teste, `core/wiki-map-extras.ts` + teste, `core/wiki.ts`, `core/export/documents.ts` + teste, `wiki.css`, ajuda `wiki-mapas.md`, `docs/04` (e remoção de `MapView.tsx`/`MapImageSettings.tsx`) | `npm run typecheck`; 125 arquivos/898 testes do app; testes focados do mapa (27); build Vite para `/tmp/runas-codex-map-build`; `git diff --check` | Conferência visual lado a lado em 1280/320 px, temas escuro/claro, teclado com leitor de tela e smokes Electron; o build padrão e os testes de rede do desktop ficam bloqueados pelo worktree/sandbox (EROFS/EPERM) |
| C | pronto para revisão (Codex, sem commit) | `vtt/shared/world.ts` + teste, `vtt/shared/ipc.ts`, `vtt/shared/portable-world-store.ts`, `platform/android-room.ts`, `vtt/api.ts`, `desktop/src/main/vtt/world-store.ts`, `vtt-host.ts`, preload, `screens/vtt/VttScreen.tsx`, `screens/vtt/vtt.css`, ajuda `vtt.md`, `docs/04` | `npm run typecheck`; revisão de código do fluxo desktop/Android/browser | Smoke `vttWorldCover`, Electron/Android, revisão visual e build padrão (limitação EROFS/EPERM) |
| D | revisado e corrigido (Claude, sem commit) | `vtt/shared/scene.ts`, `vtt/shared/player.ts` + teste, `core/wiki-token.ts` + teste, `vtt/wiki-tokens.ts`, `vtt/library-actions.ts`, `vtt/panels/LibraryPanel.tsx`, `vtt/canvas/SceneCanvas.tsx`, `docs/04`, `vtt/wiki-tokens.test.ts` | revisão: o alvo da imagem virou caminho do cofre (antes ia o texto do link); campo Nota com link, “nota não encontrada”, “Importar de novo da nota” e “Desvincular” | **Falta:** arrastar da Wiki para a cena e “Trocar nota…”; smokes Electron/Android |
| E | revisado e corrigido (Claude, sem commit) | `core/grid-rows.ts` + teste, `components/kit/useGridColumns.ts`, `core/campaigns.ts` + teste, `WikiCategory.tsx`, `CastView.tsx`, `docs/04`, `CastView.tsx` reescrito (seções NPCs e Facções, sem abas), `campaigns.css` | `fullRows`/`nextLimit` com testes; colunas lidas do `grid-template-columns`; foco no primeiro cartão novo; reputação −/+ no navegador | **Falta:** no tamanho Pequeno os controles do cartão não vão para o ⋯; smoke do Elenco |
| G | revisado e corrigido (Claude, sem commit) | `core/campaigns.ts` + teste, `SessionView.tsx`, `docs/04`, `campaigns.css` | `fixadas` resolvidas por link (teste); card com cadeado, “Segredo”, sessão sem número repetido, ⋯ com Abrir/Fixar/Lixeira; fixar aparece na Tela do Mestre (navegador) | **Falta:** item “Nota do mestre” no “+ Novo” do app (`lib/create-request.ts`) e “Ligar a uma sessão…”; exportação/sala no Electron |
| I1, I2 | **não feito** (Claude desfez) | — | as listas novas tinham “(variante)” e repetidos: `generator-tables.ts` e o teste voltaram ao HEAD; os dois arquivos x4 foram apagados | Precisa de conteúdo escrito de verdade (sem sufixos gerados), com concordância e sem repetidos |
| M | revisado e corrigido (Claude, sem commit) | `core/wiki-tools.ts`, `screens/wiki/WikiTools.tsx`, `docs/04` | `generateDetailed` usa o mesmo sorteio de `generateWorld` (teste de igualdade); destino por gerador (lenda → Mito com “O que é verdade”, divindade → Religião com dogma; **rumor sem `verdade`**, decisão); resultado de tabela abre o Novo artigo | Recentes em aparelho real |
| N | revisado e corrigido (Claude, sem commit) | `core/wiki-token.ts` + teste, `screens/wiki/Infobox.tsx`, `docs/04`, `wiki.css`, `core/wiki-category.ts` | grava tudo numa só `save` com fila (antes dava “mudou fora do app”); Tamanho, Disposição, Barras e Imagem; chaves do token fora dos filtros da categoria; navegador sem erro no console | **Falta:** “Importar de um token salvo…”; Obsidian |
| O | revisado e corrigido (Claude, sem commit) | `core/family-layout.ts` + teste, `screens/wiki/WikiRelations.tsx`, `docs/04`, `relations.css` | layout refeito (filiação do meio do casal, cônjuges lado a lado, 3 testes); gerações acima/abaixo (0–5, gravadas); clicar recentra, no centro abre os detalhes; anúncio para leitor de tela | Leitor de tela de verdade; tema claro |
| P | revisado e corrigido (Claude, sem commit) | `core/improvised-npc.ts` + teste, `screens/campaigns/campaign-dialogs.tsx`, `docs/04`, `campaigns.css` | Sortear não apaga o nome digitado; atitude; ocupação e descrição vão para a ficha (navegador) | Smoke |
| J, K, L (correções) | revisado e corrigido (Claude, sem commit) | `MapCanvas.tsx`, `WikiMap.tsx`, `map.css` | enquadra de novo ao mudar o tamanho até o usuário mexer; foco sem `requestAnimationFrame`; abas do painel cabem a 1280 px e o mapa abre enquadrado a 320 px | Tema claro; smokes |
| A | pronto (Claude, PR #112) | `components/vault/live-preview.tsx` + teste, `screens/books/book-workspace.css`, `desktop/src/main/smoke.ts` | margem do cartão no padding do invólucro; o live preview espera o botão do mouse subir para redesenhar; o smoke usava `detail: 0` (clique triplo no Linux); `editorClick` com `card`, `steady`, `line`, `empty` passa no smoke local e pega o problema sem a correção | Windows com mouse de verdade, Android |
| ADR 0036 | pronto (Claude, sem commit) | `docs/adr/0036-atualizacao-1.2.md` | D1–D17 e as decisões dos itens | — |
