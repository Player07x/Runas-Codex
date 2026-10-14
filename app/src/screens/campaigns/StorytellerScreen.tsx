import { useMemo, useState } from "react"
import { Dices, MonitorPlay, Pin, PinOff } from "lucide-react"
import { linkItem, listValue, resolveTarget } from "../../core/campaigns"
import { noteBody } from "../../core/sections"
import { noteName } from "../../core/text"
import { roll } from "../../lib/dice"
import { NoteSetContext } from "../../lib/note-set"
import { href } from "../../lib/router"
import { noteRoute, vaultNoteSet } from "../../lib/vault-notes"
import { Markdown } from "../../components/Markdown"
import { ClockDial, Modal } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import { WikiNotePicker } from "./campaign-dialogs"
import { useCampaignEdits } from "./campaign-edits"
import { sessionRoute, type CampaignData } from "./campaign-state"
import { attitudeColor } from "./DashboardCards"

/** Tela do Mestre: o que se consulta durante o jogo, sem sair da sessão. */
export function StorytellerScreen({ data, onClose }: { data: CampaignData; onClose(): void }) {
  const vault = useVault()
  const index = vault.index!
  const { setHome } = useCampaignEdits(data)
  const [picking, setPicking] = useState(false)
  const [rolls, setRolls] = useState<string[]>([])
  const pinnedRaw = listValue(data.data.fixadas)
  const pinned = useMemo(
    () => pinnedRaw.flatMap((raw, position) => {
      const link = linkItem(raw)
      if (!link || !data.campaign.home) return []
      return [{ position, target: link.target, dest: resolveTarget(index, link.target, data.campaign.home) }]
    }),
    [pinnedRaw.join("|"), index, vault.version],
  )
  const noteSet = useMemo(() => vaultNoteSet(index, data.campaign.home ?? data.campaign.root, {}, vault.platform), [index, data.campaign, vault.platform, vault.version])
  const session = data.upcoming
  const throwDice = (notation: string) => {
    const r = roll(notation)
    setRolls((list) => [`${notation} = ${r.total} (${r.detail})`, ...list].slice(0, 5))
  }
  return (
    <Modal wide title={<span className="row"><MonitorPlay size={16} /> Tela do Mestre — {data.campaign.name}</span>} onClose={onClose}>
      <NoteSetContext.Provider value={noteSet}>
        <div className="campaign-screen">
          <section className="card tight stack">
            <span className="eyebrow">Próxima sessão</span>
            {session ? (
              <>
                <a className="small" href={href(sessionRoute(session))} onClick={onClose}><strong>{session.title}</strong></a>
                {session.prep.map((p) => (
                  <span key={p.line} className={`small campaign-screen-step ${p.done ? "done" : ""}`}>
                    {p.done ? "✓" : "○"} {p.label ? <strong>{p.label}</strong> : null} {p.detail}
                  </span>
                ))}
              </>
            ) : (
              <span className="muted small">Nenhuma sessão planejada.</span>
            )}
          </section>
          <section className="card tight stack campaign-screen-pins">
            <div className="row between">
              <span className="eyebrow">Notas fixadas</span>
              {!data.readOnly && data.campaign.home && (
                <button className="btn ghost sm" onClick={() => setPicking(true)}>
                  <Pin size={13} /> Fixar
                </button>
              )}
            </div>
            {pinned.length === 0 && <span className="muted small">Fixe aqui as notas que você consulta durante o jogo (regras da casa, o NPC da cena…).</span>}
            {pinned.map((p) => {
              const note = p.dest ? index.note(p.dest) : undefined
              return (
                <details key={p.position} className="campaign-pin" open={pinned.length <= 2}>
                  <summary>
                    <span className="grow truncate">{noteName(p.target)}</span>
                    {!data.readOnly && (
                      <button className="icon-btn sm" onClick={(e) => { e.preventDefault(); setHome("fixadas", pinnedRaw.filter((_, i) => i !== p.position)) }} aria-label={`Desafixar ${noteName(p.target)}`}>
                        <PinOff size={13} />
                      </button>
                    )}
                  </summary>
                  {note ? <Markdown source={noteBody(note.text).slice(0, 1500)} className="campaign-pin-md" /> : <span className="small" style={{ color: "var(--red)" }}>A nota não existe.</span>}
                  {note && <a className="tiny" href={href(noteRoute(note.path))} onClick={onClose}>Abrir a nota</a>}
                </details>
              )
            })}
          </section>
          <section className="card tight stack">
            <span className="eyebrow">NPCs</span>
            {data.npcs.length === 0 && <span className="muted small">Nenhum NPC acompanhado.</span>}
            {data.npcs.map((n) => (
              <div key={n.position} className="row small">
                {n.dest ? <a className="wikilink cross grow truncate" href={href(noteRoute(n.dest))} onClick={onClose}>{noteName(n.target)}</a> : <span className="grow truncate">{noteName(n.target)}</span>}
                {n.extra && <span className={`chip ${attitudeColor(n.extra)}`}>{n.extra}</span>}
              </div>
            ))}
          </section>
          {!("error" in data.clocks) && data.clocks.length > 0 && (
            <section className="card tight stack">
              <span className="eyebrow">Relógios</span>
              <div className="campaign-clocks">
                {data.clocks.map((c, i) => (
                  <div key={i} className="campaign-clock">
                    <ClockDial segments={c.segments} filled={c.filled} color={c.kind === "ameaca" ? "var(--red)" : "var(--green)"} size={44} />
                    <span className="tiny">{c.name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className="card tight stack">
            <span className="eyebrow">Pistas ainda guardadas</span>
            {data.secrets.filter((s) => !s.done).length === 0 && <span className="muted small">Nada guardado.</span>}
            {data.secrets.filter((s) => !s.done).map((s) => (
              <span key={s.line} className="small">○ {s.clean}</span>
            ))}
          </section>
          <section className="card tight stack">
            <span className="eyebrow">Rolagem rápida</span>
            <div className="row-wrap">
              {["1d20", "1d12", "1d10", "1d8", "1d6", "2d6", "1d100"].map((d) => (
                <button key={d} className="btn sm" onClick={() => throwDice(d)}>
                  <Dices size={13} /> {d}
                </button>
              ))}
            </div>
            {rolls.map((r, i) => (
              <span key={i} className={`mono small ${i === 0 ? "" : "faint"}`}>{r}</span>
            ))}
          </section>
        </div>
      </NoteSetContext.Provider>
      {picking && (
        <WikiNotePicker
          title="Fixar nota na Tela do Mestre"
          root=""
          exclude={new Set(pinned.map((p) => p.dest).filter((d): d is string => Boolean(d)))}
          onClose={() => setPicking(false)}
          onPick={async (path) => setHome("fixadas", [...pinnedRaw, `[[${index.linkTarget(path, data.campaign.home!)}]]`])}
        />
      )}
    </Modal>
  )
}
