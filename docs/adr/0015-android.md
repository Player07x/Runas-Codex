# ADR 0015 — Android: cofre real, emulador no CI e APK assinado (etapa A1)

Data: 18/10/2026. Pedido: [docs/tarefas/android-a.md](../tarefas/android-a.md) (A1, fase C8). A sala hospedada pelo
celular (A2, X7) acrescenta uma seção aqui.

## Contexto

Até a beta.12, o APK abria o cofre de exemplo em memória: a `Platform` do Android não existia. A etapa 2 deixou três
spikes para depois: como abrir o cofre do Obsidian no Android, o CodeMirror com o teclado do Android e indexar 5 mil
notas num celular médio.

## Decisões

### 1. Acesso ao cofre: "todos os arquivos", direto no disco

- O app pede o **acesso a todos os arquivos** (`MANAGE_EXTERNAL_STORAGE`, Android 11+; `READ/WRITE_EXTERNAL_STORAGE` até o
  Android 10, com `requestLegacyExternalStorage` no 10). É o que o Obsidian faz no Android, e o cofre fica numa pasta
  comum (ex.: `Documents/Obsidian/Meu cofre`), que o Obsidian, o Syncthing e o gerenciador de arquivos também veem.
- A pasta é escolhida pelo **seletor do sistema** (`ACTION_OPEN_DOCUMENT_TREE`), e o app a converte no caminho do disco
  (`primary:Documents/Cofre` → `/storage/emulated/0/Documents/Cofre`; cartão: `/storage/XXXX-XXXX/…`). Atalhos que não
  são pastas do disco (Downloads, Drive) são recusados com uma explicação.
- **Por que não o Storage Access Framework (SAF) como caminho principal:** cada arquivo é uma consulta ao provedor de
  documentos. Listar e ler 5 mil notas leva vários segundos a minutos, e renomear e mover pastas é limitado. Com o
  acesso a arquivos, o plugin lê em lote, como o desktop.
- **Reserva pelo SAF:** implementada no branch dependente `android/a2-saf`. Ao recusar o acesso a todos os arquivos,
  o app oferece escolher uma pasta pelo seletor, com `takePersistableUriPermission`. Lembra o modo de cada pasta e
  reabre a árvore após encerrar o processo. Na beta.13 a reserva aceitava apenas o provedor local da memória interna
  e do cartão. O pedido posterior do dono amplia a escolha para pastas disponibilizadas por outros gerenciadores.
- **Mudanças de fora** (Obsidian, Syncthing): um `FileObserver` por pasta dispara uma releitura (com pausa de 400 ms), e
  a releitura compara com a última fotografia (tamanho e data). Ao voltar para o app, ele também relê, porque o Android
  pode pausar os avisos. O que o próprio app gravou não volta como mudança.
  No SAF não há `FileObserver`: ao voltar para o app, a releitura em lote compara tamanho e data e atualiza o índice.

#### Regras da reserva SAF

`VaultFs` mantém a ponte independente do modo. `DocumentVaultStore` aplica as regras sobre `SafDocuments`
(`DocumentsContract`/`ContentResolver`): uma consulta por pasta ao listar e o cache de IDs para ler os textos em lote,
sem consultar os metadados de cada uma das 5 mil notas novamente. IDs e URIs vêm do provedor; nunca se monta um
caminho de arquivo a partir deles. Anexos usam `convertFileSrc(contentUri)` e `_capacitor_content_`, na origem local.

- Versão esperada por tamanho e data, `null` só cria, conteúdo igual não regrava, nada fora da árvore e nada gravado em
  ocultos (salvo o snippet e as operações internas de inicialização/lixeira).
- A escrita fecha e sincroniza o temporário, confere novamente a versão, guarda o original e publica o temporário
  por renomeação. Falha na publicação restaura o original; nunca se abre o original com truncamento.
- O SAF **não oferece uma transação de substituição atômica entre documentos**. Há um intervalo entre as duas
  renomeações. `VaultJournal`, fora do cofre e sincronizado antes da troca, permite recuperar interrupções ao reabrir:
  restaura o original quando o destino sumiu; se o destino já existe, preserva a versão anterior na `.trash`.
  As garantias do acesso direto não foram alteradas. Provedor sem metadados ou operações necessárias recusa a escrita.
- Lixeira `.trash` com nomes livres, restauração sem substituir e backup ZIP fora do cofre, antes de liberar a
  gravação e no primeiro uso do dia. A permissão de árvore e as preferências não entram no cofre.

O CI usa o seletor real com acesso a todos os arquivos negado, reinicia o processo e executa o mesmo smoke em ambos
os modos. Os relatórios SAF ficam em `saf/` no artefato `Runas-Codex-android-cofre`, incluindo a medição das 5 mil
notas.

