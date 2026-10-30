import { useState } from "react"
import { Plus } from "lucide-react"
import { QUEST_STATUS, type QuestInfo, type QuestStatus } from "../../core/campaigns"
import { noteName } from "../../core/text"
import { href } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import { useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import { NewQuestDialog } from "./campaign-dialogs"
import { QuestMapView } from "./QuestMap"
import { ChoiceGroup } from "../../components/kit/ChoiceGroup"
import type { CampaignData } from "./campaign-state"

const VIEW_KEY = "runas-codex:campanha:missoes-vista"
type View = "colunas" | "mapa" | "lista"

/**
 * Missões em colunas pela propriedade `status`; arrastar (ou escolher no seletor, no celular) grava o status. No
 * computador as colunas têm largura mínima e a rolagem para o lado fica à vista; no celular aparece uma coluna por vez,
 * escolhida no seletor (rework F4c, CAM-4).
 */
export function QuestBoard({ data }: { data: CampaignData }) {
  const vault = useVault()
  const toast = useToast()
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<QuestStatus | null>(null)
  const [creating, setCreating] = useState<QuestStatus | null>(null)
  const [column, setColumn] = useState<QuestStatus>("ativa")
  const [view, setViewState] = useState<View>(() => { try { const saved = localStorage.getItem(VIEW_KEY); return saved === "mapa" || saved === "lista" ? saved : "colunas" } catch { return "colunas" } })
  const setView = (next: View) => { setViewState(next); try { localStorage.setItem(VIEW_KEY, next) } catch { /* só não é lembrado */ } }
  const move = (quest: QuestInfo, status: QuestStatus) => {
    if (quest.status === status) return
    if (data.readOnly) return toast("Cofre em somente leitura: libere a gravação em Configurações.")
    vault.setProperty(quest.path, "status", status).catch((err: unknown) => toast(err instanceof Error ? err.message : String(err)))
  }
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">{data.campaign.root}Missões/ · arraste os cartões ou use “Mover para”</span>
          <h1 className="page-title">Missões</h1>
        </div>
        <button className="btn primary" onClick={() => (data.readOnly ? toast("Libere a gravação em Configurações para criar missões.") : setCreating("ativa"))}>
          <Plus size={16} /> Missão
        </button>
      </div>
      <ChoiceGroup label="Ver as missões em" value={view} onChange={setView} options={[{ value: "colunas", label: "Colunas" }, { value: "mapa", label: "Mapa" }, { value: "lista", label: "Árvore" }]} />
      {view !== "colunas" ? <QuestMapView data={data} mode={view} /> : <>
      <label className="field campaign-kanban-pick">
        <span>Coluna</span>
        <select className="select" value={column} onChange={(e) => setColumn(e.target.value as QuestStatus)}>
          {QUEST_STATUS.map((s) => (
            <option key={s.id} value={s.id}>{s.label} ({data.quests.filter((q) => q.status === s.id).length})</option>
          ))}
        </select>
      </label>
      <div className="campaign-kanban" tabIndex={0} role="region" aria-label="Quadro de missões">
        {QUEST_STATUS.map((col) => {
          const quests = data.quests.filter((q) => q.status === col.id)
          return (
            <div
              key={col.id}
              className="campaign-kanban-col"
              data-current={col.id === column || undefined}
              style={{ ["--col" as string]: `var(--${col.color})` }}
              data-drop={(dragging && over === col.id) || undefined}
              onDragOver={(e) => { e.preventDefault(); if (over !== col.id) setOver(col.id) }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null) }}
              onDrop={() => {
                const quest = data.quests.find((q) => q.path === dragging)
                if (quest) move(quest, col.id)
                setDragging(null)
                setOver(null)
              }}
            >
              <div className="campaign-kanban-head">
                <span className="dot" style={{ background: `var(--${col.color})` }} />
                <strong className="grow">{col.label}</strong>
                <span className="chip">{quests.length}</span>
                {!data.readOnly && (
                  <button className="icon-btn sm" onClick={() => setCreating(col.id)} aria-label={`Nova missão em ${col.label}`}>
                    <Plus size={14} />
                  </button>
                )}
              </div>
              {quests.map((q) => (
                <div key={q.path} className="card tight campaign-kanban-card" draggable={!data.readOnly} onDragStart={() => setDragging(q.path)} onDragEnd={() => { setDragging(null); setOver(null) }}>
                  {q.order && <span className="mono tiny faint">{q.order}</span>}
                  <a className="campaign-kanban-title" href={href(noteRoute(q.path))}>{q.title}</a>
                  {q.giver && <span className="tiny muted">De: {noteName(q.giver.target)}</span>}
                  <div className="row-wrap">
                    {q.reward && <span className="chip gold">{q.reward}</span>}
                    {q.tags.map((t) => (
                      <span key={t} className="chip">{t}</span>
                    ))}
                  </div>
                  {/* Mover pelo seletor vale em qualquer largura: teclado e toque não dependem de arrastar (WCAG 2.1.1, 2.5.7). */}
                  <select className="select campaign-kanban-move" disabled={data.readOnly} value={q.status} onChange={(e) => move(q, e.target.value as QuestStatus)} aria-label={`Mover ${q.title} para`}>
                    {QUEST_STATUS.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )
        })}
      </div>
      </>}
      {creating && <NewQuestDialog campaign={data.campaign} quests={data.quests} npcs={data.npcs} initialStatus={creating} onClose={() => setCreating(null)} />}
    </div>
  )
}
