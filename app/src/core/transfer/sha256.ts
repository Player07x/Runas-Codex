/**
 * SHA-256 em partes (U109). O `crypto.subtle.digest` só aceita o arquivo inteiro; para conferir o manifesto de um
 * pacote sem juntar uma imagem ou um áudio grande na memória da tela, o hash é calculado pedaço por pedaço.
 */
const K = Uint32Array.from([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n))

export class Sha256 {
  private readonly h = Uint32Array.from([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19])
  private readonly block = new Uint8Array(64)
  private readonly w = new Uint32Array(64)
  private filled = 0
  private length = 0
  private done = false

  update(bytes: Uint8Array): this {
    if (this.done) throw new Error("SHA-256 já finalizado.")
    this.length += bytes.length
    let at = 0
    if (this.filled) {
      const take = Math.min(64 - this.filled, bytes.length)
      this.block.set(bytes.subarray(0, take), this.filled)
      this.filled += take; at = take
      if (this.filled < 64) return this
      this.compress(this.block, 0); this.filled = 0
    }
    for (; at + 64 <= bytes.length; at += 64) this.compress(bytes, at)
    if (at < bytes.length) { this.block.set(bytes.subarray(at), 0); this.filled = bytes.length - at }
    return this
  }

  /** O hash em hexadecimal minúsculo, como no manifesto do pacote. */
  hex(): string {
    if (!this.done) {
      const bits = this.length * 8
      this.block[this.filled++] = 0x80
      if (this.filled > 56) { this.block.fill(0, this.filled); this.compress(this.block, 0); this.filled = 0 }
      this.block.fill(0, this.filled, 56)
      const view = new DataView(this.block.buffer)
      view.setUint32(56, Math.floor(bits / 0x100000000)); view.setUint32(60, bits >>> 0)
      this.compress(this.block, 0)
      this.done = true
    }
    return [...this.h].map((word) => word.toString(16).padStart(8, "0")).join("")
  }

  private compress(bytes: Uint8Array, offset: number) {
    const w = this.w, h = this.h
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4
      w[i] = (bytes[j]! << 24) | (bytes[j + 1]! << 16) | (bytes[j + 2]! << 8) | bytes[j + 3]!
    }
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15]!, b = w[i - 2]!
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3), s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10)
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) | 0
    }
    let a = h[0]!, b = h[1]!, c = h[2]!, d = h[3]!, e = h[4]!, f = h[5]!, g = h[6]!, k = h[7]!
    for (let i = 0; i < 64; i++) {
      const t1 = (k + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i]! + w[i]!) | 0
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0
      k = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0
    }
    h[0] = (h[0]! + a) | 0; h[1] = (h[1]! + b) | 0; h[2] = (h[2]! + c) | 0; h[3] = (h[3]! + d) | 0
    h[4] = (h[4]! + e) | 0; h[5] = (h[5]! + f) | 0; h[6] = (h[6]! + g) | 0; h[7] = (h[7]! + k) | 0
  }
}
