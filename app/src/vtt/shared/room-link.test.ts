import { describe, expect, it } from "vitest"
import { isRoomHost, parseRoomLink } from "./room-link"

describe("link colado no Entrar Sala (U47)", () => {
  it("aceita o link do jogador como antes, com ou sem http://", () => {
    expect(parseRoomLink("192.168.0.12:30000/?k=abc")).toEqual({ url: "http://192.168.0.12:30000/?k=abc", master: false })
    expect(parseRoomLink("https://x-y.trycloudflare.com/?k=abc").master).toBe(false)
  })

  it("reconhece o link do mestre e tira o link do meio de uma mensagem", () => {
    const pasted = "Oi! Abre isto para comandar a mesa: http://192.168.0.12:30000/master?m=chave123. Valeu"
    expect(parseRoomLink(pasted)).toEqual({ url: "http://192.168.0.12:30000/master?m=chave123", master: true })
    expect(parseRoomLink("https://abc.trycloudflare.com/master?m=x").master).toBe(true)
  })

  it("recusa link de mestre fora da rede local e do túnel da sala", () => {
    expect(() => parseRoomLink("https://exemplo.com/master?m=x")).toThrow(/rede local/)
    expect(() => parseRoomLink("http://8.8.8.8:30000/master?m=x")).toThrow(/rede local/)
  })

  it("recusa link sem chave e com usuário embutido", () => {
    expect(() => parseRoomLink("http://192.168.0.12:30000/")).toThrow(/\?k=/)
    expect(() => parseRoomLink("http://a:b@192.168.0.12:30000/?k=x")).toThrow(/inválido/)
    expect(() => parseRoomLink("")).toThrow()
  })

  it("só a rede local e o túnel contam como endereço da sala", () => {
    expect(["10.0.0.5", "172.20.1.1", "192.168.1.8", "127.0.0.1", "localhost", "mesa.local", "a.trycloudflare.com"].every(isRoomHost)).toBe(true)
    expect(["172.32.0.1", "8.8.8.8", "trycloudflare.com.evil.io", "192.168.1"].some(isRoomHost)).toBe(false)
  })
})
