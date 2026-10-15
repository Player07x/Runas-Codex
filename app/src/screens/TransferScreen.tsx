import { useState } from "react"
import { ArrowDownToLine, ArrowUpFromLine, BookOpen, CalendarDays, Dices, FolderInput, History, Library, Package, ScrollText, ShieldCheck } from "lucide-react"
import { MESAS } from "../data/mesas"
import { Modal, Segmented, useToast } from "../components/ui"
import { navigate, useRoute } from "../lib/router"
import { ObsidianMigration } from "./import/ObsidianMigration"
import "./transfer.css"

/** Itens que já funcionam de verdade: abrem a tela deles em vez do protótipo. */
const WORKING: Record<string, string> = {
  "Plugins de RPG do Obsidian (calendários, mapas, statblocks, encontros)": "/transferir/obsidian",
}

const DOMAINS = [
  {
    id: "mesa",
    title: "Mesas (VTT)",
    icon: <Dices size={20} />,
    color: "var(--red)",
    exports: ["Mesa inteira (.runasmesa)", "Cena", "Tokens", "Mapas", "Playlists", "Paredes e luzes"],
    imports: ["Pacote de mesa", "Mundo do RunasVTT", "Universal VTT (.dd2vtt / .uvtt)", "Cena do Foundry (JSON)", "Pasta de imagens → tokens"],
  },
  {
    id: "wiki",
    title: "Wiki e notas",
    icon: <Library size={20} />,
    color: "var(--violet)",
    exports: ["Pasta / ZIP Markdown (Obsidian)", "Site HTML offline", "Versão dos jogadores (sem segredos)", "PDF / DOCX de uma nota"],
    imports: ["Cofre do Obsidian", "Runas DM (wiki + JSON)", "Notion (Markdown + CSV)", "Kanka (JSON)", "World Anvil", "LegendKeeper", "Plugins de RPG do Obsidian (calendários, mapas, statblocks, encontros)"],
  },
  {
    id: "livros",
    title: "Livros",
    icon: <BookOpen size={20} />,
    color: "var(--green)",
    exports: ["PDF para impressão", "EPUB", "DOCX", "HTML", "Markdown", "RTF"],
    imports: ["Homebrewery / GM Binder", "DOCX", "Markdown", "Runas Book"],
  },
  {
    id: "campanhas",
    title: "Campanhas",
    icon: <ScrollText size={20} />,
    color: "var(--gold)",
    exports: ["Campanha completa (notas + sessões + mesas + agenda)", "Diário da campanha em PDF/HTML"],
    imports: ["Pacote de campanha", "Campanhas do Runas DM"],
  },
  {
    id: "agenda",
    title: "Agenda",
    icon: <CalendarDays size={20} />,
    color: "var(--cyan)",
    exports: ["iCalendar (.ics)"],
    imports: ["iCalendar (.ics)"],
  },
]

export function TransferScreen() {
  const [, section] = useRoute()
  if (section === "obsidian") return <ObsidianMigration />
  return <TransferHome />
}

