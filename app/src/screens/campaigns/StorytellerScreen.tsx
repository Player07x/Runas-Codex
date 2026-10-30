import { useId, useMemo, useRef, useState, type ReactNode } from "react"
import { OverdueSessions } from "./NextSessionCard"
import { Dices, MonitorPlay, Pin, PinOff, X } from "lucide-react"
import { linkItem, listValue, npcAttitude, resolveTarget } from "../../core/campaigns"
import { noteBody } from "../../core/sections"
import { noteName } from "../../core/text"
import { roll } from "../../lib/dice"
import { NoteSetContext } from "../../lib/note-set"
import { href } from "../../lib/router"
import { useSinglePane } from "../../lib/tabs"
import { noteRoute, vaultNoteSet } from "../../lib/vault-notes"
import { Markdown } from "../../components/Markdown"
import { PanelTabs, TabPanel } from "../../components/kit/PanelTabs"
import { ClockDial } from "../../components/ui"
import { useDialogFocus } from "../../components/useDialogFocus"
import { useVault } from "../../platform/VaultProvider"
import { WikiNotePicker } from "./campaign-dialogs"
import { useCampaignEdits } from "./campaign-edits"
import { InitiativePanel } from "./CampaignTools"
import { sessionRoute, type CampaignData } from "./campaign-state"
import { attitudeColor } from "./DashboardCards"

type Column = "agora" | "elenco" | "fixadas"
const COLUMNS: { value: Column; label: string }[] = [
  { value: "agora", label: "Agora" },
  { value: "elenco", label: "Elenco" },
  { value: "fixadas", label: "Notas fixadas" },
]

/**
 * Tela do Mestre: o que se consulta durante o jogo, sem sair da sessão. Ocupa a tela inteira em três colunas, cada uma
 * com a própria rolagem (rework F4c, CAM-8): Agora (sessão, pistas, iniciativa, relógios e dados), Elenco e as Notas
 * fixadas, uma por aba. No celular aparece uma coluna por vez, escolhida nas abas de cima.
 */
export function StorytellerScreen({ data, onClose }: { data: CampaignData; onClose(): void }) {
  const vault = useVault()
  const index = vault.index!
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useDialogFocus(ref, onClose)
  const narrow = useSinglePane()
  const [column, setColumn] = useState<Column>("agora")
  const noteSet = useMemo(() => vaultNoteSet(index, data.campaign.home ?? data.campaign.root, {}, vault.platform), [index, data.campaign, vault.platform, vault.version])
  const columns: Record<Column, ReactNode> = {
    agora: <NowColumn data={data} onClose={onClose} />,
    elenco: <CastColumn data={data} onClose={onClose} />,
    fixadas: <PinnedColumn data={data} onClose={onClose} />,
  }
  return (
    <div ref={ref} className="campaign-gm" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <header className="campaign-gm-bar">
        <MonitorPlay size={18} aria-hidden="true" />
        <h2 id={titleId} className="campaign-gm-title">Tela do Mestre <span>· {data.campaign.name}</span></h2>
        <button type="button" className="btn sm ghost campaign-gm-close" onClick={onClose}>
          <X size={16} /> Fechar <kbd>Esc</kbd>
        </button>
        {narrow && <PanelTabs label="Colunas da Tela do Mestre" idPrefix="mestre" value={column} onChange={setColumn} tabs={COLUMNS} />}
      </header>
      <NoteSetContext.Provider value={noteSet}>
        {narrow ? (
          <TabPanel idPrefix="mestre" value={column}>
            <section className="campaign-gm-col">{columns[column]}</section>
          </TabPanel>
        ) : (
          <div className="campaign-gm-cols">
            {COLUMNS.map((col) => (
              <section key={col.value} className={`campaign-gm-col ${col.value}`} aria-labelledby={`${titleId}-${col.value}`}>
                <h3 id={`${titleId}-${col.value}`} className="campaign-gm-heading">{col.label}</h3>
                {columns[col.value]}
              </section>
            ))}
          </div>
        )}
      </NoteSetContext.Provider>
    </div>
  )
}

