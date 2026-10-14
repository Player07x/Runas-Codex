# Tarefa: etapa A — Android completo (C7 e X7)

**Para:** Claude Code (A1, fase C7) e depois Codex (A2, fase X7). **Leia antes:** [`AGENTS.md`](../../AGENTS.md), a
[divisão](README.md), a [ADR 0003](../adr/0003-instaladores-e-android.md) (Capacitor, APK só no GitHub Actions), as
seções 3, 6 e 7 de [docs/02](../02-viabilidade-e-etapas.md) e a [ADR 0008](../adr/0008-agenda.md) (lembretes no
Android).

Marco do plano: **cofre do Obsidian aberto e editado no celular; sessão de teste com a sala no celular.** Testes
automáticos no emulador do CI. Esta etapa é a penúltima de propósito: a `Platform` já precisa estar estável.

## A1 — cofre real e testes no emulador (Claude Code, `android/a1-cofre`)

1. **Spikes que sobraram da etapa 2**, cada um com a decisão registrada numa ADR nova (`0015-android.md`): acesso ao
   cofre (permissão de "todos os arquivos" + `FileObserver`, com o Storage Access Framework como reserva), CodeMirror
   com o teclado do Android e indexar 5 mil notas num celular médio.
2. **`app/src/platform/capacitor-platform.ts`** implementando a `Platform` inteira (inclusive os binários da C0) sobre
   um plugin nativo do cofre **em lote** (`mobile/android/…/vault/**`), com a mesma gravação segura do desktop:
   gravar com a versão lida, recusar se mudou fora, não regravar o que não mudou, lixeira `.trash`, backups.
3. **Testes no emulador do CI:** um job no `release.yml` (só acrescentando) que sobe um emulador, instala o APK, abre
   uma cópia de `desktop/tests/cofre-exemplo` e roda um smoke equivalente ao `--smoke --write` do desktop.
4. **APK de release assinado:** o workflow assina com a chave guardada nos segredos do repositório. **A chave é do
   dono:** ele cria o keystore e cadastra os segredos; o PR explica o passo a passo e funciona sem eles (cai no APK
   de depuração).
5. O que ficou para o Android nas outras etapas: "Compartilhar com" (texto, imagem ou link de outro app vira nota),
   widget da Agenda, lembretes com o cofre real e o lado do celular da sincronização pela rede local (C6).

## A2 — sala hospedada pelo celular (Codex, `android/a2-sala`, depende da A1)

1. **Autoridade da sala em TS compartilhado** (docs/02, seção 6): `projectScene`, validação de movimentos e assentos
   saem de `desktop/src/main/vtt/` para `app/src/vtt/shared/`, iguais no desktop e no Android. O desktop continua
   passando no `--smoke`.
2. **Servidor da sala no Android** (`mobile/android/…/room/**`): serviço em primeiro plano, travas de Wi-Fi e de
   tela, HTTP estático, WebSocket e entrega de arquivos com Range; **só rede local** (internet pelo `cloudflared`
   fica para depois). A notificação do serviço mostra o link e o código da sala.
3. **Android como jogador:** conectar a `ws://` na rede local (liberar conteúdo misto e tráfego sem TLS só para a
   LAN).
4. **Testes:** a autoridade em TS com testes; no emulador do CI, abrir uma sala e conectar um jogador pelo navegador
   do próprio job.

## Pronto quando

- (A1) um cofre real do Obsidian abre no celular sem mudar um byte e é editado pelo app; o smoke do emulador passa no
  CI;
- (A2) sessão de teste com a sala hospedada no celular e jogadores no desktop e no navegador, pela rede local;
- os comandos de sempre e os dois `--smoke` do desktop continuam passando.

## Arquivos compartilhados nesta etapa

`mobile/capacitor.config.ts`, `mobile/android/app/src/main/AndroidManifest.xml`, `MainActivity.java` e
`.github/workflows/release.yml`: os dois só acrescentam (o Claude Code cria os arquivos na A1, e o Codex acrescenta o
serviço da sala na A2).
