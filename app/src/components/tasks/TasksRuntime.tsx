import { useEffect } from "react"
import { publishTasksVault, setTasksVault } from "../../lib/tasks"
import { useVault } from "../../platform/VaultProvider"
import { useToast } from "../ui"
import "./TasksQueryBlock"

/** Liga as tarefas ao cofre aberto (o clique nas caixas usa as configurações dele) e registra o bloco ```tasks. */
export function TasksRuntime() {
  const vault = useVault()
  const toast = useToast()
  const path = vault.info?.path
  useEffect(() => setTasksVault(path), [path])
  useEffect(() => publishTasksVault(vault, toast), [vault, toast])
  return null
}
