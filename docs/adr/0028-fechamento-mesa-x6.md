# ADR 0028 — fechamento da mesa X6

- Estado: implementada no núcleo; telas de importação continuam pertencendo ao rework visual.
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
