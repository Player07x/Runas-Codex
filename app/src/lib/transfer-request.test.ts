import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("./router", () => ({ navigate: vi.fn() }))
const { navigate } = await import("./router")
const { onTransferRequest, requestExport, takeTransferRequest } = await import("./transfer-request")

describe("atalhos de exportar (U54)", () => {
  afterEach(() => { takeTransferRequest(); vi.mocked(navigate).mockClear() })

  it("leva à tela de exportar e guarda o item até a tela ler uma vez", () => {
    requestExport({ items: ["wiki:Cronos"] })
    expect(navigate).toHaveBeenCalledWith("/transferir/exportar")
    expect(takeTransferRequest()).toEqual({ items: ["wiki:Cronos"] })
    expect(takeTransferRequest()).toBeNull()
  })

  it("avisa a tela já aberta", () => {
    const heard: unknown[] = []
    const stop = onTransferRequest(request => heard.push(request))
    requestExport({ paths: ["Notas/A.md", "Notas/Pasta"] })
    stop()
    requestExport({ paths: ["Notas/B.md"] })
    expect(heard).toEqual([{ paths: ["Notas/A.md", "Notas/Pasta"] }])
  })
})
