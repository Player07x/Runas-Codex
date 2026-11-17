import { vi } from "vitest"
import type { Session, WebContents } from "electron"
const notifications = vi.hoisted(() => ({ supported: true, shown: vi.fn() }))
vi.mock("electron", () => ({ Notification: class {
  static isSupported() { return notifications.supported }
  constructor(readonly options: unknown) {}
  show() { notifications.shown(this.options) }
} }))
import { configurePagePermissions, showAppNotification } from "../src/main/page-permissions"

describe("permissões e notificações no Electron", () => {
  it("consulta e pedido recusam dispositivos em qualquer janela e conservam cópia só na janela autorizada", () => {
    const request = vi.fn<Session["setPermissionRequestHandler"]>(), check = vi.fn<Session["setPermissionCheckHandler"]>()
    const own = {} as WebContents, other = {} as WebContents
    configurePagePermissions({ setPermissionRequestHandler: request, setPermissionCheckHandler: check }, contents => contents === own)
    const onRequest = request.mock.calls[0]![0]!, onCheck = check.mock.calls[0]![0]!
    for (const permission of ["media", "geolocation", "notifications", "clipboard-sanitized-write"] as const) {
      for (const contents of [own, other]) {
        const expected = contents === own && permission === "clipboard-sanitized-write", answer = vi.fn()
        onRequest(contents, permission, answer, { requestingUrl: "file:///app/index.html", isMainFrame: true })
        expect(answer).toHaveBeenCalledExactlyOnceWith(expected)
        expect(onCheck(contents, permission, "file://", { isMainFrame: true })).toBe(expected)
      }
    }
    expect(onCheck(null, "clipboard-sanitized-write", "", { isMainFrame: true })).toBe(false)
  })
  it("emite a notificação nativa validada e não emite nada para entrada inválida ou sistema sem suporte", () => {
    notifications.shown.mockClear()
    showAppNotification("Sala interrompida", "Reconectar")
    expect(notifications.shown).toHaveBeenCalledExactlyOnceWith({ title: "Sala interrompida", body: "Reconectar" })
    expect(() => showAppNotification({}, "texto")).toThrow()
    notifications.supported = false
    showAppNotification("Sala interrompida", "Reconectar")
    expect(notifications.shown).toHaveBeenCalledTimes(1)
    notifications.supported = true
  })
})
