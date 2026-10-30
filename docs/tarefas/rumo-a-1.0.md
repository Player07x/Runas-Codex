# Tarefas do Runas-Codex: o que falta para a versão 1.0 (revisado em 30/10/2026)

**Para:** Codex, Claude Code e o dono. **Leia antes:** [`AGENTS.md`](../../AGENTS.md) (inclusive a regra 10, de UX e
acessibilidade), a [regra de lançamentos](../adr/0025-lancamentos.md) e o [guia de UX/UI](../ux-ui-acessibilidade.md).

Este arquivo substitui [`abertas-e-responsaveis.md`](abertas-e-responsaveis.md) (de 22/10). Criado em 25/10 sobre a
beta.16; **revisado em 30/10** sobre a `main` depois da beta.21 e dos PRs #85 a #89 (T1 a T4; geradores, T6, R1 sem
Android, T7, Campanhas e T9), publicados na beta.22. A visão geral, com o que foi feito por data, o que falhou e o
que mudou, está em [`panorama.html`](panorama.html).

## Resumo: feito e falta

| Frente | Feito | Falta |
|---|---|---|
| Claude Code | T1, T2, T3, T4 (PRs #85–#88), T5 (#83), T6, T7, T9 (PR #89); E1; R1 no emulador, R2, R3 e R4 (pedido do dono em 30/10, branch `main-yjcku0`) | T8 |
| Codex | R5 (#68, #70) | — (R1 a R4 feitas pelo Claude Code a pedido do dono) |
| Dono | V1 a V5 (testados e funcionando, informado em 30/10); D1 a D4 respondidas; PR #89 mesclado e beta.22 publicada | Conferir as funções novas do fim de `docs/04-testes-pendentes.md` |
| Fora da lista (pedidos do dono) | Revisão e correções das Campanhas, mapa de missões, Nova aventura, Elenco (T9), geradores com 19.412 opções e 43 culturas, Ferramentas da Wiki refeitas | Sobras da revisão das Campanhas (seção abaixo) |

## Situação

- **Na `main`:** as etapas 1 a 10, o Android (cofre real, SAF, sala na rede local, APK assinado), X1 a X8, C0 a C8,
  Tasks e tempo livre, o rework visual F1 a F5, os itens 1 a 8 do Codex, R5, a Ajuda (T5, #83), os geradores ×20 e
  a Wiki nova (#80–#82) e as telas T1 a T4 (#85–#88, mescladas em 30/10).
- **Na beta.22 (PR #89, mesclado em 30/10):** geradores com 19.412 opções e nomes de 43 culturas, Ferramentas da Wiki refeitas, T6 (10 mil
  notas), a revisão R1 sem Android ([`revisao-1.0.md`](revisao-1.0.md)) e as correções de tela T7, as correções da
  [revisão das Campanhas](../propostas/campanhas-revisao.html), o Elenco para mais de 100 NPCs (T9), o mapa de
  missões e o assistente “Nova aventura”.
- **R4 (30/10):** a sala hospedada no celular também vai para a internet: o `cloudflared` vem no APK
  ([ADR 0032](../adr/0032-tunel-publico-android.md)). Conferido no emulador do CI; falta o aparelho físico e a bateria.

## O caminho até a 1.0

1. **Feito:** o dono testou as betas (V1 a V4) e respondeu D1 a D4; T1 a T4 mescladas.
2. **Feito em 30/10:** PR #89 mesclado e beta.22 publicada; E1, R1 no emulador, R2, R3, R4 e o resto da T7.
3. **Candidata:** as conferências do dono no aparelho físico (TalkBack, sala pela internet, bateria) e, se ele
   quiser, as sobras da revisão das Campanhas.
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
| R1 | Revisão completa com Android, sobre o visual novo | sim | **Feita** pelo Claude Code: 49 telas no navegador (PR #89) e 47 telas no WebView do emulador em 5 passadas (30/10, job `android-revisao`). **Fica para o dono:** TalkBack/Orca/NVDA de verdade, aparelho físico, sala com dois aparelhos e impressão |
| R2 | Corrigir o que a R1 achar (a parte que não é tela) | sim | **Feita**: D16, o voltar do sistema fechava o app (`MainActivity.java`) |
| R3 | Cofre de 10 mil notas no emulador Android do CI | sim | **Feita**: números na ADR 0030 (abrir 12,6 s, busca assenta em 0,46 s, 157 MB) |
| R4 | Sala do celular pela internet (túnel no APK) | sim (D1, respondida em 29/10) | **Feita**: `cloudflared` 2026.9.3 no APK, conferido de ponta a ponta no emulador (ADR 0032). **Fica para o dono:** aparelho físico e bateria |
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
| T7 | Defeitos de tela achados na R1 | sim | **Feita**: D1–D10 (PR #89), D11, D13, D14, D15 e D17 (30/10) |
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

## E1 — Elenco em Lista ou Blocos (registrada e feita em 30/10/2026)

Registrada a pedido do dono e liberada por ele no mesmo dia; **feita**: botões Grade e Lista acima dos NPCs.

- **Elenco: NPCs em Lista ou Blocos.** Em Campanhas › Elenco, os NPCs ganham o seletor de exibição das categorias da
  Wiki (`app/src/screens/wiki/WikiCategory.tsx`: botões Grade e Lista com `aria-pressed`, escolha lembrada no
  `localStorage` com chave `runas-codex:<nome>`). Lista é a de hoje (`NpcRoster` em
  `app/src/screens/campaigns/CastView.tsx`, com filtros e grupos); Blocos mostra os NPCs em cartões, como os artigos de
  uma categoria.

## Para a próxima atualização (registrado em 30/10/2026)

### U1 — Atualização pelo app no Ubuntu falha no `dpkg`

Relato do dono ao atualizar da beta.22 para a beta.24 pelo botão “Verificar atualizações” (Linux, `.deb`):

```text
O sistema não concluiu a instalação. O aplicativo continua aberto.
debconf: incapaz de inicializar interface: Dialog
debconf: (A variável TERM não está definida, então a interface dialog não é utilizável.)
debconf: tentando com interface: Readline
debconf: incapaz de inicializar interface: Readline
debconf: (Essa interface requer um tty controlador.)
debconf: tentando com interface: Teletype
debconf: incapaz de inicializar interface: Teletype
debconf: (Essa interface requer um tty controlador.)
debconf: tentando com interface: Noninteractive
E: Sub-process /usr/bin/dpkg returned an error code (1)
```

O que já se sabe (`desktop/src/main/deb-update.ts`, ADR 0017):

- As linhas do `debconf` são só aviso: o `pkexec` roda o `apt-get` sem terminal. Não são a causa.
- **A causa ficou de fora da mensagem.** O app mostra só o fim do `stderr` do `apt-get`; o motivo do `dpkg` (por
  exemplo, `dpkg: erro ao processar o pacote runas-codex (--configure)` ou o script de pós-instalação que falhou) sai no
  `stdout`, que é descartado.
- Hipóteses, por ordem: (1) o script de pós-instalação do electron-builder falhou (no Ubuntu 24.04 ele instala um
  perfil do AppArmor e chama `apparmor_parser`; se o último comando do script falha, o `dpkg` recebe 1); (2) um pacote
  qualquer do sistema já estava meio configurado e o `apt-get` parou nele; (3) arquivo em conflito com outro pacote.

O que fazer:

1. Mostrar o fim do `stdout` **e** do `stderr` na mensagem de erro, para a próxima falha dizer a causa.
2. Rodar o `apt-get` com `DEBIAN_FRONTEND=noninteractive` (pelo `/usr/bin/env` dentro do `pkexec`) para tirar o ruído
   do `debconf`.
3. Com a causa real, corrigir o pacote: se for a pós-instalação, um `afterInstall` próprio no `electron-builder` em que
   os passos que não impedem o app de abrir (AppArmor, banco de ícones e de tipos) nunca derrubam a instalação.
4. Teste: o smoke do Linux no CI instala o `.deb` gerado por cima do da versão anterior com `apt-get install` sem
   terminal, como o app faz, e confere que o `dpkg` termina com 0.

Enquanto isso, para atualizar à mão: no terminal da pasta do arquivo, `sudo apt install ./Runas-Codex-0.1.0-beta.24-linux-amd64.deb`.
Se o `dpkg` tiver ficado pela metade, `sudo dpkg --configure -a` antes. Para ajudar a achar a causa, as últimas linhas
de `/var/log/apt/term.log` (ou `/var/log/dpkg.log`) logo depois da falha mostram o erro completo.

### U2 — Menu ⋯ cortado nos cartões do Elenco em grade

Relato do dono (30/10, com captura): em Campanhas › Elenco, na **Grade** (E1), o menu ⋯ de um NPC abre dentro do
cartão e aparece cortado (“…ir na Wiki”). Causa: `.campaign-npc-card` tem `overflow: hidden` (para arredondar a
imagem), o que corta o menu do `OverflowMenu`, que abre dentro do cartão. Corrigir em
`app/src/screens/campaigns/campaigns.css`: tirar o `overflow: hidden` do cartão e arredondar só o topo da imagem; conferir
o menu na última linha da grade e no celular (o menu precisa caber na tela e não ser cortado pelo cartão nem pela seção).

### U3 — Editar e excluir uma mesa (sala) do VTT

Relato do dono (30/10, com captura): em VTT › Criar Sala, os cartões das mesas (“Teste · 1 cena · Aberta ontem”) não têm
como renomear nem excluir. Hoje a `VttApi` (`app/src/vtt/shared/ipc.ts`) só tem `listWorlds`, `createWorld`,
`openWorld` e `closeWorld`. O que fazer:

1. `renameWorld(id, título)` e `deleteWorld(id)` na `VttApi`, no desktop (`desktop/src/main/vtt/world-store.ts` e IPC), no
   Android (`PortableWorldStore`, pela ponte do cofre) e na versão em memória. Excluir manda a pasta da mesa
   (`.runas/mesas/<id>/`) para a lixeira do cofre, como as notas, em vez de apagar de vez; recusar com a sala ligada.
2. Na tela (`app/src/screens/vtt/VttScreen.tsx`): menu ⋯ em cada cartão com “Renomear…” e “Excluir…”, confirmação ao
   excluir e retorno do foco, no padrão do kit (`OverflowMenu`, diálogos).
3. Testes do núcleo e no smoke do Electron (criar, renomear, excluir e conferir na lixeira).

### U4 — Visual da página VTT › Entrar Sala

Relato do dono (30/10, com duas capturas, painel aberto e recolhido):

- **Salas recentes:** o endereço longo do túnel (`strengthen-enzyme-explaining-acm.trycloudflare.com`) e o “há 16 dias”
  saem para fora do cartão. O botão da sala (`.list-item` em `app/src/screens/vtt/VttScreen.tsx`) cresce com o texto,
  então o `truncate` do nome não age; o botão precisa ocupar a largura do cartão (`width: 100%`, `min-width: 0`), com o
  nome cortado em reticências (endereço inteiro no `title`) e a data sem encolher.
- **Painel “Detalhes da sala”:** o cabeçalho do painel e os cartões não ficam alinhados com o cartão do link, e sobra um
  vão grande à direita; recolhido, o botão de abrir fica solto num quadrado à parte e o cartão do link não ocupa o espaço
  liberado. Causa: `.join-layout` (`app/src/screens/vtt/vtt.css`) fixa a coluna do painel em `320px`, mas o painel é
  redimensionável (na captura estava com ~400 px e transbordava) e, recolhido, deixa a coluna de 320 px vazia. Usar
  `minmax(0, 1fr) auto` (o painel no tamanho dele) e conferir o `max-width: 960px` da grade.
- **Dicas:** os ícones (Wi-Fi e link) desalinham quando o texto quebra em duas linhas; o ícone não pode encolher
  (`flex: none`) e a linha alinha pelo topo.
- Conferir em 320 px, tablet e computador, nos dois temas, com e sem salas recentes.

### U5 — Menu ⋯ da prévia ao lado (Livros) cortado na borda do painel

Relato do dono (30/10, com captura): em Livros › Escrever, na prévia ao lado, o menu ⋯ ao lado de “Seguir o texto”
(“Ir para a página do cursor”, “Mostrar só este capítulo”, “Diagramar e exportar…”) abre para a esquerda e fica cortado
na borda do painel. Causa: o `.kit-menu` do `OverflowMenu` (`app/src/components/kit/`) é posicionado em relação ao
botão, alinhado à direita (`align="end"`), e o `.book-side-panel` (`app/src/screens/books/book-side.css`) tem
`overflow: hidden`.

**Mesma causa do U2.** A correção certa é no kit, uma vez: o `OverflowMenu` abre o menu fora do fluxo do contêiner
(`position: fixed` calculado pelo botão, ou num portal no fim da página), vira para o lado e para cima quando não cabe na
janela, acompanha a rolagem e mantém o foco e o teclado de hoje. Isso resolve o U2, o U5 e qualquer outro menu ⋯ dentro de
um contêiner que corta (painéis, cartões, listas com rolagem). Conferir os menus do Elenco, da prévia, das abas das notas,
dos cartões da Wiki e das mesas do VTT, em 320 px e no computador.

**Também nas notas** (relato do dono, 30/10, com captura): o menu ⋯ da nota aberta (“Inserir modelo…”, “Renomear ou
mover…”, “Favoritar”… “Mandar para a lixeira”), na barra do documento, abre para a esquerda e é cortado pela borda do
painel central, com barra de rolagem lateral e textos quebrando (“Histórico de versões”, “Copiar link do bloco no
cursor”). Além de abrir fora do contêiner, o menu precisa de largura para o texto mais longo e o atalho, sem rolagem
lateral.

### U6 — A ordem e os filtros da categoria da Wiki voltam ao padrão ao trocar de página

Relato do dono (30/10, com captura de Personagens em “Editados por último”): ao sair da categoria e voltar, a **Ordem**
volta para “Nome (A–Z)” e os filtros escolhidos se perdem. Causa: em `app/src/screens/wiki/WikiCategory.tsx`, a ordem, os
filtros de campo e a subpasta vivem só no estado da tela (`useState`); só a Grade/Lista é lembrada
(`runas-codex:wiki-categoria-modo`). O que fazer:

- Lembrar, **por categoria**, a ordem, os filtros de campo e a subpasta no `localStorage`
  (`runas-codex:wiki-categoria:<pasta>`, regra 5 do AGENTS.md: preferência de tela não vai para o cofre). A busca de texto
  pode continuar começando vazia.
- “Limpar filtros” limpa também o que foi lembrado; um filtro cujo campo saiu da categoria é ignorado (como hoje).
- Conferir o mesmo no Elenco das campanhas (agrupamento e ordem já são lembrados; a situação e a atitude, não) e nas
  outras listas com ordem (sessões, missões), para o comportamento ser igual em todo o app.

### U7 — Missões: excluir, cartão menor e editar sem sair da campanha

Relato do dono (30/10, com capturas de Campanhas › Missões e da missão aberta nas Notas):

- **Não há como excluir uma missão** pelo quadro. Acrescentar ao cartão um menu ⋯ com “Abrir”, “Mover para…” e
  “Mandar para a lixeira” (pelo `useVault().trash`, com confirmação ou desfazer), também na Árvore e no Mapa.
- **Cada cartão ocupa muito espaço:** número da ordem, título e o seletor “Mover para” da largura do cartão
  (`campaign-kanban-move`, sempre visível desde a revisão das Campanhas). Deixar o cartão compacto: título com a ordem
  ao lado e o “Mover para” dentro do menu ⋯ (continua acessível pelo teclado, e o arrastar continua).
- **Editar leva para as Notas e perde a campanha.** O título do cartão é um link para `/notas/<missão>`
  (`app/src/screens/campaigns/QuestBoard.tsx`), e para voltar são vários cliques (Campanhas › campanha › Missões). Abrir a
  missão **dentro da campanha**, como as sessões: rota `/campanhas/<nome>/missoes/<caminho>` com o editor da nota
  (`NoteView`), “Voltar às missões” e um painel com situação, “Parte de”, “Depende de” e recompensa. Criar uma missão
  (“+ Missão” e o “+” de cada coluna) abre direto esse editor, e voltar leva ao quadro na mesma vista (Colunas, Mapa ou
  Árvore).
- Conferir em 320 px, tablet e computador, pelo teclado e no celular.

### U8 — Tirar o aviso “A única parte do app que usa a rede” da tela do VTT

Relato do dono (30/10, com captura): na tela inicial do VTT, o cartão “A única parte do app que usa a rede — Só
enquanto a sala estiver aberta…” não precisa estar ali. Retirar da tela (`app/src/screens/vtt/VttScreen.tsx`); a
explicação de privacidade continua em Configurações › Privacidade e na Ajuda do VTT. (O texto também ficou impreciso:
“Verificar atualizações” e o link público usam a internet, ADR 0017 e ADR 0032.)
