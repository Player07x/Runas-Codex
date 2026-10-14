import { useState } from "react"
import { ZoomIn } from "lucide-react"
import { href } from "../../lib/router"
import { ORDEM_X_CAOS } from "../../lib/fictional-calendar"
import { Segmented } from "../../components/ui"

type Zoom = "eras" | "seculo" | "campanha"

const RANGES: Record<Zoom, [number, number]> = {
  eras: [3100, 4045],
  seculo: [3950, 4040],
  campanha: [4026, 4032.2],
}

const TRACKS = [
  {
    name: "Condado de Valdris",
    color: "var(--green)",
    events: [
      { year: 3655, title: "Fundação de Valdris", to: "valdris" },
      { year: 3968, title: "Nasce o Conde Ormund", to: "conde-ormund" },
      { year: 3998, title: "Ormund vira conde", to: "conde-ormund" },
      { year: 4012.2, title: "A Queda de Myrr", to: "queda-de-myrr" },
      { year: 4029.4, title: "Lobos nos esgotos", to: "lobo-de-cinzas" },
    ],
  },
  {
    name: "Ordem da Chama Cinzenta",
    color: "var(--cyan)",
    events: [
      { year: 3201, title: "Forja da Lâmina de Obsidiana", to: "lamina-obsidiana" },
      { year: 3890, title: "Fundação da Ordem", to: "ordem-chama-cinzenta" },
      { year: 4013, title: "A Ordem se divide", to: "ordem-chama-cinzenta" },
    ],
  },
  {
    name: "Aldren Vael",
    color: "var(--gold)",
    events: [
      { year: 3999.1, title: "Nascimento", to: "aldren-vael" },
      { year: 4013, title: "Entra para a Ordem", to: "aldren-vael" },
      { year: 4012.25, title: "Sai de Myrr com a Lâmina", to: "aldren-vael" },
      { year: 4031.6, title: "Salva Ilsa (sessão 11)", to: "aldren-vael" },
    ],
  },
  {
    name: "Campanha: As Cinzas de Valdris",
    color: "var(--red)",
    events: [
      { year: 4031.55, title: "Sessão 9", to: "" },
      { year: 4031.58, title: "Sessão 10", to: "" },
      { year: 4031.62, title: "Sessão 11", to: "" },
      { year: 4031.63, title: "Sessão 12", to: "" },
    ],
  },
]

export function WikiTimeline() {
  const [zoom, setZoom] = useState<Zoom>("seculo")
  const [from, to] = RANGES[zoom]
  const pos = (year: number) => ((year - from) / (to - from)) * 100
  const step = zoom === "eras" ? 100 : zoom === "seculo" ? 10 : 1
  const ticks: number[] = []
  for (let y = Math.ceil(from / step) * step; y <= to; y += step) ticks.push(y)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Linhas do tempo paralelas</span>
          <h1 className="page-title">História de Ordem x Caos</h1>
        </div>
        <Segmented<Zoom>
          label="Zoom"
          value={zoom}
          onChange={setZoom}
          options={[
            { value: "eras", label: "Eras", icon: <ZoomIn size={14} /> },
            { value: "seculo", label: "Século" },
            { value: "campanha", label: "Campanha" },
          ]}
        />
      </div>

      <div className="card flat timeline">
        <div className="timeline-scroll">
          <div className="timeline-inner">
            <div className="tl-eras">
              {ORDEM_X_CAOS.eras.map((era) => {
                const left = Math.max(0, pos(era.start))
                const right = Math.min(100, pos(era.end ?? to))
                if (right <= 0 || left >= 100) return null
                return (
                  <div key={era.name} className="tl-era" style={{ left: `${left}%`, width: `${right - left}%` }}>
                    {era.name}
                  </div>
                )
              })}
            </div>
            <div className="tl-axis">
              {ticks.map((t) => (
                <span key={t} style={{ left: `${pos(t)}%` }}>
                  {t.toLocaleString("pt-BR")}
                </span>
              ))}
            </div>
            {TRACKS.map((track) => (
              <div key={track.name} className="tl-track">
                <span className="tl-name" style={{ color: track.color }}>{track.name}</span>
                <div className="tl-line" style={{ ["--tr" as string]: track.color }}>
                  {track.events
                    .filter((e) => e.year >= from && e.year <= to)
                    .map((e, i) => (
                      <a key={e.title} className="tl-event" href={e.to ? href(`/wiki/artigo/${e.to}`) : href("/campanhas/cinzas-de-valdris")} style={{ left: `${pos(e.year)}%`, top: i % 2 ? 30 : 4 }} title={`${Math.floor(e.year)} C.E.`}>
                        <span className="tl-dot" />
                        <span className="tl-label">{e.title}</span>
                      </a>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="tiny faint">Cada evento é uma nota com `data_mundo`; as eras vêm do calendário. Trilhas por país, ordem, personagem ou campanha.</p>
    </div>
  )
}
