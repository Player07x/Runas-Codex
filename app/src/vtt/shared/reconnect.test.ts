import { describe, expect, it } from "vitest"
import { DEAD_AFTER_MS, RECONNECT_MAX_MS, RECONNECT_MIN_MS, connectionIsDead, reconnectDelay } from "./reconnect"

describe("espera antes de religar o WebSocket", () => {
  it("dobra a cada tentativa, com o sorteio entre metade e o total", () => {
    expect([0, 1, 2, 3].map((attempt) => reconnectDelay(attempt, () => 1))).toEqual([1000, 2000, 4000, 8000])
    expect([0, 1, 2, 3].map((attempt) => reconnectDelay(attempt, () => 0))).toEqual([500, 1000, 2000, 4000])
  })

  it("nunca passa do teto, por mais tentativas que haja", () => {
    for (const attempt of [4, 5, 20, 1000]) {
      expect(reconnectDelay(attempt, () => 1)).toBe(RECONNECT_MAX_MS)
      expect(reconnectDelay(attempt, () => 0)).toBe(RECONNECT_MAX_MS / 2)
    }
  })

  it("fica sempre dentro do intervalo e aceita entrada estranha", () => {
    for (const attempt of [-3, 0, 1.7, Number.NaN, Number.POSITIVE_INFINITY]) {
      const delay = reconnectDelay(attempt)
      expect(delay).toBeGreaterThanOrEqual(RECONNECT_MIN_MS / 2)
      expect(delay).toBeLessThanOrEqual(RECONNECT_MAX_MS)
    }
  })
})

describe("conexão semimorta", () => {
  it("só é dada como morta depois do prazo sem mensagens", () => {
    expect(connectionIsDead(1000, 1000 + DEAD_AFTER_MS)).toBe(false)
    expect(connectionIsDead(1000, 1001 + DEAD_AFTER_MS)).toBe(true)
  })
})
