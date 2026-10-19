# Tarefas em andamento

Quem está trabalhando em quê, para dois agentes não mexerem nos mesmos arquivos. As regras gerais estão no
[`AGENTS.md`](../../AGENTS.md). Ao terminar uma tarefa, o dono do repositório mescla o PR e atualiza a tabela de
situação.

## Divisão do que falta (14/10/2026, depois da etapa 7)

Duas frentes trabalham **ao mesmo tempo**, cada uma dona de uma parte do código, para terminar tudo o mais rápido
possível. A ordem combinada (docs/02, seção 8: 7 → 8c → 8d → 9 → 10 → A → 11) continua valendo **dentro de cada
frente**.

- **Codex (GPT-6 Astra): o que vira documento e a mesa.** Livros (exportar e importar), exportações para documento
  de qualquer módulo (PDF, DOCX, HTML, EPUB, site estático), o VTT no toque e o fechamento da mesa e, no Android, a
  sala hospedada pelo celular.
- **Claude Code: o que é cofre e dados.** Anexos e imagens nas notas, o mestre controlando pelo celular a sala aberta
  no desktop (etapa 9), núcleo de notas e editor, Wiki, Campanhas, Agenda, pacotes, migrações (etapa 10) e o Android
  completo (cofre real, testes no emulador, APK assinado).

### Fila de cada frente

Cada linha é **um PR**, nesta ordem. Uma frente não espera a outra, a não ser onde está escrito "depende de".

| # | Codex | Pedido |
|---|---|---|
| X1 | **8c** Livros: exportar PDF fiel à prévia, EPUB e DOCX | [livros-8c-8d.md](livros-8c-8d.md) |
| X2 | **8d** Livros: importar Homebrewery, GM Binder e DOCX (depende de **C0**) | [livros-8c-8d.md](livros-8c-8d.md) |
| X3 | **9** VTT no toque | [vtt-9.md](vtt-9.md) |
| X4 | Exportações para documento: nota, coleção, artigo da wiki e diário da campanha; site estático; versão dos jogadores | [exportacoes.md](exportacoes.md) |
| X5 | Fechamento dos Livros (o que falta das seções E e G.3 da checklist) | [fechamento-modulos.md](fechamento-modulos.md) |
| X6 | Fechamento da mesa (o que falta das seções D e G.1) | [fechamento-modulos.md](fechamento-modulos.md) |
| X7 | **A2** Sala hospedada pelo celular (depende de **C8**) | [android-a.md](android-a.md) |
| X8 | **11** Polimento: visual, acessibilidade, primeiros passos | [polimento-11.md](polimento-11.md) |

| # | Claude Code | Pedido |
|---|---|---|
| C0 | Arquivos binários no cofre (`Platform` + `useVault`). **Destrava X1 e X2**; sai primeiro | [anexos-imagens.md](anexos-imagens.md) |
| C1 | Imagens nas notas: importar, colar (Ctrl+V) e arrastar | [anexos-imagens.md](anexos-imagens.md) |
| C2 | Imagens nas notas: alças de tamanho e posição (PR pequeno do leitor; muda o dialeto) | [anexos-imagens.md](anexos-imagens.md) |
| C3 | **9** Mestre pelo celular com a sala aberta no desktop | [vtt-9.md](vtt-9.md) |
| C4 | **10** Migrações: Obsidian (calendários, mapas e fichas dos plugins de RPG) | [migracoes-10.md](migracoes-10.md) |
| C5 | Fechamento do núcleo de notas e do editor (seções A e F.1) | [fechamento-modulos.md](fechamento-modulos.md) |
| C6 | Fechamento da Wiki, das Campanhas e da Agenda — **Codex assume em 17/10/2026** (seções B, C, F.2 e G.5) | [fechamento-modulos.md](fechamento-modulos.md) |
| C7 | Pacotes: pacote `.runas`, pacote de campanha, exportar pasta/ZIP, backups agendados | [fechamento-modulos.md](fechamento-modulos.md) |
| C8 | **A1** Android completo: cofre real, spikes que sobraram da etapa 2, testes no emulador, APK assinado | [android-a.md](android-a.md) |
| C9 | **11** Polimento: desempenho com cofres grandes, instaladores, ajuda offline, beta | [polimento-11.md](polimento-11.md) |

A etapa 9 tem duas partes, uma em cada frente: o toque (X3, Codex) e o mestre pelo celular (C3, Claude Code). Ela só
está pronta quando as duas entrarem na `main`.

### Contratos entre as frentes

