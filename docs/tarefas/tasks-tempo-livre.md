# Tarefa: compatibilidade completa com Tasks e tempo livre na Agenda

**Origem:** pedido do dono em 18/10/2026.
**Situação:** autorizada pelo dono em 18/10/2026; em andamento.
**Responsável:** Claude Code (branch `agenda/tasks-tempo-livre`).

Ler [`AGENTS.md`](../../AGENTS.md), a [divisão de trabalho](README.md), o
[dialeto e a arquitetura](../02-viabilidade-e-etapas.md) e as seções F.1/F.2 da
[checklist](../01-checklist-recursos.md). Esta tarefa acrescenta requisitos ao suporte atual de tarefas com prazo.

## Objetivo e estado atual

Oferecer suporte completo ao plugin **Tasks do Obsidian** nas notas `.md` e no campo **“Anotações e checklist de
preparação”** dos eventos, com o mesmo comportamento nas demais apresentações dessas tarefas. Acrescentar à
Agenda real o cálculo dos períodos e do total de tempo livre do usuário em cada dia.

Hoje, `checklist()` reconhece caixas simples, `toggleTask()` apenas troca a marca e `dueTasks()` extrai `📅`.
O texto `🔁 every day` é preservado, mas não gera a próxima tarefa. A recorrência dos eventos é independente.
Pontos iniciais da auditoria: `app/src/core/agenda.ts`, `agenda.test.ts`,
`app/src/screens/agenda/{EventDialog,AgendaScreen}.tsx`, leitor Markdown e live preview compartilhados.

## 1. Compatibilidade completa com Tasks

### Contrato de compatibilidade

- Antes de implementar, registrar a versão estável de referência do Tasks, a data e as fontes oficiais usadas.
  Criar uma matriz por recurso, configuração, comando e sintaxe, incluindo exemplos e testes de aceitação.
  Esta etapa faz parte da execução futura; a especificação atual não declara a auditoria concluída.
- “Suporte total” inclui leitura, edição, gravação e comportamento, não apenas conservar emojis no texto.
  A matriz deve cobrir o conjunto documentado da versão escolhida; os itens abaixo são requisitos mínimos,
  não uma lista que permita excluir outros recursos do plugin.
- Não declarar paridade completa enquanto houver recurso incompatível ou pendente. Qualquer divergência que
  exija decisão de produto deve ser registrada para o dono, sem redução silenciosa do pedido.
- Usar `.md` como fonte da verdade. Abrir, alterar e reabrir no Runas-Codex e no Obsidian com Tasks deve conservar
  dados e produzir resultados equivalentes. Não exigir Obsidian instalado para usar o recurso no Runas-Codex.

### Escopo funcional mínimo

- **Formatos e campos:** formatos de tarefa documentados pelo Tasks, incluindo emojis e formato Dataview;
  descrição, tags, prioridades, datas de criação/início/agendamento/prazo/conclusão/cancelamento, recorrência,
  identificadores, dependências, ações ao concluir e demais metadados da versão de referência.
- **Estados:** estados padrão e personalizados, tipos e transições configuráveis; concluir, cancelar, reabrir e
  alternar estado corretamente. Reconhecer tarefas aninhadas e preservar descrições, conteúdo subordinado,
  listas, links e referências de bloco. Ignorar exemplos em código e frontmatter.
- **Recorrência:** regras documentadas, inclusive `when done`, múltiplas datas e suas relações, configurações de
  inserção e transições de estados. Criar a próxima ocorrência no arquivo de origem e atualizar o histórico
  conforme as configurações do Tasks. Cobrir dias úteis, intervalos, fins de mês, anos bissextos e tarefas
  atrasadas. Aplicar as regras próprias de IDs, dependências e ações ao concluir.
- **Consultas `tasks`:** filtros, datas relativas, expressões booleanas, ordenação, agrupamento, limites,
  apresentação, contexto da consulta, propriedades, presets, consultas globais e demais instruções documentadas.
  Resultados devem permitir ações sobre a tarefa original, sem gerar cópias independentes.
