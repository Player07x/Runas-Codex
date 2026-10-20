# Matriz de compatibilidade com o plugin Tasks

Pedido: [tasks-tempo-livre.md](tasks-tempo-livre.md). Decisões: [ADR 0020](../adr/0020-tasks-e-tempo-livre.md).

- **Versão de referência:** Tasks **8.6.0** (lançada em 16/10/2026), a estável mais recente em 18/10/2026.
- **Fontes:** o código e a documentação da tag `8.6.0` de `obsidian-tasks-group/obsidian-tasks` (`src/Task/`,
  `src/TaskSerializer/`, `src/Statuses/`, `src/Query/`, `src/Config/Settings.ts`, `docs/`), lidos para escrever o motor.
  Os casos de `tests/Task/Recurrence.test.ts` e `tests/Commands/ToggleDone.test.ts` viraram testes nossos.
- **Bibliotecas:** as mesmas do Tasks, nas mesmas versões: `rrule` 2.8.1 (recorrência) e `chrono-node` 2.3.9 (datas
  por extenso nas consultas).
- **Evidência:** testes em `app/src/core/tasks/*.test.ts` (o nome do teste aparece na coluna) e conferência no
  navegador (`npm run dev`, nota `Notas/Tarefas.md` do exemplo).

Legenda: ✅ igual ao Tasks · ⚠️ funciona com diferença (explicada) · ❌ não suportado (pendente ou impossível).

**A paridade não é completa.** As linhas ⚠️ e ❌ abaixo são o que falta ou o que difere; cada uma diz por quê.

## Formato da tarefa

| Recurso | Situação | Evidência / observação |
|---|---|---|
| Caixa com qualquer caractere, marcadores `-`, `*`, `+`, `1.`, `1)`, recuo com tabs e `>` (citação, callout) | ✅ | "regrava na ordem canônica e preserva recuo…" |
| Campos com emoji: 🔺⏫🔼🔽⏬, ➕🛫⏳⌛📅📆🗓✅❌, 🔁, 🏁, 🆔, ⛔, seletor de variação (U+FE0F) | ✅ | "lê os campos do fim da linha…", "aceita os emojis alternativos…" |
| Campos lidos do fim para o começo, em qualquer ordem; etiquetas no meio voltam à descrição | ✅ | mesma expressão do `DefaultTaskSerializer` |
| Formato Dataview (`[due:: …]`, `(priority:: high)`, `[repeat:: …]`…) com os dois espaços antes do colchete | ✅ | "lê e grava o formato do Dataview" |
| Regravação na ordem do Tasks (descrição, id, depende de, prioridade, recorrência, ao concluir, datas, `^bloco`) | ✅ | o Tasks também regrava a linha inteira ao marcar |
| Referência de bloco (`^id`) e quebra de linha de 2+ espaços preservadas; 1 espaço no fim some | ✅ | "casos do próprio Tasks: espaço único no fim some…" |
| Exemplos em código e no frontmatter ignorados | ✅ | "acha as tarefas de uma nota fora do frontmatter…" |
| Data inválida (`2026-02-30`) | ⚠️ | aparece como "data inválida", filtros `… date is invalid` funcionam; ao regravar a linha mantemos o texto (o Tasks escreveria `Invalid date`) |
| Regra 🔁 que o rrule não entende | ⚠️ | mantida como texto na linha (o Tasks a apagaria ao regravar) |
| Tarefa em várias linhas (continuação) | ✅ | o Tasks também só trata a primeira linha |

## Estados e marcação

| Recurso | Situação | Evidência / observação |
|---|---|---|
| Estados padrão (` `, `x`, `/`, `-`) e personalizados, tipos TODO, DONE, IN_PROGRESS, ON_HOLD, CANCELLED, NON_TASK | ✅ | "estados personalizados: o próximo estado…" |
| Clique: próximo estado; ✅ ao concluir, ❌ ao cancelar, data removida ao sair do estado | ✅ | "cancelar põe ❌…", "reabrir tira a data…" |
| `setDoneDate`, `setCancelledDate`, `setCreatedDate` | ✅ | "respeita setDoneDate desligado…" |
| Estado desconhecido vira TODO que vai para `x` | ✅ | `StatusRegistry.bySymbolOrCreate` |
| Mudar para qualquer estado (menu da tarefa, botão direito) | ✅ | nas listas, consultas e checklist |
| Comandos "Set status to …" por estado no editor | ❌ | no editor há Ctrl+L (alternar) e a janela de edição, que muda o estado; falta um comando por estado |
| Coleções prontas de estados (temas Minimal, ITS…) | ⚠️ | não há botão de coleção; os estados vêm do `data.json` importado ou são editados à mão |
| Fora do filtro global, a caixa só alterna ` `/`x` | ✅ | "fora do filtro global, a caixa só alterna" |