Estes pontos de contato ficam definidos desde já, para uma frente não ficar esperando a outra:

- **Arquivos binários (C0, Claude Code).** A `Platform` ganha `readBinary`, `writeBinary` e `saveBytes`, e o
  `useVault()` ganha `addAttachment`, que grava na pasta de anexos do Obsidian e devolve o caminho. A assinatura
  está em [anexos-imagens.md](anexos-imagens.md). Até a C0 entrar na `main`, o Codex pode gerar os bytes da
  exportação e deixar só o "salvar" para o fim.
- **Etapa 9 (X3 e C3).** O Codex mexe no canvas, nas ferramentas e no layout da mesa; o Claude Code, na conexão do
  mestre remoto (veja a lista de arquivos em [vtt-9.md](vtt-9.md)). O mestre remoto usa a **mesma interface** da
  mesa (`VttApi`), então o toque da X3 funciona nele sem trabalho extra.
- **Exportações (X4, Codex).** O motor e o diálogo de exportar ficam em `app/src/core/export/**` e
  `app/src/components/export/**`. Nas telas do Claude Code (Notas, Wiki, Campanhas), o Codex só **acrescenta** a
  entrada "Exportar…" no menu que já existe, avisando no PR.
- **Tela Transferir** (`app/src/screens/TransferScreen.tsx`, hoje protótipo): é do Claude Code (C7), e o Codex
  acrescenta as entradas de Mesa e de Livros quando elas funcionarem de verdade.
- **Mesas no cofre.** As mesas são arquivos em `<cofre>/.runas/mesas/`; o pacote de campanha (C7) as leva como
  arquivos, sem depender do pacote de mesa da X6.
- **Android (C8 → X7).** A C8 cria a `Platform` do Capacitor e o plugin nativo do cofre; a X7 põe o servidor da sala
  por cima, em arquivos próprios.
