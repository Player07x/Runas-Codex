import type { ReactNode } from "react"
import { BrickWall, DoorClosed, DoorOpen, EyeOff, Lock, LockOpen, LocateFixed } from "lucide-react"
import type { WallData, WallKind } from "../shared/scene"
import type { DocumentInput } from "../shared/ipc"
import type { WorldDocument } from "../shared/world"

const GROUPS: { kind: WallKind; title: string; item: string; empty: string }[] = [
  { kind: "door", title: "Portas", item: "Porta", empty: "Nenhuma porta nesta cena. Desenhe uma com a ferramenta Paredes e portas." },
  { kind: "secret", title: "Portas secretas", item: "Porta secreta", empty: "Nenhuma porta secreta." },
  { kind: "wall", title: "Paredes", item: "Parede", empty: "Nenhuma parede." },
]

const cells = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${value === 1 ? "quadro" : "quadros"}`

/**
 * Lista de portas, portas secretas e paredes da cena (anexo 2, 25/11), na aba Portas e paredes do menu da direita
 * (1.9). Cada linha leva até o objeto no mapa e abre os campos dele ali mesmo; as portas abrem, fecham e trancam daqui.
 * Trancada, só o mestre abre; destrancada, o jogador abre e fecha clicando no ícone da porta (quando a vê). Portas
 * secretas e paredes nunca são dos jogadores.
 */
export function WallsPanel({ walls, cell, put, selected, onFocus, editor }: {
  walls: WorldDocument<WallData>[]; cell: number; put(input: DocumentInput): void
  /** A parede escolhida, que mostra os campos embaixo da linha. */
  selected: string | null; onFocus(id: string): void; editor(wall: WorldDocument<WallData>): ReactNode
}) {
  const update = (wall: WorldDocument<WallData>, patch: Partial<WallData>) => put({ id: wall.id, type: "wall", parentId: wall.parentId, data: { ...wall.data, ...patch } })
  const doors = walls.filter((wall) => wall.data.kind === "door")
  const all = (patch: Partial<WallData>) => { for (const door of doors) if (Object.entries(patch).some(([key, value]) => door.data[key as keyof WallData] !== value)) update(door, patch) }
  return <section className="scene-side-panel" aria-labelledby="scene-walls-title">
    <header className="panel-header">
      <div><p className="eyebrow">Cena</p><h2 id="scene-walls-title">Portas e paredes</h2></div>
    </header>
    {doors.length > 1 && <div className="row-actions scene-walls-bulk" role="group" aria-label="Todas as portas">
      <button className="ghost" onClick={() => all({ doorLocked: true })}><Lock size={14} /> Trancar todas</button>
      <button className="ghost" onClick={() => all({ doorLocked: false })}><LockOpen size={14} /> Destrancar todas</button>
      <button className="ghost" onClick={() => all({ open: false })}><DoorClosed size={14} /> Fechar todas</button>
    </div>}
    {GROUPS.map((group) => {
      const items = walls.filter((wall) => wall.data.kind === group.kind)
      // Paredes costumam ser dezenas de trechos: ficam recolhidas (a escolhida abre o grupo).
      return <details key={group.kind} className="scene-walls-group" open={group.kind !== "wall" || items.some((wall) => wall.id === selected)}>
        <summary>{group.title} · {items.length}</summary>
        {!items.length ? <p className="hint">{group.empty}</p> : <ul>
          {items.map((wall, index) => {
            const name = `${group.item} ${index + 1}`
            const length = Math.hypot(wall.data.x2 - wall.data.x1, wall.data.y2 - wall.data.y1) / cell
            const open = wall.id === selected
            return <li key={wall.id} className={`${wall.data.open ? "open" : ""} ${open ? "selected" : ""}`}>
              <div className="scene-walls-line">
                <button className="scene-walls-name" title="Mostrar no mapa e editar" aria-expanded={open} onClick={() => onFocus(wall.id)}>
                  {group.kind === "wall" ? <BrickWall size={15} aria-hidden="true" /> : wall.data.open ? <DoorOpen size={15} aria-hidden="true" /> : <DoorClosed size={15} aria-hidden="true" />}
                  <span><strong>{name}</strong><small>{cells(length)}{group.kind === "door" ? ` · ${wall.data.doorLocked ? "trancada" : "jogadores abrem"}` : group.kind === "secret" ? " · só o mestre" : ""}</small></span>
                  <LocateFixed size={14} aria-hidden="true" className="scene-walls-go" />
                </button>
                {group.kind !== "wall" && <button className={`icon-toggle ${wall.data.open ? "active" : ""}`} aria-pressed={wall.data.open} aria-label={`${name} aberta`} title={wall.data.open ? "Aberta: clique para fechar" : "Fechada: clique para abrir"} onClick={() => update(wall, { open: !wall.data.open })}>
                  {wall.data.open ? <DoorOpen size={15} /> : <DoorClosed size={15} />}
                </button>}
                {group.kind === "door" && <button className={`icon-toggle ${wall.data.doorLocked ? "active" : ""}`} aria-pressed={wall.data.doorLocked} aria-label={`${name} trancada`} title={wall.data.doorLocked ? "Trancada: só o mestre abre" : "Destrancada: os jogadores abrem e fecham clicando na porta"} onClick={() => update(wall, { doorLocked: !wall.data.doorLocked })}>
                  {wall.data.doorLocked ? <Lock size={15} /> : <LockOpen size={15} />}
                </button>}
                {group.kind === "secret" && <span className="scene-walls-secret" title="Os jogadores não veem a porta secreta"><EyeOff size={15} aria-hidden="true" /><span className="sr-only">Escondida dos jogadores</span></span>}
              </div>
              {open && <div className="scene-side-editor" aria-label={`Campos: ${name}`} role="group">{editor(wall)}</div>}
            </li>
          })}
        </ul>}
      </details>
    })}
  </section>
}
