/**
 * Largura e altura de uma imagem lendo só o cabeçalho (PNG, JPEG, GIF e WebP), sem decodificar. O conversor do
 * Leaflet precisa delas: as coordenadas dos marcadores dependem do tamanho da imagem em pixels.
 */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const ascii = (at: number, length: number) => String.fromCharCode(...bytes.subarray(at, at + length))
  const ok = (width: number, height: number) => (width > 0 && height > 0 ? { width, height } : null)

  if (bytes.length >= 24 && ascii(1, 3) === "PNG" && ascii(12, 4) === "IHDR") return ok(view.getUint32(16), view.getUint32(20))
  if (bytes.length >= 10 && ascii(0, 3) === "GIF") return ok(view.getUint16(6, true), view.getUint16(8, true))
  if (bytes.length >= 30 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    const chunk = ascii(12, 4)
    if (chunk === "VP8X") return ok(1 + (bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16)), 1 + (bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16)))
    if (chunk === "VP8 ") return ok(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff)
    if (chunk === "VP8L") {
      const b = view.getUint32(21, true)
      return ok((b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1)
    }
    return null
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    // Segmentos até o SOF (início do quadro), que tem altura e largura.
    let at = 2
    while (at + 9 < bytes.length) {
      if (bytes[at] !== 0xff) return null
      const marker = bytes[at + 1]!
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
        at += 2
        continue
      }
      const length = view.getUint16(at + 2)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return ok(view.getUint16(at + 7), view.getUint16(at + 5))
      at += 2 + length
    }
  }
  return null
}
