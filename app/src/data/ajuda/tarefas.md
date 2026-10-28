Tarefas são caixas de marcar (`- [ ]`) em qualquer nota do cofre. O app segue o formato do plugin **Tasks** do
Obsidian (8.6): as datas, a prioridade e a repetição ficam no fim da linha, com emojis (ou no formato do Dataview,
se você escolher em Configurações › Agenda e tarefas). O Obsidian com o Tasks mostra as mesmas tarefas.

### Escrever uma tarefa

```markdown
- [ ] Preparar o mapa da cripta ⏫ 🛫 2026-10-20 📅 2026-10-24
- [ ] Ligar para o grupo 🔁 every week 📅 2026-10-25
- [x] Imprimir as fichas ✅ 2026-10-18
```

| Campo | Emoji | Exemplo |
| :-- | :-- | :-- |
| Prazo | 📅 | `📅 2026-10-24` |
| Agendada (quando fazer) | ⏳ | `⏳ 2026-10-22` |
| Início (não antes de) | 🛫 | `🛫 2026-10-20` |
| Criada em | ➕ | `➕ 2026-10-17` |
| Concluída em | ✅ | `✅ 2026-10-18` |
| Cancelada em | ❌ | `❌ 2026-10-19` |
| Repetição | 🔁 | `🔁 every week`, `🔁 every month on the 1st` |
| Prioridade | 🔺 ⏫ 🔼 🔽 ⏬ | da mais alta à mais baixa |
| Identificador e dependência | 🆔 ⛔ | `🆔 mapa` numa, `⛔ mapa` em outra (só depois da primeira) |
| Ao concluir | 🏁 | `🏁 delete` apaga a linha quando concluída |

Estados da caixa: `[ ]` a fazer, `[x]` feita, `[/]` em andamento, `[-]` cancelada.

### Marcar e editar

- Na leitura, clique na caixa: ela passa ao próximo estado; ao concluir, ganha `✅` com a data; numa tarefa que
  repete, a próxima ocorrência é criada.
- No editor, <kbd>Ctrl</kbd> <kbd>L</kbd> alterna a tarefa da linha e <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>T</kbd>
  abre a janela de criar ou editar tarefa (datas, prioridade, repetição sem decorar emojis).
- Com **Sugestões ao digitar** ligado (Configurações › Agenda e tarefas), o editor sugere campos, datas e regras de
  repetição enquanto você escreve a linha, como o autocompletar do Tasks.

### Consultas `tasks`

Um bloco `tasks` lista tarefas de todo o cofre que obedecem às linhas da consulta:

````markdown
```tasks
not done
due before in two weeks
path includes Campanhas
group by due
sort by priority
limit 20
```
````

Filtros comuns: `done`/`not done`, `due`/`scheduled`/`starts` com `before`, `after`, `on`, `today`, `tomorrow`;
`has due date`, `no due date`, `priority is high`, `path includes`, `tags include #sessao`, `description includes`.
Também `group by`, `sort by`, `limit`, `short mode` e `hide`/`show`. Consultas em JavaScript ficam desligadas, como no
padrão do Tasks.

### Na Agenda

Tarefas com prazo, agendamento ou início aparecem no dia certo da Agenda e na aba **Tarefas** do painel, com a nota
de onde vieram. O **Tempo livre** (⋯ da Agenda) usa seus horários disponíveis e desconta os eventos.

### Configurações

Em Configurações › Agenda e tarefas: o filtro global (só linhas com `#tarefa`, por exemplo, contam), o formato
(emojis ou Dataview), quais datas o app põe sozinho (criação, conclusão, cancelamento), onde a próxima ocorrência
entra e **Importar** as configurações do Tasks do Obsidian deste cofre.
