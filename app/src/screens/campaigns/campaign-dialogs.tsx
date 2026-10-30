import { useMemo, useState, type ReactNode } from "react"
import { FileText, Search } from "lucide-react"
import { eventFileName, eventNote, type EventInput } from "../../core/agenda"
import {
  CAMPAIGN_ROOT, isPlayerNote, listPlayers, newCampaignNote, newQuestNote, npcExtra, withTrackedLink, newSessionNote, noteTitle, QUEST_STATUS, sessionFileName, uniqueNoteName, withCampaignPlayer,
  type CampaignInfo, type PlayerCharacter, type QuestInfo, type QuestStatus, type TrackedLink,
} from "../../core/campaigns"
import { emptyCanvasText } from "../../core/canvas"
import { noteDateText, parseWorldDate } from "../../core/calendar"
import { dirname, noteName } from "../../core/text"
import { articleKind, listWikis, newArticleNote } from "../../core/wiki"
import { setProperty } from "../../core/properties"
import { nameProblem } from "../../core/names"
import { useVault } from "../../platform/VaultProvider"
import { Modal } from "../../components/ui"
import type { CampaignData } from "./campaign-state"

/** Diálogo de formulário: o botão trava enquanto grava e o erro aparece embaixo. */
function FormDialog({ title, confirmLabel, disabled, onConfirm, onClose, children, wide }: { title: string; confirmLabel: string; disabled?: boolean; onConfirm(): Promise<void>; onClose(): void; children: ReactNode; wide?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const run = async () => {
    setBusy(true)
    setError(undefined)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }
  return (
    <Modal
      title={title}
      onClose={onClose}
      wide={wide}
      footer={
        <>
          <button className="btn ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn primary" onClick={run} disabled={busy || disabled}>
            {busy ? "Gravando…" : confirmLabel}
          </button>
        </>
      }
    >
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (!busy && !disabled) void run()
        }}
      >
        {children}
      </form>
      {error && <p className="small" style={{ color: "var(--red)" }}>{error}</p>}
    </Modal>
  )
}

