# Tarefas do Runas-Codex: o que falta para a versão 1.0 (revisado em 30/10/2026)

**Para:** Codex, Claude Code e o dono. **Leia antes:** [`AGENTS.md`](../../AGENTS.md) (inclusive a regra 10, de UX e
acessibilidade), a [regra de lançamentos](../adr/0025-lancamentos.md) e o [guia de UX/UI](../ux-ui-acessibilidade.md).

Este arquivo substitui [`abertas-e-responsaveis.md`](abertas-e-responsaveis.md) (de 22/10). Criado em 25/10 sobre a
beta.16; **revisado em 30/10** sobre a `main` depois da beta.21 e dos PRs #85 a #88 (T1 a T4), com o PR #89 aberto
(geradores, T6, R1 sem Android, T7, Campanhas e T9).

## Resumo: feito e falta

| Frente | Feito | Falta |
|---|---|---|
| Claude Code | T1, T2, T3, T4 (PRs #85–#88), T5 (#83), T6, T7 em parte, T9 (PR #89) | T7: D11 e D13 e o que a R1 com Android achar; T8 |
| Codex | R5 (#68, #70) | R1 no Android, R2 (se a R1 no Android achar defeito de núcleo), R3, R4 |
| Dono | V1 a V5 (testados e funcionando, informado em 30/10); D1 a D4 respondidas | Mesclar o PR #89; conferir as funções novas do fim de `docs/04-testes-pendentes.md` |
| Fora da lista (pedidos do dono) | Revisão e correções das Campanhas, mapa de missões, Nova aventura, Elenco (T9), geradores com 19.412 opções e 43 culturas, Ferramentas da Wiki refeitas | Sobras da revisão das Campanhas (seção abaixo) |

## Situação

- **Na `main`:** as etapas 1 a 10, o Android (cofre real, SAF, sala na rede local, APK assinado), X1 a X8, C0 a C8,
  Tasks e tempo livre, o rework visual F1 a F5, os itens 1 a 8 do Codex, R5, a Ajuda (T5, #83), os geradores ×20 e
  a Wiki nova (#80–#82) e as telas T1 a T4 (#85–#88, mescladas em 30/10).
- **No PR #89 (aberto):** geradores com 19.412 opções e nomes de 43 culturas, Ferramentas da Wiki refeitas, T6 (10 mil
  notas), a revisão R1 sem Android ([`revisao-1.0.md`](revisao-1.0.md)) e as correções de tela T7, as correções da
  [revisão das Campanhas](../propostas/campanhas-revisao.html), o Elenco para mais de 100 NPCs (T9), o mapa de
  missões e o assistente “Nova aventura”.
- **Limitado:** a sala hospedada no celular funciona só na rede local; pela internet, só hospedando no desktop
  ([ADR 0032](../adr/0032-tunel-publico-android.md)) até a R4.

## O caminho até a 1.0

1. **Feito:** o dono testou as betas (V1 a V4) e respondeu D1 a D4; T1 a T4 mescladas.
2. **Agora:** mesclar o PR #89 e publicar a próxima beta; Codex com R1 no Android, R3 e R4.
3. **Candidata:** o que a R1 no Android achar (R2 no núcleo, T7 na tela) e as sobras da revisão das Campanhas.
4. **1.0.0:** quando todas as tarefas desta lista estiverem concluídas com êxito (decisão D4): lista de conferências
   fechada com o dono, notas da versão e tag `v1.0.0` (T8). O Android atualiza por cima das betas sem reinstalar
   (`1.0.0` gera um `versionCode` maior que o de qualquer `0.1.0-beta.N`).

## Quem mexe em quê

O rework terminou, mas a divisão continua: **telas, componentes e estilos são do Claude Code**
(`app/src/screens/**`, `app/src/components/**`, `app/src/styles/**` e o CSS dos módulos). O Codex trabalha no núcleo
(`app/src/core/**`), na `Platform`, no processo principal do Electron, no Android nativo, nos testes e no CI. Se uma
correção do Codex precisar de tela, ele descreve o que falta (arquivo, passos, resultado esperado) e o Claude Code faz.
Um branch e um PR por tarefa, a partir da `main` atualizada.

## Codex

| # | Tarefa | Obrigatória? | Situação em 30/10 |
|---|---|---|---|
| R1 | Revisão completa com Android, sobre o visual novo | sim | **Feita em parte** pelo Claude Code (PR #89): 49 telas em 3 larguras e 2 temas, com axe. **Falta** a parte no Android físico, leitores de tela reais, sala com dois aparelhos e impressão |
| R2 | Corrigir o que a R1 achar (a parte que não é tela) | sim | Nada de núcleo na rodada sem Android; **aberta** até a R1 no Android |
| R3 | Cofre de 10 mil notas no emulador Android do CI | sim | **Aberta**. A T6 já mediu no navegador (ADR 0030) |
| R4 | Sala do celular pela internet (túnel no APK) | sim (D1, respondida em 29/10) | **Aberta** |
| R5 | Mestre pelo navegador na sala hospedada pelo celular | feita a pedido do dono | **Feita** (PRs #68 e #70, beta.17) |

### R1 — revisão completa com Android

O roteiro está em [`revisao-completa-complementar.md`](revisao-completa-complementar.md). Mudanças em relação a ele:

- **Base:** a `main` na beta.16 ou depois, não mais a branch `polimento/visual`. X5, C6, X8, X6, C7, C8 e X7 estão
  todos na `main`; o que estiver só “por dentro” (lista acima) conta como **não disponível nesta base**, não como
  defeito.
- **Critério:** além do roteiro, as regras de [`docs/ux-ui-acessibilidade.md`](../ux-ui-acessibilidade.md) (WCAG 2.2 AA,
  foco e teclado, `aria-current` e título por rota, 320 px sem rolagem lateral, alvos de 44 px, redução de movimento,
  alternativas para gráfico, Canvas e WebGL).
- **Telas novas da beta.16 a cobrir:** “+ Novo” e trilho de navegação (Ctrl+\\), Configurações › Acessibilidade e o
  índice de seções, editor (barra da seleção com Alt+F10, menu `/`, galeria Ctrl+/, barra sobre o teclado no
  celular), Livros (Escrever, Organizar, Prévia, Apoio, Excluir livro), Agenda (mês pelo teclado, painel em abas),
  Personalizar campanha e categoria, Início (próxima sessão, Centelhas com e sem PIN), Importar e exportar, VTT.
- **Entrega:** `docs/tarefas/revisao-1.0.md` com a matriz (passou, defeito reproduzido, não disponível nesta base, não
  verificado por falta de aparelho). Cada defeito com passos, esperado, obtido, severidade e o arquivo responsável, e
  marcado como **núcleo** (vai para a R2) ou **tela** (vai para o Claude Code). Um PR só com esse documento.

**Pronto quando:** o documento está na `main` e cada defeito tem dono.

### R2 — correções da revisão

Um PR por grupo de defeitos do núcleo, com teste que falhava antes. Os de tela ficam listados no documento da R1 para o
Claude Code. **Pronto quando:** nenhum defeito de núcleo com severidade alta ou média fica aberto.

### R3 — 10 mil notas no emulador do CI

O gerador existe (`app/src/core/large-vault.ts`, [ADR 0030](../adr/0030-c9-desempenho-rede-instaladores.md)) e o job
`android-vault` já mede 5 mil notas com `mobile/tests/vault-index.cdp.mjs`. Acrescentar a medição com 10 mil (só
acrescentar no `release.yml`, que é arquivo compartilhado): índice, busca, gráfico, memória e tempo de abertura. Os
números entram na ADR 0030, ao lado dos do desktop.

**Pronto quando:** o job roda no CI e a ADR 0030 tem os números do Android. Se algo travar, a causa vai para o
documento da R1 (núcleo ou tela).

### R4 — sala do celular pela internet

Obrigatória desde a resposta D1 (29/10). O estudo do túnel está na
[ADR 0032](../adr/0032-tunel-publico-android.md).

### R5 — mestre pelo navegador na sala hospedada pelo celular

**O que já existe e não entra aqui.** Com a sala aberta **no computador**, o mestre já controla a mesa pelo navegador de
qualquer celular ou tablet, sem instalar nada: a sala serve `/master?m=<chave>` (C3, [ADR 0016](../adr/0016-mestre-remoto.md)).
O que falta é o mesmo quando a sala está hospedada **no celular** (X7, [ADR 0024](../adr/0024-sala-android.md)): hoje o
servidor Java do Android serve só a página dos jogadores e, de propósito, não expõe a interface do mestre. Caso de uso:
o celular fica na mesa hospedando a sala e o mestre comanda de um tablet ou notebook pelo navegador.

**Como fazer** (mesmo contrato da ADR 0016, para a página do mestre não mudar):

1. **Servidor Java** (`mobile/android/.../room/RoomHttpServer.java`): servir `master.html` e os arquivos do build em
   `/master`, com uma **chave do mestre** separada da dos jogadores (128 bits, nova a cada vez que a sala liga,
   comparada em tempo constante). Um aparelho de mestre por vez: o canal de eventos abre uma sessão, as chamadas
   exigem `x-runas-session`, um segundo aparelho recebe 409. Valem as regras da ADR 0024: só endereços privados ou de
   loopback, `Host` numérico, `Origin` igual, limites de tamanho e de frequência.
2. **Ponte para a mesa** (`app/src/platform/android-room.ts`): a autoridade continua sendo a mesa no WebView. Cada
   chamada `POST /master/call/<canal>` vira um pedido novo na ponte que já existe (`kind: "master"`, ao lado de
   `join`, `snapshot` e `message`), que chama o mesmo tratador da mesa local. Só os canais de `MASTER_CHANNELS`
   (`app/src/vtt/shared/master.ts`); o resto recebe 403. As mudanças voltam por Server-Sent Events, como no desktop,
   e a `RemoteVttApi` (`app/src/vtt/remote-api.ts`) não muda.
3. **Assets:** `GET /master/asset/<tipo>/<arquivo>` lê da pasta da mesa (também no SAF, com streams e Range);
   `POST /master/asset` importa imagens até 50 MB, o limite que o Android já usa.
4. **Revogar:** “Trocar chave” e “Desconectar” derrubam o aparelho na hora; desligar a sala, trocar de mesa ou de cofre,
   ou retirar a gravação também encerram a sessão do mestre. A chave nunca aparece na notificação da sala.
5. **Segundo plano:** a sessão do mestre continua com a tela apagada, como a sala (o serviço em primeiro plano que já
   existe).
6. **Tela (Claude Code):** no painel Sala do Android, “Controlar por outro aparelho” com o QR escondido até pedir, o
   aviso de que quem tem o link controla a mesa, “Trocar chave” e “Desconectar” — o mesmo bloco do desktop. O Codex
   expõe o estado (link, aparelho conectado) pela `VttApi`; o Claude Code desenha.

**Testes:** no job `android-room` do CI, com o emulador hospedando a sala: um script abre `/master` com a chave (via
`adb forward`), cria um token, e a mesa do celular grava; um segundo aparelho recebe 409; um canal fora da lista recebe
403; trocar a chave invalida o link; um jogador no navegador vê o token novo. Os testes do desktop não mudam.

**Documentação:** atualizar a ADR 0024 (seção do mestre) e acrescentar no fim de `docs/04-testes-pendentes.md` a
conferência num aparelho físico: celular hospedando, tablet comandando, um jogador entrando, tela do celular apagada.

**Pronto quando:** com a sala no celular, um tablet na mesma rede comanda a mesa pelo navegador (cria token, troca a
cena transmitida, toca áudio), um jogador vê as mudanças, trocar a chave derruba o tablet e o CI passa inteiro.

**Fora do escopo:** controlar pela internet (depende da R4), mais de um aparelho de mestre ao mesmo tempo, e abrir,
criar ou fechar mesas pelo navegador (no desktop isso também é só do computador).

## Claude Code

| # | Tarefa | Obrigatória? | Situação em 30/10 |
|---|---|---|---|
| T1 | Tela de backups agendados (horário e quantos guardar) em Configurações › Backups | sim | **Feita** (PR #85, na `main`) |
| T2 | Aviso de cópias de conflito do Syncthing e do Obsidian Sync, com o original e “Arquivar” | sim | **Feita** (PR #86, na `main`) |
| T3 | Botão para criar e remover o atalho da captura rápida (GNOME e KDE) | sim | **Feita** (PR #87, na `main`) |
| T4 | Tela para importar Universal VTT, cenas do Foundry e tokens em lote | sim | **Feita** (PR #88, na `main`) |
| T5 | Ajuda em cada tela e uma seção de ajuda navegável sem internet | sim | **Feita** (PR #83, beta.21) |
| T6 | Lista de notas, árvore, busca e gráfico sem travar com 10 mil notas | sim | **Feita** (PR #89; números na ADR 0030). Conferir com placa de vídeo e no Android |
| T7 | Defeitos de tela achados na R1 | sim | **Feita em parte** (PR #89): 10 de 12 corrigidos. **Falta** D11 (telas de documento sem `h1`), D13 (link de origem da tarefa com 18 px) e o que a R1 no Android achar |
| T8 | Preparar a 1.0: conferências revisadas com o dono, notas e tag `v1.0.0` | sim | **Aberta**: depende de todo o resto |
| T9 | Elenco da campanha para mais de 100 NPCs, com “já apareceu” marcado à mão (pedido do dono, 29/10) | sim | **Feita** (PR #89) |

O núcleo de T1 a T4 já existe: `platform.backupSchedule`/`setBackupSchedule`, `listSyncConflicts`/
`archiveSyncConflict` e o evento `conflict` do watcher (ADR 0031), `platform.systemShortcut` (ADR 0029) e
`app/src/vtt/shared/importers.ts` (ADR 0028).

## Dono

| # | Tarefa | Situação em 30/10 |
|---|---|---|
| V1 | Atualizar pelo botão “Verificar atualizações” (computador e celular) e testar | **Feita** (o dono testou há tempo e está funcionando) |
| V2 | Conferências manuais (fim de [`docs/04-testes-pendentes.md`](../04-testes-pendentes.md)) | **Feita** até as funções já publicadas; **faltam** as seções novas do fim do arquivo (PR #89) |
| V3 | Abrir o cofre no Obsidian com o plugin Tasks 8.6.0 e comparar consultas e comandos | **Feita** |
| V4 | Uma sessão real da campanha usando o app (Tela do Mestre, sala, Agenda) | **Feita** |
| V5 | Responder as decisões D1 a D4 | **Feita** (29/10) |

## Decisões do dono

Cada uma muda o que entra na 1.0. A recomendação é do Claude Code; nada começa sem a resposta.

| # | Pergunta | Recomendação | Alternativa |
|---|---|---|---|
| D1 | A sala do celular pela internet entra na 1.0? | Depois da 1.0: o APK continua leve; pela internet, hospedar no desktop | Entra: o Codex embute o `cloudflared` (cerca de 20 MB) e mede a bateria (R4) |
| D2 | Comandar pelo navegador a sala hospedada no celular? (com a sala no computador isso já existe) | Depois da 1.0: hospedando no computador, o mestre já comanda pelo navegador de qualquer aparelho | Antes da 1.0 (R5) |
| D3 | Captura rápida no GNOME com Wayland | Aceitar o atalho do sistema criado por um botão do app (T3) | Esperar o portal de atalhos globais do GNOME, sem data |
| D4 | Qual versão vira 1.0.0 | A que sair depois da sessão real (V4) e da revisão com Android (R1, R2) | A que sair quando T1 a T6 ficarem prontas |

**Respostas do dono (29/10/2026):**

- **D1:** a sala do celular pela internet “deveria funcionar, mas ainda não funciona”: **entra na 1.0**. A R4 passa a
  ser obrigatória para o Codex, a partir do estudo da [ADR 0032](../adr/0032-tunel-publico-android.md).
- **D2:** respondida na prática com a R5 (beta.17).
- **D3:** o dono não usa a captura rápida. Fica a recomendação: o botão que cria o atalho do sistema (T3).
- **D4:** a 1.0.0 sai **quando todas as tarefas desta lista estiverem concluídas com êxito** (Codex, Claude Code e as
  conferências do dono).

## Feito fora da lista (pedidos do dono, 28 a 30/10)

- **Geradores da Wiki:** 84 → 1.710 (beta.21) → 9.692 → **19.412 opções**; gerador de nomes com **43 culturas** (pelo
  menos 100 nomes e 100 sobrenomes, quando há sobrenome); tela de Ferramentas refeita (grupos, tabelas da própria wiki,
  1/5/10 resultados, recentes).
- **Campanhas:** [revisão](../propostas/campanhas-revisao.html) das seis telas e as correções (data da sessão leva o
  evento da Agenda, nota da sessão validada, mover missões pelo teclado, cortes “+N” no painel, confirmações, tesouro
  editável, diários na aba Sessões); **mapa de missões** (`parte_de` e `requer`, vistas Mapa e Árvore, “Gerar no
  Quadro”); **Nova aventura** com cinco estruturas; criar NPC, lugar ou facção a partir do link na sessão.

## Sobras da revisão das Campanhas

Itens da [revisão](../propostas/campanhas-revisao.html) que ainda não foram feitos (nenhum impede a 1.0, mas valem uma
rodada antes da candidata):

- “Hoje no mundo” só leitura: avançar a data do mundo pelo painel ou ao marcar a sessão como realizada.
- Retorno “Gravado” nos campos que gravam ao sair, e gravar ao fechar o painel da sessão no celular.
- Desfazer em vez de pedir confirmação ao apagar relógio, item do tesouro, NPC ou personagem.
- Reescrever `CampaignTools.tsx` e `CampaignRoomTools.tsx` no padrão do resto do módulo (hoje em linhas únicas).
- Quadro: renomear e apagar pela barra e outros modelos além do mapa de missões (relações, linha do tempo).
- Mapa de missões: ligar missões arrastando de um cartão a outro (hoje é pelo diálogo ou pela nota).
- Ideias da revisão ainda não feitas: pistas que destravam missões, relógio por missão, NPC improvisado na Tela do
  Mestre, “o que mudou desde a última sessão”, fios soltos, recompensa direto para o Tesouro, mapa de relações do
  Elenco e mapa de missões na sala dos jogadores.

## Conferências manuais que faltam

As antigas foram feitas pelo dono (V1 a V4). Faltam as seções acrescentadas no fim de
[`docs/04-testes-pendentes.md`](../04-testes-pendentes.md) para o que está no PR #89: geradores e culturas, T6 (10 mil
notas), R1/T7 (abas, pastas, gráfico, calendário, alvos no celular), Campanhas (sessões, missões, painel,
ferramentas, Elenco, mapa de missões, Nova aventura, criar a partir do link) e, da R1, o que só um aparelho real
confere: teclado e diálogos, Orca/NVDA/TalkBack, texto a 140 %, Android físico, sala com dois aparelhos e impressão.

## Depois da 1.0

- Migrar do Notion, Kanka e World Anvil (o plano deixa para depois; a migração do Obsidian e dos plugins de RPG já
  existe, C4).
- Fora do plano: voz, vídeo e sincronização pela rede local (decisão do dono, 14/10).
