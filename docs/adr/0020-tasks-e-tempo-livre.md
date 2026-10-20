# ADR 0020 — Tarefas do plugin Tasks e tempo livre na Agenda

Data: 18/10/2026. Pedido: [docs/tarefas/tasks-tempo-livre.md](../tarefas/tasks-tempo-livre.md). Matriz:
[docs/tarefas/tasks-matriz.md](../tarefas/tasks-matriz.md).

## Decisões

1. **Um motor só, no núcleo.** `app/src/core/tasks/` lê e grava as tarefas como o Tasks 8.6.0 (formato emoji e
   Dataview, estados, recorrência, urgência, dependências) e roda as consultas. Notas (live preview e leitura), blocos
   ```` ```tasks ````, Agenda e checklist do evento usam o mesmo motor; o checklist antigo de `core/agenda.ts` saiu.
2. **Mesmas bibliotecas do Tasks.** `rrule` 2.8.1 (recorrência e o texto canônico da regra) e `chrono-node` 2.3.9
   (datas por extenso nas consultas), nas versões que o Tasks usa, sem script de instalação. Assim `every month` no dia
   31 e `due before next friday` dão o mesmo resultado nos dois apps.
3. **Sem JavaScript nas consultas.** `filter/sort/group by function` dão o erro do Tasks com o JavaScript desligado —
   o padrão dele desde a 8.0. O Runas-Codex não executa código de notas (CSP sem `unsafe-eval`, regra 6); não há opção
   para ligar.
4. **Configurações por aparelho, por cofre** (`localStorage`, `runas-codex:tasks:<cofre>`), com importação explícita do
   `data.json` do Tasks (só leitura). O app nunca grava no `.obsidian`.
5. **Gravação segura.** Cada ação lê a nota pelo índice, confere que a linha ainda é a que a tela mostrou e grava pelo
   `useVault()` (com a versão lida). Concluir e criar a próxima ocorrência é uma gravação só. CRLF é preservado.
6. **Leitor (PR pequeno à parte).** Caixas clicáveis no modo leitura, estados com outro caractere desenhados como caixa
   com `data-task` (como no Obsidian) e o ponto de extensão `registerTaskToggle`, para o módulo de tarefas decidir o
   que entra no lugar da linha clicada.
7. **Tempo livre** = faixas disponíveis (por dia da semana, com exceções por data) menos a união do que ocupa. É
   preferência do aparelho (`runas-codex:tempo-livre:<cofre>`), não nota. A conta usa instantes no fuso escolhido (dias
   de 23 e 25 horas). Ocupam: eventos dos calendários escolhidos (pastas de `Agenda/`), menos os com `ocupado: false`
   (chave nova, que o Full Calendar ignora; `TRANSP:TRANSPARENT` do `.ics`); dia inteiro conforme a escolha; e tarefas
   com horário no começo da descrição (`- [ ] 09:00 - 10:30 …`, o formato do plugin Day Planner — não é um campo do
   Tasks). Tarefa só com data não ocupa. Como é a união, uma tarefa dentro do horário de um evento não conta duas vezes.
8. **`.ics`**: ocorrência alterada (RECURRENCE-ID) vira evento próprio e a data é pulada na série; ocorrências e
   eventos cancelados não entram; a série semanal com datas puladas vira a RRULE equivalente (o Full Calendar só guarda
   `skipDates` em RRULE).

## Consequências

- O comportamento depende de o usuário importar as configurações do Tasks; sem isso valem os padrões do Tasks.
- A paridade não é completa (ver a matriz): JavaScript, `query.file.outlinks`, a busca rápida, comandos por estado no
  editor e itens sem caixa na árvore ficam de fora.
