import { describe, expect, it } from "vitest"
import { isSoftwareRenderer } from "./gpu"

describe("WebGL sem placa de vídeo (U48)", () => {
  it("reconhece os renderizadores feitos pela CPU", () => {
    expect(isSoftwareRenderer("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)")).toBe(true)
    expect(isSoftwareRenderer("llvmpipe (LLVM 15.0.7, 256 bits)")).toBe(true)
    expect(isSoftwareRenderer("ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0)")).toBe(true)
  })
  it("placa de vídeo de verdade não conta", () => {
    expect(isSoftwareRenderer("ANGLE (Intel, Mesa Intel(R) UHD Graphics 620 (KBL GT2), OpenGL 4.6)")).toBe(false)
    expect(isSoftwareRenderer("ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)")).toBe(false)
  })
})
