# ADR 0031 — C7: backups agendados e conflitos de sincronização

- Estado: implementada no núcleo e no processo principal; a tela de Configurações e o aviso visual ficam para o rework (F5).
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
