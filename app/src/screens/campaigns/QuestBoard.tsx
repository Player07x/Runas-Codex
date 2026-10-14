import { useState } from "react"
import { GripVertical, Plus } from "lucide-react"
import type { Campaign, QuestStatus } from "../../data/types"
import { useProtoAction } from "../../components/ui"

const COLUMNS: { id: QuestStatus; label: string; color: string }[] = [
  { id: "ideia", label: "Ideias", color: "var(--violet)" },
  { id: "ativa", label: "Ativas", color: "var(--cyan)" },
  { id: "pausada", label: "Em pausa", color: "var(--gold)" },
  { id: "concluida", label: "Concluídas", color: "var(--green)" },
  { id: "falhou", label: "Falharam", color: "var(--red)" },
]

export function QuestBoard({ campaign }: { campaign: Campaign }) {
  const proto = useProtoAction()
  const [quests, setQuests] = useState(campaign.quests)
  const [dragging, setDragging] = useState<string | null>(null)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Arraste os cartões entre as colunas</span>
          <h1 className="page-title">Missões</h1>
        </div>
        <button className="btn primary" onClick={proto("criar missão")}>
          <Plus size={16} /> Missão
        </button>
      </div>
      <div className="kanban">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="kanban-col"
            style={{ ["--col" as string]: col.color }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragging) setQuests(quests.map((q) => (q.id === dragging ? { ...q, status: col.id } : q)))
              setDragging(null)
            }}
          >
            <div className="kanban-head">
              <span className="dot" style={{ background: col.color }} />
              <strong>{col.label}</strong>
              <span className="chip">{quests.filter((q) => q.status === col.id).length}</span>
            </div>
            {quests
              .filter((q) => q.status === col.id)
              .map((q) => (
                <div key={q.id} className="card tight kanban-card" draggable onDragStart={() => setDragging(q.id)}>
                  <div className="row">
                    <GripVertical size={14} color="var(--faint)" />
                    <span className="mono tiny faint">{q.order}</span>
                  </div>
                  <strong className="small">{q.title}</strong>
                  {q.giver && <span className="tiny muted">De: {q.giver}</span>}
                  <div className="row-wrap">
                    {q.reward && <span className="chip gold">{q.reward}</span>}
                    {q.tags.map((t) => (
                      <span key={t} className="chip">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}
