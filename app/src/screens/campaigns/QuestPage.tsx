import { useMemo, useState } from "react"
import { ArrowRight, ChevronLeft, ExternalLink, PanelRight, Trash2 } from "lucide-react"
import { ResizablePanel, usePanelToggle } from "../../components/ResizablePanel"
import { OverflowMenu, type MenuEntry } from "../../components/kit/OverflowMenu"
import { NoteView } from "../../components/vault/NoteView"
import { ConfirmDialog } from "../../components/vault/dialogs"
import { useToast } from "../../components/ui"
import { QUEST_STATUS, type Clock, type QuestInfo, type QuestStatus } from "../../core/campaigns"
import { dirname, noteName } from "../../core/text"
import { navigate } from "../../lib/router"
import { useVault } from "../../platform/VaultProvider"
import { NewNpcDialog } from "./campaign-dialogs"
import { campaignRoute, questRoute, type CampaignData } from "./campaign-state"
import { ClocksEditor } from "./ClocksEditor"
import { useQuestStatus } from "./quest-actions"

/**
 * Menu ⋯ de uma missão (U7), igual no quadro, no mapa e na árvore: abrir dentro da campanha, mover de coluna (a
 * alternativa ao arrastar, pelo teclado) e mandar para a lixeira do cofre, com confirmação.
 */
export function QuestMenu({ data, quest }: { data: CampaignData; quest: QuestInfo }) {
  const vault = useVault()
  const setStatus = useQuestStatus(data)
  const [deleting, setDeleting] = useState(false)
  const move = (status: QuestStatus) => void setStatus(quest, status)
  // Quem aponta para esta missão (parte_de ou requer) fica com o link quebrado: a confirmação conta.
  const dependents = data.quests.filter((q) => q.parent?.dest === quest.path || q.requires.some((r) => r.dest === quest.path))
  const items: MenuEntry[] = [
    { label: "Abrir", icon: <ExternalLink size={15} />, onSelect: () => navigate(questRoute(data.campaign.name, quest.path)) },
    "separator",
    ...QUEST_STATUS.filter((s) => s.id !== quest.status).map((s): MenuEntry => ({ label: `Mover para ${s.label}`, icon: <ArrowRight size={15} />, onSelect: () => move(s.id), disabled: data.readOnly })),
    "separator",
    { label: "Mandar para a lixeira…", icon: <Trash2 size={15} />, danger: true, disabled: data.readOnly, onSelect: () => setDeleting(true) },
  ]
  return <>
    <OverflowMenu label={`Ações da missão ${quest.title}`} items={items} triggerClassName="icon-btn sm" />
    {deleting && (
      <ConfirmDialog title={`Mandar “${quest.title}” para a lixeira?`} confirmLabel="Mandar para a lixeira" danger onClose={() => setDeleting(false)} onConfirm={() => vault.trash(quest.path)}>
        A nota da missão vai para a lixeira do cofre (<code>.trash</code>) e pode ser restaurada em Notas › ⋯ › Lixeira do cofre.
        {dependents.length > 0 && <> {dependents.length === 1 ? "A missão" : "As missões"} {dependents.map((q) => `“${q.title}”`).join(", ")} {dependents.length === 1 ? "aponta" : "apontam"} para ela e {dependents.length === 1 ? "fica" : "ficam"} com o link quebrado.</>}
      </ConfirmDialog>
    )}
  </>
}

/** A missão aberta dentro da campanha (U7): o editor da nota e um painel com situação, ligações e recompensa. */
export function QuestPage({ data, path }: { data: CampaignData; path: string }) {
  const vault = useVault()
  const toast = useToast()
  const index = vault.index!
  const panel = usePanelToggle("campaign-quest")
  const [creatingLink, setCreatingLink] = useState<string | null>(null)
  const quest = data.quests.find((q) => q.path === path)
  const folders = useMemo(() => [...new Set(index.allFiles().map((f) => dirname(f.path)))].filter(Boolean), [index, vault.version])
  const back = () => navigate(campaignRoute(data.campaign.name, "missoes"))
  if (!quest) {
    return (
      <div className="page">
        <p className="muted">
          Missão não encontrada (foi renomeada ou apagada?). <button className="btn sm" onClick={back}>Voltar às missões</button>
        </p>
      </div>
    )
  }
  return (
    <div className={`campaign-session-layout ${panel.overlay ? "show-panel" : ""}`}>
      <section className="campaign-session-main">
        <button className="btn ghost sm campaign-quest-back" onClick={back}><ChevronLeft size={14} /> Voltar às missões</button>
        <NoteView
          key={path}
          path={path}
          folders={folders}
          onShowPanel={panel.toggle}
          panelOpen={panel.expanded}
          panelHint="Situação, ligações e recompensa da missão"
          onBack={back}
          onCreate={(target) => (data.readOnly ? toast(`“${target}” ainda não existe.`) : setCreatingLink(target))}
          onTag={(tag) => toast(`Tag #${tag}`)}
        />
      </section>
      <ResizablePanel id="campaign-quest" label="Detalhes da missão" side="right" width={360} className="campaign-session-side" onCollapsedChange={panel.onCollapsedChange}>
        <button className="btn ghost sm campaign-panel-close" onClick={panel.close}>
          <ChevronLeft size={14} /> Voltar à nota
        </button>
        <QuestDetails key={quest.path} data={data} quest={quest} />
      </ResizablePanel>
      <button className="icon-btn campaign-panel-toggle" onClick={panel.toggle} aria-label="Painel da missão" aria-expanded={panel.expanded}>
        <PanelRight size={18} />
      </button>
      {creatingLink && <NewNpcDialog data={data} initialName={creatingLink} onClose={() => setCreatingLink(null)} onCreated={(created) => toast(`“${noteName(created)}” criado na wiki.`)} />}
    </div>
  )
}