- **Fluxos de edição:** criar/editar tarefa, sugestões de campos e datas, comandos e atalhos equivalentes,
  adiamento, navegação até a origem e atualização de consultas e Agenda após cada alteração.
- **Configurações:** filtro global, exclusões de arquivos/pastas, formatos, estados, datas automáticas,
  recorrência, consultas e demais opções com efeito funcional. Inventariar as configurações do plugin em
  `.obsidian/plugins/obsidian-tasks-plugin/data.json`; oferecer importação explícita sem sobrescrever o original.
  Preferências próprias por aparelho seguem o armazenamento definido no projeto.
- **Todas as superfícies:** código-fonte, live preview, leitura, consultas, lista de tarefas na Agenda e checklist
  do evento usam um único motor. Marcar uma tarefa em qualquer superfície atualiza a origem e todas as outras.
  O formulário de anotações aceita a sintaxe completa; a visualização permite suas ações correspondentes.

### Exemplo obrigatório

Com a data local de conclusão fixada em **18/10/2026**, e as configurações padrão correspondentes habilitadas,
concluir esta tarefa pelo checklist de preparação ou pela nota:

```md
- [ ] Beber 2L de água 🔁 every day 📅 2026-10-18
```

deve registrar a conclusão em `2026-10-18` e criar **uma única próxima ocorrência** aberta para `2026-10-19`,
preservando a regra de repetição. O mesmo caso deve funcionar ao concluir por um resultado de consulta ou pela
Agenda. Testar reabertura e repetição da interação conforme a semântica do Tasks, sem duplicações acidentais.

## 2. Tempo livre no calendário real

- Permitir configurar os períodos disponíveis por dia da semana, com várias faixas no mesmo dia, exceções por
  data e escolha explícita dos calendários/eventos que ocupam o tempo. Não presumir que todo o período de 24 h
  seja utilizável; enquanto não houver configuração, orientar o usuário a defini-la.
- Calcular **tempo livre = períodos disponíveis menos a união dos intervalos ocupados**. Recortar eventos às
  faixas disponíveis e aos limites do dia. Unir sobreposições e adjacências antes de somar, sem descontar duas
  vezes o mesmo minuto. Faixas disponíveis sobrepostas também não podem inflar o total.
- Considerar eventos únicos e recorrentes, exceções, alterações de uma ocorrência, cancelamentos, eventos que
  atravessam meia-noite e eventos de vários dias. Respeitar fuso e transições de horário de verão, inclusive em
  eventos importados por `.ics`; não tratar todo dia como necessariamente composto de 24 horas.
- Definir claramente quais eventos bloqueiam tempo, respeitando disponibilidade livre/ocupado quando existir.
  Para eventos de dia inteiro, oferecer política explícita: bloquear as faixas disponíveis desse dia ou servir
  apenas de anotação. Exibir a política e permitir ajuste, sem inferir ocupação pela categoria ou pelo título.
- Tarefas com apenas data de prazo/início/agendamento não têm duração e **não consomem horas automaticamente**.
  Só descontar tarefa que tenha reserva explícita de início/fim ou duração em um horário. Se for necessário
  acrescentar esse vínculo, documentar seu formato sem inventar campos atribuídos ao Tasks; evitar dupla contagem
  com o evento associado.
- Mostrar o total de horas/minutos livres e as faixas livres do dia selecionado. Nas visões semanal e mensal,
  mostrar um resumo por dia e acesso aos intervalos. Para hoje, distinguir **livre no dia** de **livre restante**,
  descontando o tempo já passado apenas no segundo indicador. Usar o fuso configurado e atualizar na virada do dia.
- Atualizar ao criar, editar, mover, excluir ou importar eventos, alterar recorrências, reservas ou preferências,
  inclusive após edição externa no cofre. Mostrar estados de nenhum período disponível e dia totalmente ocupado.
- Resultado apenas informativo: não mover compromissos nem agendar tarefas automaticamente.

