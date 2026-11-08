# Atualização 1.2.0 — plano e passagem para o Codex

Plano aprovado pelo dono em 07/11/2026. Escrito pelo Claude Code; quem continuar (Codex ou Claude) segue este arquivo
e o [`AGENTS.md`](../../AGENTS.md).

## Para quem continuar

- **Situação:** nenhum item terminado. O **PR A (U16)** está em rascunho no branch `editor/u16-clique-propriedades`
  (correção feita; a checagem nova do smoke ainda falha — o PR explica). A ADR 0036 ainda não existe: crie-a no
  primeiro PR que usar as decisões abaixo. A página visual com maquetes (Fase 0, item 3) não foi feita: pergunte ao
  dono se ele quer vê-la antes dos PRs de tela (B, E, F, H, J).
- Um PR por letra, na ordem e com as dependências do fim da seção "PRs". Trabalhe numa worktree própria a partir da
  `main` atualizada; nunca na pasta principal do dono.
- As linhas citadas são da 1.1.0 (origin/main f497ea3); confira antes de editar.
- Arquivos de gravação segura e do leitor Markdown: só mudam como diz o `AGENTS.md` (o PR A é o PR pequeno do leitor).

## Contexto

A 1.1.0 saiu em 04/11/2026 (origin/main = f497ea3, nenhum PR aberto). Em 07/11 o João mandou 16 capturas com
problemas e pedidos em Wiki (Mapas, Relações, Ferramentas, categorias, Novo artigo), Campanhas (Painel, Sessões,
Elenco, Facções), VTT (mesas e tokens), um bug do editor (o clique cai abaixo do lugar certo) e "geradores +300%".
Funções novas depois da 1.0 = **1.2.0** (ADR 0025).

**Atenção:** a pasta principal está em 7041feb (46 commits atrás, sem U1–U14 nem 1.1.0). Todo trabalho parte da
origin/main numa worktree nova (`.worktrees/runas-codex-1.2`); as linhas citadas abaixo são da 1.1.0
(`.worktrees/runas-codex-1.1.0`, idêntica à origin/main).

## Decisões

Do João (07/11):
1. Os relógios de ameaça/meta saem do Painel. Em **Missões**, a vista **"Árvore" some do programa** e no lugar entra
   a vista **Relógios**. Os relógios de cada missão continuam.
2. Relógio do mundo: uma volta completa passa ao **próximo período**; depois do último, a data avança um dia. Dá para
   marcar o período à mão.
3. **Nota do mestre** = nota solta da campanha, escondida dos jogadores, com sessão ligada opcional.
4. Geradores **×4 só nas tabelas** (8.599 → ≥ 34.396 opções); nomes das culturas (e as 3 listas lusófonas) ficam.

Minhas (registrar na ADR 0036):
- Pino ligado a nota mostra **o título da nota**; rótulo só em pino sem nota (o `rotulo` antigo fica gravado).
- Dados de token na nota, no frontmatter: `token: "[[imagem]]"`, `token_tamanho`, `token_disposicao` (jogador,
  aliado, neutro, hostil, secreto), `token_barras: ["PV 12/12", "PA 3/3"]`. Sem `token`, usa o retrato. Copiados só
  na importação. No VTT o vínculo é `TokenData.notePath` (mesmo nome do pino de nota).
- Hora do mundo no **mesmo bloco `runas-calendario`** do `hoje:` (vale para a wiki inteira): `hora: "07:30"` (sempre
  entre aspas), `periodo: Dia`, `relogio: { horas: 12, minutos: 60, periodos: [Dia, Noite] }`, gravados numa só
  gravação; calendários ligados sincronizam só o `hoje`.
- Sessão continua no arquivo `Sessão N.md` (dois-pontos não valem em nome de arquivo no Windows/Obsidian); o H1 passa
  a `# Sessão N: Título`. O evento da Agenda mantém " — " (`next-session.ts:63` depende dele).
- Áreas do mapa: retângulo e elipse gravam `tipo: zona` + `forma` opcional (um `tipo` novo faria versões antigas
  recusarem o mapa inteiro); o nome é o `texto` que já existe.
- Capa da mesa = caminho de imagem do cofre (fora de `.runas`) no `mesa.json`; API `setWorldCover?` opcional.
- Cargo no organograma = texto entre parênteses de `membro_de` (`"[[Ordem]] (tesoureira)"`); ex-membro = texto que
  começa com "ex". Nada novo no formato.

## Itens

