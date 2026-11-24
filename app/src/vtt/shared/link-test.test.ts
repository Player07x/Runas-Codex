import { isDnsNotFound, linkTestMessage } from "./link-test"

describe("mensagem do “Testar link”", () => {
  it("reconhece o nome que ainda não existe no DNS, no Android e no Electron", () => {
    expect(isDnsNotFound('Unable to resolve host "a-b-c.trycloudflare.com": No address associated with hostname')).toBe(true)
    expect(isDnsNotFound("fetch failed (ENOTFOUND)")).toBe(true)
    expect(isDnsNotFound("getaddrinfo EAI_AGAIN a-b-c.trycloudflare.com")).toBe(true)
    expect(isDnsNotFound("O túnel respondeu 502.")).toBe(false)
    expect(isDnsNotFound("timeout")).toBe(false)
    expect(isDnsNotFound(undefined)).toBe(false)
  })

  it("pede um minuto (ou a internet) quando o DNS ainda não conhece o link, sem chamar de link quebrado", () => {
    const text = linkTestMessage({ ok: false, ms: 61, error: 'Unable to resolve host "a-b-c.trycloudflare.com": No address associated with hostname' })
    expect(text).toContain("tente de novo daqui a um minuto")
    expect(text).toContain("confira a internet deste aparelho")
    expect(text).not.toContain("O link não respondeu")
  })

  it("mantém o texto de sucesso e o de falha com o erro", () => {
    expect(linkTestMessage({ ok: true, ms: 230 })).toMatch(/^O link responde: 230 ms/)
    expect(linkTestMessage({ ok: false, ms: 10000, error: "O túnel respondeu 502." })).toBe("O link não respondeu: O túnel respondeu 502.")
  })
})
