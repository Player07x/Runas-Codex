# Auditoria C6 — Wiki, Campanhas e Agenda

Responsável: Codex, por pedido do dono em 17/10/2026. C6a fecha a Wiki; C6b fecha Campanhas/Agenda e os fluxos da sala.

| Checklist | Situação ao fechar C6 |
|---|---|
| B.1 tipos, categorias, página inicial, infobox, statblock e segredos | Pronto na base |
| B.1 galeria, áudio e spoilers | Pronto na C6a; mídia compartilhada e details nativo |
| B.2 calendário, conversões, datas, hoje, luas, linha do tempo | Pronto na base |
| B.2 recorrência fictícia e crônicas | Pronto na C6a |
| B.3 pinos, mapas aninhados, escala/régua, criação de notas | Pronto na base |
| B.3 várias imagens, zonas, rotas e rótulos | Pronto na C6a |
| B.4 relações, genealogia, hierarquias e diplomacia | Pronto na base |
| B.5 tabelas, geradores, idiomas e metas | Pronto na C6a |
| B.6 mostrar artigo pela sala | Pronto na C6b; projeção textual pública ou por assento |
| C Campanhas: quadro, tesouro, diário, avaliação, aventuras e iniciativa | Pronto na C6b |
| F.2 criação de sessão/evento | Pronto na base; smokes completos passaram |
| F.2 enquete de data e bandeja desktop | Pronto na C6b; bandeja física na revisão manual |
| G.5 ICS nos dois sentidos | Pronto na base |
| Widget/cofre/sala Android | C8/X7; revisão complementar após X8 |
| Diário PDF/HTML e pacotes | X4/C7 (outras tarefas) |

O motor de tabelas está em `core/wiki-tools.ts`, reutilizável pela X6. Migrações de calendários já são da C4.


## Validação e limites da C6b

- `npm run typecheck`, `npm test` (412 passaram, 5 ignorados no app; 168 no desktop), `npm run build` e
  `npm run desktop:build` passaram. Os dois smokes do Electron passaram, cada um com perfil temporário próprio;
  o modo de escrita usa uma cópia do cofre de teste.
- Teste com conexões WebSocket reais: a apresentação privada só chega ao assento escolhido, inclusive na conexão
  inicial. Avaliações, votos individuais, diários e lista de destinatários não entram na projeção pública.
- Pela interface: tesouro gravado, avanço de iniciativa, seleção retangular de seis cartões e recorte de PNG
  (192 × 192 → 96 × 192), com retorno ao original. Evidências em `docs/imagens/campanhas-c6b/`.
- Apresentação de artigo é texto revisável: comentários, transclusões e blocos privados são removidos. Imagens e
  formatação rica de handouts continuam na X6. `segredo_para` autoriza o conteúdo explicitamente para um assento;
  nunca envia a fonte completa. A prévia local da Wiki usa um índice público efêmero e somente leitura.
- Avaliações são anônimas na interface e no resultado salvo; o servidor autentica o assento para impedir duplicatas.
  Carta X não identifica quem sinalizou e fica ativa até o mestre confirmar a pausa. Diários têm autor e só são
  descartados da memória depois que o mestre os grava numa nota.
- Sala, formulários e resultados ficam em memória. Salve resultados antes de abrir uma nova atividade ou fechar o
  mundo. Sair de uma tela mantém a sala; trocar de mundo/cofre e encerrar explicitamente fecham os serviços.
- Iniciativa presencial aceita combatentes e importa encontros. Quantidades em dados precisam ser roladas pelo
  mestre; o importador avisa e usa uma unidade. Automação de combate no VTT é X6.
- Bandeja é opcional e configurada por aparelho; fechar a janela esconde o app quando ligada, Sair encerra. Não
  implementa inicialização automática (C9). Conferência em bandeja física Linux/Windows, multitouch real e leitores
  de tela integra a revisão complementar. Android excluído por pedido do dono.