| Item | Pedido | PR |
|---|---|---|
| U16 | Clique no Editar cai uma linha abaixo (margem do cartão de Propriedades não medida pelo CodeMirror) | A |
| U17 | Mapa: tela com painel lateral recolhível e trilho de ferramentas | J |
| U18 | Mapa: pino = nota (busca, criar nota, editar depois, teclado) | K |
| U19 | Mapa: imagem com busca e "Do computador…", trocar depois | B, J |
| U20 | Mapa: áreas com formas e edição de vértices; SVG sem esticar | J, L |
| U21 | Capa dos mapas (lista e categoria); "Novo mapa" já como Mapa | J |
| U22 | Token ligado a nota; seção Token na nota; Importar dos dois lados | D, N |
| U23 | Capa da mesa | C |
| U24 | Novo NPC com ficha opcional e Sortear | P |
| U25 | Relações: página, organograma e árvore genealógica refeitos | H, O |
| U26 | Ferramentas: levar o resultado para a categoria certa | M |
| U27 | Ferramentas: lista e Recentes alinhados | M |
| U28 | Categoria/Elenco: "Mostrar mais" com fileiras inteiras | E |
| U29 | Novo artigo com a ficha preenchida na criação (layout novo) | B |
| U30 | Relógio do mundo no Painel; Relógios em Missões no lugar da Árvore | F |
| U31 | Sessões: "Sessão N: Título" e notas do mestre | G |
| U32 | Geradores ×4 nas tabelas | I1, I2 |
| U33 | Elenco: tamanho dos cartões sem quebrar o visual | E |
| U34 | Facções: Grade/Lista e tamanho, Nova facção, Sortear, −/+ sem apagar texto | E, P |

Defeitos achados na leitura (entram nos PRs): o `notePath` dos pinos de nota vai para os jogadores
(`vtt/shared/player.ts:135`, PR D); −/+ da reputação apaga o texto extra entre parênteses (`CastView.tsx:324-330`,
PR E); pino público ligado a nota secreta mostra o nome aos jogadores (`MapView.tsx:221`, PR K).

## Fase 0 — registro e página visual (antes dos PRs de tela)

1. Worktree `.worktrees/runas-codex-1.2` a partir da origin/main; `npm ci` (Node 24 em `~/.local/opt/node/bin`).
2. PR de documentos `tarefas/atualizacao-1.2`: `docs/tarefas/atualizacao-1.2.md` (U16–U34 com causa e o que fazer),
   linha no `docs/tarefas/README.md`, itens no `PENDING` de `docs/tarefas/panorama.html` (só acrescentar),
   `docs/adr/0036-atualizacao-1.2.md` com as decisões acima.
3. Página visual (Artifact, cores do Órbita) com antes/depois e maquetes de: tela do mapa, Novo artigo, Relações,
   Relógio do mundo, Elenco com tamanhos e Facções, token ↔ nota. O João olha enquanto sai o PR A; ajustes dele
   entram antes dos PRs de tela (B, E, F, H, J).

## PRs, na ordem (cada um cabe numa janela de 5 h; conferir o uso antes de começar cada um)

Cada PR: branch próprio a partir da main atualizada, testes de unidade em português, `docs/04-testes-pendentes.md`
(só acrescentar), ajuda (`app/src/data/ajuda/*.md`, só editar os 22 tópicos existentes), prints no PR.

**A — `editor/u16-clique-propriedades` (U16).** PR pequeno só do live preview: em
`app/src/components/vault/live-preview.tsx:527` trocar a `margin: 4px 0 10px` do `.cm-lp-properties` por espaço que
o CodeMirror mede (padding num invólucro do widget), mesmo desenho. Smoke: clicar no **meio** de uma linha depois do
cartão e conferir a linha do cursor (o atual clica em `box.top + 4`, `desktop/src/main/smoke.ts:212-217`; chave nova
de resultado). Conferir também o zoom por rota do Chromium (Preferences guarda zoom por URL com `#`); se trocar de
tela mudar o zoom, guardar um zoom só para o app.

**B — `wiki/u29-novo-artigo-ficha` (U29, base de U19/U22/U24/U26).**
- Novos: `screens/wiki/NewArticleDialog.tsx` (sai de `WikiHome.tsx`, que re-exporta), `screens/wiki/FichaFields.tsx`
  (controlado, sem `useWiki()`: imagem → `CoverImagePicker` em `<details>`, link → combobox, links → fichas, data →
  dia/mês do calendário/ano com sigla, texto/número), `components/kit/NoteCombobox.tsx` (combobox ARIA 1.2 com
  "Criar “X”"), `screens/wiki/new-article.css`, `core/wiki-ficha.ts` + teste: `ARTICLE_KIND_GROUPS`, `fichaInput`,
  `fichaValue` (mesmas validações do `FieldEditor`, `Infobox.tsx:148-163`), `applyFicha` (usa `setProperty` de
  `core/properties.ts`), `withArticleBody`.
