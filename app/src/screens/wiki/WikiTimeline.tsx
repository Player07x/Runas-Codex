import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, History, List, Users } from "lucide-react"
import { dayNumber, formatDate, formatYear, fromDayNumber, type Calendar, type WorldDate } from "../../core/calendar"
import { calendarOffsets } from "../../core/calendar-sync"
import { listMaps, timelineEvents, type CalendarRef, type TimelineEvent } from "../../core/wiki"
import { href, navigate } from "../../lib/router"
import { useVault } from "../../platform/VaultProvider"
import { articleRoute, KindIcon, useWiki } from "./wiki-state"

const TRACK_COLORS = ["var(--violet)", "var(--gold)", "var(--cyan)", "var(--green)", "var(--red)"]
const ROW = 24

/** Acontecimento já no eixo do calendário-base do gráfico, com o calendário em que foi escrito. */
type Shown = TimelineEvent & { calendar: Calendar }

interface Placed {
  event: Shown
  x: number
  width: number
  row: number
}

/** Distribui os rótulos em linhas para não se sobreporem. */
function place(events: Shown[], x: (day: number) => number): { placed: Placed[]; rows: number } {
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

const STORE = (wiki: string) => `runas-codex:linha-do-tempo:${wiki}`
function storedPaths(wiki: string): string[] | null {
  try {
    const raw = localStorage.getItem(STORE(wiki))
    const list: unknown = raw ? JSON.parse(raw) : null
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === "string") : null
  } catch {
    return null
  }
}

/**
 * Grupos de calendários marcados: os sincronizados entre si (por `correspondencias`) dividem o mesmo eixo, no primeiro
 * deles; cada calendário sem ligação com os outros ganha um gráfico próprio.
 */
function groupCalendars(all: CalendarRef[], chosen: CalendarRef[]): { base: CalendarRef; members: { ref: CalendarRef; offset: number }[] }[] {
  const groups: { base: CalendarRef; members: { ref: CalendarRef; offset: number }[] }[] = []
  const done = new Set<string>()
  for (const ref of chosen) {
    if (done.has(ref.path)) continue
    const offsets = calendarOffsets(all, ref.path)
    const members = chosen.filter((c) => !done.has(c.path) && offsets.has(c.path)).map((c) => ({ ref: c, offset: offsets.get(c.path)! }))
    members.forEach((m) => done.add(m.ref.path))
    groups.push({ base: ref, members })
  }
  return groups
}