**Caso de aceitação:** disponibilidade `08:00–18:00`, eventos ocupados `09:00–11:00`, `10:00–12:00` e
`15:00–16:00`. Exibir **6 h livres**, nas faixas `08:00–09:00`, `12:00–15:00` e `16:00–18:00`.
Uma tarefa sem horário com prazo nesse dia não altera o total. Um evento fora de `08:00–18:00` também não.

## Arquitetura, compatibilidade e entrega futura

- Implementar parsers, transições, recorrência, consultas e operações com intervalos em TypeScript puro no núcleo,
  com testes de comportamento. As telas usam esse motor compartilhado e a interface `Platform` existente.
- Gravar por `useVault()`, com controle de versão e conflitos. Conclusão e geração da próxima ocorrência devem
  integrar a mesma gravação da nota; falha não pode deixar conclusão parcial ou uma tarefa duplicada.
  Preservar campos desconhecidos, LF/CRLF, BOM, indentação e conteúdo não alterado.
- Respeitar isolamento dos espaços e controles de notas privadas/secretas nas consultas e agregações.
- Usar os pontos de extensão do Markdown. Se a paridade exigir mudança do leitor/live preview, fazer um PR
  pequeno dedicado, com justificativa e regressões do dialeto, conforme `AGENTS.md`.
- Consultas por função/script exigem desenho de execução compatível com o funcionamento offline e a CSP vigente,
  sem `unsafe-eval`, rede ou acesso indevido aos arquivos. Registrar a solução e a equivalência na matriz;
  a dificuldade técnica não transforma omissão em suporte total.
- Interface em pt-BR, temas claro/escuro, teclado e leitores de tela, 320 px e alvos de toque de 44 px.
  Conferir Windows, Linux e Android; registrar dependências reais de plataforma e validações pendentes.
- Propor fases/PRs separados para motor de tarefas, superfícies/consultas e tempo livre, após a autorização.
  O planejamento em fases não reduz o escopo final. Não implementar nesta rodada de documentação.

## Validação para considerar a tarefa concluída

- Matriz completa com fontes, versão e evidência de cada requisito, incluindo configurações e sintaxes menos comuns.
- Casos equivalentes executados no Obsidian/Tasks e no Runas-Codex com cópias de um cofre de teste, sem alterar
  o cofre pessoal. Cobrir formatos alternativos, metadados, estados, dependências, consultas e recorrências.
- Testes de gravação concorrente, erro de salvamento, read-only, conclusão por múltiplas superfícies e mudança
  externa; nenhuma perda de texto ou criação acidental de ocorrências duplicadas.
- Testes de tempo livre: sobreposição, faixas múltiplas, dia vazio/cheio, dia inteiro, meia-noite, vários dias,
  recorrência/exceções, cancelamentos, fusos, horário de verão e indicadores de hoje versus dia completo.
- Verificação de desempenho com muitas tarefas e recorrências, expandindo apenas o intervalo necessário.
- Rodar os checks do `AGENTS.md` e os smokes aplicáveis quando houver implementação; capturas das superfícies
  desktop/celular e registro honesto do que não foi possível verificar em `docs/04-testes-pendentes.md`.

## Referências oficiais

Consultadas para delimitar este pedido em 18/10/2026; confirmar a versão estável e revisar o inventário na execução:

- [Tasks — guia oficial](https://publish.obsidian.md/tasks/Introduction).
- [Recorrência e suas regras](https://github.com/obsidian-tasks-group/obsidian-tasks/blob/main/docs/Getting%20Started/Recurring%20Tasks.md).
- [Datas](https://github.com/obsidian-tasks-group/obsidian-tasks/blob/main/docs/Getting%20Started/Dates.md).
- [Dependências](https://github.com/obsidian-tasks-group/obsidian-tasks/blob/main/docs/Getting%20Started/Task%20Dependencies.md).
- [Filtros](https://publish.obsidian.md/tasks/Queries/Filters),
  [ordenação](https://publish.obsidian.md/tasks/Queries/Sorting),
  [agrupamento](https://publish.obsidian.md/tasks/Queries/Grouping) e
  [presets](https://publish.obsidian.md/tasks/Queries/Presets).
