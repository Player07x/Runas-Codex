import { useEffect, useMemo, useRef, useState } from "react"
import { History, Users } from "lucide-react"
import { dayNumber, formatDate, formatYear, fromDayNumber, type Calendar } from "../../core/calendar"
import { listMaps, timelineEvents, type TimelineEvent } from "../../core/wiki"
import { href, navigate } from "../../lib/router"
import { useVault } from "../../platform/VaultProvider"
import { articleRoute, KindIcon, useWiki } from "./wiki-state"

const TRACK_COLORS = ["var(--violet)", "var(--gold)", "var(--cyan)", "var(--green)", "var(--red)"]
const ROW = 24

interface Placed {
  event: TimelineEvent
  x: number
  width: number
  row: number
}

/** Distribui os rótulos em linhas para não se sobreporem. */
function place(events: TimelineEvent[], x: (day: number) => number): { placed: Placed[]; rows: number } {
  const ends: number[] = []
  const placed = events.map((event) => {
    const left = x(event.startDay)
    const width = Math.max(10, x(event.endDay) - left)
    const labelEnd = left + Math.max(width, 14 + event.title.length * 6.6)
    let row = ends.findIndex((end) => end < left - 8)
    if (row < 0) row = ends.length
    ends[row] = labelEnd
    return { event, x: left, width, row }
  })
  return { placed, rows: Math.max(1, ends.length) }
}

