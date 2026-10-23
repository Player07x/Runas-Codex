import { describe, expect, it } from "vitest"
import { networkRequestAllowed } from "../src/main/network-guard"

describe("guarda de rede do smoke", () => {
  it("permite somente sala, Cloudflare Quick Tunnel e atualizações oficiais", () => {
    expect(networkRequestAllowed("http://127.0.0.1:30000/?k=x")).toBe(true)
    expect(networkRequestAllowed("http://192.168.1.20:30000/socket")).toBe(true)
    expect(networkRequestAllowed("https://mesa.trycloudflare.com/?k=x")).toBe(true)
    expect(networkRequestAllowed("https://api.github.com/repos/Player07x/Runas-Codex/releases")).toBe(true)
    expect(networkRequestAllowed("https://example.com/telemetry")).toBe(false)
  })
})
