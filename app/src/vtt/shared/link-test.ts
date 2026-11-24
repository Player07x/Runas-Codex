import type { LinkTestResult } from "./ipc"

// O nome *.trycloudflare.com só existe alguns segundos depois de o túnel abrir. Perguntado antes, o DNS responde “não
// existe” e guarda essa resposta por até 60 s (TTL negativo do SOA de trycloudflare.com): nesse minuto, testar de novo
// falha na hora sem perguntar à Cloudflare. O erro chega com textos diferentes no Android e no Electron.
const DNS_NOT_FOUND = /unable to resolve host|no address associated|ENOTFOUND|EAI_NONAME|EAI_AGAIN|getaddrinfo/i

export function isDnsNotFound(error: string | undefined): boolean {
  return error !== undefined && DNS_NOT_FOUND.test(error)
}

/** O texto do painel depois do “Testar link”. */
export function linkTestMessage(result: LinkTestResult): string {
  if (result.ok) return `O link responde: ${result.ms} ms do seu computador até a mesa, passando pela Cloudflare. Se um jogador ainda não abrir, o bloqueio está na rede dele: alguns provedores, DNS de filtro e antivírus barram trycloudflare.com. Peça para testar em dados móveis ou com o DNS 1.1.1.1.`
  if (isDnsNotFound(result.error)) return "O endereço do link ainda não existe para o DNS deste aparelho. Um link novo leva alguns segundos para ser publicado, e o aparelho guarda a resposta “não existe” por até um minuto: tente de novo daqui a um minuto. Se continuar, confira a internet deste aparelho."
  return `O link não respondeu: ${(result.error ?? "erro desconhecido").replace(/\.$/, "")}.`
}
