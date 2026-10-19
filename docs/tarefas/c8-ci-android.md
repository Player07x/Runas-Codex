# Tarefa: fechar o CI da C8 (Android) — para o Codex

**Pedido do dono (18/10/2026):** o Codex assume o acompanhamento do CI do PR Player07x/Runas-Codex#41 e corrige o que falhar. Leia antes o [`AGENTS.md`](../../AGENTS.md), a [ADR 0015](../adr/0015-android.md) e a [tarefa da etapa A](android-a.md).

## Onde está

- Branch `android/a1-cofre` (PR #41). Trabalhe nele com commits normais (**sem `--force`**) e não mescle.
- O cofre nativo está em `mobile/android/app/src/main/java/dev/runas/codex/vault/` (`VaultStore`, `VaultWatcher`, `RunasVaultPlugin`) e o widget em `.../widget/AgendaWidget.java`. A interface está em `app/src/platform/capacitor-platform.ts` e `AndroidRuntime.tsx`.
- No CI, o job `android-vault` do `.github/workflows/release.yml` faz três coisas:
  - roda `./gradlew testDebugUnitTest assembleDebug`;
  - sobe o emulador Android 35 e roda `mobile/tests/vault-smoke.cdp.mjs`;
  - roda o spike das 5 mil notas (`mobile/tests/vault-index.cdp.mjs`).
- Situação na última verificação:
  - **o Java compila e o `VaultStoreTest` passa**;
  - o smoke tinha falhado porque o `/sdcard` ainda não estava montado (corrigido no commit `acdfccf`);
  - os passos seguintes nunca rodaram.

## O que fazer

1. Acompanhar o `android-vault` até ficar verde. Para depurar, use `gh run view <id> --log-failed` e o artefato `Runas-Codex-android-cofre`, que traz `vault-smoke.json`, `vault-index.json`, `logcat.txt`, `emulator.log` e os relatórios JUnit.
2. Corrigir as falhas no Java, nos scripts `mobile/tests/*.cdp.mjs` ou nos passos do job. **Não afrouxe as garantias da gravação segura para o teste passar.** Elas são as do `desktop/src/main/vault.ts`:
   - versão esperada;
   - `null` só cria;
   - nada oculto;
   - nada fora do cofre;
   - temporário + troca;
   - lixeira `.trash`.
3. Pontos que ninguém executou ainda (os prováveis lugares de falha):
   - os avisos do `FileObserver` no armazenamento FUSE do emulador (cheque "observa mudanças de fora");
   - o `Capacitor.convertFileSrc` com caminhos de `/sdcard` ("anexo carrega na interface");
   - o `adb shell input text` no CodeMirror (spike do teclado);
   - o tempo do laço que gera 5 mil notas;
   - o `appops ... MANAGE_EXTERNAL_STORAGE allow`;
   - o encaminhamento do devtools depois do `am force-stop`.
4. Com o CI verde:
   - escrever os números do spike (`indexMs`, `heapMb`, `keyboardMs`) na ADR 0015, seção 5, e na descrição do PR #41;
   - atualizar a seção "O que ficou sem verificar" do PR.

## Cuidados

- Outra sessão (Claude Code) está fazendo a **reserva pelo SAF** num branch próprio, a partir deste. Mexa em `VaultStore` e `RunasVaultPlugin` só o necessário para o CI passar, para não gerar conflito.
- No `release.yml` (arquivo compartilhado), mexa só no job `android-vault` e no passo do APK assinado do job `android`.
- PR em português: o que mudou, como verificou e o que ficou sem verificar.


## Conclusão

CI fechado e PR #41 mesclado por autorização posterior do dono. Os resultados do teclado e das 5 mil notas
(`indexMs: 8415`, `heapMb: 18`, `keyboardMs: 6509`) estão na ADR 0015 e no PR, com a execução 39170127880.
A sequência SAF também foi concluída e entrou na beta.13. O dono informou a conferência manual anterior como
aprovada; novas mudanças têm suas próprias conferências em docs/04.