export function WikiTimeline() {
  const vault = useVault()
  const { wiki, calendar: main, calendars, players } = useWiki()
  const index = vault.index!
  const [people, setPeople] = useState(false)
  const [zoom, setZoom] = useState(1)
  // A lista é a vista equivalente ao gráfico, pelo teclado e pelo leitor de tela (rework F4b, WIK-3).
  const [asList, setAsList] = useState(false)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [tag, setTag] = useState("")
  const [picked, setPicked] = useState<string[] | null>(() => (wiki ? storedPaths(wiki.name) : null))
  useEffect(() => setPicked(wiki ? storedPaths(wiki.name) : null), [wiki])
  // Sem escolha guardada: os calendários que têm acontecimentos (ou o principal).
  const withEvents = useMemo(() => calendars.filter((c) => timelineEvents(index, wiki!.root, c, { people: true }).length > 0).map((c) => c.path), [calendars, index, wiki, vault.version])
  const chosen = calendars.filter((c) => (picked ?? (withEvents.length ? withEvents : main ? [main.path] : [])).includes(c.path))
  const toggle = (path: string, on: boolean) => {
    const next = calendars.map((c) => c.path).filter((p) => (p === path ? on : chosen.some((c) => c.path === p)))
    setPicked(next)
    try { localStorage.setItem(STORE(wiki!.name), JSON.stringify(next)) } catch { /* fica só nesta tela */ }
  }
  const groups = useMemo(() => groupCalendars(calendars, chosen), [calendars, chosen.map((c) => c.path).join("|")])
  const first = groups[0]?.base ?? main
  const [eraYear,setEraYear]=useState(first?.calendar.today?.year??0)
  const [mapPath,setMapPath]=useState("")
  const charts = useMemo(
    () =>
      groups.map((g) => ({
        base: g.base,
        synced: g.members.length > 1,
        events: g.members
          .flatMap(({ ref, offset }): Shown[] => timelineEvents(index, wiki!.root, ref, { people }).map((e) => ({ ...e, startDay: e.startDay + offset, endDay: e.endDay + offset, calendar: ref.calendar })))
          .filter((e) => {
            if (hidden.has(e.track)) return false
            if (tag.trim() && !e.tags.some((t) => t.toLocaleLowerCase("pt-BR").startsWith(tag.trim().replace(/^#/, "").toLocaleLowerCase("pt-BR")))) return false
            // Versão dos jogadores: artigos marcados com `segredo: true` ficam de fora.
            if (players && index.note(e.path)?.meta.frontmatter?.data?.segredo === true) return false
            return true
          })
          .sort((a, b) => a.startDay - b.startDay || a.title.localeCompare(b.title, "pt-BR")),
      })),
    [groups, index, wiki, people, hidden, tag, players, vault.version],
  )
  const tracks = useMemo(() => [...new Set(groups.flatMap((g) => g.members.flatMap(({ ref }) => timelineEvents(index, wiki!.root, ref, { people }).map((e) => e.track))))].sort((a, b) => a.localeCompare(b, "pt-BR")), [groups, index, wiki, people, vault.version])

  if (!main && !calendars.length) {
    return (
      <div className="page">
        <div className="card stack">
          <strong>A linha do tempo precisa de um calendário</strong>
          <span className="muted small">Crie um artigo do tipo Calendário e use datas nas propriedades dos artigos (<code>data_mundo: "4031-03-15 SIGLA"</code>, com a sigla do calendário; <code>data_fim_mundo</code> para períodos).</span>
        </div>
      </div>
    )
  }
  const calendar = first?.calendar ?? null

  return (
    <div className="page wiki-timeline">
      <div className="page-head">
        <div>
          <span className="eyebrow">{chosen.map((c) => c.calendar.name).join(" · ") || "Nenhum calendário marcado"}</span>
          <h1 className="page-title row" style={{ gap: 8 }}>
            <History size={22} /> Linha do tempo
          </h1>
        </div>
      </div>
      {/* Uma linha de controles (rework F4b, WIK-3): Calendários e Filtros recolhidos, zoom, ajustar e lista. */}
      <div className="timeline-controls" role="group" aria-label="Controles da linha do tempo">
        {calendars.length > 1 && (
          <details className="dropdown">
            <summary className="btn sm">Calendários · {chosen.length} <ChevronDown size={14} /></summary>
            <fieldset className="dropdown-panel card stack">
              <legend className="sr-only">Calendários exibidos</legend>
              {calendars.map((c) => (
                <label key={c.path} className="check small">
                  <input type="checkbox" checked={chosen.some((x) => x.path === c.path)} onChange={(e) => toggle(c.path, e.target.checked)} /> {c.calendar.name} <span className="chip">{c.calendar.abbr}</span>
                </label>
              ))}
              <span className="tiny muted">Calendários sincronizados (Wiki › Calendário › Sincronizar) dividem o mesmo eixo; os outros aparecem em gráficos separados.</span>
            </fieldset>
          </details>
        )}
        <details className="dropdown">
          <summary className="btn sm">Filtros{(people ? 1 : 0) + (tag.trim() ? 1 : 0) + hidden.size ? ` · ${(people ? 1 : 0) + (tag.trim() ? 1 : 0) + hidden.size}` : ""} <ChevronDown size={14} /></summary>
          <div className="dropdown-panel card stack">
            <label className="check small">
              <input type="checkbox" checked={people} onChange={(e) => setPeople(e.target.checked)} /> <Users size={14} /> Nascimentos e mortes
            </label>
            <label className="field"><span>Tag</span><input className="input sm" placeholder="Filtrar por tag" value={tag} onChange={(e) => setTag(e.target.value)} /></label>
            {tracks.length > 1 && (
              <div className="row-wrap" role="group" aria-label="Trilhas">
                {tracks.map((t, i) => (
                  <button key={t} className={`chip track-chip ${hidden.has(t) ? "off" : ""}`} style={{ ["--tr" as string]: TRACK_COLORS[i % TRACK_COLORS.length] }} aria-pressed={!hidden.has(t)} onClick={() => setHidden((h) => (h.has(t) ? new Set([...h].filter((v) => v !== t)) : new Set([...h, t])))}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </details>
        <label className="field graph-slider timeline-zoom">
          <span className="tiny muted">Zoom</span>
          <input type="range" min={1} max={20} step={0.5} value={zoom} disabled={asList} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom da linha do tempo" />
        </label>
        <button className="btn sm ghost" disabled={asList || zoom === 1} onClick={() => setZoom(1)}>Ajustar à tela</button>
        <button className={`btn sm ghost ${asList ? "active" : ""}`} aria-pressed={asList} onClick={() => setAsList(!asList)}><List size={15} /> Lista</button>
      </div>
      {calendar && <details className="card timeline-chronicles"><summary><strong>Crônicas: mapa por era</strong></summary><div className="row-wrap"><label>Era<select className="input" value={eraYear} onChange={e=>setEraYear(Number(e.target.value))}>{calendar.eras.map(era=><option key={era.start} value={era.start}>{era.name} ({era.start})</option>)}<option value={calendar.today?.year??0}>Hoje ({calendar.today?.year??0})</option></select></label><label>Mapa<select className="input" value={mapPath} onChange={e=>setMapPath(e.target.value)}><option value="">Escolha um mapa…</option>{listMaps(index,wiki!.root).filter(n=>!players||n.meta.frontmatter?.data?.segredo!==true).map(n=><option key={n.path} value={n.path}>{n.name}</option>)}</select></label><button className="btn" disabled={!mapPath} onClick={()=>{try{sessionStorage.setItem("runas-codex:era-mapa",String(eraYear))}catch{}navigate(`/wiki/mapa/${encodeURIComponent(mapPath)}`)}}>Ver mapa nesta era</button></div></details>}
      {!chosen.length ? (
        <p className="muted">Marque ao menos um calendário acima.</p>
      ) : charts.every((c) => c.events.length === 0) ? (
        <p className="muted">Nenhum acontecimento com data nos calendários marcados. Ponha <code>data_mundo: "AAAA-MM-DD SIGLA"</code> (e <code>data_fim_mundo</code>) nos artigos; a propriedade <code>trilha</code> escolhe a faixa (um país, um personagem…).</p>
      ) : (
        charts.filter((c) => c.events.length > 0).map((chart) => asList ? (
          <TimelineList key={chart.base.path} calendar={chart.base.calendar} events={chart.events} title={charts.length > 1 || chart.synced ? (chart.synced ? `No eixo do ${chart.base.calendar.name}` : chart.base.calendar.name) : undefined} />
        ) : (
          <TimelineChart key={chart.base.path} calendar={chart.base.calendar} events={chart.events} tracks={tracks.filter((t) => !hidden.has(t))} zoom={zoom} title={charts.length > 1 || chart.synced ? (chart.synced ? `No eixo do ${chart.base.calendar.name}` : chart.base.calendar.name) : undefined} />
        ))
      )}
    </div>
  )
}

/** Um gráfico da linha do tempo, no eixo de `calendar`. */
function TimelineChart({ calendar, events, tracks, zoom, title }: { calendar: Calendar; events: Shown[]; tracks: string[]; zoom: number; title?: string | undefined }) {
  const scroller = useRef<HTMLDivElement>(null)
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
  // Abre com o "hoje" do mundo no meio da tela (os acontecimentos recentes costumam ser os que importam).
  const todayX = today !== null ? x(today) : null
  useEffect(() => {
    const el = scroller.current
    if (el && todayX !== null) el.scrollLeft = Math.max(0, todayX + 168 - el.clientWidth * 0.7)
  }, [zoom, calendar])
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
  const eras = calendar.eras.map((era, i) => {
    const start = dayNumber(calendar, { year: era.start, month: 1, day: 1 })
    const next = calendar.eras[i + 1]
    const end = next ? dayNumber(calendar, { year: next.start, month: 1, day: 1 }) : from + span + pad * 2
    return { era, left: Math.max(0, x(start)), right: Math.min(width, x(end)) }
  }).filter((e) => e.right > 0 && e.left < width)
  const own = (e: Shown, d: WorldDate) => `${formatDate(e.calendar, d)}${e.calendar === calendar ? "" : ` (${e.calendar.abbr})`}`

  return (
    <div className="card timeline">
      {title && <span className="eyebrow" style={{ padding: "10px 12px 0", display: "block" }}>{title}</span>}
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
            .filter((t) => events.some((e) => e.track === t))
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
                    {placed.map(({ event, x: left, width: w, row }) => {
                      // Perto da borda direita, o rótulo vai para o lado esquerdo do ponto, para não ser cortado.
                      const flip = event.endDay <= event.startDay && left > width - 220
                      return (
                      <a
                        key={`${event.path}:${event.title}`}
                        className={`tl-event ${event.endDay > event.startDay ? "range" : ""} ${event.life ?? ""} ${flip ? "flip" : ""}`}
                        href={href(articleRoute(event.path))}
                        style={flip ? { right: width - left - 6, top: row * ROW + 6 } : { left, top: row * ROW + 6 }}
                        title={`${event.title} — ${own(event, event.start)}${event.end ? ` a ${own(event, event.end)}` : ""}`}
                      >
                        {event.endDay > event.startDay ? <span className="tl-bar" style={{ width: w }} /> : <span className="tl-dot" />}
                        <span className="tl-label">
                          {event.kind && <KindIcon tipo={event.kind.id} size={12} />} {event.title}
                        </span>
                      </a>
                      )
                    })}
                  </div>
                </div>
              )
            })}
        </div>
      </div>
      {today !== null && <span className="tiny faint" style={{ padding: "6px 12px", display: "block" }}>A linha vertical marca hoje no mundo: {formatDate(calendar, calendar.today!)}.</span>}
    </div>
  )
}

/** A linha do tempo como tabela, na ordem das datas: data, acontecimento, trilha e fim (rework F4b, WIK-3). */
function TimelineList({ calendar, events, title }: { calendar: Calendar; events: Shown[]; title?: string | undefined }) {
  const own = (e: Shown, d: WorldDate) => `${formatDate(e.calendar, d)}${e.calendar === calendar ? "" : ` (${e.calendar.abbr})`}`
  return (
    <div className="card timeline-list">
      {title && <span className="eyebrow">{title}</span>}
      <table className="graph-table">
        <caption className="sr-only">Acontecimentos na ordem das datas{title ? `, ${title}` : ""}</caption>
        <thead><tr><th scope="col">Data</th><th scope="col">Acontecimento</th><th scope="col">Trilha</th><th scope="col">Até</th></tr></thead>
        <tbody>{events.map((event) => (
          <tr key={`${event.path}:${event.title}:${event.startDay}`}>
            <td>{own(event, event.start)}</td>
            <th scope="row"><a href={href(articleRoute(event.path))} className="wikilink">{event.title}</a>{event.life && <small className="muted"> · {event.life}</small>}</th>
            <td>{event.track}</td>
            <td>{event.end ? own(event, event.end) : "—"}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}
