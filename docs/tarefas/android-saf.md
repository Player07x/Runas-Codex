# Tarefa: SAF como reserva do cofre no Android — para o Codex

**Pedido do dono (18/10/2026).** Leia antes o [`AGENTS.md`](../../AGENTS.md), a [ADR 0015](../adr/0015-android.md)
(seção 1) e a [tarefa do CI da C8](c8-ci-android.md). **Faça esta tarefa depois que o CI do PR #41 estiver verde.**

## Objetivo

Hoje o cofre do Android só abre com o "acesso a todos os arquivos" (`MANAGE_EXTERNAL_STORAGE`). Esta tarefa cria a
reserva pelo Storage Access Framework, para quando o usuário recusar esse acesso (e para uma futura ida ao Google Play).

## O que fazer

- Branch `android/a2-saf`, a partir do `android/a1-cofre` (ou da `main`, se o #41 já tiver sido mesclado). O branch
  local com esse nome está vazio e pode ser reaproveitado.
- Extrair uma interface (ex.: `VaultFs`) com as operações que o `RunasVaultPlugin` usa e criar a implementação SAF:
  - `DocumentsContract`/`ContentResolver`, **em lote** (uma consulta por pasta ao listar);
  - as **mesmas regras** do `VaultStore`: versão esperada (tamanho e data), `null` só cria, conteúdo igual não
    regrava, nada oculto (menos o snippet), nada fora da árvore, lixeira `.trash` e backup zip.
- No `RunasVaultPlugin`: se o acesso a todos os arquivos for recusado, oferecer a abertura pelo SAF.
  - Guardar a permissão da árvore com `takePersistableUriPermission`.
  - Lembrar qual modo cada cofre usa.
- Anexos na interface pelo `_capacitor_content_` do Capacitor. As mudanças de fora são vistas pela releitura ao voltar
  para o app (o SAF não tem `FileObserver`).
- No job `android-vault` do `release.yml` (só acrescentando), rodar o smoke também no modo SAF e medir a abertura do
  cofre de 5 mil notas pelo SAF, para comparar com o acesso direto.

## Pronto quando

- O smoke do emulador (`mobile/tests/vault-smoke.cdp.mjs`) passa nos dois modos.
- A ADR 0015 diz que a reserva existe e qual é o custo medido.
- `npm run typecheck`, `npm test` e `npm run build` passam.
- O PR está em português, com o que ficou sem verificar.


## Conclusão

Implementada em `android/a2-saf`, PR #42, integrada na main pelo PR #43 e publicada na beta.13, depois do CI da C8.
O smoke e o spike das 5 mil notas passaram nos dois modos; permissões persistentes e reinício do processo foram
conferidos no emulador. Custos e limites estão na ADR 0015. O PR #45 ampliou a escolha para provedores de outros
aplicativos, inclusive com acesso amplo já liberado, preservando as garantias da escrita segura.
