# Atualização 1.2.0 — plano e passagem para o Codex

Plano aprovado pelo dono em 07/11/2026. Escrito pelo Claude Code, revisto pelo Codex na noite de 07/11 e revisto de
novo pelo Claude em 08/11 contra as regras de design do rework visual (ADR 0001, ADR 0026, ADR 0027 e
[`docs/ux-ui-acessibilidade.md`](../ux-ui-acessibilidade.md)). Quem continuar (Codex ou Claude) segue este arquivo e o
[`AGENTS.md`](../../AGENTS.md).

## Para quem continuar

- **Situação (08/11, noite):** todos os itens feitos e lançados na **1.2.0**. O andamento de cada PR, com os
  arquivos, como foi verificado e o que ficou sem verificar, está na tabela “Andamento” de
  [`atualizacao-1.2-codex.md`](atualizacao-1.2-codex.md). As decisões estão na
  [ADR 0036](../adr/0036-atualizacao-1.2.md). Os geradores ×4 pararam em cerca de 21.000 opções, a pedido do dono.
  Os PRs saíram por área: A (#112), documentos (#113) e um PR com Wiki, Campanhas e VTT (um commit por área).
- **Regras de design:** a seção "Regras de design" (D1 a D17) vale para todo PR de tela. Cada PR diz no texto quais
  regras conferiu e marca **Não verificada** o que não deu para conferir.
- **Código já começado:** os commits `48c2d42` e `9ea3c0e` (Novo artigo com ficha, painel do mapa, relógio do mundo,
  Relógios em Missões, lista nas Relações, pino com o título da nota) entraram no branch de documentos antes da
  aprovação das maquetes. Eles **não fazem parte do PR de documentos**: ficam num branch próprio
  (`rascunho/1.2-telas-codex`) e servem de ponto de partida dos PRs B, F, H, J e K, com as correções da seção "O que
  aproveitar do código já começado".
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

Do Claude, de formato (registrar na ADR 0036 depois da aprovação):
- Pino ligado a nota mostra **o título da nota**; rótulo só em pino sem nota (o `rotulo` antigo fica gravado).
- Dados de token na nota, no frontmatter: `token: "[[imagem]]"`, `token_tamanho`, `token_disposicao` (jogador,
  aliado, neutro, hostil, secreto), `token_barras: ["PV 12/12", "PA 3/3"]`. Sem `token`, usa o retrato. Copiados só
  na importação. No VTT o vínculo é `TokenData.notePath` (mesmo nome do pino de nota).
- Hora do mundo no **mesmo bloco `runas-calendario`** do `hoje:` (vale para a wiki inteira): `hora: "07:30"` (sempre
  entre aspas), `periodo: Dia`, `relogio: { horas: 12, minutos: 60, periodos: [Dia, Noite] }`, gravados numa só
  gravação; calendários ligados sincronizam só o `hoje`.
- Sessão continua no arquivo `Sessão N.md` (dois-pontos não valem em nome de arquivo no Windows/Obsidian); o H1 passa
  a `# Sessão N: Título`. O evento da Agenda mantém " — " (`app/src/core/next-session.ts:63` depende dele).
- Áreas do mapa: retângulo e elipse gravam `tipo: zona` + `forma` opcional (um `tipo` novo faria versões antigas
  recusarem o mapa inteiro); o nome é o `texto` que já existe.
- Capa da mesa = caminho de imagem do cofre (fora de `.runas`) no `mesa.json`; API `setWorldCover?` opcional.
- Cargo no organograma = texto entre parênteses de `membro_de` (`"[[Ordem]] (tesoureira)"`); ex-membro = texto que
  começa com "ex". Nada novo no formato.

Do Claude, de design (08/11; o rework é responsabilidade do Claude, então estas respostas não esperam o João; entram
na ADR 0036). Elas respondem às perguntas da versão 1 das maquetes que as regras ou o código já resolvem:
- **Painel do mapa:** aberto no computador, fechado até 860 px; lembrado pelo `ResizablePanel` (D4).
- **Imagem do mapa, da mesa e do token:** pelo `CoverImagePicker` do kit, que já define a ordem (miniaturas do cofre
  com filtro, depois "Do computador…"). Imagem anexada a um artigo é arquivo do cofre e já aparece ali.
- **Áreas novas:** a ferramenta Área tem três formas (Retângulo, Elipse, Livre); a primeira vez começa em Retângulo e
  depois lembra a última no aparelho. A forma livre é a zona que já existe.
- **Novo artigo:** a ficha mostra todos os campos do tipo (são os mesmos da ficha do artigo); Perguntas-guia começam
  recolhidas. No celular, passo 1 = tipo e nome, passo 2 = ficha.
- **Relações:** abre na última visão usada no aparelho; na primeira vez, na que tem dados (Organograma, depois Árvore,
  depois Teia). Antigos membros aparecem sempre, marcados em texto e borda tracejada. O painel do nó é o painel da
  tela: lateral no computador, por cima no celular.
- **Relógio do mundo:** "Avançar" é um menu com nomes (próximo período, 1 dia, 1 semana, 1 mês, até a próxima
  sessão). Os períodos começam em Dia e Noite e se editam em "Configurar o relógio". Em Missões › Relógios, os
  relógios ficam agrupados por missão.
- **Elenco:** tamanho padrão **Médio = o tamanho de hoje** (ninguém vê mudança até escolher outro). Facções abrem em
  Grade, como os NPCs. Exibição e tamanho são lembrados por aparelho, separados para NPCs e Facções.
- **Novo NPC e Nova facção:** Sortear nunca apaga o que a pessoa digitou: preenche os campos vazios e troca só o que
  ele mesmo sorteou antes. Sortear existe só no diálogo.
- **Pino e token ligados a nota secreta** nunca aparecem na versão dos jogadores (regra de segredo, não é escolha).
- **Capa ausente:** o cartão volta ao desenho padrão e diz "Capa não encontrada" em texto; "Capa…" no ⋯ troca. O
  caminho gravado fica até alguém trocar.
- **Sessões:** "Nota do mestre" fica no ⋯ das Sessões, no "+ Novo" e no cabeçalho da seção "Notas do mestre"; a
  sessão ligada é opcional na criação e editável depois nas Propriedades. "Fixar na Tela do Mestre" grava na
  propriedade `fixadas` da campanha, como as notas fixadas de hoje (cofre, vale em todos os aparelhos).
- **Ferramentas:** Recentes guarda os 12 de hoje, agora no aparelho. "Guardar na wiki…" abre o Novo artigo
  preenchido (o diálogo já é a confirmação).

O que fica para o João está em "O que o João decide", no fim.

## Regras de design (valem para todo PR de tela)

Resumo das regras do rework aplicadas a esta atualização. Fonte entre parênteses; em conflito, vale a fonte.

- **D1 Anatomia.** Tela de lista: `PageHeader` (título, contagem, **uma** ação principal, ⋯), filtros numa linha que
  quebra no celular, conteúdo. Tela de documento: `DocumentBar` (voltar · título · modo · `SaveStatus` · Painel · ⋯),
  conteúdo, um painel, barra de status. Diálogo: `Modal` com a ação principal no rodapé, à direita (no celular, na
  largura toda). (ADR 0026 §1–2; F5 TRF-2)
- **D2 Três camadas.** À vista só o que a tela existe para fazer e **no máximo uma ação principal** (`btn primary`)
  por cabeçalho, cartão ou diálogo; a um toque o que é do contexto (popover do pino, painel, seleção); o resto num ⋯
  (`OverflowMenu`) com nome. (ADR 0026 §1)
- **D3 Kit.** `PageHeader`, `DocumentBar`, `SaveStatus`, `OverflowMenu`/`ContextMenu`, `PanelTabs`/`TabPanel`,
  `Notice`, `ListRow`, `ChoiceGroup`, `CoverImagePicker`, `Crest`/`NoteCrest`/`CoverBand`, `PersonalizeDialog`,
  `useFitCount`. Entram no kit nesta atualização: `FormGrid`/`FormField` (B, todo formulário), `NoteCombobox` (B),
  `WorldDateField` (B, usado em F) e `useGridColumns` (E). Outro cabeçalho, menu, aba ou painel precisa de justificativa no PR. (ADR 0026 §3)
- **D4 Um painel por tela**, à direita, pelo `ResizablePanel` (o único jeito de recolher) com `id`; a preferência fica
  em `runas-codex:painel:<id>`, não numa chave nova. Aberto no computador; até 860 px começa fechado e sobe por cima
  do conteúdo, um por vez, Esc fecha e devolve o foco. (ADR 0026 §4; F4d AGE-10)
- **D5 Abas e vistas.** `PanelTabs` troca o conteúdo (o que ver); `ChoiceGroup` escolhe a vista, a ordem ou o tamanho
  (como ver). Nunca os dois na mesma fileira. Opção com o nome inteiro ("Pequeno", não "P"). Par de botões com
  `aria-pressed` para escolher vista vira `ChoiceGroup`. (ADR 0026 F2)
- **D6 Cor com função.** `--cyan` ação principal e item ativo; `--gold` narrativa e sessão planejada; `--violet`
  segredo e magia; `--green` sucesso e sessão jogada; `--red` só perigo e dano. Dentro de campanha e categoria vale o
  tom da ADR 0027 (`toned`). Nada de hexadecimal na interface (a teia diplomática é a exceção já registrada). Cor
  nunca é a única pista: texto ou ícone junto. (ADR 0001; ADR 0027 §2–4)
- **D7 Texto e medidas.** App a 15 px, leitura a 16 px, **nada abaixo de 12 px**, inclusive dentro de SVG; títulos em
  Geist (`--font-display`); Cinzel só nas páginas impressas de Livros; foco de 3 px; bordas de controle
  `--line-strong`. Nada de `opacity` para esmaecer texto ou cartão (derruba os 4,5:1): estado secundário vai em texto
  ("antigo membro") e borda tracejada. (ADR 0026 §5; ADR 0001)
- **D8 Ícones e nomes.** Ícone sozinho só quando o significado é universal (voltar, buscar, fechar, ⋯, aproximar,
  afastar); os outros levam texto, ou `aria-label` igual ao nome que "Mostrar rótulos" exibe (WCAG 2.5.3). Seta `↗`
  só para o que sai da tela. Nenhum caminho de arquivo, `.md` ou `[[ ]]` no lugar do nome. (proposta do rework,
  "Regras que valem para todas as telas"; F2)
- **D9 Alvos.** 24×24 px no ponteiro; 44×44 px no toque e com "Controles maiores", inclusive alças de vértice, −/+ e
  pinos. (`ux-ui-acessibilidade.md`)
- **D10 Celular e 320 px.** Sem rolagem para os lados; conteúdo 2D (mapa, organograma, árvore, mapa de missões) com
  rolagem interna identificada (`role="region"` com nome) e controles por botão. A barra inferior do app não ganha
  concorrente: ferramentas da tela ficam no topo do conteúdo ou numa folha. (`ux-ui-acessibilidade.md`; F3a)
- **D11 Teclado e alternativa.** Tudo por teclado; arrastar e gesto nunca são o único jeito; todo desenho (mapa,
  organograma, árvore, relógio, mapa de missões) tem lista, tabela ou texto que permite consultar e abrir os mesmos
  itens. Grupos grandes (nós, pinos, alças) são uma parada de Tab com setas dentro. (`ux-ui-acessibilidade.md`;
  F4a NOT-3; F4d AGE-2)
- **D12 Formulários.** Rótulo sempre à vista; placeholder não é rótulo nem instrução; formato explicado no rótulo ou
  na dica; erro em `Notice` perto do campo, com `aria-describedby`, `aria-invalid` e foco no campo. Datas do mundo
  pelo `WorldDateField`, links pelo `NoteCombobox`, imagens pelo `CoverImagePicker`: nunca caminho digitado nem lista
  separada por vírgula. Valores de propriedade gravados por `setProperty` (`core/properties.ts`). **Campos alinhados:**
  todo formulário usa `FormGrid` + `FormField` do kit (subgrid): os campos de uma fileira alinham rótulo, controle e
  dica, todos com a mesma borda esquerda e colunas da mesma largura; campos curtos primeiro (dois por fileira),
  depois os largos (data, lista de links) numa fileira cada, imagens por último num `<details>`; sem caixa em volta da
  ficha (ela é uma seção com título). (F4d AGE-8; pedido do João em 08/11)
- **D13 Estados.** Vazio com a próxima ação real, carregando, erro com o que fazer, somente leitura (cofre só leitura
  e mestre remoto), sucesso anunciado (`role="status"`). Nota grava sozinha pelo `useVault()` com `SaveStatus`: nada
  de botão "Salvar" em nota; "Salvar" só em diálogo que grava várias coisas de uma vez.
- **D14 Nada simulado nem perdido.** A tela mostra só dados que existem na fonte (a mesa não guarda "última sessão"
  nem "jogadores"); texto não promete o que a tela não faz; botão sem ação não entra; nenhuma função existente some ao
  reorganizar (categorias criadas pelo usuário, ⋯ de cada missão, "NPC da wiki", Mesas recentes).
  (`ux-ui-acessibilidade.md`, "Alinhamento entre interface e funcionalidades")
- **D15 Imagens.** Sem imagem, brasão (`Crest`/`NoteCrest`), nunca quadrado vazio nem só a inicial; capa numa faixa no
  topo do cartão, sem texto nem selo por cima (o contraste não pode depender da imagem). (ADR 0027 §5 e adendo 1.1)
- **D16 Movimento.** Com movimento reduzido, nada de ponteiro animado nem enquadrar ou aproximar com animação.
- **D17 Onde mora.** Preferência de tela no aparelho (`runas-codex:<nome>`); conteúdo (relógio, capa, fixadas, token)
  no cofre, pelo `useVault()`. (AGENTS.md, regra 5)

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

Defeitos achados na leitura (entram nos PRs): ao adicionar `notePath` a um token, ele não pode ir para os jogadores
(`app/src/vtt/shared/player.ts:124-131`, PR D); −/+ da reputação apaga o texto extra entre parênteses
(`app/src/screens/campaigns/CastView.tsx:324-330`, PR E); pino público ligado a nota secreta mostra o nome aos
jogadores (`app/src/screens/wiki/MapView.tsx:217-221`, PR K).

## Fase 0 — registro e página visual (antes dos PRs de tela)

1. Worktree `.worktrees/runas-codex-1.2` a partir da origin/main; `npm ci` (Node 24 em `~/.local/opt/node/bin`).
2. PR de documentos `tarefas/atualizacao-1.2` (#113): este arquivo e a página de maquetes. Só documentos: o código dos
   commits `48c2d42` e `9ea3c0e` sai deste PR. A ADR 0036 fica para depois da aprovação.
3. Página visual estática (`docs/tarefas/atualizacao-1.2-maquetes.html`), **versão 2**: as maquetes no tamanho real do
   app (texto a 15 px, nada abaixo de 12 px, telas de computador com rolagem própria e celular a 360 px), desenhadas
   só com as peças do kit, com o estado vazio, de erro ou somente leitura onde ele muda a tela, e para cada tela o que
   mudou em relação à versão 1 e qual regra pediu. O João revisa a página antes dos PRs de tela (B, E, F, H, J).

## PRs, na ordem (cada um cabe numa janela de 5 h; conferir o uso antes de começar cada um)

Cada PR: branch próprio a partir da main atualizada, testes de unidade em português, `docs/04-testes-pendentes.md`
(só acrescentar), ajuda (`app/src/data/ajuda/*.md`, só editar os 22 tópicos existentes), prints no PR e a lista das
regras D1–D17 conferidas. O parágrafo **Tela** de cada PR é a parte visual; ele segue a maquete da versão 2.

**A — `editor/u16-clique-propriedades` (U16).** PR pequeno só do live preview: em
`app/src/components/vault/live-preview.tsx:527` trocar a `margin: 4px 0 10px` do `.cm-lp-properties` por espaço que
o CodeMirror mede (padding num invólucro do widget), mesmo desenho. Smoke: clicar no **meio** de uma linha depois do
cartão e conferir a linha do cursor (o atual clica em `box.top + 4`, `desktop/src/main/smoke.ts:212-217`; chave nova
de resultado). Conferir também o zoom por rota do Chromium (Preferences guarda zoom por URL com `#`); se trocar de
tela mudar o zoom, guardar um zoom só para o app. Sem tela nova.

**B — `wiki/u29-novo-artigo-ficha` (U29, base de U19/U22/U24/U26).**
- Novos: `screens/wiki/NewArticleDialog.tsx` (sai de `WikiHome.tsx`, que re-exporta), `screens/wiki/FichaFields.tsx`
  (controlado, sem `useWiki()`), `components/kit/NoteCombobox.tsx` (combobox ARIA 1.2 com "Criar “X”"),
  `components/kit/WorldDateField.tsx` (dia, mês do calendário e ano, com a sigla escrita ao lado; grava
  "ANO-MM-DD SIGLA"), `screens/wiki/new-article.css`, `core/wiki-ficha.ts` + teste: `ARTICLE_KIND_GROUPS`,
  `fichaInput`, `fichaValue` (mesmas validações do `FieldEditor`, `Infobox.tsx:148-163`), `applyFicha` (usa
  `setProperty` de `core/properties.ts`; nada de escrever YAML à mão), `withArticleBody`.
- `ARTICLE_KIND_GROUPS` cobre **todos** os tipos (Pessoas e grupos, Lugares, Coisas, História e mundo, e "Outros"
  para o que sobrar, como Idioma, Documento e Condição) e um grupo "Criados nesta wiki" com os tipos de
  `setCustomKinds` (ADR 0027, adendo de 28/10). Teste: cada tipo aparece em exatamente um grupo.
- **Tela:** `Modal` largo. A partir de 900 px, duas colunas: à esquerda "Tipo do artigo", um `fieldset` por grupo
  (`legend` com o nome do grupo) com **rádios nativos** (ícone e nome; as setas andam entre eles) e busca com rótulo
  que anuncia "N tipos" em `role="status"`; "Nova categoria…" continua no fim. À direita: Nome (obrigatório), pasta
  numa linha ("Em Personagens · Trocar pasta"), a seção "Ficha · Personagem" com os campos do tipo (link →
  `NoteCombobox`; lista de links → fichas com `NoteCombobox`; data → `WorldDateField`; número → campo numérico; imagem
  → `CoverImagePicker` dentro de `<details>` "Imagem (opcional)") e Perguntas-guia num `<details>` fechado. Rodapé do
  `Modal`: "Cancelar" e **"Criar artigo"**. Abaixo de 900 px, dois passos com o texto "Passo 1 de 2 · Tipo e nome" e
  "Passo 2 de 2 · Ficha" (o foco vai ao título do passo); rodapé "Continuar" no passo 1, "Voltar" e "Criar artigo" no
  passo 2. Erro no `Notice` ligado ao Nome (D12). Props novas `initialValues`, `initialBody`, `onCreated`. Mapa usa o
  `CoverImagePicker` no lugar do `<select>`.
- `kit/CoverImagePicker.tsx`: `useId()` no lugar de `name="book-cover-image"`. `Infobox.tsx`: `FieldEditor` passa a
  usar `fichaValue` (sem mudar comportamento).

**C — `vtt/u23-capa-da-mesa` (U23).** `vtt/shared/world.ts` (`capa?` no `WorldManifest`, `parseWorldManifest`
mantém, `setWorldCoverManifest`, testes); IPC `vtt:worlds-cover` (`ipc.ts`, `preload/index.ts` só acrescentar,
`vtt-host.ts`, `world-store.ts` com `writeJsonAtomically`); `portable-world-store.ts` + `android-room.ts`; `api.ts`
(prévia); `remote-api.ts` sem o método (item escondido). Smoke: chave nova `vttWorldCover` (definir capa → abrir a
mesa → listar e a capa continua, pegando o `open()` que regrava o manifesto).
- **Tela (`screens/vtt/VttScreen.tsx`, Criar Sala):** o cartão continua um botão que abre a mesa, com o ⋯ fora dele
  (botão dentro de botão não vale). O ⋯ "Ações da mesa X" ganha **"Capa…"** antes de Renomear e Excluir. A capa
  preenche a faixa `.mesa-thumb` (`object-fit: cover`) e o selo "N cenas" sai de cima da imagem para a linha de
  texto ("3 cenas · Aberta há 2 dias"), porque o contraste não pode depender da imagem (D15). Sem capa ou com a
  imagem sumida (`onError`), volta o desenho de hoje (degradê e ícone) e, na falta, a linha diz "Capa não
  encontrada". Diálogo "Capa da mesa": `CoverImagePicker` ("Imagem da capa"), "Tirar a capa" e, no rodapé,
  "Cancelar" e **"Usar esta imagem"**. A tela mostra só o que o `mesa.json` tem (D14). As "Mesas recentes" da tela
  inicial do VTT usam a capa como imagem da linha (`ListRow` com `media`). A regra fixa continua: só Criar Sala e
  Entrar Sala na tela inicial (F5 VTT-1).

**D — `vtt/u22a-token-ligado-a-nota` (U22, mesa).** `app/src/vtt/shared/scene.ts`: `TokenData.notePath?` validado
em `normalizeToken` (auxiliar `vaultNotePath` tirado de `normalizeNote`). `app/src/vtt/shared/player.ts`: tirar
`notePath` da projeção do token (a nota já o omite), teste em `player-projection.test.ts`. `core/wiki-token.ts` +
teste (`TOKEN_KEYS`, `noteToken`, `parseTokenBar`, `tokenBarText`, `tokenProperties`). `vtt/wiki-tokens.ts` (fonte
montada em `MesaTable` com `useVault()` e passada por parâmetro; `undefined` no mestre remoto). `library-actions.ts`:
`placeWikiToken` (bytes por `platform.readBinary` → `vtt.assets.import("tokens")`), `reimportWikiToken`.
- **Tela:** `app/src/vtt/panels/LibraryPanel.tsx` ganha **"Da wiki"** como terceira opção do grupo "Mostrar" que já
  existe (`library-kinds`), com a mesma busca e a mesma linha dos itens (imagem do token ou retrato, e sem os dois o
  `NoteCrest`; nome; "Aliado · PV 12/12") e o mesmo botão **"+" "Pôr X na cena"** dos itens guardados (o primeiro uso
  importa a imagem). Arrastar com `application/x-runas-wiki-token` (tratado no `onDrop` de `SceneCanvas.tsx:249`)
  também vale, mas não é o único jeito (D11). Vazio: "Nenhuma nota da wiki tem imagem de token ou retrato." No mestre
  remoto, "Da wiki" não aparece. Em `TokenFields` (propriedades no trilho, ADR 0034 §1): linha "Nota" com o nome da
  nota como link (Abrir) e um ⋯ "Mais ações da nota" com Trocar nota…, Importar de novo da nota e Desvincular (D2).
  Nota apagada ou renomeada: "Nota não encontrada" em texto e "Trocar nota…".

**E — `campanhas/u28-u33-u34-grades` (U28, U33, U34 sem o diálogo).** `components/kit/useGridColumns.ts`
(ResizeObserver + `gridTemplateColumns`), `core/grid-rows.ts` + teste (`fullRows`, `nextLimit`);
`WikiCategory.tsx` (24/+24 → fileiras inteiras); `core/campaigns.ts`: `withReputation` + teste. Não mexer na
`.campaign-cast-grid` dos PJs (smoke conta os filhos).
- **Tela (`CastView.tsx`):** o Elenco continua em seções empilhadas (Personagens dos jogadores, NPCs, Facções); não
  vira abas. A seção Facções ganha o mesmo cabeçalho da de NPCs: título com contagem, **"+ Nova facção"**
  (`NewNpcDialog initialKind="organizacao"`) e "Facção da wiki", lado a lado como "Novo NPC" e "NPC da wiki". Na
  linha da contagem de cada seção, dois `ChoiceGroup`: "Exibição: Grade · Lista" (no lugar do par de botões com
  `aria-pressed`, D5) e, só na Grade, "Tamanho: Pequeno · Médio · Grande" (padrão Médio = o de hoje). Cada seção
  lembra os dois no aparelho. Cartão com `container-type`; no Pequeno ficam retrato, nome e atitude em texto, e o
  resto (−/+, sessões vistas) vai para o ⋯ do cartão (nada some). Facções: `ArticleArt` (símbolo ou bandeira, senão
  brasão), −/+ com nome ("Baixar a reputação com Ordem do Sal"), o valor em texto ao lado e anunciado, e o texto entre
  parênteses preservado. "Mostrar mais N de M" completa fileiras inteiras (`useGridColumns` no lugar do `PAGE 60`) e
  leva o foco ao primeiro cartão novo. No celular, Lista = `ListRow` (retrato, nome, "neutra · Sessão 12", ⋯).

**F — `campanhas/u30-relogio-do-mundo` (U30).**
- `core/world-clock.ts` + teste (`parseWorldClock`, `advanceClock` com virada de período e de dia **também para
  vários dias e para trás**, `withWorldClock` sem mexer no resto do bloco, `handAngles`, `nextPeriodIn`).
  `screens/wiki/world-today.ts`: `useSetWorldClock` grava `hoje`, `hora` e `periodo` numa gravação só.
- **Tela do Painel (`WorldClockCard.tsx`, no lugar do `ClocksCard`; sai também o chip da capa):** cartão igual aos
  vizinhos (`card` com `section-title` "Relógio do mundo" e o nome do calendário) e um ⋯ "Mais ações do relógio"
  (Ajustar data e hora…, Configurar o relógio…, Abrir o calendário). À esquerda, o mostrador em SVG `role="img"` com
  o mesmo texto que está ao lado; as marcas seguem `relogio.horas` (não 12 fixas) e, como cada volta é um período, o
  anel mostra em `--cyan` quanto da volta já passou (não divide o mostrador entre Dia e Noite); números a 12 px ou
  mais e nenhum ponteiro animado (D16). À direita, o texto que é a alternativa (D11): a hora grande em `--text`
  (Geist Mono), "9 de Ogronios de 5631 CR", a sequência dos períodos com o atual marcado em texto ("Dia, agora ·
  Noite") e "Noite em 4 h 30 min". Ações sem botão principal no cartão (D2): "+10 min", "+1 h" e **"Avançar ▾"**, um menu
  com Até a Noite (próximo período), 1 dia, 1 semana, 1 mês e Até a próxima sessão (a mesma conta do "Avançar o
  mundo" da sessão). O novo estado é anunciado (`role="status"`). "Ajustar data e hora" é um `Modal` com
  `WorldDateField`, Hora ("Hora (HH:MM)") e Período (lista), salvo de uma vez. "Configurar o relógio" é outro `Modal`:
  horas por volta, minutos por hora e a lista de períodos (um campo por período, Acrescentar, Remover, Subir, Descer;
  nada de texto separado por vírgula). Sem calendário: estado vazio "Esta campanha ainda não tem calendário do mundo"
  com o caminho real para escolher ou abrir os calendários. Somente leitura: botões desativados e o motivo em texto.
  No celular, a ordem do Painel (CAM-9) fica: próxima sessão, relógio do mundo, missões ativas, segredos e pistas,
  elenco, limites, linha do tempo, estatísticas recolhidas, também no HTML.
- **Tela de Missões (`QuestBoard.tsx`, `QuestMap.tsx`):** o `ChoiceGroup` "Ver as missões em: Colunas · Mapa ·
  Relógios" (`"lista"` lembrado vira `"colunas"`). Relógios = "Relógios da campanha" (o `ClocksEditor` dos relógios
  de ameaça e meta que saíram do Painel, com "+ Relógio") e "Relógios das missões", um grupo por missão com o título
  (link) e a situação em texto. Vazio com o caminho real ("Abra uma missão e acrescente um relógio"). Como a Árvore
  era a alternativa em lista do Mapa, o **Mapa passa a ser acessível sozinho**: região com rolagem própria e nome, os
  cartões no Tab na ordem dos arcos, cada um com situação, "bloqueada" e "requer X" em texto e o ⋯ da missão
  (`QuestMenu`, já existe). CSS da lista sai.
- Smoke (`smoke.ts` compartilhado, explicar no PR): os relógios passam a ser contados em Missões › Relógios; chave
  nova `worldClock`. Ajuda `campanhas.md` (linhas 12, 28, 38-39, 89).

**G — `campanhas/u31-sessoes-notas-do-mestre` (U31).** `core/campaigns.ts`: H1 `Sessão N: Título`,
`GM_NOTES_FOLDER`, `newGmNote` (`tipo: nota-mestre`, `segredo: true`, `sessao` opcional), `isGmNote`,
`listGmNotes`; testes (`campaigns.test.ts:254`, `table-notes.test.ts:9`, nota do mestre não é sessão). Conferir que as
exportações do diário e "Mostrar pela sala" pulam `tipo: nota-mestre`.
- **Tela (`SessionView.tsx`):** "+ Nova sessão" continua a única ação principal do `.page-head` (o smoke procura lá),
  e o eyebrow passa a mostrar o nome da campanha no lugar da pasta (`Campanhas/…/Sessões/`, D8).
  "Nova nota do mestre…" entra no ⋯ "Ações das sessões" (primeiro item), no "+ Novo" do app (`lib/create-request.ts`)
  e no cabeçalho da seção **"Notas do mestre · N"** (botão comum "+ Nota do mestre", como "Novo NPC" no Elenco). A
  seção lista com `ListRow`: título, "Segredo · Sessão 12" (ou "sem sessão") em texto e o tom violeta de segredo, e um
  ⋯ por nota com Abrir, Fixar na Tela do Mestre / Desafixar (propriedade `fixadas` da campanha, a mesma de hoje),
  Ligar a uma sessão… e Mandar para a lixeira. `GmNoteDialog.tsx`: `Modal` com Título (obrigatório) e Sessão
  (opcional, "Nenhuma" e as sessões; vem marcada a sessão de onde se abriu); rodapé "Cancelar" e **"Criar nota"**,
  que abre a nota no editor (grava sozinha, D13). As sessões aparecem como "Sessão 12: A ponte" com a situação em
  texto e a cor do CAM-3.

**H — `wiki/u25a-relacoes-organograma` (U25).** `core/wiki.ts`: `relationEdges` (arestas montadas uma vez).
`core/relation-layout.ts` + teste (`orgStructure`, `layoutOrg`; sem sobreposição, antigos membros marcados).
- **Tela (`WikiRelations.tsx` + `relations.css`):** `PageHeader` "Relações" (eyebrow "Wiki · <nome>"). Na linha de
  baixo, dois `ChoiceGroup`: "Visão: Organograma · Árvore genealógica · Teia diplomática" (o seletor que já existe) e
  "Mostrar como: Gráfico · Lista". No computador, três partes: à esquerda a lista recolhível com busca rotulada
  ("Organizações", "Pessoas" ou "Facções", conforme a visão), em `ListRow` com `NoteCrest` e `aria-current`; no meio
  o gráfico, numa região com nome e uma parada de Tab (setas andam pelos nós seguindo a estrutura, Enter abre o nó,
  + e − aproximam, 0 enquadra; os botões Aproximar, Afastar e Enquadrar fazem o mesmo, D11); à direita o painel do nó
  (`ResizablePanel` `wiki-relacoes`, D4) com retrato, cargo, situação, as relações, "Abrir artigo" e `AddRelation`
  (exportado de `WikiArticle.tsx`). Cartão do nó: retrato (`NoteCrest`), nome, cargo e situação em texto; antigo
  membro com borda tracejada e "antigo membro" escrito, **sem `opacity`** (D7); ramo que fecha é um botão "▸ 4
  membros" com `aria-expanded`. Lista: tabela "Membro · Cargo · Situação" no organograma (a teia já tem a dela). No
  celular, a lista vem primeiro; escolher abre o gráfico com rolagem própria e o nó escolhido sobe por cima. A Teia
  diplomática entra no mesmo esqueleto sem trocar o motor. Visão lembrada no aparelho
  (`runas-codex:wiki-relacoes-visao`).

**I1/I2 — `dados/u32a-geradores-pessoas-lugares`, `dados/u32b-geradores-enredo-mundo` (U32).** Arquivos novos
`core/generator-tables-x4-*.ts` (auxiliares `lines`/`pairs`), spread só **no fim** de cada lista (os testes usam os
primeiros itens), concordância de gênero nos pares; teste: listas ≥ 34.396, sem repetidos, culturas inalteradas. Sem
tela nova.

**J — `wiki/u17-mapas-tela` (U17, U19, U21, SVG do U20).** `MapView.tsx` dividido em `MapCanvas.tsx`, `MapRail.tsx`
e `MapPanel.tsx`; `MapImageSettings.tsx` vira a aba Mapa; `core/wiki.ts`: `articleImage` lê o bloco `runas-mapa` (sem
tocar `parse.ts`), `mapBaseYaml`; `map.css` novo e as regras mortas ou duplicadas de `wiki.css` saem; SVG com
`viewBox` do tamanho da imagem e `non-scaling-stroke`. Smoke mantém `.map-pin` (≥ 2) e `.map-world img`.
- **Tela do mapa (documento, D1):** `DocumentBar` com voltar (Mapas), "Bitu" e "Mapa · Wiki <nome>", `SaveStatus`,
  botão **Painel** e ⋯ "Mais ações do mapa" (Abrir a nota do mapa, que substitui o botão "Nota"; Versão dos jogadores;
  Trocar a imagem…). O **trilho** (`MapRail`, `role="toolbar"`, uma parada de Tab com setas) fica à esquerda do mapa
  e tem as **ferramentas**: Mover, Pôr pino, Área (menu com Retângulo, Elipse e Livre) e Medir, cada uma com nome em
  `aria-label` e dica, e o nome embaixo do ícone com "Mostrar rótulos". O trilho não repete as abas do painel. Os
  controles de vista (Aproximar, Afastar, Enquadrar) ficam no canto do mapa; Ano/era, quando o mapa tem camadas por
  ano, também. O mapa é uma região com nome ("Mapa de Bitu") e dica de teclado (setas movem, + e − aproximam). O
  **painel** é o `ResizablePanel` `wiki-mapa` (D4: `runas-codex:painel:wiki-mapa`; aberto no computador, fechado até
  860 px; o mapa reenquadra ao abrir e fechar) com `PanelTabs` Pinos · Áreas · Camadas · Mapa, com contadores. A aba
  Pinos é a alternativa do desenho (D11): busca rotulada e um `ListRow` por pino (nome da nota, camada e "segredo" em
  texto) que centraliza e escolhe o pino; "Pôr pino no centro" para quem usa o teclado. A aba Mapa tem o
  `CoverImagePicker` "Imagem do mapa" e as camadas de imagem e crônicas (o campo "Imagem do cofre" também vira
  `CoverImagePicker`). No celular: a `DocumentBar` em uma linha, o trilho vira uma faixa no **topo** do mapa (a barra
  inferior do app fica onde está, D10), o painel sobe por cima do mapa.
- **Lista de mapas (U21, lista, D1):** `PageHeader` "Mapas" com a contagem e **"+ Novo mapa"** (`initialKind="mapa"`);
  cartões com a capa na faixa do topo (`ArticleArt size="cover"`) e, sem imagem, o brasão (D15).

**M — `wiki/u26-u27-ferramentas` (U26, U27).** `core/wiki-tools.ts`: `generateDetailed` (mesma ordem de sorteio que
`generateWorld`, teste de igualdade), `GENERATOR_ARTICLE` (Nome/NPC/Mercador → Personagem; Nome de lugar/Sala de
masmorra → Local; Taverna → Construção; Facção → Organização; Divindade → Religião (mandamento em `dogma`); Item
mágico/Tesouro → Item; Lenda/Rumor → Mito (`verdade`); Gancho/Aventura → Acontecimento; Clima → campo `clima` de um
Local).
- **Tela (`WikiTools.tsx`):** a anatomia da F4b (WIK-5) continua: geradores numa lista à esquerda, o resultado à
  direita, do tamanho dele; nada de abas por grupo. "Gerar" é a única ação principal. Com 5 ou 10 resultados, cada
  linha é o texto inteiro (quebra a linha, sem cortar) e um botão de **largura fixa** com `aria-pressed` ("Usar este"
  / "✓ Escolhido", a mesma largura nos dois estados, alinhado à direita em todas as linhas). Embaixo, "Vai para
  Personagens (Personagem)" e **"Guardar na wiki…"** (botão comum), que abre o Novo artigo preenchido (B), onde está o
  "Criar artigo". Recentes: `<details>` "Recentes (N)", guardado em `runas-codex:wiki-ferramentas-recentes:<raiz>` (os
  12 de hoje), cada um com o nome do gerador, o texto em 2 linhas e um "Mostrar tudo" com `aria-expanded`, e "Usar"
  (nada de `↗`, D8).

**N — `wiki/u22b-token-na-nota` (U22, nota).** `wiki-category.ts`: `TOKEN_KEYS` em `NOT_FILTERS`.
- **Tela (`Infobox.tsx`, aba Ficha do painel do artigo, F4b WIK-6):** `TOKEN_KEYS` em `HIDDEN` e, no fim da Ficha, um
  `<details>` **"Token para a mesa"**: Imagem do token (`CoverImagePicker`; sem imagem, "Usa o retrato" e a prévia com
  o retrato ou o brasão), Tamanho (lista em células), Disposição (lista com os nomes: Jogador, Aliado, Neutro, Hostil,
  Secreto) e Barras, uma linha por barra com Nome, Valor e Máximo rotulados e Remover, mais "Acrescentar barra" (o
  mesmo desenho das barras da mesa, ADR 0034 §2). Cada mudança grava sozinha, como os outros campos da ficha, com
  todas as chaves `token_*` numa gravação só. "Importar de um token salvo…" (botão comum) abre a biblioteca →
  `vault.addAttachment` → `token_*` → `LibraryStore.update` com a versão, grava o `notePath` no item.

**O — `wiki/u25b-arvore-genealogica` (U25).** `familyGraph`, `layoutFamily` (gerações, casal lado a lado, filhos
saindo do meio do casal, irmãos na mesma fileira, ciclos sem travar) + testes.
- **Tela:** o mesmo esqueleto do H. Clicar ou Enter num nó recentraliza e anuncia "Centralizado em X"; "Gerações
  acima" e "Gerações abaixo" são campos numéricos rotulados com −/+, lembrados no aparelho
  (`runas-codex:wiki-arvore-geracoes`). Lista: tabela "Pessoa · Pais · Cônjuges · Filhos".

**P — `campanhas/u24-novo-npc-faccao` (U24, U34 no diálogo).** `core/improvised-npc.ts`: `improvisedNpcFicha` (saída
de `improvisedNpcNote` idêntica).
- **Tela (`NewNpcDialog`):** `Modal` "Novo NPC" ou "Nova facção". Nome (obrigatório) com **"Sortear"** ao lado (botão
  comum; NPC por `improvisedNpc`, facção por `generateDetailed("faccao")`; nunca apaga o que foi digitado), Atitude
  num `ChoiceGroup` com os nomes de `ATTITUDES` e um `<details>` fechado **"Ficha (opcional)"** com `FichaFields` de
  Personagem ou Organização (retrato ou símbolo pelo `CoverImagePicker`). Rodapé: "Cancelar" e **"Criar NPC"** ou
  **"Criar facção"**.

**K — `wiki/u18-mapas-pinos` (U18).** `core/map-geometry.ts`: `nudgePoint` + teste.
- **Tela:** o pino mostra o título da nota (nunca `[[ ]]`); pino de segredo tem o tom violeta **e** um cadeado, e na
  aba Pinos o texto "segredo" (D6). Ao pôr ou escolher um pino abre um popover (diálogo sem bloqueio) junto ao ponto,
  com o título, Nota (`NoteCombobox` com "Criar “X”…", que abre o Novo artigo e liga o pino em `onCreated`), Rótulo
  (só sem nota), Camada, Segredo e, no rodapé, "Pronto" e um ⋯ (Abrir a nota, Apagar o pino). Esc fecha e devolve o
  foco ao pino; no celular, o popover sobe por cima. Os pinos são uma parada de Tab: setas escolhem, Enter abre,
  Alt+setas movem 0,5 % (Shift 5 %), Delete apaga com "Desfazer". Pinos ligados a nota secreta somem na versão dos
  jogadores e na projeção da sala.

**L — `wiki/u20-mapas-areas` (U20).** `core/map-geometry.ts`: `rectPolygon`, `ellipsePolygon`, `insertVertex`,
`removeVertex`, `translatePoints`, `pointInPolygon` + testes; `wiki-map-extras.ts`: `opacidade`, `borda`, `nota`,
`forma` (ida e volta, mapa antigo igual).
- **Tela:** alças de vértice e de meio de aresta com área de toque de 24 px (44 px no toque), desenhadas menores;
  arrastar a área; as alças da área escolhida são uma parada de Tab (setas movem, Enter na alça do meio insere o
  ponto, Delete apaga o vértice, Esc termina). "Nova área" na aba Áreas cria um retângulo no centro da vista, para
  quem usa o teclado. A aba Áreas edita Nome, Cor (rádios com o nome dos 12 tons da ADR 0027), Opacidade (com o valor
  em texto), Borda, Camada, Segredo, Nota (`NoteCombobox`) e Eras (de/até).

**Versão — `versao/1.2.0`** quando o João pedir (ADR 0025): junta os PRs, `docs/releases/v1.2.0.md`, conferências
no fim do `docs/04`, `git diff --diff-filter=D` explicado, tag pela workflow `lancar-versao.yml`.

Dependências: B antes de F (`WorldDateField`), J, M, N, P; D antes de N; F inclui as Missões; H antes de O; J antes
de K antes de L.

## O que aproveitar do código já começado (`48c2d42`, `9ea3c0e`)

O Codex escreveu estas partes antes da aprovação das maquetes, no branch de documentos. Ficam no branch
`rascunho/1.2-telas-codex`; cada PR copia o que serve e refaz o resto.

| Arquivo | Aproveitar | Refazer (regra) |
|---|---|---|
| `core/world-clock.ts` + teste (F) | `parseWorldClock`, `handAngles`, `withWorldClock` | `advanceClock` conta no máximo 1 dia e não volta para trás: dias = piso((período + voltas) ÷ nº de períodos), também negativo |
| `core/calendar.ts` (F) | `worldClock` lido do mesmo bloco | — |
| `WorldClockCard.tsx` + CSS (F) | o mostrador em SVG e `useSetWorldClock` | 12 marcas fixas (seguir `horas`); o anel metade Dia, metade Noite, embora cada volta seja um período; números a 10–11 px (D7); hora em `--cyan` (D6); "Avançar" sem dizer quanto (D8); "data editada aqui" sem campo de data (D14); edição dentro do cartão e períodos separados por vírgula (D12) |
| `QuestBoard.tsx`, `QuestMap.tsx` (F) | a troca de Árvore por Relógios e `QuestClocksView` | o comentário diz que a lista continua no Mapa, mas nada ficou: fazer o Mapa acessível (D11, D14); "bloco runas-relogios" no vazio é termo técnico (D8) |
| `CampaignDashboard.tsx` (F) | `WorldClockCard` no lugar do `ClocksCard` | ordem do celular (CAM-9) |
| `core/wiki.ts` `articleImage` + `WikiMap.tsx` lista (J) | capa do mapa pelo bloco `runas-mapa`, `ArticleArt` nos cartões | — |
| `WikiMap.tsx` `MapWorkspace` (J) | as abas Pinos/Áreas/Camadas/Mapa | o trilho repete as abas do painel (D3, D14); painel sem `ResizablePanel` e sem lembrar (D4); vazio de Áreas nunca aparece (`filter` devolve `[]`); textos apontam para ferramentas que não estão ali (D14); cabeçalho próprio no lugar da `DocumentBar` (D1) |
| `MapView.tsx` (K) | o título da nota no lugar do rótulo | a mesma expressão 4 vezes (extrair `pinTitle`); falta a regra de segredo |
| `core/wiki-ficha.ts` + teste (B) | a ideia de `applyFicha` | escreve YAML à mão em vez de `setProperty` (D12, regra 4 do AGENTS) |
| `FichaFields.tsx` (B) | o componente controlado | imagem por caminho digitado com placeholder, links em área de texto, data em texto livre (D12) |
| `WikiHome.tsx` Novo artigo (B) | os grupos e a busca de tipo | grupos fixos escondem Idioma, Documento, Condição e os tipos criados pelo usuário (D14); botões com `role="radio"` sem setas no lugar de rádios nativos; ações do celular fora do rodapé do `Modal` (D1) |
| `WikiRelations.tsx` + CSS (H) | a lista com busca no lugar dos `<select>` | `GraphControls` com −, 100 % e + que não fazem nada (D14); Gráfico/Lista como dois botões `primary`/`ghost` (D5) |

## Riscos a vigiar

- Normalizadores que jogam fora campos novos: `normalizeToken`, `parseWorldManifest` (o `open()` do desktop regrava
  o `mesa.json`; versões antigas apagam a capa — avisar), `parseMapExtras`/`mapExtrasYaml`, `pinsToYaml`.
- A mesa remota não tem `VaultProvider`: tudo "da wiki" entra por parâmetro; biblioteca é `null` lá.
- `rename.ts` cobre links no frontmatter e nos blocos, mas não o JSON de `.runas` (capa da mesa, `notePath`): a tela
  mostra "não encontrada · Trocar".
- Geradores somam ~0,75 MB ao bundle principal; se pesar, carregar as tabelas por `import()` depois.
- Verificações finais do smoke contam chaves (`wikiCategory` 7, `vttWorlds` 4, `campaignPlayers` 7): só chaves novas.
- O texto a 15 px muda a densidade: o Elenco no Pequeno, o painel do mapa e os cartões do organograma precisam ser
  conferidos com "Tamanho do texto" em 130 % e "Espaçamento muito amplo" (F2), não só no padrão.

## Verificação (cada PR)

- Na worktree: `npm run typecheck`, `npm test`, `npm run build`, `npm run desktop:build`.
- Smokes locais com perfil separado (o app instalado do João fica aberto):
  `cd desktop && npx electron . --smoke --user-data-dir=<scratch>/ud --vault="$PWD/tests/cofre-exemplo"` e o mesmo
  com `--write`.
- Telas no navegador (`npm run dev`, cofre de exemplo) em 320 px, 768 px e desktop; tema escuro e claro, paletas
  Floresta e Brasa, contraste alto e cores de campanha desligadas; só teclado; leitor de acessibilidade
  (`read_page`); estados vazio, erro e somente leitura; prints para o PR. O que não der para conferir entra no PR e no
  `docs/04` como **Não verificada**.
- U16: na nota com frontmatter, `posAtCoords` no meio de cada linha devolve a própria linha (diferença 0 px, antes
  14 px); controle em nota sem frontmatter e no modo Código.
- Testar com uma cópia do cofre real (`/home/joao-antonio/Documentos/Runas-Codex`, só leitura) no scratchpad:
  mapa Bitu, Elenco da Jornada para Vatu, calendário Rúnico.

## Revisão de design (Claude, 08/11)

A versão 1 das maquetes e o código começado foram comparados com as regras D1–D17. O que mudou na versão 2:

- **Escala:** a versão 1 encolhia telas inteiras em meia coluna, com texto de 9 a 11 px; assim tudo parecia caber.
  A versão 2 desenha no tamanho do app (15 px, nada abaixo de 12 px), com rolagem própria nas telas de computador.
- **Uma ação principal (D2):** Sessões tinha "+ Nota do mestre" e "+ Nova sessão" no cabeçalho; Ferramentas tinha
  "Escolhido" como botão principal em cada resultado; o Novo NPC tinha "Criar NPC" no topo; a mesa tinha "Abrir" e
  "⋯ Capa…" como botões soltos dentro do cartão, que já é um botão.
- **Abas misturadas (D5):** o Elenco virava "Personagens · Facções · Grade · Lista" numa fileira e as Relações punham
  "Como lista" como terceira aba; o tamanho era "P M G" em letras.
- **Anatomia (D1, D3, D4):** o mapa tinha "Salvar" num documento que grava sozinho e um trilho que repetia as abas do
  painel; Ferramentas trocava a lista de geradores (decisão WIK-5 da F4b) por abas; o Elenco virava abas, mas é feito
  de seções; as abas selecionadas eram preenchidas de lavanda, que não é o desenho do `PanelTabs`.
- **Cor e texto (D6, D7, D15):** título da página em Cinzel; "Token (para a mesa)" em violeta, que é a cor de segredo;
  pino de segredo em vermelho, que é perigo; antigos membros esmaecidos por opacidade; a capa da mesa com uma letra.
- **Nomes e dados (D8, D14):** `[[Bosque Salgado]]` e `[[Bitu]]` no lugar de nomes; `Capitã Brites.md` como título;
  "última sessão" e "2 jogadores" na mesa, que não guarda isso; ↗ em ações que não saem da tela.
- **Formulários e estados (D12, D13):** barras do token como fichas escolhíveis; "Ficha opcional" desenhada como campo
  de texto; "Salvar nota" numa nota; nenhuma tela mostrava vazio, erro ou somente leitura.
- **Celular (D9, D10):** uma barra de ferramentas do mapa embaixo, em cima da barra do app; ícones de 25 a 29 px e
  "− ＋" como texto solto.
- **Página:** os botões das maquetes eram botões de verdade que não faziam nada (o Tab passava por dezenas deles); na
  versão 2 as maquetes são figuras com descrição em texto.

## Revisão do Codex (07/11, mantida como histórico)

Revisão feita contra a `origin/main` (`f497ea3`, 1.1.0), sem alterar o branch do PR #112 nem escrever no cofre real.

### Corrigido diretamente no plano

- A tarefa cobre os 14 pedidos do João: U17–U21 tratam do mapa; U22 de token e nota; U23 da capa da mesa; U24 e U34
  do NPC/facção; U25 das relações; U26–U27 das ferramentas; U28–U29 de categorias e Novo artigo; U30 do relógio e
  Missões; U31 das sessões; U32 dos geradores; U33 do Elenco; U16 do editor.
- As citações de código foram conferidas. `live-preview.tsx:527`, `desktop/src/main/smoke.ts:212–217`,
  `CastView.tsx:324–330`, `MapView.tsx:217–221`, `Infobox.tsx:148–163` e `SceneCanvas.tsx:249` existem na
  `origin/main` (as linhas podem mudar quando os PRs anteriores entrarem). A referência a `next-session.ts:63` está em
  `app/src/core/next-session.ts:63`.
- Caminhos do VTT: o código compartilhado fica em `app/src/vtt/shared/` e o painel da biblioteca em
  `app/src/vtt/panels/LibraryPanel.tsx`; `desktop/src/main/vtt/` contém `vtt-host.ts` e `world-store.ts`.
- `app/src/vtt/shared/scene.ts:119–139` ainda não tem `TokenData.notePath`, e `app/src/vtt/shared/player.ts:16` já
  exclui `notePath` das notas projetadas. O PR D adiciona `notePath` ao token e o remove em `projectScene`
  (`app/src/vtt/shared/player.ts:124–131`), com teste de projeção.
- `MapView.tsx:221` hoje prefere `pin.label` mesmo quando há nota. O PR K inverte essa precedência e aplica a regra de
  segredo também na projeção para jogadores. `CastView.tsx:324–330` confirma o segundo defeito: o `save` atual
  substitui a string inteira e perde o texto entre parênteses.
- A entrada de `docs/tarefas/README.md` para a atualização já existe. O `PENDING` do `panorama.html` não ganha itens:
  a página desta fase é a de maquetes, e o panorama registra a situação da 1.0.

### Propostas aceitas

- A página de maquetes é o arquivo estático `docs/tarefas/atualizacao-1.2-maquetes.html` (sem rede) e a ADR 0036 só
  é criada depois da aprovação.
- C, D, E, G, H e I1/I2 não dependem de B e podem andar em paralelo quando houver mais de uma janela; F depende de B
  só pelo `WorldDateField`.
- Os acabamentos (arrastar para a biblioteca, "Fixar na Tela do Mestre", lista acessível dos gráficos, Recentes no
  aparelho) ficam: são o que as regras D2, D11 e D17 pedem. Se a janela de 5 h apertar, viram subtarefas do mesmo PR,
  sem mudar o formato do cofre.
- O PR C preserva campos desconhecidos do `mesa.json` e deixa a troca visível quando a imagem não for encontrada.
- Nenhum PR altera os gravadores seguros, `Markdown.tsx`/`blocks.ts` ou a CSP; nada de dependência nova; imagem só do
  cofre ou do app.

## O que o João decide

1. **Aprovar as maquetes (versão 2).** Com a aprovação, a ADR 0036 registra as decisões de formato e de design acima e
   os PRs de tela começam (B primeiro).
2. **Token: "Importar de novo da nota".** Recomendado: as barras do token passam a ser as da nota (a nota é a fonte),
   mantendo o valor atual das barras de mesmo nome (o PV que o token perdeu na luta não volta a 12). A outra opção é
   só acrescentar as barras que faltam no token.
