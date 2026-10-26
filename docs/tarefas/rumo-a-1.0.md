# Tarefas do Runas-Codex: o que falta para a versão 1.0 (25/10/2026)

**Para:** Codex, Claude Code e o dono. **Leia antes:** [`AGENTS.md`](../../AGENTS.md) (inclusive a regra 10, de UX e
acessibilidade), a [regra de lançamentos](../adr/0025-lancamentos.md) e o [guia de UX/UI](../ux-ui-acessibilidade.md).

Este arquivo substitui [`abertas-e-responsaveis.md`](abertas-e-responsaveis.md) (de 22/10), que ainda lista como
abertas fases já mescladas. Ele segue o código da `main` em 25/10 (`1fa53f9`, versão 0.1.0-beta.16).

## Situação

- **Na `main` e na beta.16:** as etapas 1 a 10 do plano, o Android (cofre real, SAF, sala na rede local, APK
  assinado), X1 a X8, C0 a C8, Tasks e tempo livre, o rework visual F1 a F5 (#54 a #65) e os itens 1 a 8 do Codex
  (#58 e #62). Nenhum PR aberto.
- **Por dentro, sem tela ainda** (feito no #58): backups agendados, aviso de cópias de conflito do Syncthing e do
  Obsidian Sync, atalho do sistema para a captura rápida no Wayland, importadores de Universal VTT, Foundry e tokens em
  lote.
- **Limitado:** a sala hospedada no celular funciona só na rede local; pela internet, só hospedando no desktop
  ([ADR 0032](../adr/0032-tunel-publico-android.md)).

## O caminho até a 1.0

1. **Agora:** o dono testa a beta.16 e responde as conferências.
2. **Beta.17 e seguintes:** as telas que faltam (Claude Code) e a revisão completa com Android (Codex), em paralelo.
3. **Candidata:** correções da revisão e uma sessão real da mesa do dono usando o app (marco da etapa 11).
4. **1.0.0:** lista de conferências fechada com o dono, notas da versão e tag `v1.0.0`. O Android atualiza por cima das
   betas sem reinstalar (`1.0.0` gera um `versionCode` maior que o de qualquer `0.1.0-beta.N`).

## Quem mexe em quê

O rework terminou, mas a divisão continua: **telas, componentes e estilos são do Claude Code**
(`app/src/screens/**`, `app/src/components/**`, `app/src/styles/**` e o CSS dos módulos). O Codex trabalha no núcleo
(`app/src/core/**`), na `Platform`, no processo principal do Electron, no Android nativo, nos testes e no CI. Se uma
correção do Codex precisar de tela, ele descreve o que falta (arquivo, passos, resultado esperado) e o Claude Code faz.
Um branch e um PR por tarefa, a partir da `main` atualizada.

## Codex

| # | Tarefa | Obrigatória? | Depende de |
|---|---|---|---|
| R1 | Revisão completa com Android, sobre o visual novo | sim | pode começar |
| R2 | Corrigir o que a R1 achar (a parte que não é tela) | sim | R1 |
| R3 | Cofre de 10 mil notas no emulador Android do CI | sim | pode começar |
| R4 | Sala do celular pela internet (túnel no APK) | só se o dono decidir (D1) | decisão D1 |
| R5 | Mestre pelo navegador, sem o app | só se o dono pedir (D2) | decisão D2 |

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

### R4 e R5 — opcionais

Não começar sem a resposta do dono (decisões D1 e D2 abaixo). O estudo do túnel está na
[ADR 0032](../adr/0032-tunel-publico-android.md).

## Claude Code

| # | Tarefa | Obrigatória? | Depende de |
|---|---|---|---|
| T1 | Tela de backups agendados (horário e quantos guardar) em Configurações › Backups | sim | pode começar |
| T2 | Aviso de cópias de conflito do Syncthing e do Obsidian Sync, com o original e “Arquivar” | sim | pode começar |
| T3 | Botão para criar e remover o atalho da captura rápida (GNOME e KDE) | sim | decisão D3 |
| T4 | Tela para importar Universal VTT, cenas do Foundry e tokens em lote | sim | pode começar |
| T5 | Ajuda em cada tela e uma seção de ajuda navegável sem internet | sim | pode começar |
| T6 | Lista de notas, árvore, busca e gráfico sem travar com 10 mil notas | sim | pode começar; usa a R3 |
| T7 | Defeitos de tela achados na R1 | sim | R1 |
| T8 | Preparar a 1.0: conferências revisadas com o dono, notas e tag `v1.0.0` | sim | todo o resto e D4 |

O núcleo de T1 a T4 já existe: `platform.backupSchedule`/`setBackupSchedule`, `listSyncConflicts`/
`archiveSyncConflict` e o evento `conflict` do watcher (ADR 0031), `platform.systemShortcut` (ADR 0029) e
`app/src/vtt/shared/importers.ts` (ADR 0028).

## Dono

| # | Tarefa | Depende de |
|---|---|---|
| V1 | Atualizar para a beta.16 pelo botão “Verificar atualizações” (computador e celular) e testar | agora |
| V2 | Conferências manuais (fim de [`docs/04-testes-pendentes.md`](../04-testes-pendentes.md)) | beta.16 |
| V3 | Abrir o cofre no Obsidian com o plugin Tasks 8.6.0 e comparar consultas e comandos | beta.16 |
| V4 | Uma sessão real da campanha usando o app (Tela do Mestre, sala, Agenda) | T1, T2, T4 |
| V5 | Responder as decisões D1 a D4 | quando puder |

## Decisões do dono

Cada uma muda o que entra na 1.0. A recomendação é do Claude Code; nada começa sem a resposta.

| # | Pergunta | Recomendação | Alternativa |
|---|---|---|---|
| D1 | A sala do celular pela internet entra na 1.0? | Depois da 1.0: o APK continua leve; pela internet, hospedar no desktop | Entra: o Codex embute o `cloudflared` (cerca de 20 MB) e mede a bateria (R4) |
| D2 | Mestre pelo navegador, sem o app? | Depois da 1.0: o mestre pelo celular já cobre a mesa presencial | Antes da 1.0 (R5) |
| D3 | Captura rápida no GNOME com Wayland | Aceitar o atalho do sistema criado por um botão do app (T3) | Esperar o portal de atalhos globais do GNOME, sem data |
| D4 | Qual versão vira 1.0.0 | A que sair depois da sessão real (V4) e da revisão com Android (R1, R2) | A que sair quando T1 a T6 ficarem prontas |

## Conferências manuais que faltam

A lista detalhada está no fim de [`docs/04-testes-pendentes.md`](../04-testes-pendentes.md) (335 caixas, nenhuma
marcada; o que foi até a beta.13 e o Android logo depois já foi aprovado pelo dono em conversa). Em grupos:

1. Atualizar para a beta.16 sem perder cofre, PIN e preferências.
2. Rework F1 a F5: todas as telas no desktop e no celular, temas escuro e claro, Acessibilidade.
3. Tasks no Obsidian com o plugin 8.6.0.
4. X4 e X7 restauradas: exportar de cada módulo, site em ZIP, sala do celular na rede local.
5. Itens do Codex: Homebrewery, Foundry e Universal VTT (quando houver tela), `runas-codex --captura` no Wayland.
6. Snippet `runas-codex.css` reinstalado no Obsidian, com a cor de uma campanha personalizada.

## Depois da 1.0

- Migrar do Notion, Kanka e World Anvil (o plano deixa para depois; a migração do Obsidian e dos plugins de RPG já
  existe, C4).
- A sala do celular pela internet e o mestre pelo navegador, se o dono deixar para depois (D1 e D2).
- Fora do plano: voz, vídeo e sincronização pela rede local (decisão do dono, 14/10).
