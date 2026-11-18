import { afterEach, describe, expect, it, vi } from "vitest"
import { createRemoteVttApi } from "./remote-api"

/** O SSE é só a abertura da sessão; o teste confere o JSON enviado de verdade pelo cliente. */
class Events {
  static current: Events
  handlers = new Map<string, (event: { data: string }) => void>()
  constructor(_url: string) { Events.current = this }
  addEventListener(name: string, handler: (event: { data: string }) => void) { this.handlers.set(name, handler) }
  onerror: (() => void) | undefined
  close = vi.fn()
}
afterEach(() => vi.unstubAllGlobals())

describe("consulta de documentos do mestre remoto", () => {
  it("omite o pai ausente sem convertê-lo no filtro de raiz", async () => {
    vi.stubGlobal("EventSource", Events)
    const fetch = vi.fn(async (_url: string, _options: RequestInit) => new Response(JSON.stringify({ result: [] }), { status: 200 }))
    vi.stubGlobal("fetch", fetch)
    const api = createRemoteVttApi({ origin: "http://127.0.0.1:30000", key: "mestre" })
    const connected = api.connect()
    Events.current.handlers.get("hello")!({ data: JSON.stringify({ session: "sessao", world: { id: "mesa" } }) })
    await connected
    await api.documents.list("token")
    await api.documents.list("token", "scene")
    await api.documents.list("scene", null)
    expect(fetch.mock.calls.map(([, options]) => JSON.parse(String(options.body)))).toEqual([
      { channel: "vtt:documents-list", args: ["token"] },
      { channel: "vtt:documents-list", args: ["token", "scene"] },
      { channel: "vtt:documents-list", args: ["scene", null] },
    ])
  })
})


describe("desconexão do mestre remoto", () => {
  it.each(["erro do SSE", "aviso explícito"])("bloqueia novas chamadas após %s", async (reason) => {
    vi.stubGlobal("EventSource", Events)
    const fetch = vi.fn(async () => new Response(JSON.stringify({ result: null })))
    vi.stubGlobal("fetch", fetch)
    const api = createRemoteVttApi({ origin: "http://127.0.0.1:30000", key: "mestre" })
    const connected = api.connect()
    const events = Events.current
    const world = { id: "mesa" }
    events.handlers.get("hello")!({ data: JSON.stringify({ session: "sessao", world }) })
    await connected
    expect(await api.connect()).toEqual(world)
    await api.table.report({ sceneId: "cena", selection: [], center: null })
    expect(fetch).toHaveBeenCalledTimes(1)
    fetch.mockClear()

    const lost = vi.fn()
    api.onLost(lost)
    if (reason === "erro do SSE") events.onerror!()
    else events.handlers.get("closed")!({ data: "" })
    await api.table.report({ sceneId: null, selection: [], center: null })
    await expect(api.documents.list("scene")).rejects.toThrow()
    await expect(api.assets.import("maps", "mapa.png", new Uint8Array([1]))).rejects.toThrow()
    await expect(api.connect()).rejects.toThrow()
    expect(lost).toHaveBeenCalledTimes(1)
    expect(events.close).toHaveBeenCalledTimes(1)
    expect(Events.current).toBe(events)
    expect(fetch).not.toHaveBeenCalled()
  })
})