function TransferHome() {
  const toast = useToast()
  const [mode, setMode] = useState<"exportar" | "importar">("exportar")
  const [mesaDialog, setMesaDialog] = useState(false)
  const [conflict, setConflict] = useState(false)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Tudo sai e entra em arquivos comuns</span>
          <h1 className="page-title">Importar / Exportar</h1>
        </div>
        <Segmented
          label="Direção"
          value={mode}
          onChange={setMode}
          options={[
            { value: "exportar", label: "Exportar", icon: <ArrowUpFromLine size={14} /> },
            { value: "importar", label: "Importar", icon: <ArrowDownToLine size={14} /> },
          ]}
        />
      </div>

      <div className="transfer-grid">
        {DOMAINS.map((d) => (
          <section key={d.id} className="card stack transfer-card" style={{ ["--dom" as string]: d.color }}>
            <span className="section-title row">
              <span className="cat-icon" style={{ ["--cat" as string]: d.color }}>{d.icon}</span>
              {d.title}
            </span>
            <div className="list">
              {(mode === "exportar" ? d.exports : d.imports).map((item) => (
                <button
                  key={item}
                  className="list-item small"
                  onClick={() => {
                    if (WORKING[item]) navigate(WORKING[item])
                    else if (d.id === "mesa" && mode === "exportar") setMesaDialog(true)
                    else if (mode === "importar" && item.startsWith("Pacote")) setConflict(true)
                    else toast(`Protótipo: ${mode === "exportar" ? "exportaria" : "importaria"} ${item}`)
                  }}
                >
                  {mode === "exportar" ? <ArrowUpFromLine size={14} /> : <ArrowDownToLine size={14} />}
                  <span className="grow">{item}</span>
                </button>
              ))}
            </div>
          </section>
        ))}

        <section className="card stack transfer-card" style={{ ["--dom" as string]: "var(--cyan)" }}>
          <span className="section-title row">
            <span className="cat-icon" style={{ ["--cat" as string]: "var(--cyan)" }}>
              <Package size={20} />
            </span>
            Geral
          </span>
          <button className="list-item small" onClick={() => toast("Protótipo: pacote .runas do cofre inteiro")}>
            <Package size={14} /> Pacote <span className="mono">.runas</span> (cofre inteiro ou seleção)
          </button>
          <button className="list-item small" onClick={() => toast("Protótipo: backup criado")}>
            <History size={14} /> Backup agora · último: hoje 08:00
          </button>
          <button className="list-item small" onClick={() => toast("Protótipo: procurando o outro aparelho na rede local")}>
            <FolderInput size={14} /> Sincronizar com outro aparelho (rede local)
          </button>
          <span className="tiny faint row">
            <ShieldCheck size={13} /> Nada sai do seu computador sem você escolher o arquivo.
          </span>
        </section>
      </div>

      {mesaDialog && (
        <Modal
          title="Exportar mesa"
          onClose={() => setMesaDialog(false)}
          footer={
            <>
              <button className="btn" onClick={() => setMesaDialog(false)}>Cancelar</button>
              <button className="btn primary" onClick={() => { setMesaDialog(false); toast("Protótipo: As Cinzas de Valdris.runasmesa (312 MB)") }}>
                Exportar
              </button>
            </>
          }
        >
          <label className="field">
            <span>Mesa</span>
            <select className="select">
              {MESAS.map((m) => (
                <option key={m.id}>{m.title}</option>
              ))}
            </select>
          </label>
          <div className="stack">
            <span className="eyebrow">O que levar</span>
            {["Mesa inteira", "Cenas (5)", "Tokens (8)", "Mapas e imagens", "Playlists e áudios", "Paredes, portas e luzes", "Névoa já explorada", "Notas da mesa (Mesas/…)"].map((item, i) => (
              <label key={item} className="check">
                <input type="checkbox" defaultChecked={i === 0 || i < 6} /> {item}
              </label>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" defaultChecked /> Incluir as notas da wiki ligadas aos pinos (dependências)
          </label>
        </Modal>
      )}

      {conflict && (
        <Modal
          title="Importar pacote"
          onClose={() => setConflict(false)}
          footer={
            <>
              <button className="btn" onClick={() => setConflict(false)}>Cancelar</button>
              <button className="btn primary" onClick={() => { setConflict(false); toast("Protótipo: importado com mescla") }}>Importar</button>
            </>
          }
        >
          <p className="small">
            O pacote <span className="mono">Coroa Partida.runasmesa</span> tem 3 itens que já existem no seu cofre.
          </p>
          {["Mesclar (mantém os dois e junta o que mudou)", "Substituir o que existe", "Duplicar como “(cópia)”"].map((option, i) => (
            <label key={option} className="card tight check">
              <input type="radio" name="conflito" defaultChecked={i === 0} /> {option}
            </label>
          ))}
          <span className="tiny faint">Um snapshot é feito antes de importar, para desfazer se precisar.</span>
        </Modal>
      )}
    </div>
  )
}
