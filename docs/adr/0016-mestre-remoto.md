# ADR 0016 — Mestre pelo celular com a sala aberta no computador

- **Status:** aceita (2026-10-14). Parte C3 da etapa 9; o toque (gestos, alças, layout no celular) é a X3.

## Contexto

O marco da etapa 9 é "sessão de teste com o mestre no celular e a sala aberta no desktop". Até aqui o celular não
tinha como controlar uma sala aberta em outro computador: no Android a mesa só abre em memória, e a sala hospedada pelo
celular é a etapa A. O dono pediu uma solução de verdade para isso.

## Decisão

**A sala do computador serve também a mesa do mestre**, em `/master?m=<chave do mestre>`. O celular (ou tablet) abre
essa página no navegador — pelo QR code do painel Sala, na mesma rede ou pelo link público — e controla a mesa aberta
no computador.

- **O computador continua sendo a autoridade.** A página do mestre usa uma `VttApi` remota (`app/src/vtt/remote-api.ts`)
  com a **mesma interface** da mesa local: cada ação chama, por HTTP, o mesmo canal que a mesa local chama por IPC
  (`VttHost` guarda os tratadores ao registrá-los), e as mudanças voltam por Server-Sent Events (os mesmos eventos que a
  janela local recebe). Validação, visão, regiões, áudio e a transmissão aos jogadores são os mesmos de sempre.
- **Por que uma página servida pela sala, e não o app do celular:** funciona em qualquer celular ou tablet (Android,
  iPhone) sem instalar nada; tudo é da mesma origem, então a CSP do app não muda (nada de `connect-src http:`) e o
  Android não precisa liberar tráfego sem TLS; pelo link público já é HTTPS. O app também abre o link (Entrar Sala),
  porque é uma página comum.
- **Chave do mestre**, separada da chave dos jogadores: 128 bits, nova a cada vez que a sala liga, comparada em tempo
  constante. "Trocar chave" derruba o aparelho conectado na hora e o link antigo para de valer. O QR fica escondido até
  o mestre pedir (a tela pode estar espelhada na TV dos jogadores), com o aviso de que quem tem o link controla a mesa.
- **Um aparelho por vez:** o canal de eventos abre uma sessão; as chamadas precisam dela (`x-runas-session`). Um segundo
  aparelho recebe 409 até o primeiro sair ou o computador usar "Desconectar".
- **O que o celular pode fazer:** documentos (cenas, tokens, paredes, luzes, desenhos, registro), importar imagens,
  relatório da mesa, áudio (tocar e parar; quem toca é o computador), névoa explorada e os controles da sala (cena
  transmitida, régua, puxar câmera, barras, áudio e movimentos dos jogadores, assentos). **Só no computador:** abrir,
  criar e fechar mesas, ligar e desligar a sala, link público, janelas. A lista é `MASTER_CHANNELS`
  (`app/src/vtt/shared/master.ts`); o resto recebe 403.
- **Assets:** o mestre vê todos os assets da mesa aberta (`/master/asset/<tipo>/<arquivo>`, mesmas regras de caminho da
  mesa), não só os da cena projetada. Importar imagem vai por `POST /master/asset` (até 100 MB).
- **Pedidos de outro site** (cabeçalho `Origin` diferente) são recusados, como na sala dos jogadores.
- A página `master.html` é uma terceira entrada do build (ao lado de `index.html` e `player.html`), com a CSP do app.

## Consequências

- Testes: `desktop/tests/vtt/master-remote.test.ts` (chave, sessão única, canais recusados, eventos, troca de chave,
  assets e importação); o `--smoke --write` abre a página do mestre numa janela oculta do tamanho de um celular (a mesa
  "Mesa do Smoke" aparece com o canvas), entra como "celular" por HTTP, cria um token na cena e confere que o computador
  gravou; um segundo aparelho é recusado, um canal só do computador também, e trocar a chave invalida o link.
  `--shot-master=<arquivo>` guarda a captura.
- **No celular a mesa ainda usa o layout do desktop** (painel lateral espremido; melhor com o celular deitado ou num
  tablet). Gestos, alças e layout por toque são a X3, que funciona aqui sem trabalho extra, porque a mesa remota usa os
  mesmos componentes.
- Mestre remoto e mesa local podem mexer ao mesmo tempo; as mudanças dos dois lados aparecem nos dois.
- O áudio toca no computador da sala, não no celular.
- Fica para depois: mais de um aparelho de mestre, e entrar como mestre numa sala hospedada pelo celular (etapa A).
