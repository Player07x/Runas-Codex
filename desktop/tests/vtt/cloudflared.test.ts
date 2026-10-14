import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { EDGE_BLOCKED_MESSAGE, edgeFailures, parseTunnelDetails, publicPlayerUrl, quickTunnelUrl, releaseChecksum, startCloudflared, tunnelArgs } from "../../src/main/vtt/cloudflared"

describe("checksum do release do cloudflared", () => {
  it("lê o SHA-256 publicado para o asset exato", () => {
    const body = [
      "### SHA256 Checksums:",
      "```",
      "cloudflared-windows-386.exe: 11b6e4b2d306950bd87e7caa4deee8e80a32d71ffee555a96237a76651eeae4c",
      "cloudflared-windows-amd64.exe: 2837888cc0f5d58f15b6dc478376de90b4d3ba5241c7947455d1e0a0df429712",
      "```",
    ].join("\n")
    expect(releaseChecksum(body, "cloudflared-windows-amd64.exe")).toBe("2837888cc0f5d58f15b6dc478376de90b4d3ba5241c7947455d1e0a0df429712")
  })

  it("não confunde um nome parecido", () => {
    expect(releaseChecksum("cloudflared-windows-amd64.exe.old: " + "a".repeat(64), "cloudflared-windows-amd64.exe")).toBeNull()
  })
})

describe("link público do Quick Tunnel", () => {
  it("encontra o endereço do túnel na saída do cloudflared", () => {
    const output = [
      "INF Requesting new quick Tunnel on trycloudflare.com...",
      "INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |",
      "INF |  https://wanna-pixel-cubic-randy.trycloudflare.com                                         |",
    ].join("\n")
    expect(quickTunnelUrl(output)).toBe("https://wanna-pixel-cubic-randy.trycloudflare.com")
  })

  it("ignora a API do trycloudflare", () => {
    expect(quickTunnelUrl("ERR failed to request https://api.trycloudflare.com/tunnel")).toBeNull()
  })

  it("leva a chave da sessão, sem a qual o servidor recusa o espectador", () => {
    expect(publicPlayerUrl("https://abc-def.trycloudflare.com", "0123abcd")).toBe("https://abc-def.trycloudflare.com/?k=0123abcd")
  })
})

const REGISTERED = "2026-09-24T20:00:00Z INF Registered tunnel connection connIndex=0 connection=abc event=0 ip=198.41.192.7 location=gru01 protocol=http2"

describe("túnel no Linux", () => {
  it("usa HTTP/2 no Linux, para não depender do buffer UDP do kernel, e o padrão nos outros sistemas", () => {
    expect(tunnelArgs(30000, "linux")).toEqual(["tunnel", "--no-autoupdate", "--protocol", "http2", "--url", "http://127.0.0.1:30000"])
    expect(tunnelArgs(30000, "win32")).toEqual(["tunnel", "--no-autoupdate", "--url", "http://127.0.0.1:30000"])
    expect(tunnelArgs(30000, "darwin")).not.toContain("--protocol")
  })

  it("lê a borda e o protocolo da linha de registro", () => {
    expect(parseTunnelDetails(`INF algo\n${REGISTERED}\nINF fim`)).toEqual({ location: "gru01", protocol: "http2" })
    expect(parseTunnelDetails("INF Registered tunnel connection connIndex=1")).toEqual({ location: null, protocol: null })
    expect(parseTunnelDetails("INF Requesting new quick Tunnel")).toBeNull()
  })

  it.skipIf(process.platform === "win32")("avisa quando o cloudflared morre depois de criado o túnel", async () => {
    const directory = await mkdtemp(join(tmpdir(), "runas-vtt-cloudflared-"))
    try {
      const fake = join(directory, "fake-cloudflared.sh")
      await writeFile(fake, `#!/bin/sh\necho "INF |  https://fake-tunnel-abc.trycloudflare.com  |"\necho "${REGISTERED}" >&2\nsleep 0.2\nexit 3\n`)
      await chmod(fake, 0o700)
      const exits: (number | null)[] = []
      const tunnel = startCloudflared(fake, 30000, { onExit: (code) => { exits.push(code) } })
      expect(await tunnel.url).toBe("https://fake-tunnel-abc.trycloudflare.com")
      expect(tunnel.details()).toEqual({ location: "gru01", protocol: "http2" })
      await new Promise<void>((resolve) => tunnel.process.once("exit", () => resolve()))
      expect(exits).toEqual([3])
    } finally { await rm(directory, { recursive: true, force: true }) }
  })

  it.skipIf(process.platform === "win32")("não chama onExit se o processo morreu antes de criar o túnel", async () => {
    const directory = await mkdtemp(join(tmpdir(), "runas-vtt-cloudflared-"))
    try {
      const fake = join(directory, "fake-cloudflared.sh")
      await writeFile(fake, "#!/bin/sh\nexit 1\n")
      await chmod(fake, 0o700)
      let called = false
      const tunnel = startCloudflared(fake, 30000, { onExit: () => { called = true } })
      await expect(tunnel.url).rejects.toThrow(/encerrou antes de criar o túnel/)
      expect(called).toBe(false)
    } finally { await rm(directory, { recursive: true, force: true }) }
  })

  it("conta as falhas de conexão com a borda da Cloudflare", () => {
    const line = 'ERR Unable to establish connection with Cloudflare edge error="DialContext error: dial tcp 198.41.192.167:7844: i/o timeout" connIndex=0'
    expect(edgeFailures(`${line}\nINF Retrying\n${line}`)).toBe(2)
    expect(edgeFailures("INF Registered tunnel connection")).toBe(0)
  })

  async function withFake(script: string, run: (fake: string) => Promise<void>): Promise<void> {
    const directory = await mkdtemp(join(tmpdir(), "runas-vtt-cloudflared-"))
    try {
      const fake = join(directory, "fake-cloudflared.sh")
      await writeFile(fake, script)
      await chmod(fake, 0o700)
      await run(fake)
    } finally { await rm(directory, { recursive: true, force: true }) }
  }

  it.skipIf(process.platform === "win32")("rede que bloqueia a porta 7844: falha logo, com o motivo, e encerra o processo", async () => {
    const blocked = 'echo "ERR Unable to establish connection with Cloudflare edge error=timeout connIndex=0" >&2'
    await withFake(`#!/bin/sh\n${blocked}\nsleep 0.1\n${blocked}\nsleep 30\n`, async (fake) => {
      const tunnel = startCloudflared(fake, 30000)
      await expect(tunnel.url).rejects.toThrow(EDGE_BLOCKED_MESSAGE)
      await new Promise<void>((resolve) => { if (tunnel.process.exitCode !== null || tunnel.process.signalCode !== null) resolve(); else tunnel.process.once("exit", () => resolve()) })
      expect(tunnel.process.killed).toBe(true)
    })
  })

  it.skipIf(process.platform === "win32")("desiste depois do tempo limite em vez de ficar gerando o link para sempre", async () => {
    await withFake("#!/bin/sh\nsleep 30\n", async (fake) => {
      const tunnel = startCloudflared(fake, 30000, { timeoutMs: 150 })
      await expect(tunnel.url).rejects.toThrow(/não ficou pronto/)
      expect(tunnel.process.killed).toBe(true)
    })
  })
})
