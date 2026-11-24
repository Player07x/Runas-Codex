# Tarefas abertas

Quem está trabalhando em quê, para dois agentes não mexerem nos mesmos arquivos. As regras gerais estão no
[`AGENTS.md`](../../AGENTS.md). Aqui ficam só as tarefas em andamento; ao terminar uma, mova o pedido para
[`concluidas/`](concluidas/) e tire a linha desta tabela.

| Tarefa | Pedido | Situação |
|---|---|---|
| Atualização 1.3.0 (U35–U49) | [atualizacao-1.3.md](atualizacao-1.3.md) e as [maquetes](atualizacao-1.3-maquetes.html) | lançada na 1.3.0 sem o H (Início “Mesa de hoje”, U46) e o I (mestre remoto, U47), que ficam para depois |
| Atualização 1.4.0 (U50–U77): transferências por itens, telas no celular e correções de Notas, Wiki e Relações | [atualizacao-1.4.md](atualizacao-1.4.md), as [maquetes](atualizacao-1.4-maquetes.html) e as [maquetes das correções](atualizacao-1.4-correcoes.html) | lançada na 1.4.0 em 14/11; a otimização (U76) fica para a 1.5 |
| Atualização 1.5.0 (U46, U47, U76, U78–U107): o que ficou de fora da 1.3 e da 1.4, “Sair da mesa”, os pedidos de 16/11, a segurança da gravação e a auditoria de usabilidade de 17/11 | [atualizacao-1.5.md](atualizacao-1.5.md) | lançada na 1.5.0 em 17/11 (PRs #145–#169) e na 1.5.1 (testes e CI: #171, #172); D, K, J2, A2, R e L (o Início novo) ficam para a próxima atualização |
| Atualização 1.6.0 (U46, U47, U76, U86, U89, U99, U104, U108–U122): os ajustes de 18/11 e o que ficou da 1.5 | [atualizacao-1.6.md](atualizacao-1.6.md) e as [maquetes](atualizacao-1.6-maquetes.html) | lançada na 1.6.0 em 18/11 (PRs #174–#195); a 1.7.0 traz os parentes na Wiki (#198) e o android-room estável (#197); a 1.7.1, os parentes na árvore genealógica (#201); a 1.7.2 conserta o botão Painel das Notas (#203); a 1.7.3 traz os calendários sincronizados (#205), o teste do link público da sala (#200) e corrige a rolagem do Elenco e os botões dos geradores (#206); a 1.7.4 traz a otimização da abertura, da busca, do calendário e das relações (#209) e, nos mapas, “Voltar às áreas” e a régua como a do VTT (#210); a 1.8.0 traz os ajustes de 24/11 (#213, capturas em [atualizacao-1.7.5/](atualizacao-1.7.5/)): reputação por jogador no Elenco, cartões novos, categorias prontas na wiki nova, excluir wiki, relações gravadas dos dois lados pela ficha, artigo formatado no VTT e relógios de ameaça até 100 |

O que o dono confere à mão está no fim de [`docs/04-testes-pendentes.md`](../04-testes-pendentes.md).

## Concluídas e histórico

- [`concluidas/`](concluidas/): os pedidos já entregues, da etapa 8 à 1.2.0. O índice antigo, com a divisão entre
  Codex e Claude Code, a tabela de situação e quem mexe em quê, está em [`concluidas/README.md`](concluidas/README.md);
  o [`panorama.html`](concluidas/panorama.html) mostra o que foi feito por data.
- [`docs/historico/`](../historico/): documentos que só contam como o projeto chegou aqui (o estudo inicial, a
  comparação dos protótipos e o inventário de responsáveis de 22/10, já desatualizado).

## Aceite do Android na atualização 1.5 (U82)

PR que mexe em tela do celular ou em transferência só se mescla com o job **`android-vault` verde** no CI.
O dono confere esse resultado antes do merge.
