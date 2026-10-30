# ADR 0032 — túnel público para sala hospedada no Android

> Renumerada de 0027 para 0032 em 22/10/2026: a 0027 estava reservada para o rework visual (cores, capas e imagens).

- Estado: aceita e implementada na R4 (30/10/2026); a seção “R4” no fim substitui a decisão provisória de 21/10.
- Data: 2026-10-21; revisada em 2026-10-30.

## Contexto

A sala hospedada no Android (ADR 0024) aceita conexões somente da rede local. O desktop já pode baixar o
`cloudflared` do release oficial, conferir a soma SHA-256 publicada e iniciar um Quick Tunnel depois da confirmação do
usuário. O APK não deve baixar ou executar um binário sem essa mesma verificação, e a regra 6 permite a internet apenas
para o tráfego da sala do VTT.

## Alternativas estudadas

### `cloudflared` Linux arm64 dentro do APK

O binário seria empacotado como recurso nativo, extraído para o armazenamento privado e iniciado pelo `RoomService`.
O processo receberia apenas `--url http://127.0.0.1:<porta>` e seria encerrado junto com a sala. A versão teria de ser
fixada no código de release, com o SHA-256 conferido antes da execução; a atualização do binário acompanharia uma
release do APK. Os releases públicos do projeto mantêm um artefato Linux arm64 e somas SHA-256 por artefato
([Cloudflare cloudflared releases](https://github.com/cloudflare/cloudflared/releases)).

Estimativa inicial para planejar o APK: **aproximadamente 20 MB compactados e 35–40 MB instalados**, dependendo da
versão e da compressão do bundle. O consumo de bateria precisa de medição no aparelho do dono: comparar 30 minutos
com a sala aberta sem túnel, com túnel ocioso e com 2 Mbps de mapas/áudio, repetindo em Wi-Fi e 4G. A meta de aceite
proposta é não ultrapassar **5% de bateria por hora em túnel ocioso**; sem essa medição não há base para publicar o
recurso.

### Relay ou outro túnel

Um relay próprio exigiria serviço hospedado, autenticação, retenção e custo operacional. Tailscale, ngrok e SSH reverso
exigem conta, aplicativo adicional ou configuração de terceiros. Essas opções aumentam a superfície de dados e não
preservam a experiência offline; nenhuma é uma substituta adequada ao Quick Tunnel para este app.

## Decisão

Manter o Android somente na rede local até que o binário arm64, a política de distribuição e o teste de bateria sejam
aprovados. A interface informa explicitamente que o link público ainda não está disponível e orienta hospedar no
desktop para partidas pela internet. Os métodos `publicLink`, `testPublicLink` e `downloadCloudflared` continuam
recusando a operação no adaptador Android, com a mesma explicação para chamadas programáticas.

## R4 — o túnel no APK (30/10/2026)

A decisão D1 do dono (29/10) pôs a sala do celular pela internet na 1.0. Ficou assim:

- **Binário oficial, versão fixa.** O APK leva o `cloudflared` **2026.9.3** (de 24/09/2026) do release oficial,
  `cloudflared-linux-arm64`, como `lib/arm64-v8a/libcloudflared.so`. No Android 10 em diante um app só executa
  binários da pasta de bibliotecas nativas, extraída na instalação (`useLegacyPackaging`). O build
  (`mobile/android/app/cloudflared.gradle`) baixa do release oficial, confere o SHA-256 fixado no arquivo e, quando a
  API do GitHub responde, também a soma publicada no release; se algo não bater, o build para. O APK publicado cresce
  cerca de 18 MB. As outras arquiteturas (ARM de 32 bits, x86) recebem um marcador pequeno, para o APK continuar
  instalando nelas; nesses aparelhos o botão explica que o link público não está disponível. O emulador do CI usa o
  `cloudflared-linux-amd64` com `-PrunasTunnelAbis=x86_64`.
- **Sem o DNS do sistema.** O binário de Linux procura o `/etc/resolv.conf`, que o Android não tem. Por isso o app
  resolve `region1.v2.argotunnel.com` e `region2.v2.argotunnel.com` pela rede do Android e passa os IPs com `--edge`.
  O pedido do túnel rápido (`POST /tunnel`) vai para um repasse só de loopback, com caminho secreto por execução
  (`--quick-service`), que o faz em `https://api.trycloudflare.com` pela pilha HTTPS do Android
  (`QuickServiceRelay.java`). Mais nada passa pelo repasse.
- **Mesmas regras do desktop.** HTTP/2 em vez de QUIC; o link só é entregue depois de “Registered tunnel connection”;
  duas falhas com a borda viram a explicação da porta 7844; 60 s sem túnel desistem; o processo encerra com a sala,
  com o “Desligar”, ao trocar de mesa ou de cofre e ao fechar o app. Se o `cloudflared` cair sozinho, o painel diz que
  o link caiu.
- **A sala aceita o túnel só do próprio aparelho.** O servidor da sala continua recusando `Host` que não seja
  numérico e da rede local; a exceção é o domínio do túnel atual, e só quando o pedido vem do loopback (o
  `cloudflared`). Pelo túnel, a `Origin` precisa ser `https://` desse domínio e o limite de tentativas usa o
  `cf-connecting-ip`. O mestre pelo navegador (`/master`, ADR 0024) continua só na rede local.
- **Bateria.** O túnel só abre quando o mestre pede e usa a mesma trava de CPU e de Wi-Fi da sala. A meta de 5 % por
  hora em túnel ocioso continua valendo e fica como conferência no aparelho do dono (`docs/04-testes-pendentes.md`).

Teste: `RoomTunnelTest` (leitura da saída, argumentos, regras de `Host` e `Origin`, repasse) nos testes de unidade, e
`mobile/tests/room-tunnel.cdp.mjs` no job `android-revisao`, onde o emulador abre o link público e o runner do CI
abre a sala por ele, pela internet.