export function WikiTimeline() {
  const vault = useVault()
  const { wiki, calendar: ref, players } = useWiki()
  const index = vault.index!
  const [people, setPeople] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [tag, setTag] = useState("")
  const [eraYear,setEraYear]=useState(ref?.calendar.today?.year??0)
  const [mapPath,setMapPath]=useState("")
  const scroller = useRef<HTMLDivElement>(null)
  const todayX = useRef<number | null>(null)
  // Abre com o "hoje" do mundo no meio da tela (os acontecimentos recentes costumam ser os que importam).
  useEffect(() => {
    const el = scroller.current
    if (el && todayX.current !== null) el.scrollLeft = Math.max(0, todayX.current + 168 - el.clientWidth * 0.7)
  }, [zoom, ref?.path])
  const all = useMemo(() => (ref ? timelineEvents(index, wiki!.root, ref, { people }) : []), [index, wiki, ref, people, vault.version])
  const events = useMemo(
    () =>
      all.filter((e) => {
        if (hidden.has(e.track)) return false
        if (tag.trim() && !e.tags.some((t) => t.toLocaleLowerCase("pt-BR").startsWith(tag.trim().replace(/^#/, "").toLocaleLowerCase("pt-BR")))) return false
        // Versão dos jogadores: artigos marcados com `segredo: true` ficam de fora.
        if (players && index.note(e.path)?.meta.frontmatter?.data?.segredo === true) return false
        return true
      }),
    [all, hidden, tag, players, index],
  )
  const tracks = useMemo(() => [...new Set(all.map((e) => e.track))].sort((a, b) => a.localeCompare(b, "pt-BR")), [all])

  if (!ref) {
    return (
      <div className="page">
        <div className="card stack">
          <strong>A linha do tempo precisa de um calendário</strong>
          <span className="muted small">Crie um artigo do tipo Calendário e use datas nas propriedades dos artigos (<code>data_mundo: "4031-03-15"</code>, <code>data_fim_mundo</code> para períodos).</span>
        </div>
      </div>
    )
  }
  const calendar: Calendar = ref.calendar
  const today = calendar.today ? dayNumber(calendar, calendar.today) : null
  const yearDays = calendar.months.reduce((n, m) => n + m.days, 0)
  const days = events.flatMap((e) => [e.startDay, e.endDay]).concat(today !== null ? [today] : [])
  const min = days.length ? Math.min(...days) : 0
  const max = days.length ? Math.max(...days) : yearDays
  const span = Math.max(yearDays, max - min)
  const pad = span * 0.04
  const from = min - pad
  const width = Math.max(900, Math.min(40_000, 900 * zoom))
  const x = (day: number) => ((day - from) / (span + pad * 2)) * width
  // Marcas de ano: um passo "redondo" que dê ~10 marcas na largura.
  const years = (span + pad * 2) / yearDays
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find((s) => years / s <= 12 * zoom) ?? 10_000
  const firstYear = Math.ceil(fromDayNumber(calendar, from).year / step) * step
  const ticks: number[] = []
  for (let y = firstYear; ticks.length < 300; y += step) {
    const day = dayNumber(calendar, { year: y, month: 1, day: 1 })
    if (day > from + span + pad * 2) break
    ticks.push(y)
  }
  todayX.current = today !== null ? x(today) : null
  const eras = calendar.eras.map((era, i) => {
    const start = dayNumber(calendar, { year: era.start, month: 1, day: 1 })
    const next = calendar.eras[i + 1]
    const end = next ? dayNumber(calendar, { year: next.start, month: 1, day: 1 }) : from + span + pad * 2
    return { era, left: Math.max(0, x(start)), right: Math.min(width, x(end)) }
  }).filter((e) => e.right > 0 && e.left < width)

  return (
    <div className="page wiki-timeline">
      <div className="page-head">
        <div>
          <span className="eyebrow">{calendar.name}</span>
          <h1 className="page-title row" style={{ gap: 8 }}>
            <History size={22} /> Linha do tempo
          </h1>
        </div>
        <div className="row-wrap">
          <label className="check small">
            <input type="checkbox" checked={people} onChange={(e) => setPeople(e.target.checked)} /> <Users size={14} /> Nascimentos e mortes
          </label>
          <input className="input sm" placeholder="Filtrar por tag" value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filtrar por tag" style={{ width: 150 }} />
          <label className="field graph-slider" style={{ width: 160 }}>
            <span className="tiny muted">Zoom</span>
            <input type="range" min={1} max={20} step={0.5} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom da linha do tempo" />
          </label>
        </div>
      </div>
      <section className="card row-wrap"><strong>Crônicas: mapa por era</strong><label>Era<select className="input" value={eraYear} onChange={e=>setEraYear(Number(e.target.value))}>{calendar.eras.map(era=><option key={era.start} value={era.start}>{era.name} ({era.start})</option>)}<option value={calendar.today?.year??0}>Hoje ({calendar.today?.year??0})</option></select></label><label>Mapa<select className="input" value={mapPath} onChange={e=>setMapPath(e.target.value)}><option value="">Escolha um mapa…</option>{listMaps(index,wiki!.root).filter(n=>!players||n.meta.frontmatter?.data?.segredo!==true).map(n=><option key={n.path} value={n.path}>{n.name}</option>)}</select></label><button className="btn" disabled={!mapPath} onClick={()=>{try{sessionStorage.setItem("runas-codex:era-mapa",String(eraYear))}catch{}navigate(`/wiki/mapa/${encodeURIComponent(mapPath)}`)}}>Ver mapa nesta era</button></section>
      {tracks.length > 1 && (
        <div className="row-wrap" role="group" aria-label="Trilhas">
          {tracks.map((t, i) => (
            <button key={t} className={`chip track-chip ${hidden.has(t) ? "off" : ""}`} style={{ ["--tr" as string]: TRACK_COLORS[i % TRACK_COLORS.length] }} aria-pressed={!hidden.has(t)} onClick={() => setHidden((h) => (h.has(t) ? new Set([...h].filter((v) => v !== t)) : new Set([...h, t])))}>
              {t}
            </button>
          ))}
        </div>
      )}
      {events.length === 0 ? (
        <p className="muted">Nenhum acontecimento com data. Ponha <code>data_mundo: "AAAA-MM-DD"</code> (e <code>data_fim_mundo</code>) nos artigos; a propriedade <code>trilha</code> escolhe a faixa (um país, um personagem…).</p>
      ) : (
        <div className="card timeline">
          <div className="timeline-scroll" ref={scroller}>
            <div className="timeline-canvas" style={{ width: width + 180 }}>
              <div className="tl-row tl-head">
                <span className="tl-name" />
                <div className="tl-lane" style={{ width }}>
                  {eras.map(({ era, left, right }) => (
                    <span key={era.name} className="tl-era" style={{ left, width: right - left }} title={`${era.name} (desde ${formatYear(calendar, era.start)})`}>
                      {era.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="tl-row">
                <span className="tl-name" />
                <div className="tl-lane tl-axis" style={{ width }}>
                  {ticks.map((y) => (
                    <span key={y} style={{ left: x(dayNumber(calendar, { year: y, month: 1, day: 1 })) }}>
                      {formatYear(calendar, y)}
                    </span>
                  ))}
                </div>
              </div>
              {tracks
                .filter((t) => !hidden.has(t))
                .map((track) => {
                  const color = TRACK_COLORS[tracks.indexOf(track) % TRACK_COLORS.length]
                  const { placed, rows } = place(events.filter((e) => e.track === track), x)
                  return (
                    <div key={track} className="tl-row" style={{ ["--tr" as string]: color }}>
                      <span className="tl-name truncate" title={track}>
                        {track}
                      </span>
                      <div className="tl-lane tl-track" style={{ width, height: rows * ROW + 12 }}>
                        {today !== null && <span className="tl-today" style={{ left: x(today) }} />}
                        {placed.map(({ event, x: left, width: w, row }) => (
                          <a
                            key={`${event.path}:${event.title}`}
                            className={`tl-event ${event.endDay > event.startDay ? "range" : ""} ${event.life ?? ""}`}
                            href={href(articleRoute(event.path))}
                            style={{ left, top: row * ROW + 6 }}
                            title={`${event.title} — ${formatDate(calendar, event.start)}${event.end ? ` a ${formatDate(calendar, event.end)}` : ""}`}
                          >
                            {event.endDay > event.startDay ? <span className="tl-bar" style={{ width: w }} /> : <span className="tl-dot" />}
                            <span className="tl-label">
                              {event.kind && <KindIcon tipo={event.kind.id} size={12} />} {event.title}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
          {today !== null && <span className="tiny faint" style={{ padding: "6px 12px", display: "block" }}>A linha vertical marca hoje no mundo: {formatDate(calendar, calendar.today!)}.</span>}
        </div>
      )}
    </div>
  )
}
