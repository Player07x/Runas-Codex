import { vi } from "vitest"
vi.mock("electron", () => ({ BrowserWindow: vi.fn() }))
import { SMOKE_SCRIPT } from "../src/main/smoke"

it("monta o roteiro completo do Electron sem colisões entre as etapas", () => {
  expect(() => new Function(SMOKE_SCRIPT)).not.toThrow()
})
