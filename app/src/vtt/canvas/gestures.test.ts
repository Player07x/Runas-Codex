import { LONG_PRESS_MS, TouchGestures } from "./gestures"
const sample = (id: number, x = 10, y = 20, time = 0) => ({ id, x, y, time })
describe("Gestos da mesa", () => {
  it("não edita no primeiro toque e reconhece um toque curto", () => {
    const g = new TouchGestures()
    expect(g.down(sample(1))).toEqual([])
    expect(g.move(sample(1, 12, 21))).toEqual([])
    expect(g.up(sample(1, 12, 21, 100)).map(e => e.type)).toEqual(["tap"])
  })
  it("inicia o arrasto no ponto original depois da tolerância", () => {
    const g = new TouchGestures(); g.down(sample(1))
    expect(g.move(sample(1, 30, 25))).toEqual([{ type: "start", origin: { x: 10, y: 20 }, point: { x: 10, y: 20 } }, { type: "move", origin: { x: 10, y: 20 }, point: { x: 30, y: 25 } }])
    expect(g.up(sample(1, 40, 25)).map(e => e.type)).toEqual(["end"])
  })
  it("reconhece toque longo uma vez e não dispara clique ao soltar", () => {
    const g = new TouchGestures(); g.down(sample(1))
    expect(g.tick(LONG_PRESS_MS - 1)).toEqual([])
    expect(g.tick(LONG_PRESS_MS)[0].type).toBe("longpress")
    expect(g.tick(2000)).toEqual([])
    expect(g.up(sample(1))).toEqual([])
  })
  it("cancela o toque longo ao começar a arrastar", () => {
    const g = new TouchGestures(); g.down(sample(1)); g.move(sample(1, 30))
    expect(g.tick(2000)).toEqual([])
  })
  it("o segundo dedo cancela o arrasto e a pinça também acompanha o deslocamento", () => {
    const g = new TouchGestures(); g.down(sample(1)); g.move(sample(1, 30))
    expect(g.down(sample(2, 50)).map(e => e.type)).toEqual(["cancel", "pinchstart"])
    expect(g.move(sample(1, 40))[0]).toEqual({ type: "pinchmove", first: { x: 40, y: 20 }, second: { x: 50, y: 20 } })
    expect(g.move(sample(2, 60))[0]).toEqual({ type: "pinchmove", first: { x: 40, y: 20 }, second: { x: 60, y: 20 } })
  })
  it("não desenha nem clica com o dedo restante depois da pinça", () => {
    const g = new TouchGestures(); g.down(sample(1)); g.down(sample(2, 60))
    expect(g.up(sample(2))[0].type).toBe("pinchend")
    expect(g.move(sample(1, 100))).toEqual([])
    expect(g.down(sample(3))).toEqual([])
    expect(g.up(sample(3))).toEqual([])
    expect(g.up(sample(1))).toEqual([])
    g.down(sample(4)); expect(g.up(sample(4))[0].type).toBe("tap")
  })
  it("cancelamento e perda de captura nunca confirmam uma edição", () => {
    const g = new TouchGestures(); g.down(sample(1)); g.move(sample(1, 40))
    expect(g.up(sample(1), true)).toEqual([{ type: "cancel" }])
    expect(g.up(sample(1))).toEqual([])
    g.down(sample(2)); g.reset(); expect(g.up(sample(2))).toEqual([])
  })
  it("aceita o terceiro dedo sem trocar o par e sem disparar ações extras", () => {
    const g = new TouchGestures(); g.down(sample(1)); g.down(sample(2, 50)); expect(g.down(sample(3, 80))).toEqual([])
    expect(g.up(sample(3))[0].type).toBe("pinchend")
    expect(g.move(sample(1, 100))).toEqual([])
  })
})
