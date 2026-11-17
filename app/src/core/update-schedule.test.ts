import { describe, expect, it } from "vitest"
import { dayKey, installable, parseUpdateMemory, rememberCheck, rememberedUpdate, serializeUpdateMemory, shouldAutoCheck } from "./update-schedule"
import type { UpdateInfo } from "./updates"

const release = (version: string) => ({ tag: `v${version}`, version, prerelease: false, notes: "", url: "", publishedAt: "", assets: [] })
const asset = { name: "Runas-Codex-Setup-1.5.0.exe", size: 10, url: "https://github.com/x" }
const sums = { name: "SHA256SUMS.txt", size: 1, url: "https://github.com/y" }
const info = (over: Partial<UpdateInfo>): UpdateInfo => ({ current: "1.4.0", latest: release("1.5.0"), newer: true, asset, checksums: sums, ...over })

describe("aviso de atualização: quando consultar", () => {
  it("usa o dia local no formato das datas do cofre", () => {
    expect(dayKey(new Date(2026, 10, 7, 23, 59))).toBe("2026-11-07")
  })

  it("consulta uma vez por dia, só com a opção ligada", () => {
    const today = "2026-11-17"
    expect(shouldAutoCheck(true, { checkedOn: null, latest: null }, today)).toBe(true)
    expect(shouldAutoCheck(true, { checkedOn: "2026-11-16", latest: null }, today)).toBe(true)
    expect(shouldAutoCheck(true, { checkedOn: today, latest: null }, today)).toBe(false)
    expect(shouldAutoCheck(false, { checkedOn: null, latest: null }, today)).toBe(false)
  })

  it("lê o que ficou guardado e ignora valores estranhos", () => {
    const memory = { checkedOn: "2026-11-17", latest: "1.5.0" }
    expect(parseUpdateMemory(serializeUpdateMemory(memory))).toEqual(memory)
    expect(parseUpdateMemory(null)).toEqual({ checkedOn: null, latest: null })
    expect(parseUpdateMemory("{quebrado")).toEqual({ checkedOn: null, latest: null })
    expect(parseUpdateMemory(JSON.stringify({ checkedOn: "ontem", latest: "nova" }))).toEqual({ checkedOn: null, latest: null })
  })
})

describe("aviso de atualização: o que mostrar", () => {
  it("só lembra a versão que tem instalador e soma SHA-256 para este sistema", () => {
    expect(rememberCheck(info({}), "2026-11-17")).toEqual({ checkedOn: "2026-11-17", latest: "1.5.0" })
    expect(rememberCheck(info({ asset: null }), "2026-11-17").latest).toBeNull()
    expect(rememberCheck(info({ checksums: null }), "2026-11-17").latest).toBeNull()
    expect(rememberCheck(info({ newer: false }), "2026-11-17").latest).toBeNull()
    expect(installable(null)).toBe(false)
  })

  it("o aviso some depois de atualizar", () => {
    const memory = { checkedOn: "2026-11-17", latest: "1.5.0" }
    expect(rememberedUpdate(memory, "1.4.0")).toBe("1.5.0")
    expect(rememberedUpdate(memory, "1.5.0")).toBeNull()
    expect(rememberedUpdate(memory, "")).toBeNull()
    expect(rememberedUpdate({ checkedOn: null, latest: null }, "1.4.0")).toBeNull()
  })
})
