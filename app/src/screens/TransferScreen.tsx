import { useRoute } from "../lib/router"
import { ObsidianMigration } from "./import/ObsidianMigration"
import { TransferWorkspace } from "./transfer/TransferWorkspace"
import "./transfer.css"

export function TransferScreen() {
  const [, section] = useRoute()
  return section === "obsidian" ? <ObsidianMigration /> : <TransferWorkspace />
}