function QuestDetails({ data, quest }: { data: CampaignData; quest: QuestInfo }) {
  const vault = useVault()
  const toast = useToast()
  const setStatus = useQuestStatus(data)
  const ro = data.readOnly
  // Relógio de ameaça da missão que acabou de encher: o mestre confirma se a missão falhou.
  const [filled, setFilled] = useState<string | null>(null)
  const onClocks = (next: Clock[], previous: Clock[]) => {
    const full = next.find((c, i) => c.kind === "ameaca" && c.filled === c.segments && previous[i]?.name === c.name && previous[i]!.filled < c.segments)
    if (full && quest.status !== "falhou" && quest.status !== "concluida") setFilled(full.name)
  }
  const set = (key: string, value: string | string[] | undefined) => {
    if (ro) return toast("Cofre em somente leitura: libere a gravação em Configurações.")
    vault.setProperty(quest.path, key, value).catch((err: unknown) => toast(err instanceof Error ? err.message : String(err)))
  }
  const link = (target: string) => `[[${vault.index!.linkTarget(target, quest.path)}]]`
  const others = data.quests.filter((q) => q.path !== quest.path)
  const requires = quest.requires.map((r) => r.dest).filter((dest): dest is string => Boolean(dest))
  const toggleRequire = (path: string) => {
    const next = requires.includes(path) ? requires.filter((p) => p !== path) : [...requires, path]
    set("requer", next.length ? next.map(link) : undefined)
  }
  // Os campos de texto gravam ao sair (Tab, clique fora); os seletores, na hora.
  const [order, setOrder] = useState(quest.order)
  const [reward, setReward] = useState(quest.reward ?? "")
  const [giver, setGiver] = useState(quest.giver ? noteName(quest.giver.target) : "")
  const label = (q: QuestInfo) => `${q.order ? `${q.order} · ` : ""}${q.title}`
  return (
    <section className="card stack campaign-quest-details" aria-label="Detalhes da missão">
      <label className="field">
        <span>Situação</span>
        <select className="select" disabled={ro} value={quest.status} onChange={(e) => void setStatus(quest, e.target.value as QuestStatus)} aria-label="Situação da missão">
          {QUEST_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Ordem</span>
        <input className="input mono" disabled={ro} value={order} placeholder="1.1" onChange={(e) => setOrder(e.target.value)} onBlur={() => order.trim() !== quest.order && set("ordem", order.trim() || undefined)} aria-label="Ordem narrativa" />
      </label>
      <label className="field">
        <span>Parte de</span>
        <select className="select" disabled={ro} value={quest.parent?.dest ?? ""} onChange={(e) => set("parte_de", e.target.value ? link(e.target.value) : undefined)} aria-label="Missão-mãe">
          <option value="">Nenhuma (missão de topo)</option>
          {others.map((q) => <option key={q.path} value={q.path}>{label(q)}</option>)}
        </select>
      </label>
      {others.length > 0 && (
        <fieldset className="field campaign-requires">
          <legend>Depende de{requires.length ? ` · ${requires.length}` : ""}</legend>
          <div className="campaign-requires-list">
            {others.filter((q) => q.path !== quest.parent?.dest).map((q) => (
              <label key={q.path} className="check small">
                <input type="checkbox" disabled={ro} checked={requires.includes(q.path)} onChange={() => toggleRequire(q.path)} /> {label(q)}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="field">
        <span>Quem pediu</span>
        <input className="input" disabled={ro} value={giver} list="npcs-da-missao" onChange={(e) => setGiver(e.target.value)} onBlur={() => {
          const current = quest.giver ? noteName(quest.giver.target) : ""
          if (giver.trim() !== current) set("contratante", giver.trim() ? `[[${giver.trim()}]]` : undefined)
        }} aria-label="Quem pediu a missão" />
        <datalist id="npcs-da-missao">{data.npcs.map((n) => <option key={n.position} value={noteName(n.target)} />)}</datalist>
      </label>
      <label className="field">
        <span>Recompensa</span>
        <input className="input" disabled={ro} value={reward} onChange={(e) => setReward(e.target.value)} onBlur={() => reward.trim() !== (quest.reward ?? "") && set("recompensa", reward.trim() || undefined)} aria-label="Recompensa" />
        <span className="tiny faint">Ao concluir a missão, o aviso oferece mandar a recompensa para o Tesouro do grupo.</span>
      </label>
      <div className="stack" style={{ gap: 6 }}>
        <span className="eyebrow">Relógios da missão</span>
        {!quest.clocks?.length && <span className="tiny muted">Uma ameaça que corre junto com a missão (“o ritual se completa”). Quando enche, a missão pode falhar.</span>}
        <ClocksEditor path={quest.path} clocks={quest.clocks ?? []} readOnly={ro} size={48} onChanged={onClocks} />
      </div>
      <div role="status" className="campaign-advance-slot">
        {filled && (
          <div className="campaign-advance stack">
            <span className="small">O relógio “{filled}” encheu. A missão falhou?</span>
            <div className="row-wrap">
              <button type="button" className="btn sm danger" onClick={() => void setStatus(quest, "falhou").then((ok) => ok && setFilled(null))}>Marcar como Falhou</button>
              <button type="button" className="btn sm ghost" onClick={() => setFilled(null)}>Ainda não</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
