import type { AssetPath } from "./scene"
import type { PlayerProjection, PlayerWireMessage } from "./player"

export interface PlayerSeatConnection { slotId: string; label: string }
export interface JoinedPlayerSeat { seat: PlayerSeatConnection; token: string }
export interface PlayerTransportOptions {
  worldPath(): string | null
  projection(): PlayerProjection
  allowedAssets?(): readonly AssetPath[]
  snapshot(seat: PlayerSeatConnection | null): PlayerWireMessage
  onSpectators(count: number): void
  onPlayers?(count: number): void
  joinSeat?(code: string): JoinedPlayerSeat | null
  authenticateSeat?(token: string): PlayerSeatConnection | null
  onClientMessage?(message: unknown, seat: PlayerSeatConnection | null): PlayerWireMessage | null
}
export interface PlayerTransport {
  readonly spectatorCount: number
  readonly addressPort: number
  start(port: number, key: string): Promise<void>
  stop(): Promise<void>
  publish(message: PlayerWireMessage): void
  publishTo(message: (seat: PlayerSeatConnection | null) => PlayerWireMessage): void
}