export function NewCampaignDialog({ onClose, onCreated }: { onClose(): void; onCreated(name: string): void }) {
  const vault = useVault()
  const wikis = useMemo(() => (vault.index ? listWikis(vault.index) : []), [vault.index, vault.version])
  const [name, setName] = useState("")
  const [summary, setSummary] = useState("")
  const [wiki, setWiki] = useState(wikis[0]?.name ?? "")
  return (
    <FormDialog
      title="Nova campanha"
      confirmLabel="Criar campanha"
      disabled={!name.trim()}
      onClose={onClose}
      onConfirm={async () => {
        const clean = name.trim()
        const root = `${CAMPAIGN_ROOT}${clean}`
        await vault.createNote(root, clean, newCampaignNote(clean, { ...(wiki ? { wiki } : {}), ...(summary.trim() ? { summary: summary.trim() } : {}) }))
        await vault.createFile(`${root}/Quadro.canvas`, emptyCanvasText())
        onCreated(clean)
      }}
    >
      <label className="field">
        <span>Nome</span>
        <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome da campanha" />
      </label>
      <label className="field">
        <span>Resumo (opcional)</span>
        <input className="input" value={summary} onChange={(e) => setSummary(e.target.value)} aria-label="Resumo da campanha" />
      </label>
      <label className="field">
        <span>Mundo (wiki)</span>
        <select className="select" value={wiki} onChange={(e) => setWiki(e.target.value)} aria-label="Wiki da campanha">
          <option value="">Nenhuma</option>
          {wikis.map((w) => (
            <option key={w.name} value={w.name}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
      <span className="small muted">Cria Campanhas/{name.trim() || "<nome>"}/ com a nota da campanha (segredos, relógios, NPCs) e um quadro em branco.</span>
    </FormDialog>
  )
}

export function NewSessionDialog({ data, onClose, onCreated }: { data: CampaignData; onClose(): void; onCreated(path: string): void }) {
  const vault = useVault()
  const index = vault.index!
  const nextNumber = Math.max(0, ...data.sessions.map((s) => s.number ?? 0)) + 1
  const last = data.sessions[data.sessions.length - 1]
  const lastDate = last?.date ? new Date(`${last.date}T12:00`) : null
  const suggested = lastDate ? new Date(Math.max(lastDate.getTime() + 7 * 86_400_000, Date.now())) : new Date()
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  const [number, setNumber] = useState(String(nextNumber))
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(iso(suggested))
  const [start, setStart] = useState(last?.time ?? "19:30")
  const [end, setEnd] = useState(last?.endTime ?? "23:00")
  const [world, setWorld] = useState(data.calendar?.today ? noteDateText(data.calendar.today, data.calendar) : "")
  const [withEvent, setWithEvent] = useState(true)
  const n = Number(number)
  return (
    <FormDialog
      title="Nova sessão"
      confirmLabel="Criar sessão"
      disabled={!Number.isInteger(n) || n < 1 || !date}
      onClose={onClose}
      onConfirm={async () => {
        // A data do mundo vai com a sigla do calendário ("4031-07-16 OC").
        const typed = parseWorldDate(world.trim())
        const worldText = typed && !typed.calendar && data.calendar ? noteDateText(typed, data.calendar) : world.trim()
        const folder = `${data.campaign.root}Sessões`
        const name = uniqueNoteName(index, folder, sessionFileName(n))
        const sessionPath = `${folder}/${name}`
        let eventPath: string | undefined
        if (withEvent) {
          const input: EventInput = {
            title: `Sessão ${n} — ${data.campaign.name}`,
            allDay: false,
            date,
            startTime: start,
            ...(end ? { endTime: end } : {}),
            repeat: { kind: "none" },
            skipDates: [],
            reminders: [1440],
            category: "Sessão",
            countdown: true,
            session: sessionPath,
          }
          const eventName = uniqueNoteName(index, "Agenda", eventFileName(input))
          eventPath = `Agenda/${eventName}`
          await vault.createNote(folder, name, newSessionNote({ number: n, ...(title.trim() ? { title: title.trim() } : {}), date, time: start, ...(end ? { endTime: end } : {}), event: eventPath, ...(worldText ? { worldDate: worldText } : {}) }))
          await vault.createNote("Agenda", eventName, eventNote(input))
        } else {
          await vault.createNote(folder, name, newSessionNote({ number: n, ...(title.trim() ? { title: title.trim() } : {}), date, time: start, ...(end ? { endTime: end } : {}), ...(worldText ? { worldDate: worldText } : {}) }))
        }
        onCreated(`${sessionPath}.md`)
      }}
    >
      <div className="campaign-form-row">
        <label className="field" style={{ maxWidth: 110 }}>
          <span>Número</span>
          <input className="input" inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} aria-label="Número da sessão" />
        </label>
        <label className="field grow">
          <span>Título (opcional)</span>
          <input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O selo na carta" aria-label="Título da sessão" />
        </label>
      </div>
      <div className="campaign-form-row">
        <label className="field grow">
          <span>Data</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Data da sessão" />
        </label>
        <label className="field">
          <span>Começa</span>
          <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Hora de início" />
        </label>
        <label className="field">
          <span>Termina</span>
          <input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Hora de término" />
        </label>
      </div>
      <label className="field">
        <span>Data no mundo {data.calendar ? `(${data.calendar.name})` : ""}</span>
        <input className="input mono" value={world} onChange={(e) => setWorld(e.target.value)} placeholder={`4031-07-16 ${data.calendar?.abbr ?? "SIGLA"}`} aria-label="Data no mundo" />
      </label>
      <label className="check">
        <input type="checkbox" checked={withEvent} onChange={(e) => setWithEvent(e.target.checked)} /> Criar o evento na Agenda (lembrete 1 dia antes e contagem regressiva na tela inicial)
      </label>
      <span className="small muted">A nota vai para {data.campaign.root}Sessões/ com o roteiro de preparação; o evento e a sessão apontam um para o outro.</span>
    </FormDialog>
  )
}

export function NewQuestDialog({ campaign, quests = [], npcs = [], initialStatus = "ativa", onClose }: { campaign: CampaignInfo; quests?: QuestInfo[]; npcs?: TrackedLink[]; initialStatus?: QuestStatus; onClose(): void }) {
  const vault = useVault()
  const [title, setTitle] = useState("")
  const [parent, setParent] = useState("")
  const [requires, setRequires] = useState<string[]>([])
  const [reqQuery, setReqQuery] = useState("")
  const toggleReq = (path: string) => setRequires((list) => (list.includes(path) ? list.filter((p) => p !== path) : [...list, path]))
  const target = (path: string, from: string) => vault.index!.linkTarget(path, from)
  const reqOptions = quests.filter((q) => q.path !== parent && q.title.toLocaleLowerCase("pt-BR").includes(reqQuery.trim().toLocaleLowerCase("pt-BR"))).slice(0, 40)
  const [status, setStatus] = useState<QuestStatus>(initialStatus)
  const [order, setOrder] = useState("")
  const [giver, setGiver] = useState("")
  const [reward, setReward] = useState("")
  return (
    <FormDialog
      title="Nova missão"
      confirmLabel="Criar missão"
      disabled={!title.trim()}
      onClose={onClose}
      onConfirm={async () => {
        const folder = `${campaign.root}Missões`
        const name = uniqueNoteName(vault.index!, folder, title.trim())
        const from = `${folder}/${name}.md`
        await vault.createNote(folder, name, newQuestNote(title.trim(), {
          status, ...(order.trim() ? { order: order.trim() } : {}), ...(giver.trim() ? { giver: giver.trim() } : {}), ...(reward.trim() ? { reward: reward.trim() } : {}),
          ...(parent ? { parent: target(parent, from) } : {}), ...(requires.length ? { requires: requires.map((p) => target(p, from)) } : {}),
        }))
      }}
    >
      <label className="field">
        <span>Título</span>
        <input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Título da missão" />
      </label>
      <div className="campaign-form-row">
        <label className="field grow">
          <span>Situação</span>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value as QuestStatus)} aria-label="Situação da missão">
            {QUEST_STATUS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field" style={{ maxWidth: 120 }}>
          <span>Ordem</span>
          <input className="input mono" value={order} onChange={(e) => setOrder(e.target.value)} placeholder="1.1" aria-label="Ordem narrativa" />
        </label>
      </div>
      <label className="field">
        <span>Quem pediu (nome de uma nota, vira link)</span>
        <input className="input" list="npcs-da-campanha" value={giver} onChange={(e) => setGiver(e.target.value)} placeholder="Conde Ormund" aria-label="Quem pediu a missão" />
        <datalist id="npcs-da-campanha">{npcs.map((n) => <option key={n.position} value={noteName(n.target)} />)}</datalist>
      </label>
      <label className="field">
        <span>Recompensa</span>
        <input className="input" value={reward} onChange={(e) => setReward(e.target.value)} aria-label="Recompensa" />
      </label>
      {quests.length > 0 && <>
        <label className="field">
          <span>Parte de (arco, no mapa de missões)</span>
          <select className="select" value={parent} onChange={(e) => { setParent(e.target.value); setRequires((list) => list.filter((p) => p !== e.target.value)) }} aria-label="Missão-mãe">
            <option value="">Nenhuma (missão de topo)</option>
            {quests.map((q) => <option key={q.path} value={q.path}>{q.order ? `${q.order} · ` : ""}{q.title}</option>)}
          </select>
        </label>
        <fieldset className="field campaign-requires">
          <legend>Depende de (só abre depois destas){requires.length ? ` · ${requires.length}` : ""}</legend>
          {quests.length > 8 && <input className="input" value={reqQuery} onChange={(e) => setReqQuery(e.target.value)} placeholder="Filtrar missões" aria-label="Filtrar missões para depender" />}
          <div className="campaign-requires-list">
            {reqOptions.map((q) => (
              <label key={q.path} className="check small">
                <input type="checkbox" checked={requires.includes(q.path)} onChange={() => toggleReq(q.path)} /> {q.order ? `${q.order} · ` : ""}{q.title}
              </label>
            ))}
          </div>
        </fieldset>
      </>}
    </FormDialog>
  )
}

export function NewPlayerDialog({ campaign, onClose }: { campaign: CampaignInfo; onClose(): void }) {
  const vault = useVault()
  const index = vault.index!
  const wikis = listWikis(index)
  const [wiki, setWiki] = useState(campaign.wiki ?? wikis[0]?.name ?? "")
  const [mode, setMode] = useState("existente")
  const [selected, setSelected] = useState("")
  const [query, setQuery] = useState("")
  const [name, setName] = useState("")
  const [player, setPlayer] = useState("")
  const [concept, setConcept] = useState("")
  // Se o vínculo falhar depois da criação, tentar de novo reutiliza o artigo já salvo.
  const [createdPath, setCreatedPath] = useState<string>()
  const root = `Wikis/${wiki}/`
  const linked = new Set(listPlayers(index, campaign).map(p => p.path))
  const characters = index.notesIn(root).filter(n => (articleKind(n.meta.frontmatter?.data?.tipo)?.id === "personagem" || isPlayerNote(n, root)) && !linked.has(n.path))
    .sort((a, b) => noteTitle(a).localeCompare(noteTitle(b), "pt-BR"))
  const filtered = characters.filter(n => `${noteTitle(n)} ${n.path}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")))
  const existing = mode === "existente"
  return (
    <FormDialog
      title="Personagem de jogador"
      confirmLabel={createdPath ? "Vincular personagem criado" : existing ? "Vincular personagem" : "Criar e vincular"}
      disabled={!campaign.home || !wiki || (existing && !createdPath ? !characters.some(n => n.path === selected) : !createdPath && !name.trim())}
      onClose={onClose}
      onConfirm={async () => {
        if (!campaign.home) throw new Error("Falta a nota inicial da campanha.")
        let path = createdPath ?? selected
        if (!existing && !createdPath) {
          const folder = `${root}Personagens`
          const text = setProperty(newArticleNote(articleKind("personagem")!, name.trim()), "conceito", concept.trim() || undefined)
          path = await vault.createNote(folder, uniqueNoteName(index, folder, name.trim()), text)
          setCreatedPath(path)
        }
        if (!index.note(path)) throw new Error("O personagem não existe mais. Selecione outro.")
        await vault.setProperty(campaign.home, "personagens", withCampaignPlayer(index, campaign, path, player))
      }}
    >
      <label className="field">
        <span>Wiki</span>
        <select className="select" value={wiki} disabled={!!createdPath} onChange={e => { setWiki(e.target.value); setSelected("") }} aria-label="Wiki do personagem">
          <option value="">Escolha uma wiki…</option>
          {wikis.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
        </select>
      </label>
      {wikis.length === 0 && <p className="small muted">Crie uma wiki na seção Wiki para guardar os personagens.</p>}
      <label className="field">
        <span>Personagem</span>
        <select className="select" value={mode} disabled={!!createdPath} onChange={e => setMode(e.target.value)} aria-label="Origem do personagem">
          <option value="existente">Selecionar da wiki</option>
          <option value="novo">Criar na wiki</option>
        </select>
      </label>
      {existing ? <>
        <label className="field">
          <span>Buscar personagem</span>
          <input className="input" autoFocus value={query} onChange={e => { setQuery(e.target.value); setSelected("") }} aria-label="Buscar personagem da wiki" />
        </label>
        <label className="field">
          <span>Personagem da wiki</span>
          <select className="select" value={selected} onChange={e => setSelected(e.target.value)} aria-label="Personagem da wiki">
            <option value="">Selecione um personagem…</option>
            {filtered.map(n => <option key={n.path} value={n.path}>{noteTitle(n)} — {dirname(n.path).slice(root.length) || wiki}</option>)}
          </select>
        </label>
        {filtered.length === 0 && <p className="small muted">Nenhum personagem disponível. Você pode criar um na wiki.</p>}
      </> : <>
        <label className="field">
          <span>Nome do personagem</span>
          <input className="input" autoFocus disabled={!!createdPath} value={name} onChange={e => setName(e.target.value)} aria-label="Nome do personagem" />
        </label>
        <label className="field">
          <span>Conceito</span>
          <input className="input" disabled={!!createdPath} value={concept} onChange={e => setConcept(e.target.value)} placeholder="Ladina de rua" aria-label="Conceito do personagem" />
        </label>
      </>}
      <label className="field">
        <span>Jogador(a)</span>
        <input className="input" value={player} onChange={e => setPlayer(e.target.value)} aria-label="Nome de quem joga" />
      </label>
      <span className="small muted">O personagem fica na wiki. O vínculo e o nome de quem joga ficam nesta campanha.</span>
    </FormDialog>
  )
}

export function EditPlayerDialog({ campaign, character, onClose }: { campaign: CampaignInfo; character: PlayerCharacter; onClose(): void }) {
  const vault = useVault()
  const [player, setPlayer] = useState(character.player ?? "")
  return (
    <FormDialog title={`Jogador de ${character.name}`} confirmLabel="Salvar jogador" onClose={onClose} onConfirm={async () => {
      if (!campaign.home) throw new Error("Falta a nota inicial da campanha.")
      await vault.setProperty(campaign.home, "personagens", withCampaignPlayer(vault.index!, campaign, character.path, player))
    }}>
      <label className="field">
        <span>Jogador(a)</span>
        <input className="input" autoFocus value={player} onChange={e => setPlayer(e.target.value)} aria-label="Nome de quem joga" />
      </label>
      <span className="small muted">Deixe vazio para remover o nome de quem joga nesta campanha.</span>
    </FormDialog>
  )
}

/** Escolhe uma nota da wiki (NPC, facção) para acompanhar na campanha. */
export function WikiNotePicker({ title, root, exclude, onPick, onClose }: { title: string; root: string; exclude: Set<string>; onPick(path: string): Promise<void>; onClose(): void }) {
  const vault = useVault()
  const index = vault.index!
  const [query, setQuery] = useState("")
  const results = useMemo(() => {
    const q = query.trim()
    const paths = q ? index.search(q, root, 40).map((h) => h.path) : index.notesIn(root).sort((a, b) => b.mtime - a.mtime).slice(0, 40).map((n) => n.path)
    return paths.filter((p) => !exclude.has(p))
  }, [index, query, root, exclude, vault.version])
  return (
    <Modal title={title} onClose={onClose} wide>
      <label className="search">
        <Search size={15} />
        <input className="input" autoFocus placeholder={`Buscar em ${root || "todo o cofre"}…`} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar nota" />
      </label>
      <div className="list">
        {results.length === 0 && <span className="muted small">Nada encontrado.</span>}
        {results.map((path) => (
          <button
            key={path}
            className="list-item"
            onClick={async () => {
              await onPick(path)
              onClose()
            }}
          >
            <FileText size={15} />
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="truncate" style={{ display: "block", fontWeight: 600 }}>{noteName(path)}</span>
              <span className="truncate tiny faint" style={{ display: "block" }}>{dirname(path)}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

const QUICK_KINDS = [
  { id: "personagem", label: "NPC (personagem)" },
  { id: "local", label: "Lugar" },
  { id: "organizacao", label: "Facção (organização)" },
  { id: "item", label: "Item" },
] as const

/**
 * Cria um artigo na wiki da campanha a partir de um nome (botão “Novo NPC” do Elenco ou um link que ainda não existe
 * na nota da sessão). NPC já entra no Elenco e facção, nas Facções; marcar “já apareceu” grava junto da atitude.
 */
export function NewNpcDialog({ data, initialName = "", initialKind = "personagem", onClose, onCreated }: { data: CampaignData; initialName?: string; initialKind?: (typeof QUICK_KINDS)[number]["id"]; onClose(): void; onCreated?(path: string): void }) {
  const vault = useVault()
  const index = vault.index!
  const wikis = listWikis(index)
  const [wiki, setWiki] = useState(data.campaign.wiki ?? wikis[0]?.name ?? "")
  const [kind, setKind] = useState<(typeof QUICK_KINDS)[number]["id"]>(initialKind)
  const [name, setName] = useState(initialName.replace(/\.md$/i, "").split("/").pop() ?? "")
  const [appeared, setAppeared] = useState(true)
  const problem = name.trim() ? nameProblem(name.trim()) : null
  return (
    <FormDialog
      title={kind === "personagem" ? "Novo NPC" : "Novo artigo na wiki"}
      confirmLabel={kind === "personagem" ? "Criar e pôr no Elenco" : kind === "organizacao" ? "Criar e acompanhar" : "Criar artigo"}
      disabled={!wiki || !name.trim() || Boolean(problem)}
      onClose={onClose}
      onConfirm={async () => {
        const article = articleKind(kind)!
        const folder = `Wikis/${wiki}/${article.folder}`
        const path = await vault.createNote(folder, uniqueNoteName(index, folder, name.trim()), newArticleNote(article, name.trim()))
        const home = data.campaign.home
        if (home && (kind === "personagem" || kind === "organizacao")) {
          const key = kind === "personagem" ? "npcs" : "faccoes"
          const extra = kind === "personagem" ? npcExtra("neutro", appeared) : "0"
          await vault.setProperty(home, key, withTrackedLink(data.data[key], -1, vault.index!.linkTarget(path, home), extra))
        }
        onCreated?.(path)
      }}
    >
      <label className="field">
        <span>Nome</span>
        <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(problem)} aria-label="Nome do artigo" />
        {problem && <span className="tiny" role="alert" style={{ color: "var(--red)" }}>{problem}</span>}
      </label>
      <div className="campaign-form-row">
        <label className="field grow">
          <span>O que é</span>
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Tipo do artigo">
            {QUICK_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </label>
        <label className="field grow">
          <span>Wiki</span>
          <select className="select" value={wiki} onChange={(e) => setWiki(e.target.value)} aria-label="Wiki do artigo">
            {wikis.length === 0 && <option value="">Nenhuma wiki</option>}
            {wikis.map((w) => <option key={w.name} value={w.name}>{w.name}</option>)}
          </select>
        </label>
      </div>
      {kind === "personagem" && (
        <label className="check small">
          <input type="checkbox" checked={appeared} onChange={(e) => setAppeared(e.target.checked)} /> Já apareceu na campanha
        </label>
      )}
      {wikis.length === 0 && <p className="small muted">Crie uma wiki na seção Wiki para guardar os artigos.</p>}
      <span className="tiny faint">O artigo vai para Wikis/{wiki || "…"}/{articleKind(kind)?.folder}/ com o modelo do tipo.</span>
    </FormDialog>
  )
}
