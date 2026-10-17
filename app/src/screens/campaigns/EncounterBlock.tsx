import { useState } from "react"
import { useMarkdownOptions } from "../../components/Markdown"
import { useVault } from "../../platform/VaultProvider"
import { vtt } from "../../vtt/api"
import { EyeOff, HeartHandshake, Swords } from "lucide-react"
import { combatantCount, parseEncounter, type Encounter } from "../../core/encounters"
import type { CodeBlockProps } from "../../markdown/extensions"
import { useNoteSet } from "../../lib/note-set"
import { href } from "../../lib/router"

/** Bloco ```runas-encontro``` desenhado em qualquer nota: os participantes do encontro, sem ficha (só leitura). */
export function EncounterBlock({ code }: CodeBlockProps) {
  const set = useNoteSet()
  const {showSecrets}=useMarkdownOptions()
  const vault=useVault(),[message,setMessage]=useState("")
  let encounter: Encounter
  try {
    encounter = parseEncounter(code)
  } catch (error) {
    return (
      <div className="callout aviso encounter-block">
        <div className="callout-title">Encontro com erro</div>
        <div className="callout-body small">{error instanceof Error ? error.message : String(error)}</div>
      </div>
    )
  }
  const players = encounter.players === true ? "todos os jogadores" : encounter.players === false ? "sem jogadores" : encounter.players.join(", ")
  const visible=encounter.combatants.filter(c=>showSecrets||!c.hidden)
  const total = combatantCount({...encounter,combatants:visible})
  return (
    <div className="encounter-block card">
      {showSecrets&&<button className="btn" disabled={vault.info?.readOnly||!vtt.collaboration} onClick={()=>void vtt.collaboration!.command({type:"handout",handout:{title:encounter.name??"Encontro",text:encounter.combatants.filter(c=>!c.hidden).map(c=>`${c.display??c.name} × ${c.count}`).join("\n")||"Nenhum participante visível."}}).then(()=>setMessage("Encontro apresentado na sala.")).catch(e=>setMessage(String(e)))}>Apresentar encontro pela sala</button>}
      {message&&<p role="status">{message}</p>}
      <div className="row between wrap">
        <strong className="row" style={{ gap: 6 }}>
          <Swords size={16} /> {encounter.name ?? "Encontro"}
        </strong>
        <span className="tiny muted">
          {total} {total === 1 ? "participante" : "participantes"} · {encounter.party ? `grupo ${encounter.party}` : players}
          {encounter.xp !== undefined ? ` · ${encounter.xp} XP` : ""}
        </span>
      </div>
      {encounter.combatants.length > 0 ? (
        <div className="encounter-table">
          <table>
            <thead>
              <tr>
                <th>Combatente</th>
                <th>Qtd.</th>
                <th>PV</th>
                <th>CA</th>
                <th>Inic.</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c, i) => {
                const target = c.note ? set.resolve?.(c.note, "wiki") : undefined
                return (
                  <tr key={i} className={c.ally ? "ally" : undefined}>
                    <td>
                      {target ? (
                        <a className="wikilink" href={href(target.route)} title={target.path}>
                          {c.name}
                        </a>
                      ) : (
                        c.name
                      )}
                      {c.display && <span className="muted"> · {c.display}</span>}
                      {c.ally && <HeartHandshake size={13} className="encounter-mark" aria-label="aliado" />}
                      {c.hidden && <EyeOff size={13} className="encounter-mark" aria-label="oculto dos jogadores" />}
                    </td>
                    <td>{c.count}</td>
                    <td>{c.hp ?? (c.rollHp ? "rolar" : "—")}</td>
                    <td>{c.ac ?? "—"}</td>
                    <td>{c.initiative === undefined ? "—" : c.initiative >= 0 ? `+${c.initiative}` : `−${-c.initiative}`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <span className="tiny muted">Nenhum combatente.</span>
      )}
    </div>
  )
}
