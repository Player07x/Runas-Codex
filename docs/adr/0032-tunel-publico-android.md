# ADR 0032 — túnel público para sala hospedada no Android

> Renumerada de 0027 para 0032 em 22/10/2026: a 0027 está reservada para o rework visual (cores, capas e imagens).

- Estado: decisão provisória; a implementação do túnel fica para uma etapa posterior.
- Data: 2026-10-22.

## Contexto

A sala hospedada no Android aceita conexões somente da rede local. O desktop já pode baixar o `cloudflared` do release
oficial, conferir a soma SHA-256 publicada e iniciar um Quick Tunnel depois da confirmação do usuário. O APK não deve
baixar ou executar um binário sem essa mesma verificação, e a regra 6 permite a internet apenas para o tráfego da sala
do VTT.

## Alternativas estudadas

### `cloudflared` Linux arm64 dentro do APK

O binário seria empacotado como recurso nativo, extraído para o armazenamento privado e iniciado pelo `RoomService`.
O processo receberia apenas `--url http://127.0.0.1:<porta>` e seria encerrado junto com a sala. A versão teria de ser
fixada no código de release, com o SHA-256 conferido antes da execução; a atualização do binário acompanharia uma
release do APK.

O planejamento inicial estima aproximadamente **20 MB compactados e 35–40 MB instalados**, dependendo da versão e da
compressão do bundle. O consumo precisa ser medido no aparelho do dono: 30 minutos com a sala aberta sem túnel, com
túnel ocioso e com 2 Mbps de mapas/áudio, repetindo em Wi-Fi e 4G. A meta proposta é não ultrapassar **5% de bateria
por hora em túnel ocioso**; sem essa medição não há base para publicar o recurso.

### Relay ou outro túnel

Um relay próprio exigiria serviço hospedado, autenticação, retenção e custo operacional. Tailscale, ngrok e SSH reverso
exigem conta, aplicativo adicional ou configuração de terceiros. Nenhuma alternativa preserva a experiência offline e
a regra de que só a sala do VTT usa a internet.

## Decisão

Manter o Android somente na rede local até que o binário arm64, a política de distribuição e o teste de bateria sejam
aprovados. A interface informa explicitamente que o link público ainda não está disponível e orienta hospedar no
desktop para partidas pela internet. Os métodos `publicLink`, `testPublicLink` e `downloadCloudflared` continuam
recusando a operação no adaptador Android, com a mesma explicação para chamadas programáticas.
