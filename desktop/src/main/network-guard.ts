import type { Session } from "electron"

const UPDATE_HOSTS = new Set(["api.github.com", "github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"])

function privateIpv4(host: string): boolean {
  const parts = host.split(".").map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  return parts[0] === 10 || parts[0] === 127 || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 172 && parts[1]! >= 16 && parts[1]! <= 31)
}

/** Hosts permitidos pelo smoke: sala local, Quick Tunnel e consulta/baixamento explícito de atualização. */
export function networkRequestAllowed(raw: string): boolean {
  let url: URL
  try { url = new URL(raw) } catch { return true }
  if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) return true
  const host = url.hostname.toLowerCase()
  return host === "localhost" || host === "::1" || privateIpv4(host) || host.endsWith(".trycloudflare.com") || UPDATE_HOSTS.has(host)
}

export interface NetworkReport { requests: number; violations: string[] }

/** Guarda usada somente pelo `--smoke`; não altera o tráfego do app em uso. */
export class NetworkGuard {
  private requests = 0
  private violations: string[] = []

  attach(target: Session): void {
    target.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] }, (details, callback) => {
      this.requests++
      if (!networkRequestAllowed(details.url)) this.violations.push(details.url)
      callback({ cancel: false })
    })
  }

  report(): NetworkReport { return { requests: this.requests, violations: [...this.violations] } }
}
