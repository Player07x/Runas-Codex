import type { NetworkInterfaceInfo } from "node:os"
import { describe, expect, it } from "vitest"
import { pickLanAddress } from "../../src/main/vtt/network-address"

function v4(address: string, internal = false): NetworkInterfaceInfo {
  return { address, netmask: "255.255.255.0", family: "IPv4", mac: "00:00:00:00:00:00", internal, cidr: `${address}/24` }
}

describe("endereço da rede local", () => {
  it("escolhe a Wi-Fi, e não a ponte do Docker que vem antes dela", () => {
    expect(pickLanAddress({ lo: [v4("127.0.0.1", true)], docker0: [v4("172.17.0.1")], "br-1a2b3c": [v4("172.18.0.1")], virbr0: [v4("192.168.122.1")], wlp0s20f3: [v4("10.4.1.124")] })).toBe("10.4.1.124")
  })

  it("ignora VPN, túnel e link-local", () => {
    expect(pickLanAddress({ tailscale0: [v4("100.101.102.103")], wg0: [v4("10.8.0.2")], enp7s0: [v4("169.254.10.20")], eth0: [v4("192.168.0.15")] })).toBe("192.168.0.15")
  })

  it("nomes do Windows e do macOS: entra a Wi-Fi, saem WSL e VirtualBox", () => {
    expect(pickLanAddress({ "vEthernet (WSL)": [v4("172.24.16.1")], "VirtualBox Host-Only Network": [v4("192.168.56.1")], "Wi-Fi": [v4("192.168.1.20")] })).toBe("192.168.1.20")
    expect(pickLanAddress({ utun3: [v4("10.9.0.2")], en0: [v4("192.168.1.30")] })).toBe("192.168.1.30")
  })

  it("prefere endereço privado numa placa física a um público", () => {
    expect(pickLanAddress({ eth0: [v4("203.0.113.9")], wlan0: [v4("192.168.1.7")] })).toBe("192.168.1.7")
  })

  it("com só uma interface estranha, ainda usa o que houver; sem rede, devolve null", () => {
    expect(pickLanAddress({ lo: [v4("127.0.0.1", true)], usb0: [v4("192.168.42.5")] })).toBe("192.168.42.5")
    expect(pickLanAddress({ lo: [v4("127.0.0.1", true)] })).toBeNull()
    expect(pickLanAddress({})).toBeNull()
  })
})
