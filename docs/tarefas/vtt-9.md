# Tarefa: etapa 9 — VTT no toque

**Para:** Codex (GPT-6 Astra), depois da 8d. **Leia antes:** [`AGENTS.md`](../../AGENTS.md), a
[divisão das tarefas](README.md), a [ADR 0006](../adr/0006-mesa-vtt.md) (a mesa copiada do RunasVTT), as seções 6 e 7
de [docs/02](../02-viabilidade-e-etapas.md) e a seção D da [checklist](../01-checklist-recursos.md#d-vtt).

Um PR (`vtt/etapa9`). O item da checklist é: **interface do mestre no celular e no tablet — mover, editar e desenhar
por toque** (hoje só com mouse e teclado).

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

## Entregar

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

## Pronto quando

O plano pede "sessão de teste com o mestre no celular e a sala aberta no desktop". Como a sala hospedada pelo
celular só chega na X7, nesta etapa vale:
- a mesa de exemplo é operada do começo ao fim **só por toque** num celular ou tablet Android (mesa em memória, APK do
  CI ou emulador) e numa tela de toque no desktop (Electron, com a sala aberta e um jogador conectado pelo navegador);
- nada do que funciona com mouse e teclado deixa de funcionar;
- `npm run typecheck`, `npm test`, `npm run build`, `npm run desktop:build` e os dois `--smoke` passam.

## Fora do escopo

Hospedar a sala no celular (X7), importar e exportar mesas e o resto da seção D da checklist (X6, no fechamento da
mesa).

## Ao terminar

- PR em português com vídeos ou imagens do celular, do tablet e do desktop.
- Atualize a ADR 0006 (gestos, layout no toque, desempenho no Android) e corrija a linha que diz que hospedar sala no
  celular é a etapa 9: agora é a etapa A (X7).
- Acrescente em `docs/04-testes-pendentes.md` uma seção "Etapa 9 — VTT no toque" com o que o dono precisa conferir à
  mão (celular real, tablet, tela de toque).
- Atualize a linha da etapa na tabela de situação do [`README.md`](README.md).
