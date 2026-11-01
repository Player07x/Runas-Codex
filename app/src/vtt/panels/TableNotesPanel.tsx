import { useEffect, useRef, useState } from "react"
import { ClipboardCopy, Dices, Info, Save, Swords, Trash2 } from "lucide-react"
import type { LogKind } from "../shared/log"
import { TABLE_NOTES_ID } from "../shared/scene"
import { useDocumentsVersion, type DocumentStore } from "../document-store"
import { vtt } from "../api"
import { appendLine, eventLine, sessionFromTableNotes } from "../../core/table-notes"
import { listCampaigns, listSessions, sessionFileName, uniqueNoteName } from "../../core/campaigns"
import { Modal, useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"

const KIND: Record<LogKind, { label: string; icon: typeof Dices; className: string }> = {
  test: { label: "Teste", icon: Dices, className: "test" },
  damage: { label: "Dano", icon: Swords, className: "damage" },
  info: { label: "Aviso", icon: Info, className: "info" },
}

/** Data local de hoje (`AAAA-MM-DD`), o dia da nota. */
const today = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}` }

/**
 * Notas da mesa (U14, no lugar do Registro): o mestre anota o que quiser durante o jogo. O texto grava sozinho (pausa
 * curta ao digitar, ao sair do campo, ao trocar de painel e ao fechar a mesa) e fica com a mesa; só “Salvar Sessão”
 * o transforma numa sessão da campanha. Os Acontecimentos (rolagens, avisos das regiões) seguem embaixo, só leitura.
 */
export function TableNotesPanel({ store, canSaveSession }: { store: DocumentStore; canSaveSession: boolean }) {
  useDocumentsVersion(store)
  const saved = store.tableNotes()?.data.text ?? ""
  const [draft, setDraft] = useState(saved)
  const [state, setState] = useState<"gravado" | "gravando" | "erro">("gravado")
  const [saving, setSaving] = useState(false)
  const latest = useRef(draft)
  const dirty = useRef(false)
  const timer = useRef<number | null>(null)
  latest.current = draft
  // Mudança vinda de fora (o mestre remoto escrevendo) entra quando não há nada por gravar aqui.
  useEffect(() => { if (!dirty.current) setDraft(saved) }, [saved])
  const flush = () => {
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null }
    if (!dirty.current) return
    dirty.current = false
    setState("gravando")
    void store.put({ id: TABLE_NOTES_ID, type: "table-notes", parentId: null, data: { text: latest.current } }).then(() => setState("gravado"), () => { dirty.current = true; setState("erro") })
  }
  const change = (text: string) => {
    latest.current = text
    setDraft(text)
    dirty.current = true
    setState("gravando")
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, 700)
  }
  // Trocar de painel, sair da mesa ou fechar a janela: grava o que faltava.
  useEffect(() => {
    window.addEventListener("pagehide", flush)
    return () => { window.removeEventListener("pagehide", flush); flush() }
  }, [])

  return <div className="log-panel table-notes-panel">
    <header className="panel-header">
      <div><p className="eyebrow">Notas</p><h2>Notas da mesa</h2></div>
      {canSaveSession && <button type="button" className="primary" disabled={!draft.trim()} onClick={() => { flush(); setSaving(true) }} title="Cria uma sessão da campanha com este texto"><Save size={15} /> Salvar Sessão</button>}
    </header>
    <label className="table-notes-field">
      <span className="sr-only">Notas da mesa</span>
      <textarea value={draft} onChange={(event) => change(event.target.value)} onBlur={flush} placeholder="O que aconteceu, nomes improvisados, pistas, ganchos… O texto fica com a mesa até você salvar a sessão." />
    </label>
    <small className="hint" role="status" aria-live="polite">{state === "gravando" ? "Gravando…" : state === "erro" ? "Não deu para gravar; o texto continua aqui e tenta de novo ao sair do campo." : draft ? "Gravado com a mesa." : ""}</small>
    <Events store={store} onCopy={(line) => change(appendLine(latest.current, line))} />
    {saving && <SaveSessionDialog text={draft} onClose={() => setSaving(false)} onSaved={(clear) => { setSaving(false); if (clear) { change(""); flush() } }} />}
  </div>
}

/** Acontecimentos: o que ia para o Registro (rolagens dos sites da suíte, avisos e teleportes das regiões). */
function Events({ store, onCopy }: { store: DocumentStore; onCopy: (line: string) => void }) {
  const [clearing, setClearing] = useState(false)
  const entries = store.logs()
  // O Registro cresce a sessão inteira; a limpeza sai numa única mudança, sem republicar a projeção a cada entrada.
  async function clear() {
    if (!window.confirm(`Apagar os ${entries.length} acontecimentos? Isso não pode ser desfeito (as Notas ficam).`)) return
    setClearing(true)
    try { await vtt.documents.clearLog() } finally { setClearing(false) }
  }
  return <details className="table-events">
    <summary>Acontecimentos{entries.length ? ` · ${entries.length}` : ""}</summary>
    {entries.length === 0 && <p className="hint">Avisos das regiões (texto e teleporte) e rolagens aparecem aqui e sobre o token na cena.</p>}
    {entries.length > 0 && <div className="row-actions"><button type="button" className="ghost danger small" disabled={clearing} onClick={() => void clear()}><Trash2 size={14} /> Limpar acontecimentos</button></div>}
    <ol className="log-list">
      {entries.map((entry) => {
        const kind = KIND[entry.data.kind]
        const Icon = kind.icon
        return <li key={entry.id} className={kind.className}>
          <span className="log-icon" title={kind.label}><Icon size={14} /></span>
          <div>
            <header><strong>{entry.data.title}</strong><time>{new Date(entry.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time></header>
            {entry.data.tokenName && <small className="log-token">{entry.data.tokenName}</small>}
            {entry.data.detail && <p>{entry.data.detail}</p>}
            <button type="button" className="link" onClick={() => onCopy(eventLine({ ...entry.data, at: entry.createdAt }))}><ClipboardCopy size={12} /> Copiar para a nota</button>
          </div>
        </li>
      })}
    </ol>
  </details>
}

/** Campanha, número e título da sessão; a data já vem como o dia de hoje. Só no app com o cofre (não no mestre remoto). */
function SaveSessionDialog({ text, onClose, onSaved }: { text: string; onClose: () => void; onSaved: (clear: boolean) => void }) {
  const vault = useVault()
  const toast = useToast()
  const index = vault.index
  const campaigns = index ? listCampaigns(index) : []
  const [campaign, setCampaign] = useState(campaigns[0]?.name ?? "")
  const chosen = campaigns.find((entry) => entry.name === campaign)
  const next = chosen && index ? Math.max(0, ...listSessions(index, chosen, new Date()).map((session) => session.number ?? 0)) + 1 : 1
  const [number, setNumber] = useState("")
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(today)
  const [clear, setClear] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const n = Number(number || next)
  const readOnly = vault.info?.readOnly ?? true
  const save = async () => {
    if (!chosen || !index) return
    setBusy(true); setError("")
    try {
      const folder = `${chosen.root}Sessões`
      const name = uniqueNoteName(index, folder, sessionFileName(n))
      await vault.createNote(folder, name, sessionFromTableNotes({ number: n, title, date, text }))
      toast(`Sessão ${n} salva em ${folder}/.`)
      onSaved(clear)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      setBusy(false)
    }
  }
  return <Modal title="Salvar Sessão" onClose={onClose} footer={<>
    <button className="btn" onClick={onClose} disabled={busy}>Cancelar</button>
    <button className="btn primary" onClick={() => void save()} disabled={busy || readOnly || !chosen || !Number.isInteger(n) || n < 1 || !date}>Criar sessão</button>
  </>}>
    {!campaigns.length ? <p className="small muted">Nenhuma campanha neste cofre. Crie uma em Campanhas para salvar as notas como sessão.</p> : <div className="stack">
      <label className="field"><span>Campanha</span><select className="select" value={campaign} onChange={(event) => { setCampaign(event.target.value); setNumber("") }}>{campaigns.map((entry) => <option key={entry.name} value={entry.name}>{entry.name}</option>)}</select></label>
      <div className="row" style={{ gap: 10, alignItems: "end" }}>
        <label className="field" style={{ maxWidth: 110 }}><span>Número</span><input className="input" inputMode="numeric" value={number || String(next)} onChange={(event) => setNumber(event.target.value.replace(/\D/g, ""))} aria-label="Número da sessão" /></label>
        <label className="field grow"><span>Título (opcional)</span><input className="input" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Título da sessão" /></label>
      </div>
      <label className="field"><span>Data</span><input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Data da sessão" /></label>
      <label className="check"><input type="checkbox" checked={clear} onChange={(event) => setClear(event.target.checked)} /> Limpar as notas da mesa depois de salvar</label>
      <span className="small muted">A sessão entra como realizada, com o texto em Anotações; os Acontecimentos não vão junto (copie os que quiser).</span>
      {readOnly && <span className="small" style={{ color: "var(--red)" }}>Cofre em somente leitura: libere a gravação em Configurações.</span>}
      {error && <span className="small" style={{ color: "var(--red)" }}>{error}</span>}
    </div>}
  </Modal>
}