function NowColumn({ data, onClose }: { data: CampaignData; onClose(): void }) {
  const [rolls, setRolls] = useState<string[]>([])
  const session = data.upcoming
  const secrets = data.secrets.filter((s) => !s.done)
  const throwDice = (notation: string) => {
    const r = roll(notation)
    setRolls((list) => [`${notation} = ${r.total} (${r.detail})`, ...list].slice(0, 5))
  }
  return (
    <>
      <OverdueSessions data={data} />
      <section className="card tight stack">
        <span className="eyebrow">Próxima sessão</span>
        {!session && data.next?.event ? (
          <span className="small"><strong>{data.next.title}</strong> · {data.next.event.start.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}, marcada na Agenda sem nota de sessão</span>
        ) : session ? (
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
      <section className="card tight stack">
        <span className="eyebrow">Pistas ainda guardadas</span>
        {secrets.length === 0 && <span className="muted small">Nada guardado.</span>}
        {secrets.map((s) => (
          <span key={s.line} className="small">○ {s.clean}</span>
        ))}
      </section>
      <InitiativePanel data={data} level={3} />
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
        <span className="eyebrow">Rolagem rápida</span>
        <div className="row-wrap">
          {["1d20", "1d12", "1d10", "1d8", "1d6", "2d6", "1d100"].map((d) => (
            <button key={d} className="btn sm" onClick={() => throwDice(d)}>
              <Dices size={13} /> {d}
            </button>
          ))}
        </div>
        <div className="stack" role="status" aria-live="polite" style={{ gap: 2 }}>
          {rolls.map((r, i) => (
            <span key={i} className={`mono small ${i === 0 ? "" : "faint"}`}>{r}</span>
          ))}
        </div>
      </section>
    </>
  )
}

function CastColumn({ data, onClose }: { data: CampaignData; onClose(): void }) {
  const link = (dest: string | null, label: string) =>
    dest ? <a className="wikilink cross grow truncate" href={href(noteRoute(dest))} onClick={onClose}>{label}</a> : <span className="grow truncate">{label}</span>
  return (
    <>
      <section className="card tight stack">
        <span className="eyebrow">Personagens dos jogadores</span>
        {data.players.length === 0 && <span className="muted small">Nenhum personagem ligado à campanha.</span>}
        {data.players.map((p) => (
          <div key={p.path} className="row small">
            {link(p.path, p.name)}
            {p.player && <span className="tiny muted">{p.player}</span>}
          </div>
        ))}
      </section>
      <section className="card tight stack">
        <span className="eyebrow">NPCs</span>
        {data.npcs.length === 0 && <span className="muted small">Nenhum NPC acompanhado.</span>}
        {data.npcs.map((n) => (
          <div key={n.position} className="row small">
            {link(n.dest, noteName(n.target))}
            {npcAttitude(n.extra) && <span className={`chip ${attitudeColor(npcAttitude(n.extra))}`}>{npcAttitude(n.extra)}</span>}
          </div>
        ))}
      </section>
      {data.factions.length > 0 && (
        <section className="card tight stack">
          <span className="eyebrow">Facções</span>
          {data.factions.map((f) => (
            <div key={f.position} className="row small">
              {link(f.dest, noteName(f.target))}
              {f.extra && <span className={`chip ${attitudeColor(f.extra)}`}>{f.extra}</span>}
            </div>
          ))}
        </section>
      )}
    </>
  )
}

/** As notas fixadas na propriedade `fixadas` da campanha, uma por aba e inteira, sem rolagem dentro da coluna. */
function PinnedColumn({ data, onClose }: { data: CampaignData; onClose(): void }) {
  const vault = useVault()
  const index = vault.index!
  const { setHome } = useCampaignEdits(data)
  const [picking, setPicking] = useState(false)
  const [chosen, setChosen] = useState("")
  const pinnedRaw = listValue(data.data.fixadas)
  const pinned = useMemo(
    () => pinnedRaw.flatMap((raw, position) => {
      const link = linkItem(raw)
      if (!link || !data.campaign.home) return []
      return [{ position, target: link.target, dest: resolveTarget(index, link.target, data.campaign.home) }]
    }),
    [pinnedRaw.join("|"), index, vault.version],
  )
  const current = pinned.find((p) => String(p.position) === chosen) ?? pinned[0]
  const note = current?.dest ? index.note(current.dest) : undefined
  const canPin = !data.readOnly && Boolean(data.campaign.home)
  return (
    <>
      {canPin && (
        <button type="button" className="btn sm campaign-gm-pin" onClick={() => setPicking(true)}>
          <Pin size={14} /> Fixar nota
        </button>
      )}
      {!current ? (
        <p className="muted small">Fixe aqui as notas que você consulta durante o jogo (regras da casa, o NPC da cena…).</p>
      ) : (
        <div className="card tight campaign-gm-pins">
          <PanelTabs label="Notas fixadas" idPrefix="mestre-fixada" value={String(current.position)} onChange={setChosen}
            tabs={pinned.map((p) => ({ value: String(p.position), label: noteName(p.target) }))} />
          <TabPanel idPrefix="mestre-fixada" value={String(current.position)}>
            {note ? <Markdown source={noteBody(note.text)} className="campaign-pin-md" /> : <p className="small" style={{ color: "var(--red)" }}>A nota não existe.</p>}
            <div className="row-wrap">
              {note && <a className="btn sm ghost" href={href(noteRoute(note.path))} onClick={onClose}>Abrir a nota</a>}
              {!data.readOnly && (
                <button type="button" className="btn sm ghost" onClick={() => { setChosen(""); setHome("fixadas", pinnedRaw.filter((_, i) => i !== current.position)) }}>
                  <PinOff size={14} /> Desafixar {noteName(current.target)}
                </button>
              )}
            </div>
          </TabPanel>
        </div>
      )}
      {picking && (
        <WikiNotePicker
          title="Fixar nota na Tela do Mestre"
          root=""
          exclude={new Set(pinned.map((p) => p.dest).filter((d): d is string => Boolean(d)))}
          onClose={() => setPicking(false)}
          onPick={async (path) => setHome("fixadas", [...pinnedRaw, `[[${index.linkTarget(path, data.campaign.home!)}]]`])}
        />
      )}
    </>
  )
}