- Diálogo: duas colunas ≥ 900 px (tipos agrupados em rádios nativos com busca | Nome, Pasta compacta, Ficha,
  Perguntas-guia recolhidas); no celular, dois passos. Props novas `initialValues`, `initialBody`, `onCreated`.
  Mapa usa o `CoverImagePicker` no lugar do `<select>`.
- `kit/CoverImagePicker.tsx`: `useId()` no lugar de `name="book-cover-image"`. `Infobox.tsx`: `FieldEditor` passa a
  usar `fichaValue` (sem mudar comportamento).

**C — `vtt/u23-capa-da-mesa` (U23).** `vtt/shared/world.ts` (`capa?` no `WorldManifest`, `parseWorldManifest`
mantém, `setWorldCoverManifest`, testes); IPC `vtt:worlds-cover` (`ipc.ts`, `preload/index.ts` só acrescentar,
`vtt-host.ts`, `world-store.ts` com `writeJsonAtomically`); `portable-world-store.ts` + `android-room.ts`; `api.ts`
(prévia); `remote-api.ts` sem o método (item escondido). `screens/vtt/VttScreen.tsx`: ⋯ ganha "Capa…" (diálogo com
`CoverImagePicker`), `.mesa-thumb` mostra a imagem e volta ao degradê em `onError`. Smoke: chave nova
`vttWorldCover` (definir capa → abrir a mesa → listar e a capa continua, pegando o `open()` que regrava o manifesto).

**D — `vtt/u22a-token-ligado-a-nota` (U22, mesa).** `scene.ts`: `TokenData.notePath?` validado em `normalizeToken`
(auxiliar `vaultNotePath` tirado de `normalizeNote`). `player.ts`: tirar `notePath` do token e da nota (vazamento),
teste em `player-projection.test.ts`. `core/wiki-token.ts` + teste (`TOKEN_KEYS`, `noteToken`, `parseTokenBar`,
`tokenBarText`, `tokenProperties`). `vtt/wiki-tokens.ts` (fonte montada em `MesaTable` com `useVault()` e passada
por parâmetro; `undefined` no mestre remoto). `library-actions.ts`: `placeWikiToken` (bytes por
`platform.readBinary` → `vtt.assets.import("tokens")`), `reimportWikiToken`. `LibraryPanel.tsx`: "Da wiki" com busca
e botão **Importar**, arrastar com `application/x-runas-wiki-token` (tratado no `onDrop` de `SceneCanvas.tsx:249`).
`TokenFields`: "Nota: X · Abrir · Trocar · Desvincular · Importar de novo".

**E — `campanhas/u28-u33-u34-grades` (U28, U33, U34 sem o diálogo).** `components/kit/useGridColumns.ts`
(ResizeObserver + `gridTemplateColumns`), `core/grid-rows.ts` + teste (`fullRows`, `nextLimit`);
`WikiCategory.tsx` (24/+24 → fileiras inteiras); `CastView.tsx`: `size` P/M/G nas preferências do Elenco, cartão com
`container-type` e controles compactos no pequeno, Facções em Grade/Lista com `ArticleArt` (símbolo) e −/+, botão
**Nova facção** (`NewNpcDialog initialKind="organizacao"`), `useGridColumns` no lugar do `PAGE 60`;
`core/campaigns.ts`: `withReputation` + teste. Não mexer na `.campaign-cast-grid` dos PJs (smoke conta os filhos).

**F — `campanhas/u30-relogio-do-mundo` (U30).**
- Missões: `QuestBoard.tsx` vistas Colunas/Mapa/Relógios (`"lista"` lembrado vira `"colunas"`); Relógios = 
  `ClocksEditor` da campanha + "Relógios das missões". `QuestMap.tsx` perde o modo lista; o Mapa continua acessível
  com ordem do DOM por arco e texto de situação/dependências em cada cartão. CSS da lista sai.
- `core/world-clock.ts` + teste (`parseWorldClock`, `advanceClock` com virada de período e de dia,
  `withWorldClock` sem mexer no resto do bloco, `handAngles`). `screens/wiki/world-today.ts`: `useSetWorldClock`.
