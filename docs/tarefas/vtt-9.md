# Tarefa: etapa 9 — VTT no toque e mestre pelo celular

**Para:** Codex (X3, o toque) e Claude Code (C3, o mestre pelo celular), ao mesmo tempo. **Leia antes:** [`AGENTS.md`](../../AGENTS.md), a
[divisão das tarefas](README.md), a [ADR 0006](../adr/0006-mesa-vtt.md) (a mesa copiada do RunasVTT), as seções 6 e 7
de [docs/02](../02-viabilidade-e-etapas.md) e a seção D da [checklist](../01-checklist-recursos.md#d-vtt).

O item da checklist é: **interface do mestre no celular e no tablet — mover, editar e desenhar por toque** (hoje só
com mouse e teclado). O marco do plano é: **sessão de teste com o mestre no celular e a sala aberta no desktop.**

Até agora, o celular não tinha como controlar uma sala aberta no desktop: lá a mesa só abre em memória, e a sala
hospedada pelo celular é a etapa A. Por isso a etapa tem duas partes, **um PR cada**:

| Parte | Quem | Branch | O quê |
|---|---|---|---|
| **X3** | Codex | `vtt/etapa9-toque` | gestos, alças e layout da mesa no toque |
| **C3** | Claude Code | `vtt/etapa9-mestre-remoto` | o celular abre a mesa do mestre de uma sala que está aberta no desktop |

As duas partes não dependem uma da outra: o mestre remoto usa a **mesma interface** da mesa (`VttApi`), então o
toque da X3 funciona nele sem trabalho extra.

## O que já existe

- `app/src/vtt/canvas/SceneView.ts` (Pixi 8): a cena, as ferramentas (`select`, `ruler`, `draw`, `region`, `wall`,
  `light`), pinça para zoom com dois dedos e `touch-action: none` no canvas.
- `app/src/vtt/canvas/SceneCanvas.tsx`: barra de ferramentas, opções de cada ferramenta, painel do item selecionado e
  importação de imagens (arrastar e soltar). Os atalhos de teclado ficam em `keyboard.ts` e
  `vtt/shared/settings.ts`.
- `app/src/vtt/panels/`: cenas, áudio, registro, jogadores (sala) e configurações. `app/src/screens/vtt/VttScreen.tsx`
  é a tela Criar Sala / Entrar Sala.
- No Android e no navegador a mesa abre **em memória** (`isBrowserPreview` em `vtt/api.ts`); hospedar a sala no
  celular é a X7 (etapa A2), não esta.

## X3 — toque (Codex)

1. **Gestos no canvas**, sem quebrar o mouse:
   - um dedo usa a ferramenta ativa (selecionar e arrastar token, régua, desenhar, paredes, luzes, regiões);
   - dois dedos movem e aproximam o mapa (já existe a pinça; falta mover junto);
   - **toque longo** abre o menu do item (o que hoje é o clique direito);
   - tocar no vazio desmarca; arrastar no vazio com a ferramenta de seleção faz a seleção em retângulo;
   - nada dispara sem querer ao começar um gesto de dois dedos (o primeiro dedo não pode deixar um traço ou mover um
     token).
2. **Alças para redimensionar e girar** tokens, imagens e luzes (item da seção D.4), grandes o bastante para o dedo
   (44 px) e que também funcionam com o mouse.
3. **Tudo o que hoje só tem atalho de teclado** ganha um botão alcançável no toque: desfazer, apagar, ocultar dos
   jogadores, Shift + direção (mover a seleção uma casa), Alt ao soltar (ignorar a grade) e trocar de ferramenta.
4. **Layout do mestre no celular e no tablet:** a barra de ferramentas e os painéis viram gavetas ou abas que não
   cobrem a cena inteira; a partir de 320 px de largura, sem rolagem para os lados; alvos de 44 px; o painel do item
   selecionado vira uma folha que sobe de baixo. No tablet deitado, painel lateral como no desktop.
5. **Desempenho no WebView do Android** (era um dos spikes da etapa 2): meça a cena de exemplo e um mapa grande
   (4096 px com névoa e luzes) no APK do CI ou num emulador e registre os números na ADR 0006. Se ficar abaixo de
   ~30 quadros por segundo, ajuste a resolução do canvas no celular.
6. **Testes:** a lógica dos gestos (reconhecer toque, toque longo, arrasto e pinça a partir de uma sequência de
   eventos de ponteiro) fica em TS puro com testes (`vtt/canvas/gestures.ts` + `gestures.test.ts`); o
   `--smoke --write` simula toques (eventos de ponteiro com `pointerType: "touch"`) para mover um token e desenhar um
   traço.

**Pronto quando (X3):** a mesa de exemplo é operada do começo ao fim **só por toque** num celular ou tablet Android
(mesa em memória, APK do CI ou emulador) e numa tela de toque no desktop; nada do que funciona com mouse e teclado
deixa de funcionar; os comandos de sempre e os dois `--smoke` passam.

**Arquivos da X3:** `app/src/vtt/canvas/**`, os painéis (menos o `PlayerPanel.tsx`), o contêiner da mesa
(`MesaTable.tsx`) e o `vtt.css`.

## C3 — mestre pelo celular com a sala no desktop (Claude Code)

**Como funciona:**
1. Com a sala aberta no desktop, o painel **Jogadores** ganha **"Controlar pelo celular"**: um QR code e um link com
   uma **chave do mestre**, separada da chave dos jogadores, criada a cada sessão e que dá para trocar a qualquer
   momento (a anterior para de valer na hora).
2. No celular, **Entrar Sala** (ler o QR ou colar o link) reconhece a chave do mestre e abre a **mesa do mestre**
   completa, não a vista do jogador: cenas, tokens, paredes, luzes, névoa, áudio e registro.
3. O desktop continua sendo a autoridade: guarda a mesa no cofre, aplica as mudanças e transmite aos jogadores. O
   celular fala com ele por uma implementação **remota** da `VttApi` (`app/src/vtt/remote-api.ts`) sobre o mesmo
   servidor da sala (WebSocket para os documentos e os eventos, HTTP com a chave para imagens e para enviar imagens
   novas).
4. Um celular de mestre por vez. O desktop mostra "Mestre conectado pelo celular" com um botão para desconectar, e
   continua podendo mexer na mesa ao mesmo tempo (as mudanças dos dois lados aparecem nos dois).
5. Funciona na rede local e pelo link da internet (túnel), sempre com a chave. No Android, liberar `ws://` e `http://`
   **só para endereços da rede local** (pelo link da internet já é `https`/`wss`).
6. **Testes:** o protocolo do mestre remoto (autorizar a chave, trocar a chave, aplicar mudanças, recusar o segundo
   celular) em TS puro com testes; no `--smoke --write`, uma segunda janela entra como mestre remoto, cria um token e
   o desktop confere que ele foi gravado na mesa.

**Arquivos da C3:** `app/src/vtt/remote-api.ts` (novo), `app/src/vtt/api.ts` (escolher a implementação),
`app/src/vtt/panels/PlayerPanel.tsx`, `app/src/screens/vtt/VttScreen.tsx` (Entrar Sala),
`desktop/src/main/vtt/player-server.ts`, `player-session.ts` e um arquivo novo para o mestre remoto
(`desktop/src/main/vtt/master-remote.ts`); no `vtt-host.ts`, só acrescentando. Decisões na ADR 0016.

**Pronto quando (C3):** a sala aberta no desktop é controlada pelo celular (APK do CI ou emulador) com a chave do
mestre, e um jogador no navegador vê as mudanças; a chave trocada derruba o celular antigo; os comandos de sempre e
os dois `--smoke` passam.

## Pronto quando (etapa 9 inteira)

Com a X3 e a C3 na `main`: **sessão de teste com o mestre no celular, operando só por toque, e a sala aberta no
desktop**, com pelo menos um jogador conectado.

## Fora do escopo

Hospedar a sala no celular (X7), importar e exportar mesas e o resto da seção D da checklist (X6, no fechamento da
mesa). Mestre remoto pelo navegador (sem o app) fica para depois.

## Ao terminar (cada parte)

- PR em português com vídeos ou imagens do celular, do tablet e do desktop.
- X3: atualize a ADR 0006 (gestos, layout no toque, desempenho no Android) e corrija a linha que diz que hospedar sala
  no celular é a etapa 9: agora é a etapa A (X7). C3: ADR 0016.
- Acrescente em `docs/04-testes-pendentes.md` uma seção "Etapa 9 — VTT no toque" com o que o dono precisa conferir à
  mão (celular real, tablet, tela de toque).
- Atualize a linha da etapa na tabela de situação do [`README.md`](README.md).
