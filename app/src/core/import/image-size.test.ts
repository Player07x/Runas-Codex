import { imageSize } from "./image-size"

const bytes = (...parts: (number[] | string)[]) => new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)))
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
const u16be = (n: number) => [(n >> 8) & 255, n & 255]
const u16le = (n: number) => [n & 255, (n >> 8) & 255]

describe("tamanho da imagem pelo cabeçalho", () => {
  it("PNG", () => {
    expect(imageSize(bytes([0x89], "PNG\r\n\x1a\n", u32(13), "IHDR", u32(2048), u32(1024), [8, 6, 0, 0, 0]))).toEqual({ width: 2048, height: 1024 })
  })

  it("GIF", () => {
    expect(imageSize(bytes("GIF89a", u16le(320), u16le(200), [0, 0, 0]))).toEqual({ width: 320, height: 200 })
  })

  it("JPEG, pulando os segmentos antes do SOF", () => {
    const app0 = [0xff, 0xe0, ...u16be(16), ...new Array(14).fill(0)]
    const sof = [0xff, 0xc0, ...u16be(17), 8, ...u16be(1080), ...u16be(1920), 3]
    expect(imageSize(bytes([0xff, 0xd8], app0, sof, new Array(12).fill(0)))).toEqual({ width: 1920, height: 1080 })
  })

  it("WebP (VP8X)", () => {
    const w = 4095 - 1
    const h = 300 - 1
    expect(imageSize(bytes("RIFF", u32(0), "WEBP", "VP8X", u32(10), [0, 0, 0, 0], [w & 255, (w >> 8) & 255, w >> 16, h & 255, (h >> 8) & 255, h >> 16]))).toEqual({ width: 4095, height: 300 })
  })

  it("devolve null para o que não conhece", () => {
    expect(imageSize(bytes("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull()
    expect(imageSize(new Uint8Array())).toBeNull()
  })
})
