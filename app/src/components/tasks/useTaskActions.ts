import { useCallback, useMemo, useRef } from "react"
import { changeTaskInText, postponedDate, postponeField, updateTaskInText, type DateField } from "../../core/tasks/edit"
import type { Status } from "../../core/tasks/status"
import { parseContext, type ParseContext, type Task } from "../../core/tasks/task"
import { useTasksSettings, useTasksVault } from "../../lib/tasks"
import { flushOpenNotes } from "../../lib/vault-notes"

export type TaskPatch = Parameters<typeof updateTaskInText>[3]

/**
 * Ações sobre a tarefa original (na nota de origem), iguais em qualquer tela: marcar, mudar o estado, adiar, editar.
 * Grava pelo `useVault()` (com a versão lida) e recusa se a linha mudou desde que a tela leu a tarefa — assim um
 * clique duplo ou uma mudança no Obsidian não conclui a tarefa errada nem duplica a recorrência.
 */
export function useTaskActions() {
  const { vault, toast } = useTasksVault()
  const settings = useTasksSettings(vault?.info?.path)
  const pending = useRef(new Set<string>())
  const readOnly = vault?.info?.readOnly ?? true

  const run = useCallback(
    async (task: Task, change: (text: string, ctx: ParseContext) => string) => {
      const key = `${task.path}:${task.line}`
      if (readOnly || pending.current.has(key)) return
      pending.current.add(key)
      try {
        // Uma nota aberta com edição pendente grava antes (senão a gravação daqui daria conflito com ela).
        await flushOpenNotes()
        const note = vault?.index?.note(task.path)
        if (!note) throw new Error(`A nota ${task.path} não existe mais.`)
        const next = change(note.text, parseContext(settings))
        if (next !== note.text) await vault!.save(task.path, next)
      } catch (error) {
        toast(error instanceof Error ? error.message : String(error))
      } finally {
        pending.current.delete(key)
      }
    },
    [readOnly, settings, toast, vault],
  )

  return useMemo(() => {
    const update = (task: Task, patch: TaskPatch) => run(task, (text, ctx) => updateTaskInText(text, task.line, ctx, patch, task.originalMarkdown))
    return {
      readOnly,
      settings,
      toggle: (task: Task) => run(task, (text, ctx) => changeTaskInText(text, task.line, ctx, { expected: task.originalMarkdown })),
      setStatus: (task: Task, status: Status) => run(task, (text, ctx) => changeTaskInText(text, task.line, ctx, { status, expected: task.originalMarkdown })),
      update,
      /** Adia o campo escolhido nas configurações (prazo, agendada ou início). */
      postpone(task: Task, days: number) {
        const field = postponeField(task, settings.postponeDateField)
        if (!field) return Promise.resolve()
        const today = parseContext(settings).today
        return update(task, { [field]: postponedDate(task[field], today, days) })
      },
      setDate: (task: Task, field: DateField, value: string | null) => update(task, { [field]: value }),
    }
  }, [readOnly, run, settings])
}

export type TaskActions = ReturnType<typeof useTaskActions>