## Recorrência

| Recurso | Situação | Evidência / observação |
|---|---|---|
| Regras do rrule (`every day`, `every 2 weeks on Monday, Friday`, `every weekday`, `every month on the last Friday`…) e o texto canônico gravado | ✅ | "grava o texto canônico do rrule" |
| `when done` (a partir da conclusão) | ✅ | "tarefa atrasada anda a partir da data dela; com when done…" |
| Data de referência: prazo, agendada, início (ou prazo, início, agendada com `removeScheduledDateOnRecurrence`); as outras andam junto | ✅ | "mantém a distância entre as datas…", "tirar a agendada…" |
| Fim de mês, 29/02, "every N months/years" sem pular meses | ✅ | "casos do próprio Tasks: meses no fim do mês…" |
| Atravessa a troca do horário de verão sem pular dias | ✅ | "atravessa a troca do horário de verão…" (rodado também em 4 fusos) |
| Próxima ocorrência acima (padrão) ou abaixo (`recurrenceOnNextLine`), sem id, dependências nem `^bloco` | ✅ | "exemplo obrigatório…", "com recurrenceOnNextLine…", "a próxima ocorrência não leva id…" |
| Estado da próxima ocorrência: anda pelos estados até um TODO (ou IN_PROGRESS) | ✅ | "casos do próprio Tasks: a recorrência anda pelos estados…" |
| `🏁 delete` / `🏁 keep` | ✅ | "🏁 delete apaga a ocorrência concluída…" |
| Regra que terminou (`for 3 times`, `until`) | ⚠️ | não cria ocorrência (o Tasks gravaria datas inválidas) |
| Conclusão e próxima ocorrência numa gravação só; recusa se a linha mudou (sem duplicar) | ✅ | "recusa quando a linha mudou…"; o app grava com a versão lida |

## Consultas ```` ```tasks ````

