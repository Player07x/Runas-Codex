import { useMemo, useState } from "react"
import { FileText, Search } from "lucide-react"
import { vaultTasks, useTasksSettings, useTasksVault } from "../../lib/tasks"
import { navigate } from "../../lib/router"
import { noteName } from "../../core/text"
import { vaultRoute } from "../../lib/vault-notes"
import { Modal } from "../ui"

/** Busca rápida do Tasks: procura uma parte da descrição e abre a nota de origem. */
export function TaskQuickSearch({ onClose }: { onClose: () => void }) {
  const { vault } = useTasksVault()
  const settings = useTasksSettings(vault?.info?.path)
  const [needle, setNeedle] = useState("")
  const matches = useMemo(() => {
    if (!vault?.index) return []
    const query = needle.trim().toLocaleLowerCase("pt-BR")
    if (!query) return []
    const filter = settings.globalFilter.toLocaleLowerCase("pt-BR")
    return vaultTasks(vault.index, settings)
      .filter((task) => {
        const description = filter ? task.description.toLocaleLowerCase("pt-BR").replace(filter, "").trim() : task.description.toLocaleLowerCase("pt-BR")
        return description.includes(query)
      })
      .slice(0, 50)
  }, [needle, settings, vault])

  return (
    <Modal title="Busca rápida de tarefas" onClose={onClose} wide>
      <label className="tasks-filter row" style={{ marginBottom: 10 }}>
        <Search size={16} aria-hidden />
        <input
          className="input"
          autoFocus
          value={needle}
          onChange={(event) => setNeedle(event.target.value)}
          placeholder="Digite parte da descrição…"
          aria-label="Buscar tarefa pela descrição"
        />
      </label>
      {!needle.trim() && <p className="muted small">Digite parte da descrição para abrir diretamente a nota da tarefa.</p>}
      {needle.trim() && !matches.length && <p className="muted small">Nenhuma tarefa encontrada.</p>}
      {matches.length > 0 && (
        <div className="task-list" role="listbox" aria-label="Resultados da busca rápida">
          {matches.map((task) => (
            <button
              key={`${task.path}:${task.line}`}
              className="list-item"
              role="option"
              onClick={() => {
                navigate(vaultRoute(task.path))
                window.setTimeout(() => window.dispatchEvent(new CustomEvent("runas-codex:ir-para-tarefa", { detail: { path: task.path, line: task.line } })), 120)
                onClose()
              }}
            >
              <FileText size={15} aria-hidden />
              <span className="stack" style={{ alignItems: "flex-start", minWidth: 0 }}>
                <strong className="truncate">{task.description}</strong>
                <small className="muted truncate">{noteName(task.path)}{task.heading ? ` › ${task.heading}` : ""} · linha {task.line + 1}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
