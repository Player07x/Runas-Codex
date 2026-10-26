import { afterEach, describe, expect, it, vi } from "vitest"
import { createRemoteVttApi } from "./remote-api"

/** O SSE é só a abertura da sessão; o teste confere o JSON enviado de verdade pelo cliente. */
class Events {
  static current: Events
  handlers = new Map<string, (event: { data: string }) => void>()
  constructor(_url: string) { Events.current = this }
  addEventListener(name: string, handler: (event: { data: string }) => void) { this.handlers.set(name, handler) }
  close() {}
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