| Recurso | Situação | Evidência / observação |
|---|---|---|
| `done`, `not done`, `status.name`, `status.type is/is not` | ✅ | "not done e done", "prioridade, estado…" |
| Datas: `due`, `scheduled`, `starts` (sem início passa), `done`, `created`, `cancelled`, `happens` com `before/after/on/in/on or before…`, `has/no … date`, `… date is invalid` | ✅ | "datas absolutas, relativas e por extenso", "starts…", "happens…" |
| Datas relativas e períodos: `today`, `next friday`, `in two weeks`, `this/last/next week/month/quarter/year`, `2026`, `2026-Q4`, `2026-10`, `2026-W43`, dois extremos | ✅ | chrono-node 2.3.9 como o Tasks |
| Texto: `description`, `path`, `folder`, `root`, `filename`, `heading`, `tag(s)`, `recurrence`, `id` com `includes`, `does not include`, `regex matches`, `regex does not match`; recusa de regex com quantificador aninhado | ✅ | "texto: descrição, caminho…", erros |
| `priority is/above/below/not`, `is recurring`, `is blocked/blocking`, `has/no depends on`, `has/no id`, `exclude sub-items` | ✅ | "prioridade, estado, recorrência…" |
| AND, OR, NOT, AND NOT, OR NOT, XOR com `()`, `[]`, `{}` ou `""`, precedência NOT > XOR > AND > OR | ✅ | "combinações booleanas…" |
| `sort by` (todos os campos, `reverse`, `tag N`, `random`, `urgency`) e a ordem padrão do Tasks | ✅ | "ordem padrão…", "sort by com reverse…" |
| `group by` (todos os campos, `reverse`; títulos com `%%n%%` para ordenar; só os títulos que mudam) | ✅ | "group by com títulos ordenados…" |
| `limit`, `limit groups`, contagem "N de M tarefas" | ✅ | "limit conta antes e depois" |
| `hide/show` de todos os elementos, `short mode`, `full mode`, `explain`, comentários `#`, linhas com `\` | ✅ | "hide/show, short mode…", "linhas continuadas…" |
| `view list`, `view columns by …` com arrastar entre colunas (prioridade e datas) | ✅ | conferido no navegador (arrastar mudou 🔽 para 🔼) |
| `preset`, predefinições padrão do Tasks, consulta global, `ignore global query`, propriedades `TQ_…` da nota | ✅ | "consulta global…", "propriedades TQ_…" |
| Marcadores `{{query.file.path/folder/root/filename…}}`, `query.file.property('…')`, `hasProperty` | ✅ | "this_file e this_folder…", "marcador de propriedade" |
| `{{query.file.outlinks…}}` | ❌ | não implementado |
| `filter/sort/group by function` e marcadores com JavaScript | ⚠️ | dão o mesmo erro do Tasks com o JavaScript desligado, que é o padrão dele desde a 8.0. O Runas-Codex não executa JavaScript de notas (CSP sem `unsafe-eval`, regra 6): ligar o JavaScript **não é possível** aqui. A predefinição padrão `this_folder_only` depende disso. |
| `show tree` | ⚠️ | mostra subtarefas debaixo da mãe quando as duas estão no resultado; itens de lista comuns (sem caixa) não aparecem |
| Barra de ferramentas: filtrar pela descrição e copiar em Markdown | ✅ | |
| Texto do `explain` | ⚠️ | em português e mais curto que o do Tasks (as datas resolvidas aparecem) |
| Títulos de grupo por backlink/arquivo | ⚠️ | aparecem como texto `[[Nota]]`, não como link |
| Busca rápida de tarefas (Quick Search, 8.4/8.5) | ❌ | não implementada |

## Edição e telas

| Recurso | Situação | Evidência / observação |
|---|---|---|
| Clique na caixa no live preview, no modo leitura, nas consultas, na Agenda e no checklist do evento, com o mesmo motor | ✅ | conferido no navegador; o modo leitura acha a caixa pela ordem e recusa se a contagem não bate |
| Janela "criar ou editar tarefa" (todos os campos, datas por extenso em português ou inglês, "só datas futuras", ids existentes) | ✅ | "datas digitadas" |
| Adiar (1, 2, 3 dias, 1, 2, 4 semanas), mudar para hoje/amanhã, tirar a data; `postpone.dateField` | ✅ | "adiar: a partir da data, ou de hoje…" |
| Autocompletar no editor (campos, datas, regras, ids, `autoSuggestInEditor/MinMatch/MaxItems`) | ⚠️ | com `autoSuggestMinMatch` 0 pedimos 2 letras (para não abrir a janela a cada palavra em português); aceita palavras em português |
| Comando "alternar tarefa" no editor (Ctrl+L, configurável) e "criar ou editar tarefa" (Ctrl+Shift+T) | ✅ | mesmo `toggleLine` do Tasks (linha comum ganha `- [ ] `) |
| Ir para a origem (backlink com o título) | ✅ | |
| Modo leitura do Obsidian com o filtro global escondido nas notas | ❌ | o leitor não muda o desenho (regra 7); só as listas de tarefas escondem o filtro |

## Configurações

| Configuração do `data.json` | Situação |
|---|---|
| `globalFilter`, `removeGlobalFilter`, `globalQuery`, `presets`, `taskFormat`, `setCreatedDate`, `setDoneDate`, `setCancelledDate`, `postpone.dateField`, `useFilenameAsScheduledDate`, `filenameAsScheduledDateFormat` (YYYY/MM/DD), `filenameAsDateFolders`, `recurrenceOnNextLine`, `removeScheduledDateOnRecurrence`, `searchResults.taskCountLocation`, `autoSuggestInEditor`, `autoSuggestMinMatch`, `autoSuggestMaxItems`, `statusSettings` | ✅ importadas e editáveis |
| `filenameAsScheduledDateFormat` com tokens além de YYYY, MM e DD | ⚠️ cai no padrão `AAAA-MM-DD`/`AAAAMMDD` |
| `provideAccessKeys`, `isShownInEditModal`, `quickSearch`, `dismissedNotices`, `debugSettings`, `loggingOptions` | ❌ só do Obsidian (a importação lista quais ficaram de fora) |

A importação é explícita (Configurações › Tarefas › Importar), só lê o arquivo e nunca grava no `.obsidian`.

## Pendente de conferência no Obsidian

Os casos acima foram conferidos contra o código e os testes do Tasks 8.6.0, não rodando o plugin. Falta abrir uma
cópia de um cofre de teste no Obsidian com o Tasks 8.6.0 e comparar as linhas gravadas pelos dois apps (lista em
[`docs/04-testes-pendentes.md`](../04-testes-pendentes.md)).
