import { useState } from "react"
import { Minus, Pencil, Plus, Trash } from "lucide-react"
import { setClocks, type Clock } from "../../core/campaigns"
import { ClockDial, useToast } from "../../components/ui"
import { OverflowMenu } from "../../components/kit/OverflowMenu"
import { useVault } from "../../platform/VaultProvider"
import { FormDialog } from "./campaign-dialogs"
import { useUndoable } from "./campaign-edits"

const SEGMENTS = [4, 6, 8, 10, 12]

/**
 * Relógios de um bloco `runas-relogios` (na nota da campanha ou da missão): avançar e voltar, editar nome, partes e
 * tipo pelo ⋯, e apagar sem pedir confirmação, com “Desfazer” no aviso. `onChanged` recebe a lista nova e a anterior
 * (a missão usa para oferecer “Falhou” quando a ameaça enche).
 */
export function ClocksEditor({ path, clocks, readOnly, size, onChanged }: {
  path: string | undefined
  clocks: Clock[]
  readOnly: boolean
  size?: number
  onChanged?(next: Clock[], previous: Clock[]): void
}) {
  const vault = useVault()
  const toast = useToast()
  const undoable = useUndoable()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const save = async (next: Clock[]) => {
    if (readOnly || !path) {
      toast("Cofre em somente leitura: libere a gravação em Configurações.")
      return false
    }
    try {
      await vault.save(path, setClocks(vault.index!.note(path)!.text, next))
      onChanged?.(next, clocks)
      return true
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err))
      return false
    }
  }
  const set = (i: number, filled: number) => void save(clocks.map((c, j) => (j === i ? { ...c, filled: Math.max(0, Math.min(c.segments, filled)) } : c)))
  const remove = (i: number) => {
    if (!path) return
    void undoable(path, `Relógio “${clocks[i]!.name}” apagado.`, () => save(clocks.filter((_, j) => j !== i)))
  }
  return (
    <>
      <div className="campaign-clocks">
        {clocks.map((c, i) => (
          <div key={`${c.name}-${i}`} className="campaign-clock">
            <ClockDial segments={c.segments} filled={c.filled} color={c.kind === "ameaca" ? "var(--red)" : "var(--green)"} {...(size ? { size } : {})} />
            <span className="small">{c.name}</span>
            <span className="tiny faint">
              {c.kind === "ameaca" ? "Ameaça" : "Progresso"} · {c.filled} de {c.segments}
            </span>
            {!readOnly && (
              <span className="row" style={{ gap: 2 }}>
                <button type="button" className="icon-btn sm" onClick={() => set(i, c.filled - 1)} aria-label={`Voltar ${c.name}`}>
                  <Minus size={14} />
                </button>
                <button type="button" className="icon-btn sm" onClick={() => set(i, c.filled + 1)} aria-label={`Avançar ${c.name}`}>
                  <Plus size={14} />
                </button>
                <OverflowMenu label={`Ações do relógio ${c.name}`} triggerClassName="icon-btn sm" items={[
                  { label: "Editar nome, partes e tipo…", icon: <Pencil size={15} />, onSelect: () => setEditing(i) },
                  { label: "Apagar", icon: <Trash size={15} />, danger: true, onSelect: () => remove(i) },
                ]} />
              </span>
            )}
          </div>
        ))}
      </div>
      {!readOnly && (adding ? (
        <ClockForm onCancel={() => setAdding(false)} onSubmit={(clock) => void save([...clocks, clock]).then((ok) => ok && setAdding(false))} />
      ) : (
        <button type="button" className="btn sm ghost campaign-clock-add" onClick={() => setAdding(true)}>
          <Plus size={14} /> Novo relógio
        </button>
      ))}
      {editing !== null && clocks[editing] && (
        <ClockDialog clock={clocks[editing]!} onClose={() => setEditing(null)} onSave={async (clock) => {
          if (!(await save(clocks.map((c, j) => (j === editing ? clock : c))))) throw new Error("Não foi possível gravar o relógio.")
        }} />
      )}
    </>
  )
}

function ClockForm({ onSubmit, onCancel }: { onSubmit(clock: Clock): void; onCancel(): void }) {
  const [name, setName] = useState("")
  const [segments, setSegments] = useState("6")
  const [kind, setKind] = useState<Clock["kind"]>("ameaca")
  return (
    <form
      className="campaign-inline-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) onSubmit({ name: name.trim(), segments: Number(segments), filled: 0, kind })
      }}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <input className="input" autoFocus placeholder="Nome do relógio" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome do relógio" />
      <select className="select" value={segments} onChange={(e) => setSegments(e.target.value)} aria-label="Partes">
        {SEGMENTS.map((n) => <option key={n} value={n}>{n} partes</option>)}
      </select>
      <select className="select" value={kind} onChange={(e) => setKind(e.target.value as Clock["kind"])} aria-label="Tipo">
        <option value="ameaca">Ameaça</option>
        <option value="progresso">Progresso</option>
      </select>
      <button type="submit" className="btn sm primary" disabled={!name.trim()}>Criar</button>
      <button type="button" className="btn sm ghost" onClick={onCancel}>Cancelar</button>
    </form>
  )
}

function ClockDialog({ clock, onSave, onClose }: { clock: Clock; onSave(clock: Clock): Promise<void>; onClose(): void }) {
  const [name, setName] = useState(clock.name)
  const [segments, setSegments] = useState(clock.segments)
  const [kind, setKind] = useState(clock.kind)
  // Menos partes que as já preenchidas: o relógio fica cheio, sem passar do total.
  return (
    <FormDialog title="Editar relógio" confirmLabel="Gravar" disabled={!name.trim()} onClose={onClose}
      onConfirm={() => onSave({ name: name.trim(), segments, kind, filled: Math.min(clock.filled, segments) })}>
      <label className="field">
        <span>Nome</span>
        <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome do relógio" />
      </label>
      <div className="campaign-form-row">
        <label className="field grow">
          <span>Partes</span>
          <select className="select" value={segments} onChange={(e) => setSegments(Number(e.target.value))} aria-label="Partes">
            {[...new Set([...SEGMENTS, clock.segments])].sort((a, b) => a - b).map((n) => <option key={n} value={n}>{n} partes</option>)}
          </select>
        </label>
        <label className="field grow">
          <span>Tipo</span>
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value as Clock["kind"])} aria-label="Tipo">
            <option value="ameaca">Ameaça</option>
            <option value="progresso">Progresso</option>
          </select>
        </label>
      </div>
    </FormDialog>
  )
}
