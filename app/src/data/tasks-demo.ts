/**
 * Exemplo das tarefas no formato do plugin Tasks (datas relativas a hoje, para o exemplo fazer sentido em qualquer
 * dia) e consultas ```tasks.
 */
const pad = (n: number) => String(n).padStart(2, "0")
function day(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const TASKS_DEMO: Record<string, string> = {
  "Notas/Tarefas.md": `---
tags: [tarefas]
---
# Tarefas

Formato do plugin **Tasks** do Obsidian: clique na caixa para concluir (a data ✅ entra sozinha) e veja a tarefa
recorrente criar a próxima ocorrência.

## Rotina

- [ ] Beber 2L de água 🔁 every day 📅 ${day(0)}
- [ ] Revisar as anotações da sessão #rpg ⏫ 📅 ${day(-2)}
- [ ] Comprar dados novos 🔽 ⏳ ${day(3)}
- [/] Pintar as miniaturas #rpg 🔼 🛫 ${day(-5)} 📅 ${day(6)}
- [x] Imprimir os mapas ✅ ${day(-1)}
- [-] Reservar a sala do clube ❌ ${day(-3)}

## Projeto

- [ ] Escrever a aventura 🆔 aventura 📅 ${day(10)}
    - [ ] Desenhar o mapa da masmorra 📅 ${day(4)}
- [ ] Testar a aventura com o grupo ⛔ aventura 📅 ${day(14)}

## Por fazer, agrupadas por prazo

\`\`\`tasks
not done
group by due
\`\`\`

## Atrasadas ou de hoje

\`\`\`tasks
not done
due on or before today
sort by priority
\`\`\`

## Quadro por prioridade

\`\`\`tasks
not done
path includes {{query.file.path}}
view columns by priority
hide backlink
\`\`\`
`,
  // Configurações do plugin Tasks como o Obsidian grava (para testar "Importar" nas Configurações).
  ".obsidian/plugins/obsidian-tasks-plugin/data.json": JSON.stringify(
    {
      presets: { this_file: "path includes {{query.file.path}}", rpg: "not done\ntag includes #rpg" },
      globalQuery: "",
      globalFilter: "",
      removeGlobalFilter: false,
      taskFormat: "tasksPluginEmoji",
      setCreatedDate: false,
      setDoneDate: true,
      setCancelledDate: true,
      postpone: { dateField: "due-scheduled-start" },
      autoSuggestInEditor: true,
      useFilenameAsScheduledDate: true,
      filenameAsScheduledDateFormat: "",
      filenameAsDateFolders: ["Notas/Diário"],
      recurrenceOnNextLine: false,
      removeScheduledDateOnRecurrence: false,
      statusSettings: {
        coreStatuses: [
          { symbol: " ", name: "Todo", nextStatusSymbol: "x", availableAsCommand: true, type: "TODO" },
          { symbol: "x", name: "Done", nextStatusSymbol: " ", availableAsCommand: true, type: "DONE" },
        ],
        customStatuses: [
          { symbol: "/", name: "In Progress", nextStatusSymbol: "x", availableAsCommand: true, type: "IN_PROGRESS" },
          { symbol: "-", name: "Cancelled", nextStatusSymbol: " ", availableAsCommand: true, type: "CANCELLED" },
          { symbol: "h", name: "Em espera", nextStatusSymbol: " ", availableAsCommand: true, type: "ON_HOLD" },
        ],
      },
      loggingOptions: { minLevels: { "": "info" } },
    },
    null,
    2,
  ),
}
