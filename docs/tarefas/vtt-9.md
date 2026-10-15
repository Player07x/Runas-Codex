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

**Como funciona** (feito no PR #17; decisões na ADR 0016):
1. Com a sala aberta no desktop, o painel **Sala** ganha **"Controlar pelo celular"**: QR code e link com uma **chave
   do mestre**, separada da chave dos jogadores, nova a cada sessão e que dá para trocar a qualquer momento.
2. A **própria sala serve a mesa do mestre** em `/master?m=<chave>`: o celular (ou tablet) abre no navegador, pela
   mesma rede ou pelo link público. Sem instalar nada, sem mudar a CSP do app e sem liberar tráfego sem TLS no Android.
3. O desktop continua sendo a autoridade: a página usa uma `VttApi` remota (`app/src/vtt/remote-api.ts`) que chama, por
   HTTP, os mesmos canais do IPC (só os de `MASTER_CHANNELS`), e as mudanças voltam por Server-Sent Events.
4. Um aparelho de mestre por vez; o desktop mostra se há um conectado, com "Desconectar" e "Trocar chave".
5. **Testes:** `desktop/tests/vtt/master-remote.test.ts` e, no `--smoke --write`, a página do mestre numa janela oculta
   do tamanho de um celular, mais um "celular" por HTTP que cria um token conferido no desktop.

**Arquivos da C3:** `app/src/vtt/shared/master.ts`, `app/src/vtt/remote-api.ts`, `app/master.html`,
`app/src/vtt/master-main.tsx`, `app/src/vtt/api.ts` (escolher a implementação), `PlayerPanel.tsx`, `RemoteMesa` em
`MesaTable.tsx`, `desktop/src/main/vtt/master-remote.ts` e ganchos em `player-server.ts`, `player-transmission.ts` e
`vtt-host.ts`.

**Pronto quando (C3):** a sala aberta no desktop é controlada pelo celular (navegador) com a chave do
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
