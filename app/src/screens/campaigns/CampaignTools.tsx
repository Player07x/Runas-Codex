import { useState } from "react"
import { Minus, Pencil, Plus, Trash } from "lucide-react"
import { findCodeBlocks } from "../../core/codeblocks"
import {
  advanceInitiative, initiativeFromEncounter, initiativeYaml, parseInitiative, parseTreasury, treasuryYaml,
  type Initiative, type TreasureItem, type Treasury,
} from "../../core/campaign-tools"
import { OverflowMenu } from "../../components/kit/OverflowMenu"
import { useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import type { CampaignData } from "./campaign-state"
import { FormDialog } from "./campaign-dialogs"
import { useUndoable } from "./campaign-edits"
import { CampaignRoomTools } from "./CampaignRoomTools"
import { AdventureWizard } from "./AdventureWizard"
import { createToolNote, findToolNote, INITIATIVE_TOOL, TREASURY_TOOL, updateToolBlock, type ToolNote } from "./tool-notes"

const TOOLS = [
  { id: "tesouro", label: "Tesouro do grupo" },
  { id: "iniciativa", label: "Iniciativa presencial" },
  { id: "aventura", label: "Nova aventura" },
  { id: "sala", label: "Atividades pela sala" },
] as const
type ToolId = (typeof TOOLS)[number]["id"]
const TOOL_KEY = "runas-codex:campanha:ferramenta"

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err))