- `screens/campaigns/WorldClockCard.tsx`: ponteiros em SVG (`role="img"` com data, hora e período), +10 min, +1 h,
  Avançar (1 dia, semana, mês, data da sessão), Editar data e hora ali, "Ajustar o relógio" (horas, minutos,
  períodos). `CampaignDashboard.tsx`: sai o `ClocksCard` e o chip da capa.
- Smoke (`smoke.ts` compartilhado, explicar no PR): os relógios passam a ser contados em Missões › Relógios; chave
  nova `worldClock`. Ajuda `campanhas.md` (linhas 12, 28, 38-39, 89).

**G — `campanhas/u31-sessoes-notas-do-mestre` (U31).** `core/campaigns.ts`: H1 `Sessão N: Título`,
`GM_NOTES_FOLDER`, `newGmNote` (`tipo: nota-mestre`, `segredo: true`, `sessao` opcional), `isGmNote`,
`listGmNotes`; testes (`campaigns.test.ts:254`, `table-notes.test.ts:9`, nota do mestre não é sessão).
`SessionView.tsx`: "Nova sessão" fica no `.page-head` (smoke) com "Nota do mestre" ao lado e a seção "Notas do
mestre · N" com "Fixar na Tela do Mestre"; `GmNoteDialog.tsx` novo.

**H — `wiki/u25a-relacoes-organograma` (U25).** `core/wiki.ts`: `relationEdges` (arestas montadas uma vez).
`core/relation-layout.ts` + teste (`orgStructure`, `layoutOrg`; sem sobreposição, ex-membros esmaecidos).
`WikiRelations.tsx` + `relations.css`: coluna com lista pesquisável (organizações / pessoas / facções da teia) no
lugar dos `<select>`, gráfico com arrastar, zoom e Enquadrar (também por teclado), cartões com retrato, cargo e
situação, ramos que fecham, painel do nó com "Abrir artigo" e `AddRelation` (exportado de `WikiArticle.tsx`), "Ver
como lista". A Teia diplomática entra no mesmo esqueleto sem trocar o motor.

**I1/I2 — `dados/u32a-geradores-pessoas-lugares`, `dados/u32b-geradores-enredo-mundo` (U32).** Arquivos novos
`core/generator-tables-x4-*.ts` (auxiliares `lines`/`pairs`), spread só **no fim** de cada lista (os testes usam os
primeiros itens), concordância de gênero nos pares; teste: listas ≥ 34.396, sem repetidos, culturas inalteradas.

**J — `wiki/u17-mapas-tela` (U17, U19, U21, SVG do U20).** `MapView.tsx` dividido em `MapCanvas.tsx`, `MapRail.tsx`
(`role=toolbar`) e `MapPanel.tsx` (`PanelTabs` Pinos/Áreas/Camadas/Mapa); painel lembrado em
`runas-codex:wiki-mapa-painel`, mapa reenquadra ao recolher; `MapImageSettings.tsx` vira a aba Mapa (imagem pelo
`CoverImagePicker`); `WikiMap.tsx`: cartões com `ArticleArt size="cover"`, "Novo mapa" com `initialKind="mapa"`;
`core/wiki.ts`: `articleImage` lê o bloco `runas-mapa` (sem tocar `parse.ts`), `mapBaseYaml`; `map.css` novo e as
regras mortas/duplicadas de `wiki.css` saem; SVG com `viewBox` do tamanho da imagem e `non-scaling-stroke`. Smoke
mantém `.map-pin` (≥ 2) e `.map-world img`.

**M — `wiki/u26-u27-ferramentas` (U26, U27).** `core/wiki-tools.ts`: `generateDetailed` (mesma ordem de sorteio que
`generateWorld`, teste de igualdade), `GENERATOR_ARTICLE` (Nome/NPC/Mercador → Personagem; Nome de lugar/Sala de
masmorra → Local; Taverna → Construção; Facção → Organização; Divindade → Religião (mandamento em `dogma`); Item
mágico/Tesouro → Item; Lenda/Rumor → Mito (`verdade`); Gancho/Aventura → Acontecimento; Clima → campo `clima` de um
Local). `WikiTools.tsx`: "Guardar na wiki" abre o Novo artigo preenchido; resultados em grade com botões da mesma
altura e largura fixa (Usar/Escolhido); Recentes em `runas-codex:wiki-ferramentas-recentes:<raiz>`, 2 linhas com
reticências e "abrir inteiro".

