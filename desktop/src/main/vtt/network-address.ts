import type { NetworkInterfaceInfo } from "node:os"

/**
 * Interfaces que nunca são a rede onde os jogadores estão: pontes de
 * contêiner e de máquina virtual, VPNs e túneis. No Linux, `docker0` ou
 * `virbr0` costumam vir antes da Wi-Fi e davam um link e um QR code que
 * nenhum celular consegue abrir.
 */
const VIRTUAL_INTERFACE = /^(docker|br-|veth|virbr|vmnet|vboxnet|tun|tap|tailscale|wg|zt|utun|awdl|llw|anpi|bridge|lxc|lxd|cni|flannel|kube)|vethernet|virtual|vmware|hyper-v|wsl|bluetooth|loopback|pseudo/i

/** Nomes de placa de rede física: Wi-Fi e Ethernet no Linux, macOS e Windows. */
const PHYSICAL_INTERFACE = /^(wl|en|eth|wlan|wi-?fi|ethernet)/i

function isPrivate(address: string): boolean {
  const [first = 0, second = 0] = address.split(".").map(Number)
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168)
}

/**
 * Endereço IPv4 da rede local para o link e o QR code, ou `null` sem rede.
 *
 * Prefere endereço privado numa placa física; depois privado em qualquer
 * outra; por último o que sobrar. Empates ficam com a primeira interface.
 */
export function pickLanAddress(interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>): string | null {
  let best: { address: string; rank: number } | null = null
  for (const [name, entries] of Object.entries(interfaces)) {
    if (VIRTUAL_INTERFACE.test(name)) continue
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal || entry.address.startsWith("169.254.")) continue
      const rank = (isPrivate(entry.address) ? 0 : 2) + (PHYSICAL_INTERFACE.test(name) ? 0 : 1)
      if (!best || rank < best.rank) best = { address: entry.address, rank }
    }
  }
  return best?.address ?? null
}
