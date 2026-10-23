import { checkPin, createPin, lockoutSeconds, pinProblem } from "./pin"

describe("PIN do espaço Notas", () => {
  it("aceita de 4 a 8 algarismos", () => {
    expect(pinProblem("1234")).toBeNull()
    expect(pinProblem("12345678")).toBeNull()
    for (const bad of ["123", "123456789", "12a4", " 1234", ""]) expect(pinProblem(bad)).not.toBeNull()
  })

  it("guarda só o hash com sal, e confere o PIN certo", async () => {
    const stored = await createPin("2468")
    // O hash é aleatório: procurar o texto do PIN nele deixava o teste instável.
    expect(stored.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(stored.salt).toMatch(/^[0-9a-f]{32}$/)
    expect(await checkPin("2468", stored)).toBe(true)
    expect(await checkPin("2469", stored)).toBe(false)
    // O mesmo PIN com outro sal dá outro hash.
    expect((await createPin("2468")).hash).not.toBe(stored.hash)
  })

  it("recusa PIN fora do formato ao criar", async () => {
    await expect(createPin("12")).rejects.toThrow("4 a 8")
  })

  it("espera 30 s a partir da quinta tentativa errada", () => {
    expect([0, 4, 5, 9].map(lockoutSeconds)).toEqual([0, 0, 30, 30])
  })
})
