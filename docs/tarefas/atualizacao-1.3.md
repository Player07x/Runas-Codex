# Atualização 1.3.0 — os 12 pedidos de 11/11 e duas sobras da 1.2

> Plano do Claude (líder desta atualização), feito a partir das duas capturas e da lista do João de 11/11/2026, com
> o código da `main` em `adc97b0` (v1.2.0). Página visual com as maquetes:
> [`atualizacao-1.3-maquetes.html`](atualizacao-1.3-maquetes.html). Em 11/11 o João mandou seguir com as
> recomendações (ver "O que o João decide", no fim) e começar pelo PR A.

Funções novas depois da 1.2 = **1.3.0** (ADR 0025, adendo de SemVer). Itens **U35 a U49**. As regras de design
**D1–D17** de [`atualizacao-1.2.md`](concluidas/atualizacao-1.2.md#regras-de-design-valem-para-todo-pr-de-tela) continuam valendo
para todo PR de tela, e cada PR segue o `AGENTS.md`.

## Itens

| Item | Pedido do João | Causa ou ponto de partida no código | PR |
|---|---|---|---|
| U35 | 1. Criar e configurar calendário sem editar código | Hoje o calendário é um bloco YAML ` ```runas-calendario ` editado à mão (`core/calendar.ts:4`); o botão "Editar" só abre a nota (`WikiCalendar.tsx:255`) | D |
| U36 | 2. Telas que mudam de tamanho de uma página para outra | **Causa achada e medida:** a barra do topo é item de uma coluna flex sem `flex: none` (`styles/layout.css:31-37`), e o conteúdo usa `flex: 1 1 auto` (`:50`). Quando a página é mais alta que a janela, a barra **encolhe** junto com o conteúdo: 56 px na Agenda e no Calendário vazio, **44,8 px** na Wiki e nas Notas (medido a 1920×1040). Por isso, nas duas capturas, a barra e as abas da Wiki estão em alturas diferentes | A |
| U37 | 3. Tarefas com prazo e tarefas diárias, com atraso e falha | As tarefas já existem no formato do plugin Tasks (📅 prazo, 🔁 repete, ❌ cancelada; `core/tasks/`). Faltam: estado "falhou", aviso de atraso, vista própria e hábitos diários sem a nota crescer a cada dia | B |
| U38 | 4. "Editar tarefa" com espaço demais para pouco dado | `TaskEditDialog.tsx`: um campo por linha, seis datas abertas, estado `[ ] Todo` e repetição em inglês | B |
| U39 | 5. Data e relógio de cada campanha separados da wiki | A data é a linha `hoje:` do calendário da wiki, e o relógio também mora no bloco (`core/world-today.ts:5`, `core/world-clock.ts:7`): todas as campanhas avançam o mesmo dia | E |
| U40 | 6. Nome da janela mudando a cada página | O título da rota (`Shell.tsx:223`, `document.title`) vira o título da janela do Electron, porque `desktop/src/main/index.ts` não trata `page-title-updated` | A |
| U41 | 7. Tamanho do token livre (0,5; 1,7; 2,5…) | A mesa já aceita qualquer número de 0,25 a 20 (`vtt/shared/scene.ts:343`), mas a ficha da Wiki só oferece 0,5/1/2/3/4 (`Infobox.tsx:152`) e o campo da mesa anda de 0,5 em 0,5 | A |
| U42 | 8. Barra lateral das Notas confusa | Cada nota ocupa ~56 px (título + prévia), a pasta tem uma segunda linha ("1 nota"), o recuo das subpastas é de 10 px sem guia (`NotesScreen.tsx:458-488`) | F |
| U43 | 9. Prévia dos livros sem gambiarras | Ver "Análise do Valknut (1ª Edição)" abaixo | G1, G2 |
| U44 | 10. "Dia inteiro" salva e fecha o evento | **Causa achada:** o `Switch` é um `<button>` sem `type="button"` (`components/ui.tsx:56`); dentro do `<form>` do evento ele envia o formulário | A |
| U45 | 11. Central de avisos ao lado do tema | Os lembretes já viram notificação do sistema (`platform/ReminderSync.tsx`), mas não há onde vê-los no app, nem as tarefas que vencem hoje ou venceram | C |
| U46 | 12. Início que acelera o mestre (opcional) | O Início mostra contadores que a barra lateral já mostra e não mostra o dia (tarefas, atrasos, data no mundo) | H |
| U47 | Sobra da 1.2: mestre remoto completo | O celular que comanda a sala não tem Biblioteca, "Salvar Sessão" nem o ⋯ da nota no token (não tem o cofre) | I |
| U48 | Sobra da 1.2: mapa e acessibilidade | Abas do painel do mapa cortadas a 1280 px; enquadramento a 320 px; Relações (árvore e organograma) sem conferência com leitor de tela; gráfico global lento com 10 mil notas sem placa de vídeo | J |
| U49 | Pedido de 11/11 (depois da lista): limpeza do repositório | Ver "Limpeza do repositório (U49)" abaixo | K |

## Limpeza do repositório (U49)

**Veredito: o repositório não precisa ser reorganizado.** Os 1.123 arquivos versionados seguem a divisão do
`AGENTS.md` (`app/src/core`, `screens`, `components`, `desktop`, `mobile`), o histórico tem 4,5 MiB compactado e não há
arquivo gerado versionado (`dist/`, `out/`, `release/` e `node_modules/` já estão no `.gitignore`). O lixo de verdade
está **em volta** do repositório, no disco do João.

No repositório (vai num PR, `limpeza/1.3-repositorio`):

| O quê | Quanto | O que fazer |
|---|---|---|
| Código que ninguém importa: `components/MoonIcon.tsx`, `NoteEditor.tsx`, `NotePanels.tsx`, `lib/fictional-calendar.ts`, `lib/graph.ts` | 5 arquivos, 500 linhas; o mais antigo é da etapa 2 (14/10) | apagar, depois de `typecheck`, testes e builds passarem |
| Imagens de `docs/imagens/` que nenhum documento cita | 83 de 132, 4,1 MB | apagar da `main`. Os PRs antigos apontam para a imagem **no branch do PR** (`blob/<branch>/docs/imagens/…`), então os links deles não dependem da `main` |
| Tarefas já concluídas em `docs/tarefas/` | 31 arquivos; ao menos 19 se dizem concluídos ou mesclados | mover para `docs/tarefas/concluidas/`, consertar os links e deixar no `README.md` da pasta só o que está aberto |
| Documentos históricos (`docs/00-estudo.md`, `docs/03-comparacao-prototipos.md`, `abertas-e-responsaveis.md`, que se declara desatualizado) | 3 | mover para `docs/historico/` |
| Proteção para não voltar | — | um teste que falha se um arquivo de `app/src` não é importado por ninguém ou se uma imagem de `docs/imagens` não é citada |

Fora do repositório (na máquina do João; nada disso vai para o GitHub, e cada passo é conferido antes):

| O quê | Quanto | O que fazer |
|---|---|---|
| Worktrees antigos em `~/Documentos/GitHub/.worktrees/` | 37 pastas, **21 GB** | remover os 27 cujo branch já está na `main` e não têm nada sem commit; `arquivo` (branch fora da `main`) e `backup-1.2` ficam; os 5 com mudanças sem commit (`1.2`: 114, `c5`: 17, `geradores`: 6, `codex`: 3, `1.2-modulos`: 3) são conferidos um a um e, se houver algo que não está na `main`, viram um patch guardado antes |
| `out/worktrees/tasks-tempo-livre` na pasta principal | 962 MB, limpo, branch na `main` | remover |
| `desktop/release/` na pasta principal (instaladores da 0.0.1) | 503 MB | apagar |
| Pastas vazias `.agents/`, `.aws/`, `.codex/` na pasta principal | 0 arquivos | apagar |
| Branches locais já mesclados | 97 de 103 | apagar (`git branch -d`, que recusa o que não foi mesclado) |
| Branches no GitHub já mesclados | 9 | **manter**: as imagens dos PRs antigos são lidas desses branches |
| `stash` da pasta principal | 4, o mais novo de 01/11 | guardar cada um como patch numa pasta de backup e só então apagar |
| Pasta principal em `7041feb` | 30+ commits atrás da `main` | atualizar com `git pull --ff-only` (está limpa) |

## Análise do Valknut (1ª Edição) (U43)

Lida uma **cópia** do livro (16 capítulos e seções, 3.332 palavras, 9 imagens) num app de teste; o cofre do João não
foi tocado. A prévia gera 19 páginas. O Markdown está limpo (nenhum `&nbsp;`, espaço especial ou recuo à mão; só
`<u>`), então as gambiarras são de estrutura:

| O que o João teve de fazer | Por que precisou | Causa no código |
|---|---|---|
| Linha só com `\` para separar parágrafos e atributos (Começo Rápido, Arquétipos, Espírito, dentro dos cartões de magia) | Não há espaço entre parágrafos: o tema põe 0 e o recuo faz o papel de separar | `book-pages.css:78`: só `p + p` ganha margem e recuo |
| E o `\` aparece impresso na página 5 (Arquétipos) | Um `\` seguido de linha vazia não é quebra de linha no Markdown, é o próprio caractere | — |
| Bloco `::: runas-colunas-1` em volta da Tabela de Carma, e um `::: runas-colunas-2` vazio depois | Para a tabela ocupar a largura toda numa página de 2 colunas | não há opção de largura por tabela |
| Linhas vazias seguidas antes de tabelas e entre cartões | Tentativa de dar respiro; o Markdown junta linhas vazias | — |
| Imagem com `\|480` dentro do cartão | Controlar o tamanho | ok, é do dialeto; fica |

O que a prévia faz por conta própria e o João não controla:

1. **Recuo "quando quer":** o recuo só vale para um parágrafo logo depois de outro, e só no nível de cima do capítulo
   (`.md > p + p`). Não vale depois de título, lista, cartão ou linha `\`, nem dentro de `::: colunas` ou de cartões.
   Medido: só **4 de 95** parágrafos do livro têm recuo.
2. **Tabelas com colunas iguais:** `table-layout: fixed` (`book-pages.css:35`). A coluna "Descrição" vazia da Tabela
   de Carma ocupa ¼ da largura; numa página de 2 colunas, as tabelas de XP ficam com 326 px e colunas iguais.
3. **Página quase vazia antes de cada seção:** o capítulo usa a página nomeada `capitulo` e a seção não
   (`book-layout.ts:100`). No Paged.js, a troca de página nomeada força quebra, então toda seção depois de um
   capítulo começa em página nova mesmo com o capítulo acabando no alto (páginas 9 e 12 do Valknut).
4. **Sete espaçamentos diferentes** entre parágrafos (0; 5,7; 6; 9,3; 10,7 px…), cada um vindo de uma regra
   diferente (tema, cartão, colunas).

## Decisões do Claude (o João pode trocar qualquer uma)

- **U36 (constância):** a casa do app vira grade de linhas fixas (`.main { display: grid; grid-template-rows:
  var(--topbar-height) minmax(0, 1fr) }`), e toda barra fixa (topo, abas da Wiki, barra do documento, barra do livro)
  ganha `flex: none` e altura por variável (`--topbar-height`, `--subbar-height`, `--docbar-height`). Proteção: uma
  checagem no smoke percorre **todas as rotas** a 1280×800 e 375×812 e falha se uma barra fixa medir diferente da
  variável. É isso que impede a inconstância de voltar.
- **U40 (janela):** a janela principal mostra sempre **"Runas-Codex"** (`page-title-updated` com `preventDefault`).
  A janela de nota avulsa mostra "‹nota› — Runas-Codex" (não muda enquanto está aberta). O `document.title` por rota
  continua, porque é ele que leitor de tela e histórico usam (WCAG 2.4.2).
- **U41 (token):** um só campo **TokenSizeField** (número com vírgula, de 0,25 a 20, atalhos 0,5 · 1 · 2 · 3 · 4) na
  ficha da Wiki, nas propriedades do token da mesa e na Biblioteca. O token continua centrado na grade.
- **U44:** `Switch` ganha `type="button"`, e um teste varre o `app/src` atrás de `<button` sem `type` dentro de
  `<form>`.
- **U37 (tarefas):** nenhuma sintaxe nova; tudo continua abrindo no Tasks do Obsidian.
  - **Atrasada** = aberta com 📅 antes de hoje. **Vence hoje** = 📅 hoje.
  - **Falhou** = cancelada (`[-]`, ❌ data) **depois** do prazo; cancelada antes do prazo continua "Cancelada".
    Assim o Obsidian mostra as duas como canceladas e o app separa as duas pela data.
  - Ao marcar "Falhou" numa tarefa que repete, o app cria a próxima ocorrência (o Tasks só cria ao concluir; a linha
    gravada é a mesma que o Tasks gravaria).
  - **Hábito diário** = 🔁 `every day` com 🏁 `delete`: ao concluir, a ocorrência feita sai e fica só a próxima, para
    a nota não ganhar uma linha por dia.
  - Tarefas novas criadas pela Agenda vão para `Agenda/Tarefas.md`; as que já estão em outras notas ficam onde estão.
- **U39 (tempo por campanha):** a nota da campanha ganha `data_mundo: "4031-07-15 OC"`, `hora_mundo: "07:30"` e
  `periodo_mundo: Dia` (datas e horas entre aspas). Sem essas propriedades, a campanha **segue a wiki**; a primeira
  vez que o mestre muda a data ou a hora na campanha, ela passa a ter as suas. A **regra** do relógio (horas por
  volta, períodos) continua no calendário, porque é do mundo; o **ponteiro** é da campanha. No calendário, o "Hoje no
  mundo" vira uma escolha: **data manual** (o `hoje:` de hoje) ou **seguir uma campanha**
  (`hoje_de: "[[Campanhas/X/X]]"` no bloco), e a aba lista a data atual de cada campanha daquele calendário.
- **U35 (calendário):** aba **Configurar** no painel "Detalhes do calendário" (nome, sigla, sufixo, semana, meses com
  dias e estação, bissexto, luas, eras, feriados, relógio), que grava o mesmo bloco YAML com a API `Document` do
  `yaml` (mantém comentários e a ordem). O **Novo artigo › Calendário** abre o mesmo formulário (como a ficha do U29),
  com modelos prontos (Gregoriano, 12×30, 13×28) para começar.
- **U42 (Notas):** linha única de 32 px (44 px no toque e com "Controles maiores"); sem prévia em nota nem segunda
  linha em pasta; contagem numa bolinha à direita; recuo de 16 px por nível com uma linha-guia; "Recolher tudo" no ⋯.
- **U43 (livros), em dois PRs:**
  - **G1 (o que a prévia faz sozinha):** recuo com regra clara e escolha no painel (**Nenhum · Todos os parágrafos ·
    Menos o primeiro depois de título**), tamanho do recuo e **Espaço entre parágrafos** (0 a 1,5 linha) valendo
    também dentro de colunas e cartões; tabelas com `table-layout: auto` e a escolha **Ajustar ao conteúdo · Largura
    toda**; capítulo e seção na mesma página nomeada, com **Começar em nova página** por capítulo e por seção
    (propriedade `nova_pagina` da nota; o padrão vem do livro).
  - **G2 (fim das gambiarras):** **Linhas vazias contam** no livro (opção `linhas_vazias: respeitar`: cada linha vazia
    a mais vira uma linha de espaço só na prévia e no PDF; o Obsidian continua juntando, como sempre);
    **ajustes por bloco** em comentário do Obsidian, que ele esconde (`%% livro: largura-toda %%` antes de uma tabela,
    `%% livro: nova-pagina %%`, `%% livro: espaco 2 %%`), lidos só pelo livro; e **Revisar o livro**, que lista
    as gambiarras que não são mais necessárias (linhas `\`, `::: colunas` vazio, `colunas-1` só em volta de tabela) e
    troca cada uma **só quando o João confirmar**, com backup antes.
  - O leitor compartilhado (`Markdown.tsx`, `markdown.css`, live preview) **não muda** (regra 7): tudo isso é CSS e
    pré-processamento do próprio livro.
- **U45 (avisos):** sino com contagem ao lado do botão de tema (no celular, na barra do topo, alvo de 44 px). O painel
  tem **Atrasadas**, **Vencem hoje** e **Lembretes** (eventos com `lembrete` nas próximas 24 h e os que já
  dispararam), cada item com Concluir, Falhou, Adiar para amanhã e Abrir. O que foi visto fica no aparelho
  (`runas-codex:avisos-vistos`, D17). Tarefa não ganha sintaxe de lembrete: o app avisa no dia do prazo, na hora
  escolhida em Configurações (padrão 09:00).
- **U46 (Início, opinião):** "Mesa de hoje" — a coluna **Hoje** (agenda do dia, tarefas que vencem e atrasadas,
  hábitos com caixa de marcar), a **Próxima sessão** com contagem, preparação e "Abrir a mesa", **Campanhas ativas**
  com a data e a hora no mundo de cada uma (U39), e **Centelhas** e **Retome o fio** menores. A fileira de seis
  contadores sai: os números já estão na barra lateral.

## PRs, na ordem

Cada um cabe numa janela de 5 h e sai de um branch próprio a partir da `main` atualizada. Ao fim de cada um: testes
em português, `docs/04-testes-pendentes.md`, ajuda do módulo, e conferência no navegador a 1280 px e 320 px nos dois
temas.

| PR | Itens | Conteúdo | Depende de |
|---|---|---|---|
| **A** `correcoes/1.3-constancia` | U36, U40, U41, U44 | grade da casa, `flex: none`, variáveis de barra, checagem de rotas no smoke; título da janela; TokenSizeField; `type="button"` e o teste | — |
| **B** `agenda/1.3-tarefas` | U37, U38 | vista **Tarefas** na Agenda (Atrasadas, Hoje, Próximas, Hábitos, Feitas), Falhou, hábito diário, novo Editar tarefa | — |
| **C** `shell/1.3-avisos` | U45 | sino, painel, hora do aviso das tarefas | B |
| **D** `wiki/1.3-calendario` | U35 | aba Configurar, Novo artigo › Calendário, modelos | — |
| **E** `campanhas/1.3-tempo` | U39 | data e relógio por campanha, "Hoje no mundo" com origem | D |
| **F** `notas/1.3-barra` | U42 | árvore compacta | A (variáveis de linha) |
| **G1** `livros/1.3-diagramacao` | U43 | recuo, espaço entre parágrafos, tabelas, nova página | — |
| **G2** `livros/1.3-sem-gambiarras` | U43 | linhas vazias, ajustes por comentário, Revisar o livro | G1 |
| **H** `inicio/1.3-mesa-de-hoje` | U46 | novo Início | B, C, E |
| **I** `vtt/1.3-mestre-remoto` | U47 | Biblioteca, Salvar Sessão e ⋯ da nota no celular, pela sala | — |
| **J** `acessibilidade/1.3-mapa` | U48 | abas do mapa, 320 px, leitor de tela nas Relações, gráfico sem GPU | — |
| **K** `limpeza/1.3-repositorio` | U49 | código e imagens sem uso, tarefas concluídas e históricos em pastas próprias, teste contra órfãos; a limpeza do disco é feita à parte, sem PR | — |
| **V** `versao/1.3.0` | — | notas da versão, docs/04, `lancar-versao.yml` quando o João pedir | todos |

## Riscos a vigiar

- **U36** mexe na casa de todas as telas: o smoke de rotas precisa passar antes do merge. Telas que dependiam do
  encolhimento (alguma que coube "por sorte") vão aparecer na checagem.
- **U39** muda quem grava a data: a nota da campanha passa a mudar quando o relógio anda. Precisa do `setProperty`
  com a versão lida (regra 3) e de um teste para não regravar o calendário sem querer.
- **U43 G2** grava nos capítulos do João só pelo "Revisar o livro", com confirmação e backup. Nada é trocado sozinho.
- **U45** não pode duplicar a notificação do sistema: o painel lê a mesma lista que o `ReminderSync`.

## O que o João decide

1. Aprovar as maquetes (Calendário › Configurar, Tarefas e Editar tarefa, Tempo da campanha, Notas, Diagramar,
   Avisos, Início) ou pedir mudanças.
2. **Janela (U40):** sempre "Runas-Codex" (recomendado) ou nada.
3. **Falhou (U37):** derivado de "cancelada depois do prazo" (recomendado, compatível com o Obsidian) ou um estado
   próprio `[f]` (o Obsidian sem configuração o trata como tarefa aberta).
4. **"Aninhar" nas Notas (U42):** a árvore com guias e arrastar para dentro basta, ou ele quer também **nota-pasta**
   (uma nota que abre a pasta e tem as outras dentro, como o plugin Folder Notes)?
5. **Linhas vazias no livro (U43):** valer só no livro (recomendado) — o Obsidian continua juntando as linhas.
6. **Início (U46):** a "Mesa de hoje" como proposta, ou manter o Início de hoje e só acrescentar a coluna Hoje.
7. **Limpeza do disco (U49):** autorizar a remoção dos worktrees antigos (21 GB), do `out/worktrees` e do
   `desktop/release` na pasta principal, e dos 97 branches locais já mesclados. Os 5 worktrees com mudanças sem
   commit só são removidos depois de virar patch guardado.

**Resposta de 11/11:** "siga com a atualização e aplique as recomendações". Valem as escolhas recomendadas: maquetes
como estão; janela sempre "Runas-Codex"; Falhou = cancelada depois do prazo; árvore com guias (sem nota-pasta);
linhas vazias só no livro; Início "Mesa de hoje". A limpeza do disco (7) continua esperando autorização explícita,
item por item, na hora do PR K.
