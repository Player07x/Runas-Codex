# ADR 0031 — C7: backups agendados e conflitos de sincronização

- Estado: implementada; telas entregues nas tarefas T1 e T2 (29/10/2026).
- Data: 2026-10-22.

## Decisão

O `VaultService` mantém uma agenda fora do cofre, em `userData/config.json`. O padrão é um backup por dia às `03:00`,
com os 15 ZIPs mais recentes; o contrato `BackupSchedule` valida horário local e limita a retenção a 1–100 arquivos.
Ao abrir ou trocar de cofre, o processo principal arma o próximo disparo; o timer é cancelado ao parar o serviço e um
erro de backup não interrompe a sessão. O backup manual e o backup antes da primeira gravação do dia usam a mesma
retenção configurada.

O observador reconhece cópias com os marcadores do Syncthing (`.sync-conflict-YYYYMMDD-HHMMSS-dispositivo`) e do
Obsidian Sync (`.sync-conflict-…` e `(conflicted copy)`). Elas chegam à ponte como `VaultChange` do tipo `conflict`,
com o caminho original inferido, e permanecem intactas para não perder dados. O processo principal também oferece
listagem e arquivamento individual na lixeira `.trash`; arquivar faz um backup antes e nunca substitui o original.

## Limites

A interface de Configurações ainda precisa editar `BackupSchedule` e mostrar o aviso com ações. A resolução de conteúdo
(mesclar duas versões) continua sendo uma decisão do usuário; o núcleo só detecta, preserva e permite arquivar a cópia.

**Telas (29/10/2026, Claude Code, T1 e T2).** Configurações › Backups edita a agenda (ligar, horário, quantos guardar)
e mostra o próximo backup e os cinco últimos; no celular, sem agenda, explica o backup do primeiro salvamento do dia.
As cópias de conflito são achadas no índice (vale em todas as plataformas): um aviso no topo do app leva a
Configurações › Conflitos de sincronização, com cada cópia ao lado do original, a data e o aparelho do nome do
Syncthing, a comparação linha a linha (`core/line-diff.ts`) e duas saídas: manter o original e arquivar a cópia
(`archiveSyncConflict`, ou a lixeira do cofre fora do desktop) ou ficar com a cópia (backup, `useVault().save` no
original, que guarda o texto anterior no histórico de versões, e arquivar). “Depois” guarda as cópias já vistas no
`localStorage` (`runas-codex:conflitos-dispensados`).
