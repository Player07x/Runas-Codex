# ADR 0006 — Mesa (VTT) com o código do RunasVTT, dentro do cofre

- **Status:** aceita (2026-10-14)

## Contexto
Etapa 4: o VTT no desktop. O RunasVTT já resolve cena, tokens, paredes, visão, luz, névoa, regiões, áudio e a sala
dos jogadores, mas é amarrado à Runas Suite (navegador integrado, ponte com os sites, fichas do Runas Tools nos
assentos) e guarda os mundos em SQLite fora de qualquer cofre. Pela [ADR 0004](0004-independente-da-runas-suite.md),
o Codex só reaproveita o código.

## Decisão
**Código reaproveitado, não compartilhado.** A mesa do RunasVTT foi copiada para `app/src/vtt/` (interface: Pixi,
painéis, página dos jogadores) e `desktop/src/main/vtt/` (serviços: documentos, visão, áudio, regiões, servidor da
sala, túnel), junto com os testes. Saíram: navegador integrado, ponte `window.runasVTT`, cópia dos sites, fichas
(`actor` do token e `seat-character`) e o Runas Tools servido aos jogadores.

**Mesas no cofre:** `<cofre>/.runas/mesas/<nome>-<id>/` com `mesa.json`, uma cena por JSON em `cenas/` (a cena e
tudo o que ela contém), `outros.json` (playlists, faixas, registro) e `assets/<tipo>/<sha256>.<ext>`. O Obsidian
ignora a pasta (começa com ponto). Os documentos ficam em memória com a mesma interface síncrona do banco do RunasVTT,
e a gravação é adiada (1 s) e atômica, só das partes que mudaram. Abrir ou criar uma mesa exige a gravação do cofre
liberada.

**Assentos sem fichas:** o mestre escolhe no token "Controlado por: Jogador N"; quem entra na sala com o código daquele
assento move aquele token. Quem entra sem código assiste.

**Sala:** servidor HTTP + WebSocket no computador do mestre (rede local), link público opcional pelo túnel rápido da
Cloudflare (`cloudflared`, baixado só quando o mestre pede — a única ida à internet do app). A página dos jogadores
(`player.html`) é parte do mesmo build e tem uma CSP própria que permite `ws:`/`wss:`; o app principal continua sem
nenhuma conexão. Arquivos do build são públicos; mapas, tokens e áudio só saem com a chave e se a cena projetada usa.

**Entrar Sala:** cola o link do mestre e abre a página da sala numa janela própria (desktop) ou nova aba (navegador),
sem a ponte do app. Salas recentes ficam neste aparelho.

**Cores:** o CSS da mesa fica contido em `.vtt-root` e usa os tokens Órbita.

## Consequências
- `--smoke --write` cria uma mesa e uma cena pela interface, abre a sala e confere, como um jogador, a página, o
  WebSocket e o ingresso no assento; roda no CI (Linux empacotado e Windows).
- No Android a mesa abre como prévia em memória; hospedar sala no celular é a etapa A2 (X7).
- Fica para depois: importar/exportar mesas e pinos ligados às notas do cofre.

## Etapa 9 — Toque (X3, 15/10/2026)

- O reconhecedor puro `canvas/gestures.ts` adia a ferramenta até distinguir toque, arrasto e toque longo (550 ms).
  O segundo dedo cancela a prévia sem gravar; a pinça aproxima e move pelo ponto médio. Depois dela, o dedo restante
  não desenha nem cria objetos. Cancelamento, perda de captura e saída da janela descartam a prévia.
- Um dedo usa a ferramenta ativa; vazio desmarca ou inicia seleção em retângulo. Toque longo e clique direito
  abrem editar/ocultar/apagar. Alças de 44 px redimensionam e giram tokens e imagens; luzes circulares têm alças
  para os raios de luz plena e penumbra (não têm orientação no modelo). Escala preserva centro e proporção,
  rotação encaixa em 15°; “Ignorar grade” libera o encaixe, como Alt.
- Câmera, ferramentas, apagar, ocultar, espelhar, deslocar uma casa e desfazer/refazer têm botões. O histórico local
  guarda 50 ações, agrupa alterações da seleção e recusa desfazer objetos que mudaram em outro aparelho.
- Em celular e tablet em pé, painéis e ferramentas viram gavetas; propriedades sobem em uma folha com rolagem
  própria. O mapa continua visível. Tablet deitado e desktop mantêm painel lateral; controles de toque têm 44 px.
  O mestre remoto usa o mesmo `SceneCanvas`/`SceneView`, sem mudança no protocolo da C3.
- Em ponteiro de toque, a resolução inicial do Pixi limita o DPR a 1,5. Amostras de 2,5 s abaixo de 30 FPS reduzem
  para 1 pixel físico por pixel CSS. O tamanho lógico e as coordenadas do mapa permanecem iguais.

### Medição no Android

O job `android-touch` do workflow Release gera um APK exclusivo de teste com WebView depurável, opera o canvas por
gestos nativos do Android (`adb input tap/swipe`: mover token, desenhar e toque longo), confere desfazer/refazer
pelos botões da interface (acionados pelo DOM) e mede 5 s de movimento com dois dedos em cada cena. O adb executa
cada gesto inteiro no aparelho, sem pausas para confirmação de cada evento pelo canal de depuração. A segunda usa PNG sintético de 4096 × 4096, névoa ligada, luz do dia desligada, um aliado e duas
luzes. `Runas-Codex-android-toque` guarda `metrics.json`, capturas e log do emulador. A opção de depuração é aplicada
somente ao arquivo gerado do APK de teste; não muda o instalador distribuído.

Medição de 15/10/2026, [execução 38764957646](https://github.com/Player07x/Runas-Codex/actions/runs/38764957646),
commit `94392df`: emulador 37.2.12, perfil Pixel 2, Android 15 (API 35, x86_64), KVM e GPU por software SwiftShader;
WebView Chromium 124. Viewport 412 × 684 CSS, DPR 2,625, canvas 412 × 460 CSS. A primeira cena tem 3000 × 2000,
um aliado e um traço. A segunda liga também a prévia dos jogadores, para desenhar a névoa, além de calculá-la.
FPS é a cadência de `requestAnimationFrame` durante 5 s de movimento, não uma medição em GPU de aparelho físico.

| Cena | Quadros/s | Intervalo p95 | Resolução final do canvas |
|---|---:|---:|---|
| Exemplo simples | 31,8 | 50,1 ms | 1 (412 × 460 físicos) |
| Mapa 4096, névoa e duas luzes | 24,0 | 83,4 ms | 1 (412 × 460 físicos) |

A adaptação reduziu a resolução inicial de 1,5 para 1. O mínimo de 1 preserva a leitura; o mapa grande ainda ficou
abaixo de 30 FPS neste emulador por software. Conferir fluidez em celular/tablet com GPU física continua pendente.
O roteiro passou: token de (1250, 950) para (1450, 1050), mão livre, desfazer/refazer e toque longo; sem erros no
WebView e sem rolagem lateral (412 CSS de conteúdo para 412 CSS de viewport).

Os [dados brutos](../imagens/vtt-9-toque/android-metricas.json) e as capturas de
[propriedades](../imagens/vtt-9-toque/android-propriedades.png) e
[mapa com névoa](../imagens/vtt-9-toque/android-mapa-4096.png) ficam versionados. A captura Android usa `adb screencap`.
O emulador recebe a permissão de notificações antes de abrir o app, para que o diálogo do sistema não cubra a mesa
nem coloque o WebView em segundo plano durante a medição. Essas configurações pertencem apenas ao teste.
