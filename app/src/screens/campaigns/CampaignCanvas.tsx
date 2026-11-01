import { useState } from "react"
import { Pencil, Plus, Shapes, Trash2 } from "lucide-react"
import { investigationCanvas, sessionTimelineCanvas } from "../../core/board-templates"
import { canvasToSave, emptyCanvasText, type CanvasDoc } from "../../core/canvas"
import { buildQuestMap, questMapCanvas } from "../../core/quest-map"
import { buildRelationMap, relationMapCanvas } from "../../core/relation-map"
import { nameProblem } from "../../core/names"
import { basename, dirname } from "../../core/text"
import { href, navigate } from "../../lib/router"
import { CanvasBoard } from "../../components/canvas/CanvasBoard"
import { OverflowMenu } from "../../components/kit/OverflowMenu"
import { ConfirmDialog, NameDialog } from "../../components/vault/dialogs"
import { Empty, useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import { FormDialog } from "./campaign-dialogs"
import { campaignRoute, worldDateLabel, type CampaignData } from "./campaign-state"
import { relationMembers, relationScope } from "./board-actions"

const boardName = (path: string) => basename(path).replace(/\.canvas$/i, "")

type Template = "vazio" | "missoes" | "relacoes" | "linha" | "investigacao"
const TEMPLATES: { id: Template; label: string; hint: string; name: string }[] = [
  { id: "vazio", label: "Em branco", hint: "Cartões, notas e setas do jeito que quiser.", name: "Quadro" },
  { id: "missoes", label: "Mapa de missões", hint: "Arcos e pré-requisitos das missões. A aba Missões atualiza depois.", name: "Mapa de missões" },
  { id: "relacoes", label: "Mapa de relações", hint: "Elenco e facções pelas relações da wiki e pela atitude com o grupo.", name: "Mapa de relações" },
  { id: "linha", label: "Linha do tempo", hint: "As sessões em ordem, com a data real e a data no mundo.", name: "Linha do tempo" },
  { id: "investigacao", label: "Investigação", hint: "Três pistas para cada conclusão e um grupo para os suspeitos.", name: "Investigação" },
]

/** Aba Quadro: os `.canvas` da pasta da campanha (abre direto o primeiro). */
export function BoardsView({ data, path }: { data: CampaignData; path?: string }) {
  const vault = useVault()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [trashing, setTrashing] = useState(false)
  const current = path ?? data.boards[0]
  const writable = () => {
    if (data.readOnly) toast("Libere a gravação em Configurações para mexer nos quadros.")
    return !data.readOnly
  }
  const newButton = (
    <button className="btn sm" onClick={() => writable() && setCreating(true)}>
      <Plus size={14} /> Novo quadro
    </button>
  )
  return (
    <div className="campaign-boards">
      <h1 className="sr-only">{current ? boardName(current) : "Quadros"}</h1>
      <nav className="campaign-boards-bar" aria-label="Quadros da campanha">
        <Shapes size={15} color="var(--accent, var(--violet))" aria-hidden="true" />
        {data.boards.map((b) => (
          <a key={b} className={`chip ${b === current ? "violet" : ""}`} aria-current={b === current ? "page" : undefined} href={href(campaignRoute(data.campaign.name, "quadro", b))}>
            {boardName(b)}
          </a>
        ))}
        <span className="grow" />
        {current && (
          <OverflowMenu label={`Ações do quadro ${boardName(current)}`} triggerClassName="icon-btn sm" items={[
            { label: "Renomear…", icon: <Pencil size={15} />, disabled: data.readOnly, onSelect: () => writable() && setRenaming(true) },
            { label: "Mandar para a lixeira…", icon: <Trash2 size={15} />, danger: true, disabled: data.readOnly, onSelect: () => writable() && setTrashing(true) },
          ]} />
        )}
        {newButton}
      </nav>
      {current ? (
        <CanvasBoard key={current} path={current} />
      ) : (
        <div className="page">
          <Empty title="Nenhum quadro nesta campanha" action={newButton}>
            Um quadro é um arquivo .canvas (o mesmo formato do Obsidian): cartões de texto, notas da wiki e da campanha, imagens e grupos ligados por setas.
          </Empty>
        </div>
      )}
      {creating && <NewBoardDialog data={data} onClose={() => setCreating(false)} />}
      {renaming && current && (
        <NameDialog title="Renomear quadro" label="Nome do quadro" initial={boardName(current)} confirmLabel="Renomear" hint="Os links para o quadro nas notas são atualizados."
          onClose={() => setRenaming(false)}
          onConfirm={async (name) => {
            const problem = nameProblem(name)
            if (problem) throw new Error(problem)
            const to = `${dirname(current)}/${name}.canvas`
            if (to !== current) {
              await vault.rename(current, to)
              navigate(campaignRoute(data.campaign.name, "quadro", to))
            }
          }} />
      )}
      {trashing && current && (
        <ConfirmDialog title={`Mandar “${boardName(current)}” para a lixeira?`} confirmLabel="Mandar para a lixeira" danger onClose={() => setTrashing(false)}
          onConfirm={async () => {
            await vault.trash(current)
            navigate(campaignRoute(data.campaign.name, "quadro"))
          }}>
          O arquivo vai para a lixeira do cofre (<code>.trash</code>) e pode ser restaurado em Notas › ⋯ › Lixeira do cofre.
        </ConfirmDialog>
      )}
    </div>
  )
}

/** Quadro novo: o nome e um modelo (em branco, mapas, linha do tempo ou investigação). */
function NewBoardDialog({ data, onClose }: { data: CampaignData; onClose(): void }) {
  const vault = useVault()
  const [template, setTemplate] = useState<Template>("vazio")
  const [name, setName] = useState("Quadro")
  // Enquanto o mestre não escreve outro nome, o nome acompanha o modelo.
  const [named, setNamed] = useState(false)
  const choose = (id: Template) => {
    setTemplate(id)
    if (!named) setName(TEMPLATES.find((t) => t.id === id)!.name)
  }
  const problem = name.trim() ? nameProblem(name.trim()) : null
  const build = (): CanvasDoc | null => {
    if (template === "missoes") return questMapCanvas(buildQuestMap(data.quests))
    if (template === "relacoes") return relationMapCanvas(buildRelationMap(vault.index!, relationMembers(data), relationScope(data)))
    if (template === "linha") return sessionTimelineCanvas(data.sessions, (date) => worldDateLabel(data.calendar, date) ?? date)
    if (template === "investigacao") return investigationCanvas()
    return null
  }
  return (
    <FormDialog title="Novo quadro" confirmLabel="Criar" wide disabled={!name.trim() || Boolean(problem)} onClose={onClose}
      onConfirm={async () => {
        const file = `${data.campaign.root}${name.trim()}.canvas`
        if (vault.index!.hasFile(file)) throw new Error(`Já existe o quadro “${name.trim()}”.`)
        const doc = build()
        await vault.createFile(file, doc ? canvasToSave(emptyCanvasText(), doc) ?? emptyCanvasText() : emptyCanvasText())
        navigate(campaignRoute(data.campaign.name, "quadro", file))
      }}>
      <label className="field">
        <span>Nome do quadro</span>
        <input className="input" autoFocus value={name} onChange={(e) => { setName(e.target.value); setNamed(true) }} aria-invalid={Boolean(problem)} aria-label="Nome do quadro" />
        {problem && <span className="tiny" role="alert" style={{ color: "var(--red)" }}>{problem}</span>}
      </label>
      <fieldset className="campaign-wizard-templates campaign-board-templates">
        <legend className="small">Modelo</legend>
        {TEMPLATES.map((t) => (
          <label key={t.id} className={`campaign-wizard-template ${template === t.id ? "on" : ""}`}>
            <input type="radio" name="modelo-quadro" value={t.id} checked={template === t.id} onChange={() => choose(t.id)} />
            <strong className="small">{t.label}</strong>
            <span className="tiny muted">{t.hint}</span>
          </label>
        ))}
      </fieldset>
      <span className="tiny faint">Cria {data.campaign.root}{name.trim() || "…"}.canvas, que abre igual no Obsidian.</span>
    </FormDialog>
  )
}
