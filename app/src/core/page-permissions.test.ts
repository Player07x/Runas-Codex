import { appNotification, pagePermissionAllowed } from "./page-permissions"

describe("permissões das páginas", () => {
  it.each(["media", "camera", "microphone", "geolocation", "notifications", "clipboard-read", "unknown"])("recusa %s mesmo numa janela do app", permission => {
    expect(pagePermissionAllowed(permission, true)).toBe(false)
    expect(pagePermissionAllowed(permission, false)).toBe(false)
  })
  it("permite só escrever texto na área de transferência de uma janela conhecida", () => {
    expect(pagePermissionAllowed("clipboard-sanitized-write", true)).toBe(true)
    expect(pagePermissionAllowed("clipboard-sanitized-write", false)).toBe(false)
  })
  it("valida as notificações nativas sem aceitar objetos ou textos sem limite", () => {
    expect(appNotification("Sala interrompida", "Reconecte a sala.")).toEqual({ title: "Sala interrompida", body: "Reconecte a sala." })
    for (const [title, body] of [[{}, "texto"], ["", "texto"], [" ", "texto"], ["x".repeat(201), "texto"], ["título", {}], ["título", "x".repeat(2001)]]) {
      expect(() => appNotification(title, body)).toThrow("Texto inválido")
    }
  })
})
