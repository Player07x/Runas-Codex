import { describe, expect, it } from "vitest"
import { fromBase64, HOST, HOST_CHANNELS, hostArgs, toBase64 } from "./host-services"
import { MASTER_CHANNELS } from "./master"
import { saveTableSession, sessionTargets } from "../session-save"
import { VaultIndex } from "../../core/vault-index"

const item = { formatVersion: 1, id: "lobo", kind: "token", name: "Lobo", createdAt: 1, data: { name: "Lobo" }, children: [] }

describe("serviços do cofre para o mestre remoto (U47)", () => {
  it("o mestre remoto pode pedir os serviços do cofre", () => {
    for (const channel of HOST_CHANNELS) expect(MASTER_CHANNELS).toContain(channel)
  })

  it("confere os argumentos antes de chegar ao cofre", () => {
    expect(hostArgs(HOST.libraryList, ["ignorado"])).toEqual([])
    expect(() => hostArgs(HOST.libraryAsset, ["../../segredo"])).toThrow()
    expect(() => hostArgs(HOST.librarySave, [{ id: "x" }])).toThrow(/inválido/)
    expect(() => hostArgs(HOST.sessionSave, [{ campaign: "C", number: 0, title: "", date: "2026-11-18", text: "" }])).toThrow(/inválida/)
    expect(() => hostArgs("vtt:outra-coisa", [])).toThrow()
    expect(hostArgs(HOST.sessionSave, [{ campaign: "C", number: 2, title: "", date: "2026-11-18", text: "oi" }])).toHaveLength(1)
  })

  it("aceita um item da biblioteca bem formado", () => {
    expect(() => hostArgs(HOST.librarySave, [item])).not.toThrow()
  })

  it("passa imagens em base64 sem perder bytes", () => {
    const bytes = new Uint8Array(70_000).map((_, i) => i % 256)
    expect(fromBase64(toBase64(bytes))).toEqual(bytes)
  })
})

describe("Salvar Sessão pelo cofre (local ou pelo aparelho da sala)", () => {
  const files: Record<string, string> = {
    "Campanhas/Cinzas/Cinzas.md": "---\ntipo: campanha\n---\n# Cinzas\n",
    "Campanhas/Cinzas/Sessões/Sessão 01.md": "---\ntipo: sessao\nnumero: 1\n---\n# Sessão 1\n",
  }
  const index = new VaultIndex(Object.keys(files).map((path) => ({ path, size: 1, mtime: 1 })), files)

  it("lista as campanhas com o próximo número", () => {
    expect(sessionTargets(index, false)).toEqual({ campaigns: [{ name: "Cinzas", next: 2 }], readOnly: false })
    expect(sessionTargets(null, true)).toEqual({ campaigns: [], readOnly: true })
  })

  it("cria a sessão na pasta da campanha pelo createNote", async () => {
    const created: string[] = []
    const folder = await saveTableSession({ index, readOnly: false, createNote: async (dir, name, text) => { created.push(`${dir}/${name}|${text.includes("O dragão fugiu")}`); return `${dir}/${name}.md` } }, { campaign: "Cinzas", number: 2, title: "", date: "2026-11-18", text: "O dragão fugiu." })
    expect(folder).toBe("Campanhas/Cinzas/Sessões")
    expect(created[0]).toMatch(/^Campanhas\/Cinzas\/Sessões\/.+\|true$/)
  })

  it("recusa cofre só de leitura e campanha que não existe", async () => {
    const createNote = async () => ""
    await expect(saveTableSession({ index, readOnly: true, createNote }, { campaign: "Cinzas", number: 2, title: "", date: "2026-11-18", text: "" })).rejects.toThrow(/somente leitura/)
    await expect(saveTableSession({ index, readOnly: false, createNote }, { campaign: "Outra", number: 2, title: "", date: "2026-11-18", text: "" })).rejects.toThrow(/não encontrada/)
  })
})
