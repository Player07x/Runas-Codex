import { replaceFile } from "../src/main/replace-file"

const busy = (code: string) => Object.assign(new Error(`${code}: operation not permitted, rename`), { code })

describe("replaceFile", () => {
  it("no Windows, espera a leitura de outro programa terminar e troca o arquivo", async () => {
    const waits: number[] = []
    let calls = 0
    const rename = async () => {
      calls++
      if (calls < 3) throw busy("EPERM")
    }
    await replaceFile("a.tmp", "a.md", { platform: "win32", rename, wait: async ms => { waits.push(ms) } })
    expect(calls).toBe(3)
    expect(waits).toEqual([50, 100])
  })

  it("no Windows, desiste depois de ~6 s com o erro original (U91: o antivírus pode segurar o arquivo novo)", async () => {
    let calls = 0, waited = 0
    const rename = async () => { calls++; throw busy("EBUSY") }
    await expect(replaceFile("a.tmp", "a.md", { platform: "win32", rename, wait: async ms => { waited += ms } })).rejects.toThrow("EBUSY")
    expect(calls).toBe(16)
    expect(waited).toBeGreaterThan(5_000)
    expect(waited).toBeLessThan(7_000)
  })

  it("não repete erros que não são de arquivo ocupado", async () => {
    let calls = 0
    const rename = async () => { calls++; throw busy("ENOENT") }
    await expect(replaceFile("a.tmp", "a.md", { platform: "win32", rename, wait: async () => {} })).rejects.toThrow("ENOENT")
    expect(calls).toBe(1)
  })

  it("fora do Windows, o primeiro erro já é a resposta", async () => {
    let calls = 0
    const rename = async () => { calls++; throw busy("EPERM") }
    await expect(replaceFile("a.tmp", "a.md", { platform: "linux", rename, wait: async () => {} })).rejects.toThrow("EPERM")
    expect(calls).toBe(1)
  })
})