/** Ferramentas da campanha (rework F4c, CAM-6): a lista à esquerda e só a escolhida à direita; a última fica lembrada. */
export function CampaignTools({ data }: { data: CampaignData }) {
  const [tool, setTool] = useState<ToolId>(() => {
    try {
      const saved = localStorage.getItem(TOOL_KEY)
      return TOOLS.some((t) => t.id === saved) ? (saved as ToolId) : "tesouro"
    } catch {
      return "tesouro"
    }
  })
  const choose = (id: ToolId) => {
    setTool(id)
    try {
      localStorage.setItem(TOOL_KEY, id)
    } catch {
      /* só não é lembrada */
    }
  }
  return (
    <div className="page campaign-tools">
      <h1 className="page-title">Ferramentas da campanha</h1>
      <div className="campaign-tools-layout">
        <nav className="campaign-tools-list" aria-label="Ferramentas">
          {TOOLS.map((t) => (
            <button key={t.id} type="button" className={`list-item ${tool === t.id ? "active" : ""}`} aria-current={tool === t.id ? "true" : undefined} onClick={() => choose(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="campaign-tools-current">
          {tool === "tesouro" && <TreasuryPanel data={data} />}
          {tool === "iniciativa" && <InitiativePanel data={data} />}
          {tool === "aventura" && <AdventureWizard data={data} />}
          {tool === "sala" && <CampaignRoomTools campaign={data.campaign.name} root={data.campaign.root} readOnly={data.readOnly} />}
        </div>
      </div>
    </div>
  )
}

/** A nota de uma ferramenta: o bloco lido do índice e as gravações (sempre sobre o texto atual da nota). */
function useToolNote(data: CampaignData, tool: ToolNote) {
  const vault = useVault()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const note = findToolNote(vault.index!, data.campaign.root, tool)
  const block = note ? findCodeBlocks(note.text, tool.language)[0] : undefined
  const run = async (task: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await task()
      return true
    } catch (err) {
      toast(errorText(err))
      return false
    } finally {
      setBusy(false)
    }
  }
  return {
    note,
    block,
    busy,
    disabled: data.readOnly || busy,
    create: () => run(() => createToolNote(vault, data.campaign.root, tool)),
    update: (change: (content: string) => string) => run(() => updateToolBlock(vault, data.campaign.root, tool, change)),
  }
}

// ---------- Tesouro ----------

function TreasuryPanel({ data }: { data: CampaignData }) {
  const tool = useToolNote(data, TREASURY_TOOL)
  const undoable = useUndoable()
  const [editing, setEditing] = useState<TreasureItem | null>(null)
  let state: Treasury = { coins: "", items: [] }
  let error = ""
  try {
    if (tool.block) state = parseTreasury(tool.block.content)
  } catch (err) {
    error = errorText(err)
  }
  // Cada mudança relê o bloco atual e troca só o que mudou.
  const change = (edit: (treasury: Treasury) => Treasury) => tool.update((content) => treasuryYaml(edit(parseTreasury(content))))
  const setQuantity = (item: TreasureItem, quantity: number) =>
    void change((t) => ({ ...t, items: t.items.map((i) => (i.id === item.id ? { ...i, quantity: Math.max(0, quantity) } : i)) }))
  const remove = (item: TreasureItem) =>
    void undoable(tool.note!.path, `“${item.name}” saiu do tesouro.`, () => change((t) => ({ ...t, items: t.items.filter((i) => i.id !== item.id) })))
  return (
    <section className="card stack">
      <h2>Tesouro do grupo</h2>
      {!tool.note ? (
        <button className="btn" disabled={tool.disabled} onClick={() => void tool.create()}>Criar tesouro do grupo</button>
      ) : error || !tool.block ? (
        <p role="alert">{error || "O bloco runas-tesouro não foi encontrado. Corrija a nota antes de editar."}</p>
      ) : (
        <>
          <form
            className="row-wrap"
            onSubmit={(e) => {
              e.preventDefault()
              const coins = (e.currentTarget.elements.namedItem("coins") as HTMLInputElement).value
              void change((t) => ({ ...t, coins }))
            }}
          >
            <label>
              Moedas (sem regras de sistema)
              <input className="input" name="coins" key={state.coins} defaultValue={state.coins} disabled={data.readOnly} />
            </label>
            <button type="submit" className="btn" disabled={tool.disabled}>Salvar moedas</button>
          </form>
          {state.items.length === 0 ? (
            <p className="muted small">Nenhum item. Recompensas de missões concluídas também chegam aqui.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Item</th><th>Quantidade</th><th>Portador</th><th>Notas</th><th><span className="sr-only">Ações</span></th></tr>
                </thead>
                <tbody>
                  {state.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>
                        <span className="row" style={{ gap: 4 }}>
                          <button className="icon-btn sm" disabled={tool.disabled || item.quantity <= 0} aria-label={`Diminuir ${item.name}`} onClick={() => setQuantity(item, item.quantity - 1)}>
                            <Minus size={14} />
                          </button>
                          <span className="mono">{item.quantity}</span>
                          <button className="icon-btn sm" disabled={tool.disabled} aria-label={`Aumentar ${item.name}`} onClick={() => setQuantity(item, item.quantity + 1)}>
                            <Plus size={14} />
                          </button>
                        </span>
                      </td>
                      <td>{item.holder || "Grupo"}</td>
                      <td className="preserve-lines">{item.notes}</td>
                      <td>
                        <OverflowMenu label={`Ações de ${item.name}`} triggerClassName="icon-btn sm" items={[
                          { label: "Editar…", icon: <Pencil size={15} />, disabled: tool.disabled, onSelect: () => setEditing(item) },
                          { label: "Remover do tesouro", icon: <Trash size={15} />, danger: true, disabled: tool.disabled, onSelect: () => remove(item) },
                        ]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <TreasureItemForm disabled={tool.disabled} onAdd={(item) => change((t) => ({ ...t, items: [...t.items, { id: crypto.randomUUID(), ...item }] }))} />
        </>
      )}
      {editing && (
        <TreasureItemDialog item={editing} onClose={() => setEditing(null)} onSave={async (item) => {
          if (!(await change((t) => ({ ...t, items: t.items.map((i) => (i.id === item.id ? item : i)) })))) throw new Error("Não foi possível gravar o item.")
        }} />
      )}
    </section>
  )
}

type ItemFields = Omit<TreasureItem, "id">

function TreasureItemForm({ disabled, onAdd }: { disabled: boolean; onAdd(item: ItemFields): Promise<boolean> }) {
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [holder, setHolder] = useState("")
  const [notes, setNotes] = useState("")
  return (
    <form
      className="row-wrap"
      onSubmit={(e) => {
        e.preventDefault()
        void onAdd({ name: name.trim(), quantity, holder: holder.trim(), notes: notes.trim() }).then((ok) => {
          if (!ok) return
          setName("")
          setNotes("")
        })
      }}
    >
      <label>Item<input className="input" required value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>Quantidade<input className="input" type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(Math.max(0, Number(e.target.value) || 0))} /></label>
      <label>Portador<input className="input" value={holder} onChange={(e) => setHolder(e.target.value)} /></label>
      <label>Notas do item<input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <button type="submit" className="btn" disabled={disabled || !name.trim()}>Acrescentar item</button>
    </form>
  )
}

function TreasureItemDialog({ item, onSave, onClose }: { item: TreasureItem; onSave(item: TreasureItem): Promise<void>; onClose(): void }) {
  const [name, setName] = useState(item.name)
  const [quantity, setQuantity] = useState(String(item.quantity))
  const [holder, setHolder] = useState(item.holder)
  const [notes, setNotes] = useState(item.notes)
  const amount = Number(quantity.replace(",", "."))
  const invalid = !Number.isFinite(amount) || amount < 0
  return (
    <FormDialog title={`Editar ${item.name}`} confirmLabel="Gravar" disabled={!name.trim() || invalid} onClose={onClose}
      onConfirm={() => onSave({ ...item, name: name.trim(), quantity: amount, holder: holder.trim(), notes: notes.trim() })}>
      <label className="field">
        <span>Item</span>
        <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome do item" />
      </label>
      <div className="campaign-form-row">
        <label className="field grow">
          <span>Quantidade</span>
          <input className="input" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} aria-invalid={invalid} aria-label="Quantidade" />
          {invalid && <span className="tiny" role="alert" style={{ color: "var(--red)" }}>Use um número de 0 em diante.</span>}
        </label>
        <label className="field grow">
          <span>Portador</span>
          <input className="input" value={holder} placeholder="Grupo" onChange={(e) => setHolder(e.target.value)} aria-label="Portador" />
        </label>
      </div>
      <label className="field">
        <span>Notas do item</span>
        <textarea className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notas do item" />
      </label>
    </FormDialog>
  )
}

// ---------- Iniciativa ----------

/** Também aparece na coluna Agora da Tela do Mestre (rework F4c, CAM-8), um nível de título abaixo. */
export function InitiativePanel({ data, level = 2 }: { data: CampaignData; level?: 2 | 3 }) {
  const vault = useVault()
  const tool = useToolNote(data, INITIATIVE_TOOL)
  const undoable = useUndoable()
  const [name, setName] = useState("")
  const [value, setValue] = useState(0)
  const [hidden, setHidden] = useState(false)
  const [encounter, setEncounter] = useState("")
  let state: Initiative = { round: 1, active: null, participants: [] }
  let error = ""
  try {
    if (tool.block) state = parseInitiative(tool.block.content)
  } catch (err) {
    error = errorText(err)
  }
  const change = (edit: (initiative: Initiative) => Initiative) => tool.update((content) => initiativeYaml(edit(parseInitiative(content))))
  const encounters = vault.index!.notesIn(data.campaign.root).flatMap((n) => findCodeBlocks(n.text, "runas-encontro").map((b, i) => ({ key: `${n.path}:${i}`, title: n.name, code: b.content })))
  const remove = (id: string, label: string) =>
    void undoable(tool.note!.path, `${label} saiu da iniciativa.`, () => change((s) => {
      const participants = s.participants.filter((p) => p.id !== id)
      return { ...s, participants, active: s.active === id ? participants[0]?.id ?? null : s.active }
    }))
  const Title = level === 3 ? "h3" : "h2"
  return (
    <section className="card stack">
      <Title>Iniciativa presencial</Title>
      {!tool.note ? (
        <button className="btn" disabled={tool.disabled} onClick={() => void tool.create()}>Criar iniciativa presencial</button>
      ) : error || !tool.block ? (
        <p role="alert">{error || "O bloco runas-iniciativa não foi encontrado."}</p>
      ) : (
        <>
          <p>
            Rodada {state.round} · Turno: <strong>{state.participants.find((p) => p.id === state.active)?.name ?? "nenhum"}</strong>
          </p>
          <div className="row-wrap">
            <button className="btn" disabled={tool.disabled || !state.active} onClick={() => void change((s) => advanceInitiative(s, -1))}>Turno anterior</button>
            <button className="btn primary" disabled={tool.disabled || !state.active} onClick={() => void change((s) => advanceInitiative(s))}>Próximo turno</button>
            <button className="btn" disabled={tool.disabled} onClick={() => void change((s) => ({ ...s, round: 1, active: s.participants[0]?.id ?? null }))}>Reiniciar rodadas</button>
          </div>
          <ol className="initiative-list">
            {state.participants.map((p) => (
              <li key={p.id} aria-current={p.id === state.active ? "step" : undefined}>
                <strong>{p.value} · {p.name}</strong>
                {p.hidden && " · oculto"}
                <button className="btn" disabled={tool.disabled} onClick={() => remove(p.id, p.name)}>Remover {p.name}</button>
              </li>
            ))}
          </ol>
          <form
            className="row-wrap"
            onSubmit={(e) => {
              e.preventDefault()
              void change((s) => {
                const participants = [...s.participants, { id: crypto.randomUUID(), name: name.trim(), value, hidden, note: "" }].sort((a, b) => b.value - a.value)
                return { ...s, participants, active: s.active ?? participants[0]?.id ?? null }
              }).then((ok) => ok && setName(""))
            }}
          >
            <label>Participante<input className="input" required value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>Iniciativa<input className="input" type="number" value={value} onChange={(e) => setValue(Number(e.target.value) || 0)} /></label>
            <label className="check"><input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />Oculto</label>
            <button type="submit" className="btn" disabled={tool.disabled || !name.trim()}>Acrescentar participante</button>
          </form>
          {encounters.length > 0 && (
            <div className="row-wrap">
              <label>
                Encontro
                <select className="input" value={encounter} onChange={(e) => setEncounter(e.target.value)}>
                  <option value="">Escolha um encontro…</option>
                  {encounters.map((e) => <option key={e.key} value={e.key}>{e.title}</option>)}
                </select>
              </label>
              <button className="btn" disabled={tool.disabled || !encounter} onClick={() => void change(() => initiativeFromEncounter(encounters.find((e) => e.key === encounter)!.code))}>
                Substituir pelos participantes do encontro
              </button>
              <p className="small">Rola 1d20 mais o modificador informado. Quantidades em dados entram como um participante; acrescente os demais após rolar a quantidade.</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
