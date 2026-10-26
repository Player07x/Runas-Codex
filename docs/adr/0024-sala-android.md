# ADR 0024 — sala hospedada no Android (X7)

- Estado: implementada; validação de integração obrigatória no job `android-room`.
- Data: 2026-10-20.

A autoridade da sala passa a ser `app/src/vtt/shared/room-authority.ts`: projeção pública, assentos, códigos, cookies, movimentos, colaboração, visão, áudio e gatilhos de regiões são os mesmos no Electron e no Android. O desktop adapta o transporte HTTP do Node; o Android adapta o plugin `RunasRoom`. Nenhuma regra da mesa foi reimplementada em Java.

No Android, a autoridade vive no WebView do app. Pedidos nativos chegam por eventos do Capacitor, com resposta por id e prazo de oito segundos; não dependem de temporizadores JavaScript. `WebView.onPause()` não pausa JavaScript ([documentação oficial](https://developer.android.com/reference/android/webkit/WebView#onPause())). O serviço em primeiro plano mantém o processo, uma trava parcial de CPU e uma trava de Wi-Fi enquanto a sala está ligada; a tela permanece acordada enquanto o app estiver visível. Minimizar ou apagar a tela preserva a sala; remover o app dos recentes ou destruir a Activity encerra a transmissão. Não reiniciamos uma sala com autoridade perdida após o Android matar o processo.

O serviço usa o tipo `connectedDevice` e as permissões de serviço e Wi-Fi correspondentes ([requisitos oficiais](https://developer.android.com/develop/background-work/services/fgs/service-types#connected-device)). A notificação mostra o link e a chave da sala, oculta seu conteúdo na tela bloqueada e permite encerrar. A permissão de notificações é solicitada ao ligar a primeira sala; mesmo se recusada, o Android mostra o serviço entre os aplicativos ativos. Não há inicialização no boot.

O transporte Java não usa bibliotecas novas. Aceita apenas conexões de endereços privados ou de loopback, com `Host` local numérico e origem correspondente. Expõe `player.html`, arquivos estáticos do build e apenas os hashes dos assets da projeção pública/áudio. A página dos jogadores não expõe o cofre, manifestos, paredes ou códigos individuais. O mestre remoto usa outra chave e endpoints próprios (R5, abaixo). HTTP GET/HEAD e Range usam streams, inclusive para arquivos do SAF. WebSocket exige máscara, limita frames a 16 KiB, até 24 jogadores/espectadores e oito mensagens por segundo; ingresso tem cotas por endereço e global. A chave muda a cada sessão. Cookies HttpOnly/SameSite=Strict são revalidados nas mensagens e publicações; limpar/regenerar o assento revoga também uma conexão já aberta.

A sala do celular funciona somente na rede local (Wi-Fi ou hotspot). O painel esconde o túnel público e os comandos específicos do computador. `Entrar Sala` abre o link no navegador padrão, que conecta ao HTTP/WS da sala sem relaxar a CSP do app nem habilitar HTTP arbitrário no cofre. Ao trocar de rede, desligar e ligar a transmissão atualiza o endereço.

As mesas usam o formato JSON existente em `.runas/mesas`. `PortableWorldStore` lê cenas e outros documentos; as gravações passam pela operação versionada já autorizada de `RunasVault`, em disco e no SAF. Só grava partições alteradas e bloqueia novas gravações após um conflito, sem sobrescrever a edição externa. Assets importados no Android respeitam o teto existente de 50 MB da ponte binária. Trocar cofre/mesa ou retirar a permissão de gravação fecha a sala antes da troca.

`@noble/hashes` 1.8.0 passa de dependência transitiva a direta do app: SHA-256 síncrono compartilhado preserva o contrato dos assentos, sem Node/Buffer no Android e sem implementar criptografia própria. Versão exata, publicada em 2025-04-21, sem script de instalação. Aleatoriedade usa `crypto.getRandomValues`/`randomUUID` do sistema.

Validação: testes TS da autoridade e persistência; regressão completa do desktop; testes Java de HTTP/Range/autenticação/WebSocket; job `android-room` com APK de depuração, cofre isolado, Chromium do job e Android 35. O job cobre ingresso, movimento, parede, espectador, arquivos privados, gravação, serviço em primeiro plano, tela apagada, revogação e fechamento. É requisito da publicação com Android habilitado. APKs de teste e suas opções de depuração não são publicados.


## R5 — mestre remoto na sala do celular (25/10/2026)

A sala Android serve também `/master?m=<chave>`, com o mesmo build, `RemoteVttApi` e contrato HTTP/SSE da ADR 0016.
A autoridade continua no WebView; `kind: "master"` chama os métodos da `VttApi` local por `dispatchMaster`. A lista
`MASTER_CHANNELS` é enviada ao transporte ao ligar a sala e conferida novamente em TypeScript. O servidor aceita
`POST /master/rpc` (usado pelo cliente existente) e `/master/call/<canal>` (alias da especificação do PR #67).
Criar/abrir/fechar mesas, ligar/desligar a sala e administrar a chave continuam exclusivos do aparelho hospedeiro.

- A chave de 128 bits vem de `SecureRandom`, é separada da chave dos jogadores e muda ao religar ou trocar a chave.
  A comparação usa `MessageDigest.isEqual`. O SSE reserva uma sessão única; um segundo aparelho recebe 409, e RPC e
  upload exigem `x-runas-session`. Desconectar encerra o socket; trocar a chave revoga também o link antigo. O cliente
  remoto existente mostra a perda de conexão e exige nova entrada. A chave do mestre nunca vai para a notificação.
- Os pedidos conservam Host/origem/LAN e cotas de ingresso da sala. O mestre tem teto global de 120 pedidos/s,
  RPC de 8 MiB e importação de 50 MiB. Somente `MASTER_EVENTS` seguem por SSE, numa fila de até 128 mensagens; cliente
  lento perde a conexão em vez de bloquear o WebView. O servidor usa heartbeat nativo e detecta fechamento do navegador.
- `/master/asset/<tipo>/<hash.ext>` lê todos os assets da mesa, inclusive privados, pelo mesmo stream/Range de disco
  e SAF. A lista pública dos jogadores continua separada. Uploads passam pela gravação versionada já usada pela mesa;
  não há escrita de documentos em Java. Cada pedido da ponte carrega a identidade da sessão da sala, para recusar
  pedidos atrasados de uma sala anterior. Trocar de mesa/cofre ou retirar a gravação fecha o transporte e revoga o mestre.
- `VttApi.master` no Android fornece `state`, `onState`, `rotate` e `disconnect`, com o mesmo `MasterState` do desktop.
  O link é `masterLink(playerState.localUrl, masterState.key)`. O painel existente já detecta essa capacidade e mantém
  link/QR escondidos até pedir. O ajuste de textos para “Controlar por outro aparelho”, estados e acessibilidade do painel
  fica com o Claude Code, conforme a divisão do PR #67; não foi criado outro fluxo de tela nesta tarefa.
- O serviço em primeiro plano, as travas e as regras de segundo plano permanecem os da X7. Não há túnel público novo.

Validação da R5: testes Java de chave, sessão, canais, SSE, revogação, origem/Host/cotas, importação e Range; testes
TypeScript de gravação, projeção aos jogadores, áudio, importação e pedidos atrasados. `room-master.cdp.mjs` é chamado
pelo roteiro existente do job `android-room`: cria/grava token, confere o jogador, importa asset, troca cena, aciona áudio,
opera com tela apagada, troca chave e abre a interface real `/master` no Chromium do job. A conferência física (incluindo
SAF e gerenciamento de bateria do fabricante) permanece na lista de testes manuais.
