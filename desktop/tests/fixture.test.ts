import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { DEMO_TEXT_FILES } from "../../app/src/data/demo-vault"
import { OBSIDIAN_PLUGIN_DEMO } from "../../app/src/data/obsidian-plugins-demo"

const FIXTURE = join(__dirname, "cofre-exemplo")

describe("cofre de teste", () => {
  it.each(["Notas/Formatadores.md", "Notas/Modelos/NPC.md", "Notas/Modelos/Diário.md", ".obsidian/templates.json", ".obsidian/daily-notes.json", ...Object.keys(OBSIDIAN_PLUGIN_DEMO)])(
    "%s é igual ao do exemplo do navegador",
    async (path) => {
      expect(await readFile(join(FIXTURE, ...path.split("/")), "utf8")).toBe(DEMO_TEXT_FILES[path])
    },
  )
})