**N — `wiki/u22b-token-na-nota` (U22, nota).** `Infobox.tsx`: `TOKEN_KEYS` em `HIDDEN`, seção recolhível "Token
(para a mesa)" (imagem, tamanho, disposição, barras), uma gravação só; `wiki-category.ts`: `TOKEN_KEYS` em
`NOT_FILTERS`; "Importar de um token salvo" (biblioteca → `vault.addAttachment` → `token_*` → `LibraryStore.update`
com a versão, grava o `notePath` no item).

**O — `wiki/u25b-arvore-genealogica` (U25).** `familyGraph`, `layoutFamily` (gerações, casal lado a lado, filhos
saindo do meio do casal, irmãos na mesma fileira, ciclos sem travar) + testes; clicar recentraliza; gerações para
cima/baixo lembradas no aparelho.

**P — `campanhas/u24-novo-npc-faccao` (U24, U34 no diálogo).** `core/improvised-npc.ts`: `improvisedNpcFicha` (saída
de `improvisedNpcNote` idêntica). `NewNpcDialog`: ficha opcional com `FichaFields`, **Sortear** (NPC por
`improvisedNpc`, facção por `generateDetailed("faccao")`), título "Nova facção" em organização.

**K — `wiki/u18-mapas-pinos` (U18).** Rótulo = título da nota; popover no ponto clicado com `NoteCombobox` e "Criar
nota…" (abre o Novo artigo, liga o pino em `onCreated`); editar nota/camada/segredo/rótulo; setas movem 0,5 %
(Shift 5 %); aba Pinos centraliza; pinos ligados a nota secreta somem na versão dos jogadores.
`core/map-geometry.ts`: `nudgePoint` + teste.

**L — `wiki/u20-mapas-areas` (U20).** `core/map-geometry.ts`: `rectPolygon`, `ellipsePolygon`, `insertVertex`,
`removeVertex`, `translatePoints`, `pointInPolygon` + testes; `wiki-map-extras.ts`: `opacidade`, `borda`, `nota`,
`forma` (ida e volta, mapa antigo igual). Tela: alças de vértice e de meio de aresta, arrastar a área, Delete apaga
vértice, Desfazer ponto, Esc cancela; aba Áreas edita texto, cor, opacidade, borda, camada, segredo, nota e eras.

**Versão — `versao/1.2.0`** quando o João pedir (ADR 0025): junta os PRs, `docs/releases/v1.2.0.md`, conferências
no fim do `docs/04`, `git diff --diff-filter=D` explicado, tag pela workflow `lancar-versao.yml`.

Dependências: B antes de J, M, N, P; D antes de N; F inclui as Missões; H antes de O; J antes de K antes de L.

## Riscos a vigiar

- Normalizadores que jogam fora campos novos: `normalizeToken`, `parseWorldManifest` (o `open()` do desktop regrava
  o `mesa.json`; versões antigas apagam a capa — avisar), `parseMapExtras`/`mapExtrasYaml`, `pinsToYaml`.
- A mesa remota não tem `VaultProvider`: tudo "da wiki" entra por parâmetro; biblioteca é `null` lá.
- `rename.ts` cobre links no frontmatter e nos blocos, mas não o JSON de `.runas` (capa da mesa, `notePath`): a tela
  mostra "não encontrada · Trocar".
- Geradores somam ~0,75 MB ao bundle principal; se pesar, carregar as tabelas por `import()` depois.
- Verificações finais do smoke contam chaves (`wikiCategory` 7, `vttWorlds` 4, `campaignPlayers` 7): só chaves novas.

## Verificação (cada PR)

- Na worktree: `npm run typecheck`, `npm test`, `npm run build`, `npm run desktop:build`.
- Smokes locais com perfil separado (o app instalado do João fica aberto):
  `cd desktop && npx electron . --smoke --user-data-dir=<scratch>/ud --vault="$PWD/tests/cofre-exemplo"` e o mesmo
  com `--write`.
- Telas no navegador (`npm run dev`, cofre de exemplo) em 320 px, 768 px e desktop, tema escuro e claro, só teclado,
  leitor de acessibilidade (`read_page`) e prints para o PR.
- U16: na nota com frontmatter, `posAtCoords` no meio de cada linha devolve a própria linha (diferença 0 px, antes
  14 px); controle em nota sem frontmatter e no modo Código.
- Testar com uma cópia do cofre real (`/home/joao-antonio/Documentos/Runas-Codex`, só leitura) no scratchpad:
  mapa Bitu, Elenco da Jornada para Vatu, calendário Rúnico.