- **Encontros (C4 → X6).** A migração do Initiative Tracker grava os encontros num bloco ` ```runas-encontro ` (YAML com
  `nome`, `jogadores` e `combatentes` com `nome`, `quantidade`, `pv`, `ca`, `iniciativa`, `nota`, `aliado`, `oculto`).
  O leitor é `app/src/core/encounters.ts` (`parseEncounter`, do Claude Code); o formato está na
  [ADR 0014](../adr/0014-migracoes.md). Quando a mesa ganhar a iniciativa (X6), ela importa o encontro por esse leitor,
  sem mexer nele; se precisar de um campo novo, o pedido vai no PR.

### Números de ADR reservados

Para as duas frentes não pegarem o mesmo número: **0012** anexos (C0–C2), **0013** exportações (X4; a 8c e a 8d
ficam na ADR 0009), **0014** migrações (C4), **0015** Android (C8; a X7 acrescenta uma seção), **0016** mestre pelo
celular (C3). O toque (X3) e o fechamento dos módulos atualizam a ADR de cada módulo.

### Fora do plano

- **Decisão do dono (14/10/2026):** sem voz e vídeo na sala e sem sincronização de aparelhos pela rede local (os dois
  itens foram desmarcados na checklist).
- Pela [ADR 0004](../adr/0004-independente-da-runas-suite.md): importar mundos do RunasVTT, do Runas DM e livros do
  Runas Book.
- Depois da 1.0: importar do Notion, Kanka, World Anvil e LegendKeeper; interface em inglês; API de extensões.

## Situação

| Etapa | Quem | Branches | Pedido | Situação |
|---|---|---|---|---|
| **8a** Livros: estrutura em notas e editor | Codex (GPT-6 Astra) | `livros/8a-*` | [livros-8a-8b.md](livros-8a-8b.md) | mesclada (PR #8) |
| **8b** Livros: prévia paginada e temas | Codex (GPT-6 Astra), terminada pelo Claude Code | `livros/8b` | [livros-8a-8b.md](livros-8a-8b.md) | mesclada (PR #10) |
| **6** Wiki | Claude Code | `wiki/*` | docs/02, seção 8; [ADR 0010](../adr/0010-wiki.md) | mesclada (PR #9) |
| **7** Canvas + Campanhas | Claude Code | `campanhas/etapa7` | docs/02, seção 8; [ADR 0011](../adr/0011-campanhas.md) | mesclada (PR #11) |
| **X1** 8c Livros: exportações | Codex (GPT-6 Astra), terminada pelo Claude Code | `livros/8c-exportacoes` | [livros-8c-8d.md](livros-8c-8d.md) | mesclada (PR #15, pelo #19) |
| **C0** Arquivos binários no cofre | Claude Code | `anexos/binarios` | [anexos-imagens.md](anexos-imagens.md) | mesclada (PR #13, pelo #19) |
| **C1** Imagens: importar, colar e arrastar | Claude Code | `anexos/imagens` | [anexos-imagens.md](anexos-imagens.md) | mesclada (PR #14, pelo #19) |
| **C2** Imagens: tamanho e posição | Claude Code | `anexos/tamanho-posicao` | [anexos-imagens.md](anexos-imagens.md) | mesclada (PR #16, pelo #19) |
| **C3** Mestre pelo celular | Claude Code | `vtt/etapa9-mestre-remoto` | [vtt-9.md](vtt-9.md) | mesclada (PR #17, pelo #19) |
| Verificar atualizações | Claude Code | `atualizacoes/verificar` | [ADR 0017](../adr/0017-atualizacoes.md) | mesclada (PR #18, pelo #19) |
| **X2** 8d Livros: importar Homebrewery, GM Binder e DOCX | Codex (GPT-6 Astra) | `livros/8d-importacoes` | [livros-8c-8d.md](livros-8c-8d.md) | mesclada (PR #20) |
| **X3** 9 VTT: gestos e layout no toque | Codex | `vtt/etapa9-toque` | [vtt-9.md](vtt-9.md) | em revisão (PR #23) |
| **C4** 10 Migrações do Obsidian | Claude Code | `migracoes/etapa10` | [migracoes-10.md](migracoes-10.md) | mesclada (PR #21) |
| Corretor ortográfico sem rede | Claude Code | `desktop/corretor-offline` | [ADR 0018](../adr/0018-corretor-offline.md) | mesclada (PR #22) |
| **C5a** Notas: links, gráfico e notas pessoais (A.1, A.2, F.1) | Claude Code | `notas/c5a-links-grafico` | [fechamento-modulos.md](fechamento-modulos.md) | mesclada (PR #24) |
| **C5b** Notas: organização e busca (A.3, primeira parte) | Claude Code | `notas/c5b-organizacao` | [fechamento-modulos.md](fechamento-modulos.md) | mesclada (PR #25) |
| **C5c** Notas: o resto do A.3 | Claude Code, continuada pelo Codex | `notas/c5c-conclusao` | [fechamento-modulos.md](fechamento-modulos.md) | em revisão (PR #27); depende do leitor #26 |
| **W1** Wiki: página de categoria com a arte dos artigos | Codex (exceção autorizada pelo dono em 17/10) | `wiki/pagina-categoria` | [wiki-categorias.md](wiki-categorias.md) | a fazer, depois de `integracao/x5-c6-x8` |

## Quem mexe em quê

| Área | Codex | Claude Code |
|---|---|---|
| Telas | `app/src/screens/books/**`, `app/src/screens/vtt/**`, `app/src/vtt/**` (menos o que é da C3), `app/src/components/export/**` | `app/src/screens/wiki/**`, `campaigns/**`, `agenda/**`, `import/**`, `NotesScreen.tsx`, `TransferScreen.tsx`; `app/src/components/vault/**`, `components/canvas/**`; na C3, os arquivos do mestre remoto listados em [vtt-9.md](vtt-9.md) |
| Núcleo (TS puro) | `app/src/core/books*.ts`, `app/src/core/books-import/**`, `app/src/core/export/**`, `app/src/vtt/shared/**` | o resto de `app/src/core/` (notas, anexos, wiki, calendários, campanhas, canvas, agenda, pacotes, `import/**`) |
| Desktop | `desktop/src/main/vtt/**` (menos o que é da C3), `desktop/src/main/books-*.ts`, `desktop/src/main/export-*.ts` | `desktop/src/main/vault*.ts`, `watcher.ts`, `reminders.ts`; na C3, a conexão do mestre remoto |
| Android | `mobile/android/**/room/**` (servidor da sala) | o resto de `mobile/**` e `app/src/platform/capacitor-platform.ts` |
| Leitor de Markdown | só pelos pontos de extensão (`markdown/extensions.ts`) e CSS com escopo do módulo | idem; na **C2**, um PR pequeno que muda `markdown/Embed.tsx` (autorizado pelo dono em 14/10) |
| Dados de exemplo | `app/src/data/books.ts`, `app/src/data/mesas.ts` | `app/src/data/wiki.ts`, `campaign-demo.ts`, `campaigns.ts` |
| Cofre de teste do desktop | `desktop/tests/cofre-exemplo/Livros/**` e `.runas/mesas/**` | o resto de `desktop/tests/cofre-exemplo/` |
| Documentação | `docs/adr/0009-livros.md`, `0006-mesa-vtt.md` e as ADRs novas de exportação e da sala no Android | as outras ADRs e `docs/tarefas/**` |

Os arquivos compartilhados (lista no `AGENTS.md`) podem ser mexidos pelos dois, só acrescentando.

Ninguém mexe no que é do outro. Se precisar, o pedido vai no PR ("precisa de X em `screens/wiki`") e o dono decide.

## C6 dividida em duas partes (17/10/2026)

Por pedido do dono, Codex assume a C6 e executa X5 → C6 → X8, sem Android nesta rodada. A auditoria está em
[auditoria-c6.md](auditoria-c6.md).

| Parte | Responsável | Branch | Situação |
|---|---|---|---|
| C6a — Wiki: conteúdo, ferramentas e crônicas | Codex | `wiki/c6a-fechamento` | implementada e validada localmente; publicação pendente |
| C6b — Campanhas, Agenda e colaboração pela sala | Codex | `campanhas/c6b-fechamento` | implementada e validada localmente; baseada na C6a |

A revisão de Android será especificada em tarefa complementar depois da X8.

## Atualização de responsáveis — 17/10/2026

Por pedido do dono: Codex assume **X5 → C6 → X8**, nessa ordem, em PRs separados. A revisão Android fica fora
desta rodada; será especificada em tarefa complementar depois da X8, para executar com C8/X7 disponíveis.

- X5: implementação e conferência na branch `livros/x5-fechamento`.
- C6: atribuída ao Codex. Mostrar artigo pela sala conserva a dependência dos handouts da X6.
- X8: vem imediatamente depois da C6, com revisão web/desktop e larguras de 320 px, tablet e desktop.


## Entrega local X5 → C6 → X8 e revisão complementar

| Fase | Responsável | Branch/snapshot local | Situação |
|---|---|---|---|
| X5 — fechamento de Livros | Codex | `livros/x5-fechamento` | implementada e validada |
| C6a — Wiki | Codex | `wiki/c6a-fechamento` | implementada e validada |
| C6b — Campanhas/Agenda/sala | Codex | `campanhas/c6b-fechamento` | implementada e validada; depende da C6a |
| X8 — visual/acessibilidade/primeiros passos, mais imagens e contadores pedidos pelo dono | Codex | `polimento/visual` | implementada e validada localmente; integra X5 e C6 |
| Revisão completa posterior, incluindo Android | Codex | [revisao-completa-complementar.md](revisao-completa-complementar.md) | especificada para tarefa complementar |

As fases estão em commits locais. O snapshot integrado preserva as duas frentes; publicações e mesclagem da main
continuam separadas. Consulte [auditoria-x8.md](auditoria-x8.md) para a matriz e os limites da validação.


## Entrega beta.5 — W1 e release desktop

W1 implementada em `wiki/pagina-categoria` sobre X5/C6/X8; ver [auditoria-w1.md](auditoria-w1.md).
Por pedido posterior do dono, a entrega é reunida num PR integrado e numa nova release Windows/Linux, sem Android.
As branches de fase e os commits continuam preservados para revisão. A mesclagem na main continua a cargo do dono.
A revisão complementar foi criada em chat próprio e concluiu a auditoria do snapshot d6ea6bd; seus três achados de
interface/confiabilidade dos testes foram tratados na beta.5. Validação física e C8/X7 continuam pendentes.

## C8 — Android completo (18/10/2026)

| Fase | Responsável | Branch | Situação |
|---|---|---|---|
| **C8** A1: cofre real, spikes, emulador no CI, APK assinado | Claude Code; CI com o Codex ([c8-ci-android.md](c8-ci-android.md)) | `android/a1-cofre` | em revisão ([ADR 0015](../adr/0015-android.md)) |
| SAF como reserva do cofre (depois do CI da C8) | Codex ([android-saf.md](android-saf.md)) | `android/a2-saf` | a fazer |

## Pedido posterior à beta.13 — pastas, transferências e APK

O dono aprovou a conferência manual da beta.13 e pediu a seleção de pastas disponibilizadas por outros aplicativos,
importação/exportação para mobile e desktop e atualização do APK pelo app. O andamento e o fechamento estão em
[pastas-transferencias-atualizacao.md](pastas-transferencias-atualizacao.md). Ao concluir, publicar a próxima beta
com Android, Windows e Linux, conforme confirmação na conversa.