**Comparação medida** (Android 35 x86_64 no CI, 18/10/2026,
[execução 39173777825](https://github.com/Player07x/Runas-Codex/actions/runs/39173777825), commit `dfb1ff1`):

| Modo | Abrir e indexar 5 mil notas | Memória JS | Checks do smoke |
|---|---|---|---|
| Acesso direto | 8,6 s (`indexMs: 8593`) | 20 MB | 23 aprovados |
| SAF (reserva) | 42,7 s (`indexMs: 42738`) | 21 MB | 25 aprovados |

O SAF fica cerca de **5 vezes mais lento** para abrir um cofre grande (uma consulta ao provedor por pasta e a leitura
de cada documento pelo `ContentResolver`). Por isso ele continua sendo a reserva, não o caminho principal.

### 2. Plugin nativo do cofre, com a gravação segura do desktop

`mobile/android/app/src/main/java/dev/runas/codex/vault/`:

- `VaultStore` (Java puro, testado na JVM) tem as **mesmas regras** de `desktop/src/main/vault.ts`:
  - nada fora do cofre (caminho absoluto, `..`, link simbólico);
  - nada gravado em pastas com ponto, menos o snippet;
  - grava com a versão lida (tamanho e data) e recusa se o arquivo mudou; `null` só cria;
  - conteúdo igual não é regravado;
  - grava num temporário com `fsync` e troca de uma vez;
  - a lixeira é a `.trash` do Obsidian;
  - backup zip das notas antes de liberar a gravação e no primeiro uso de cada dia.
- `RunasVaultPlugin` é a ponte para a interface, **em lote**: listar o cofre de uma vez, ler até 400 textos por
  mensagem e binários em base64 (até 50 MB). Também cuida da permissão, do seletor de pasta, de abrir anexo no app
  padrão, de salvar exportações onde o usuário escolher (`ACTION_CREATE_DOCUMENT`), do "Compartilhar com" e do widget.
- `app/src/platform/capacitor-platform.ts` implementa a `Platform` inteira sobre o plugin. Os anexos aparecem na
  interface pelo servidor local do Capacitor (`convertFileSrc`), na própria origem do app: a CSP não muda.
- Um cofre que já existia abre **em somente leitura** até o usuário liberar a gravação, como no desktop. Um cofre criado
  pelo app já nasce gravável.

### 3. O que mais o Android ganhou

- **"Compartilhar com":** texto, link ou imagem de outro app vira uma nota em `Notas/Caixa de entrada/`, com as imagens
  na pasta de anexos do Obsidian. O que chega antes de o cofre abrir espera na fila.
- **Widget da Agenda:** os próximos quatro eventos. A interface manda a lista depois de cada mudança e a cada hora;
  tocar abre a Agenda.
- **Lembretes com o cofre real:** o mesmo `ReminderSync` de sempre, agora com os eventos do cofre do disco.

### 4. Testes no emulador do CI

Job `android-vault` do `release.yml`. Roda nos PRs de branches `android/*` (ou com o Android ligado em
`release-targets.json`) e na execução manual.

- `./gradlew testDebugUnitTest`: as garantias do `VaultStore` na JVM (`VaultStoreTest`).
- O emulador (Android 35) recebe uma cópia de `desktop/tests/cofre-exemplo`. O APK **de depuração** abre o cofre pelo
  extra `runasVault`, que só funciona em APK depurável, sem o seletor.
- `mobile/tests/vault-smoke.cdp.mjs` faz o equivalente ao `--smoke --write` do desktop para o cofre:
  - a lista e o texto iguais aos do disco;
  - criar, gravar com versão e recusar conflito sem perder o texto de fora;
  - recusar pasta oculta e caminho fora do cofre;
  - anexo ida e volta, sem temporários;
  - renomear, lixeira e volta, backup e snippet;
  - mudança feita pelo `adb` chega à interface;
  - a nota de fora aparece no app, e o anexo carrega na interface.

### 5. Spikes da etapa 2

- **Teclado do Android no CodeMirror:** o smoke foca o editor, digita pelo teclado do sistema (`adb shell input text`)
  e confere que o texto entra e é gravado no arquivo. As teclas são enviadas uma a uma, aguardando o CodeMirror processar cada uma; `keyboardMs` inclui essa cadência e o custo do `adb`. O `input text` manda teclas, não a composição de um teclado como
  o Gboard (sugestões, acentos por composição). Isso fica para o teste em celular físico (docs/04).
- **5 mil notas:** o job gera um cofre de 5 mil notas (links, etiquetas e uma tarefa em cada) e mede do `am start` até
  as Configurações mostrarem "5000 notas Markdown no índice" (`vault-index.json` no artefato
  `Runas-Codex-android-cofre`). **Resultado no emulador do CI:** `indexMs: 8415`, `heapMb: 18`,
  `keyboardMs: 6509`, com os 22 checks do smoke aprovados. Medição de 18/10/2026 no Android 35 x86_64,
  [execução 39170127880](https://github.com/Player07x/Runas-Codex/actions/runs/39170127880), commit `861e251`.
  O emulador x86_64 com aceleração
  não é um "celular médio": o número serve de referência, e a medida num aparelho físico fica em docs/04.

O fechamento do CI também corrigiu a espera pela montagem e escrita do armazenamento FUSE, a serialização de
condições do CDP e o spike do teclado: ele usa uma nota nova recebida pelo observador, com a versão atual no índice.
Restaurar uma nota diretamente pelo plugin e depois editá-la com a versão antiga da interface deve continuar sendo
recusado. As garantias do `VaultStore` não foram alteradas para esses ajustes.

### 6. APK de release assinado

O job `android` gera, além do APK de depuração, o **APK de release assinado** quando os segredos existem; sem eles,
continua só o de depuração. A chave é do dono.

1. Gere a chave uma vez, num computador seu (precisa do JDK), e guarde o arquivo e as senhas num lugar seguro. Perder a
   chave impede atualizar o app instalado:

   ```bash
   keytool -genkeypair -v -keystore runas-codex.jks -alias runas-codex -keyalg RSA -keysize 4096 -validity 36500
   ```

2. Em GitHub › Settings › Secrets and variables › Actions, crie:
   - `ANDROID_KEYSTORE_BASE64`: a saída de `base64 -w0 runas-codex.jks`;
   - `ANDROID_KEYSTORE_PASSWORD`: a senha do arquivo;
   - `ANDROID_KEY_ALIAS`: `runas-codex` (ou o alias usado);
   - `ANDROID_KEY_PASSWORD`: a senha da chave (no `keytool` acima, a mesma do arquivo, se você não deu outra).
3. Na próxima tag (com o Android ligado em `.github/release-targets.json`), a Release ganha
   `Runas-Codex-<versão>-android.apk`, conferido com `apksigner verify`.

O APK assinado instala por cima de outro APK assinado com a mesma chave. Ele **não** instala por cima do de depuração:
é preciso desinstalar o de depuração uma vez (os cofres ficam nas pastas, nada se perde).

## Consequências

- O Android passa a abrir o cofre do Obsidian sem cópia e sem mudar nada que o app não grave.
- A partir da beta.13, `release-targets.json` tem `"android": true`, conforme o pedido posterior do dono para
  publicar Android, Windows e Linux. Os jobs do APK e dos emuladores foram aprovados no PR #43.
- Pendente: teclado real (Gboard) e um aparelho físico; a sala hospedada pelo celular (A2).

## Pastas disponibilizadas por outros aplicativos

Após aprovar os testes da beta.13, o dono pediu que “Abrir pasta” pudesse usar outros gerenciadores de arquivos,
inclusive para pastas sincronizadas com o notebook. O nome do gerenciador não faz parte do contrato: qualquer
`DocumentsProvider` que disponibilize uma árvore pelo seletor do Android pode ser escolhido.

- O seletor deixa de pedir `EXTRA_LOCAL_ONLY`. A árvore de outro provedor segue pelo SAF, mesmo com “acesso a todos
  os arquivos” já liberado; essa permissão não transforma URIs de outros aplicativos em caminhos do disco.
- A permissão persistente, o modo de cada cofre e a recuperação das transações continuam iguais. Provedores sem
  metadados confiáveis ou sem as operações necessárias recusam a escrita antes de substituir o original.
- A sincronização e eventual acesso de rede são feitos pelo gerenciador escolhido explicitamente pelo usuário.
  Essa é a exceção pedida pelo dono à restrição inicial de provedores locais; o Runas não implementa um cliente SMB,
  não guarda suas credenciais e não adiciona domínios à CSP. Disponibilidade offline depende da cópia mantida pelo
  gerenciador. O app não agenda consultas de rede ou sincronização por conta própria.
- O CI instala um segundo aplicativo, com outro UID e outra autoridade, cuja raiz não tem `FLAG_LOCAL_ONLY`.
  O teste usa o seletor real, sem forçar o modo SAF e com acesso amplo já liberado, reinicia o Runas e executa o mesmo
  smoke. O módulo `test-documents-provider` só é incluído com `-PrunasTestProvider` e não entra no APK publicado.
- Aplicativos que apenas importam arquivos individuais precisam também oferecer uma árvore de documentos para uso
  como cofre; o Android concede acesso persistente à pasta por esse contrato. Referência:
  [Storage Access Framework](https://developer.android.com/guide/topics/providers/document-provider).
