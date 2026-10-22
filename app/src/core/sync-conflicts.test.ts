import { describe, expect, it } from "vitest"
import { detectSyncConflict, findSyncConflicts } from "./sync-conflicts"

describe("sync conflicts", () => {
  it("maps Syncthing copies to the original note", () => {
    expect(detectSyncConflict("Notas/Regra.sync-conflict-20261022-030000-laptop.md")).toEqual({
      path: "Notas/Regra.sync-conflict-20261022-030000-laptop.md",
      originalPath: "Notas/Regra.md",
      provider: "syncthing",
    })
  })

  it("recognizes Obsidian Sync names and ignores ordinary files", () => {
    expect(detectSyncConflict("Regra (conflicted copy).md")?.originalPath).toBe("Regra.md")
    expect(detectSyncConflict("Regra.sync-conflict-2026-10-22.md")?.provider).toBe("obsidian-sync")
    expect(detectSyncConflict("Regra.md")).toBeNull()
    expect(findSyncConflicts(["a.md", "b.sync-conflict-20261022-030000-phone.md"])).toHaveLength(1)
  })
})
