import { networkInterfaces } from "node:os"
import type { PlayerState } from "../../../../app/src/vtt/shared/ipc"
import { RoomAuthority } from "../../../../app/src/vtt/shared/room-authority"
import { PlayerServer } from "./player-server"
import { pickLanAddress } from "./network-address"
import type { WorldStore } from "./world-store"
import type { VisionService } from "./vision-service"
export type { MasterCamera } from "../../../../app/src/vtt/shared/room-authority"

/** No desktop, a mesma autoridade usa o HTTP do Node e os arquivos do Electron. */
export class PlayerTransmission extends RoomAuthority {
  constructor(store: WorldStore, staticRoot: string, onStateChange: (state: PlayerState) => void, vision: VisionService | null = null) {
    super(store, options => new PlayerServer({ ...options, staticRoot }), onStateChange, vision, () => pickLanAddress(networkInterfaces()) ?? "127.0.0.1")
  }
  setRoute(route: Parameters<PlayerServer["setRoute"]>[0]): void { (this.server as PlayerServer).setRoute(route) }
}
