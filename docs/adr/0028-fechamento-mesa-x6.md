# ADR 0028 — fechamento da mesa X6

- Estado: implementada; tela de importação entregue na tarefa T4 (29/10/2026).
- Data: 2026-10-22.

## Situação levantada

| Recurso | Situação | Decisão |
| --- | --- | --- |
| Pacote da mesa inteira ou de partes | pronto | O Transferir já inclui `.runas/mesas`, valida manifesto, dependências e conflitos. |
| Handout de nota para jogadores | pronto | A colaboração já filtra destinatários por assento e mostra o texto em tela cheia. |
| Universal VTT (`.dd2vtt`/`.uvtt`) | implementado no núcleo | `importUniversalVtt` aceita JSON local, mapa embutido, grade, paredes e portais. |
| Cenas do Foundry | implementado no núcleo | `importFoundryScene` converte cena, paredes/portas, tokens e luzes sem buscar imagens. |
| Tokens em lote | implementado no núcleo | `importBatchTokens` normaliza até 500 tokens por operação. |
| Pinos ligados a notas | implementado | `NoteData.notePath` abre uma nota do cofre; `url` continua reservado a links externos. |
| Sincronização incremental | implementado | Mudanças de documentos enviam `projection-patch`; snapshot completo fica para entrada e troca de cena. |
| Túnel alternativo | decisão | O desktop usa HTTP/2 quando apropriado. Relay próprio, Tailscale e ngrok exigiriam serviço/conta e ficam fora do app offline. |
| Voz e vídeo | fora do plano | Exigem TURN, conforme decisão do dono. |

## Segurança e compatibilidade

Os importadores só leem o arquivo escolhido pelo usuário. Imagens externas não são baixadas; referências sem bytes
embutidos viram avisos. A projeção incremental passa pela mesma filtragem de segredos, paredes, barras, visão e assets
da projeção inicial. O caminho `notePath` nunca atravessa a rede para jogadores.

## Tela de importação e formatos reais (29/10/2026, Claude Code, T4)

Mesa › Cenas › **Importar…** escolhe a origem, mostra um resumo antes de gravar e aplica pela `app/src/vtt/import-apply.ts`:
cada documento ganha um id novo (os importadores numeram `wall-1`, `token-1`…, e os ids valem para a mesa inteira) e o
mapa embutido entra por `vtt.assets.import`. Tokens em lote entram na cena aberta, depois dos que ela já tem.

Ao testar com arquivos reais, os importadores foram corrigidos:

- **Universal VTT:** no `.dd2vtt` do Dungeondraft, `map_size` é `{x, y}` em células; paredes (`line_of_sight` e
  `objects_line_of_sight`) são listas de pontos `{x, y}` em células a partir de `map_origin`; portas têm `bounds` com
  dois pontos; a imagem é base64 puro (PNG ou WebP, reconhecidos pelos bytes) e as luzes têm `position`, `range` e cor
  `AARRGGBB`. Os formatos aceitos antes (pixels em lista, `data:`) continuam valendo.
- **Foundry:** a exportação não tem `dimensions`; a grade vem de `grid.size`/`grid.type`/`grid.distance` (v10+) ou de
  `grid`/`gridType`/`gridDistance` (v9). As posições descontam a margem da cena (`padding`), os tokens ficam pelo
  centro, as portas `door: 2` viram secretas e os raios das luzes passam de unidades para células.
