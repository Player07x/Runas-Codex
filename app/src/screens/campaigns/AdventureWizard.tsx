import { useMemo, useState } from "react"
import { Dices, Plus, Trash } from "lucide-react"
import { ADVENTURE_TEMPLATES, nextArcOrder, planAdventure, type AdventureScene } from "../../core/adventure-templates"
import { newQuestNote, uniqueNoteName, type QuestStatus } from "../../core/campaigns"
import { ENCOUNTERS } from "../../core/generator-tables"
import { generateWorld } from "../../core/wiki-tools"
import { navigate } from "../../lib/router"
import { useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import { campaignRoute, type CampaignData } from "./campaign-state"

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]!

/**
 * Assistente “Nova aventura”: escolher um modelo de estrutura, dar nome, gancho e objetivo, ajustar as cenas e criar
 * tudo de uma vez — o arco e uma missão por cena, já ligadas no mapa de missões (`parte_de` e `requer`).
 */
export function AdventureWizard({ data }: { data: CampaignData }) {
  const vault = useVault()
  const toast = useToast()
  const [templateId, setTemplateId] = useState(ADVENTURE_TEMPLATES[0]!.id)
  const template = ADVENTURE_TEMPLATES.find((t) => t.id === templateId)!
  const [title, setTitle] = useState("")
  const [hook, setHook] = useState("")
  const [goal, setGoal] = useState("")
  const [status, setStatus] = useState<QuestStatus>("ideia")
  const [scenes, setScenes] = useState<AdventureScene[]>(template.scenes)
  const [busy, setBusy] = useState(false)
  const order = useMemo(() => nextArcOrder(data.quests.map((q) => q.order)), [data.quests])
  const choose = (id: string) => { setTemplateId(id); setScenes(ADVENTURE_TEMPLATES.find((t) => t.id === id)!.scenes) }
  const setScene = (i: number, patch: Partial<AdventureScene>) => setScenes((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const titles = scenes.map((s) => s.title.trim()).filter(Boolean)
  const duplicate = new Set(titles).size !== titles.length || titles.includes(title.trim())
  const create = async () => {
    if (data.readOnly) return toast("Libere a gravação em Configurações para criar a aventura.")
    setBusy(true)
    try {
      const folder = `${data.campaign.root}Missões`
      const plan = planAdventure({ title, hook, goal, scenes, flow: template.flow, order })
      // Os nomes dos arquivos podem ganhar “ 2” se já existirem; os links usam o caminho criado de verdade.
      const names = new Map<string, string>()
      const taken = new Set<string>()
      for (const quest of plan) {
        let name = uniqueNoteName(vault.index!, folder, quest.title)
        for (let i = 2; taken.has(name); i++) name = `${quest.title} ${i}`
        taken.add(name)
        names.set(quest.title, `${folder}/${name}`)
      }
      for (const quest of plan) {
        const target = names.get(quest.title)!
        const front = newQuestNote(quest.title, {
          status, order: quest.order,
          ...(quest.parent ? { parent: names.get(quest.parent)! } : {}),
          ...(quest.requires.length ? { requires: quest.requires.map((r) => names.get(r)!) } : {}),
        }).split(`\n# ${quest.title}\n`)[0]
        await vault.createNote(folder, target.slice(folder.length + 1), `${front}\n# ${quest.title}\n\n${quest.body.replace(/\[\[([^\]]+)\]\]/g, (_m, t: string) => `[[${names.get(t) ?? t}|${t}]]`)}`)
      }
      toast(`Aventura “${title.trim()}” criada com ${plan.length - 1} cenas.`)
      try { localStorage.setItem("runas-codex:campanha:missoes-vista", "mapa") } catch { /* só não abre no mapa */ }
      navigate(campaignRoute(data.campaign.name, "missoes"))
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="card stack campaign-wizard" aria-labelledby="nova-aventura">
      <h2 id="nova-aventura">Nova aventura</h2>
      <p className="small muted">Cria o arco ({order}) e uma missão por cena em {data.campaign.root}Missões/, já ligadas no mapa de missões.</p>
      <fieldset className="campaign-wizard-templates">
        <legend className="eyebrow">1. Estrutura</legend>
        {ADVENTURE_TEMPLATES.map((t) => (
          <label key={t.id} className={`campaign-wizard-template ${t.id === templateId ? "on" : ""}`}>
            <input type="radio" name="modelo-aventura" checked={t.id === templateId} onChange={() => choose(t.id)} />
            <strong>{t.label}</strong>
            <span className="tiny muted">{t.description}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="stack" style={{ gap: 8 }}>
        <legend className="eyebrow">2. A aventura</legend>
        <label className="field"><span>Título</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O Selo do Conde" /></label>
        <label className="field"><span>Gancho</span>
          <span className="row" style={{ gap: 6 }}>
            <input className="input grow" value={hook} onChange={(e) => setHook(e.target.value)} placeholder="O que puxa o grupo para a história" />
            <button type="button" className="icon-btn" onClick={() => setHook(generateWorld("gancho"))} aria-label="Sortear gancho" title="Sortear gancho"><Dices size={16} /></button>
          </span>
        </label>
        <label className="field"><span>Objetivo</span><input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="O que o grupo precisa conseguir" /></label>
        <label className="field" style={{ maxWidth: 240 }}><span>Situação das missões</span>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value as QuestStatus)}>
            <option value="ideia">Ideia (ainda não começou)</option><option value="ativa">Ativa</option>
          </select>
        </label>
      </fieldset>
      <fieldset className="stack" style={{ gap: 8 }}>
        <legend className="eyebrow">3. Cenas ({template.flow === "fila" ? "em sequência" : template.flow === "pistas" ? "pistas abertas que levam ao final" : "em qualquer ordem, até o destino"})</legend>
        <ol className="campaign-wizard-scenes">
          {scenes.map((scene, i) => (
            <li key={i}>
              <span className="row" style={{ gap: 6 }}>
                <input className="input grow" value={scene.title} onChange={(e) => setScene(i, { title: e.target.value })} aria-label={`Título da cena ${i + 1}`} />
                <button type="button" className="icon-btn" onClick={() => setScene(i, { title: pick(ENCOUNTERS) })} aria-label={`Sortear a cena ${i + 1}`} title="Sortear um encontro"><Dices size={16} /></button>
                <button type="button" className="icon-btn" disabled={scenes.length <= 1} onClick={() => setScenes((list) => list.filter((_, j) => j !== i))} aria-label={`Tirar a cena ${i + 1}`}><Trash size={15} /></button>
              </span>
              <input className="input small" value={scene.hint} onChange={(e) => setScene(i, { hint: e.target.value })} aria-label={`O que acontece na cena ${i + 1}`} placeholder="O que acontece" />
            </li>
          ))}
        </ol>
        <button type="button" className="btn sm ghost" style={{ justifySelf: "start" }} onClick={() => setScenes((list) => [...list, { title: "", hint: "" }])}><Plus size={14} /> Cena</button>
      </fieldset>
      {duplicate && <p className="small" role="alert" style={{ color: "var(--red)" }}>Cada cena precisa de um título diferente (e diferente do título da aventura).</p>}
      <button className="btn primary" style={{ justifySelf: "start" }} disabled={busy || data.readOnly || !title.trim() || !titles.length || duplicate} onClick={() => void create()}>
        {busy ? "Criando…" : `Criar aventura com ${titles.length} ${titles.length === 1 ? "cena" : "cenas"}`}
      </button>
    </section>
  )
}
