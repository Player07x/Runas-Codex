import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { AlertTriangle, ArrowLeft, CalendarDays, Check, FileJson, FilePlus2, FileText, Map as MapIcon, ShieldCheck, Swords, Skull } from "lucide-react"
import { readFantasyCalendar, type CmCalendar } from "../../core/import/calendarium"
import { imageSize } from "../../core/import/image-size"
import { changedRegion, defaultCalendarFolder, KIND_LABEL, leafletImagePaths, planObsidianMigration, pluginFilePaths, type MigrationKind, type PlannedEdit, type PlannedNote } from "../../core/import/obsidian"
import { dirname, noteName } from "../../core/text"
import { Empty, useToast } from "../../components/ui"
import { href } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import type { BackupInfo } from "../../platform/platform"
import { useVault } from "../../platform/VaultProvider"
import "./import.css"

const KINDS: { kind: MigrationKind; icon: ReactNode; unit: [string, string] }[] = [
  { kind: "calendario", icon: <CalendarDays size={16} />, unit: ["calendário", "calendários"] },
  { kind: "mapa", icon: <MapIcon size={16} />, unit: ["mapa", "mapas"] },
  { kind: "statblock", icon: <Skull size={16} />, unit: ["statblock", "statblocks"] },
  { kind: "encontro", icon: <Swords size={16} />, unit: ["encontro", "encontros"] },
]

const plural = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`

interface Outcome {
  backup: BackupInfo
  written: string[]
  created: string[]
  failed: { path: string; error: string }[]
}

/**
 * Migração dos plugins de RPG do Obsidian (etapa 10, ADR 0014): mostra o que muda, faz o backup e só então grava,
 * nota por nota, pelo `useVault()`. Rota: /transferir/obsidian.
 */
export function ObsidianMigration() {
  const vault = useVault()
  const toast = useToast()
  const { index, platform, info } = vault
  const [files, setFiles] = useState<Record<string, string> | null>(null)
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number } | null>>({})
  const [extra, setExtra] = useState<{ name: string; calendars: CmCalendar[] } | null>(null)
  const [kinds, setKinds] = useState<Set<MigrationKind>>(() => new Set(KINDS.map((k) => k.kind)))
  const [keep, setKeep] = useState(false)
  const [folder, setFolder] = useState<string | null>(null)
  const defaultFolder = useMemo(() => (index ? defaultCalendarFolder(index) : "Calendários"), [index, vault.version])
  const calendarFolder = folder ?? defaultFolder
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [error, setError] = useState<string>()
  const jsonInput = useRef<HTMLInputElement>(null)

  // Dados dos plugins (.obsidian/plugins/…/data.json) e o tamanho das imagens dos mapas.
  useEffect(() => {
    if (!index) return
    let alive = true
    void (async () => {
      try {
        const texts = await platform.readTexts(pluginFilePaths())
        const found: Record<string, { width: number; height: number } | null> = {}
        for (const path of leafletImagePaths(index)) {
          found[path] = await platform.readBinary(path).then(imageSize, () => null)
        }
        if (alive) {
          setFiles(texts)
          setSizes(found)
        }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : String(err))
      }
    })()
    return () => {
      alive = false
    }
  }, [index, platform, info])

  const plan = useMemo(() => {
    if (!index || !files) return null
    return planObsidianMigration({
      index,
      files,
      imageSize: (path) => sizes[path] ?? null,
      ...(extra ? { extraCalendars: { origin: "Fantasy-Calendar", calendars: extra.calendars } } : {}),
      options: { kinds: [...kinds], keepOriginal: keep, calendarFolder },
    })
    // `version` muda a cada gravação: o plano é refeito com o cofre atual.
  }, [index, vault.version, files, sizes, extra, kinds, keep, calendarFolder])

  const chooseJson = async (file: File) => {
    try {
      const calendar = readFantasyCalendar(JSON.parse(await file.text()))
      if (!calendar) throw new Error("O arquivo não é um calendário exportado do Fantasy-Calendar.")
      setExtra({ name: file.name, calendars: [calendar] })
    } catch (err) {
      toast(err instanceof SyntaxError ? "O arquivo não é um JSON válido." : err instanceof Error ? err.message : String(err))
    }
  }

  const run = async () => {
    if (!plan || !index) return
    setBusy(true)
    setError(undefined)
    try {
      // Backup antes de qualquer gravação; se falhar, nada é gravado.
      const backup = await platform.backup()
      const result: Outcome = { backup, written: [], created: [], failed: [] }
      for (const note of plan.notes) {
        try {
          result.created.push(await vault.createNote(dirname(note.path), noteName(note.path), note.content))
        } catch (err) {
          result.failed.push({ path: note.path, error: err instanceof Error ? err.message : String(err) })
        }
      }
      for (const edit of plan.edits) {
        try {
          // A nota mudou desde a prévia (no Obsidian, por exemplo): não grava por cima.
          if (vault.index?.note(edit.path)?.text !== edit.before) throw new Error("A nota mudou desde a prévia. Migre de novo para ver a versão atual.")
          await vault.save(edit.path, edit.after)
          result.written.push(edit.path)
        } catch (err) {
          result.failed.push({ path: edit.path, error: err instanceof Error ? err.message : String(err) })
        }
      }
      setOutcome(result)
      toast(result.failed.length ? `Migração com ${result.failed.length} erro(s)` : "Migração concluída")
    } catch (err) {
      setError(`O backup falhou, e nada foi gravado: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const head = (
    <div className="page-head">
      <div>
        <a className="eyebrow row migrate-back" href={href("/transferir")}>
          <ArrowLeft size={13} /> Importar / Exportar
        </a>
        <h1 className="page-title">Plugins de RPG do Obsidian</h1>
      </div>
    </div>
  )

  if (vault.loading && !index) return <div className="page">{head}<p className="muted">Abrindo o cofre…</p></div>
  if (!index || !info) {
    return (
      <div className="page">
        {head}
        <Empty title="Nenhum cofre aberto" action={<a className="btn primary" href={href("/config")}>Abrir um cofre</a>}>
          A migração lê os dados dos plugins no cofre do Obsidian aberto no app.
        </Empty>
      </div>
    )
  }

  const changes = plan ? plan.notes.length + plan.edits.length : 0
  const totalFound = plan ? Object.values(plan.found).reduce((a, b) => a + b, 0) : 0
  return (
    <div className="page migrate">
      {head}
      <p className="small muted migrate-intro">
        Calendários do Calendarium e do Fantasy-Calendar, mapas do Leaflet, statblocks do Fantasy Statblocks e encontros do Initiative Tracker viram o formato do app — notas que o Obsidian continua abrindo. Nada é gravado antes de você ver a lista e confirmar, e um backup é feito antes.
      </p>

      {error && (
        <div className="callout aviso">
          <div className="callout-title">Não deu certo</div>
          <div className="callout-body small">{error}</div>
        </div>
      )}

      {outcome && <OutcomeCard outcome={outcome} onClose={() => setOutcome(null)} />}

      <section className="card stack">
        <span className="section-title">O que foi encontrado</span>
        {!plan ? (
          <span className="small muted">Lendo os dados dos plugins…</span>
        ) : (
          <div className="migrate-kinds">
            {KINDS.map(({ kind, icon, unit }) => {
              const found = plan.found[kind]
              return (
                <label key={kind} className={`migrate-kind card tight ${found ? "" : "empty"}`}>
                  <input
                    type="checkbox"
                    checked={kinds.has(kind) && found > 0}
                    disabled={!found}
                    onChange={(event) => {
                      const next = new Set(kinds)
                      if (event.target.checked) next.add(kind)
                      else next.delete(kind)
                      setKinds(next)
                    }}
                  />
                  <span className="migrate-kind-icon">{icon}</span>
                  <span className="grow">
                    <strong>{KIND_LABEL[kind].plugin}</strong>
                    <span className="tiny muted">
                      {found ? plural(found, unit) : "nada no cofre"} → {KIND_LABEL[kind].result}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        )}
        <div className="migrate-options">
          <label className="check">
            <input type="checkbox" checked={keep} onChange={(event) => setKeep(event.target.checked)} />
            Guardar o bloco original num comentário <span className="mono">%% … %%</span> (para quem ainda usa o plugin no Obsidian)
          </label>
          {plan && plan.found.calendario > 0 && (
            <label className="field">
              <span>Pasta dos calendários novos</span>
              <input className="input" value={calendarFolder} onChange={(event) => setFolder(event.target.value.replace(/^\/+|\/+$/g, ""))} />
            </label>
          )}
          <div className="row wrap" style={{ gap: 8 }}>
            <button className="btn sm" onClick={() => jsonInput.current?.click()}>
              <FileJson size={14} /> {extra ? "Trocar o JSON do Fantasy-Calendar" : "Calendário do site Fantasy-Calendar (JSON)…"}
            </button>
            {extra && (
              <span className="chip cyan">
                {extra.name}
                <button className="icon-btn sm" aria-label="Tirar o calendário do Fantasy-Calendar" onClick={() => setExtra(null)}>
                  ×
                </button>
              </span>
            )}
            <input ref={jsonInput} type="file" accept=".json,application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void chooseJson(file) }} />
          </div>
        </div>
      </section>

      {plan && totalFound === 0 && !extra && (
        <Empty title="Nenhum dado de plugin de RPG neste cofre">
          O app procurou calendários do Calendarium, blocos <span className="mono">leaflet</span>, <span className="mono">statblock</span> e <span className="mono">encounter</span>. Se você tem um calendário exportado do site Fantasy-Calendar, escolha o JSON acima.
        </Empty>
      )}

      {plan && changes > 0 && (
        <section className="card stack">
          <div className="row between wrap">
            <span className="section-title">O que vai mudar</span>
            <span className="tiny muted">
              {plural(plan.edits.length, ["nota muda", "notas mudam"])} · {plural(plan.notes.length, ["nota nova", "notas novas"])}
            </span>
          </div>
          <div className="list">
            {plan.notes.map((note) => (
              <NewNoteItem key={note.path} note={note} />
            ))}
            {plan.edits.map((edit) => (
              <EditItem key={edit.path} edit={edit} />
            ))}
          </div>
        </section>
      )}

      {plan && plan.notices.length > 0 && (
        <section className="card stack">
          <span className="section-title row">
            <AlertTriangle size={15} /> Fica como está
          </span>
          <ul className="migrate-notices small">
            {plan.notices.map((n, i) => (
              <li key={i}>
                {n.path && !n.path.startsWith(".") ? (
                  <a className="wikilink" href={href(noteRoute(n.path))}>
                    {n.path}
                    {n.line ? `:${n.line}` : ""}
                  </a>
                ) : (
                  n.path && <span className="mono">{n.path}</span>
                )}
                {n.path ? " — " : ""}
                {n.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan && changes > 0 && (
        <div className="migrate-foot card">
          <span className="small row grow">
            <ShieldCheck size={15} /> Antes de gravar, o app faz um backup das notas (Configurações › Backups).
          </span>
          {info.readOnly ? (
            <a className="btn" href={href("/config")}>Liberar a gravação do cofre</a>
          ) : (
            <button className="btn primary" disabled={busy} onClick={() => void run()}>
              {busy ? "Migrando…" : `Fazer backup e migrar (${changes})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Warnings({ list }: { list: string[] }) {
  if (!list.length) return null
  return (
    <ul className="migrate-warnings tiny">
      {list.map((w, i) => (
        <li key={i}>{w}</li>
      ))}
    </ul>
  )
}

function NewNoteItem({ note }: { note: PlannedNote }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="migrate-item">
      <button className="list-item small" onClick={() => setOpen(!open)} aria-expanded={open}>
        <FilePlus2 size={15} />
        <span className="grow">
          <span className="mono">{note.path}</span>
          <span className="tiny muted">{note.label}</span>
        </span>
        <span className="chip green">nova</span>
      </button>
      <Warnings list={note.warnings} />
      {open && <pre className="migrate-diff"><span className="added">{note.content}</span></pre>}
    </div>
  )
}

function EditItem({ edit }: { edit: PlannedEdit }) {
  const [open, setOpen] = useState(false)
  const region = useMemo(() => (open ? changedRegion(edit.before, edit.after) : null), [open, edit])
  const warnings = edit.changes.flatMap((c) => c.warnings)
  return (
    <div className="migrate-item">
      <button className="list-item small" onClick={() => setOpen(!open)} aria-expanded={open}>
        <FileText size={15} />
        <span className="grow">
          <span className="mono">{edit.path}</span>
          <span className="tiny muted">{edit.changes.map((c) => `${c.label}${c.line ? ` (linha ${c.line})` : ""}`).join(" · ")}</span>
        </span>
        <span className="chip">muda</span>
      </button>
      <Warnings list={warnings} />
      {region && (
        <pre className="migrate-diff">
          <span className="tiny muted">a partir da linha {region.line}{"\n"}</span>
          {region.removed.map((line, i) => (
            <span key={`r${i}`} className="removed">{`− ${line}\n`}</span>
          ))}
          {region.added.map((line, i) => (
            <span key={`a${i}`} className="added">{`+ ${line}\n`}</span>
          ))}
        </pre>
      )}
    </div>
  )
}

function OutcomeCard({ outcome, onClose }: { outcome: Outcome; onClose: () => void }) {
  return (
    <section className={`card stack migrate-outcome ${outcome.failed.length ? "with-errors" : ""}`}>
      <div className="row between">
        <span className="section-title row">
          <Check size={15} /> {outcome.failed.length ? "Migração com erros" : "Migração concluída"}
        </span>
        <button className="btn sm ghost" onClick={onClose}>Fechar</button>
      </div>
      <span className="small">
        Backup de {new Date(outcome.backup.createdAt).toLocaleString("pt-BR")} ({outcome.backup.files} arquivos). {plural(outcome.created.length, ["nota criada", "notas criadas"])}, {plural(outcome.written.length, ["nota alterada", "notas alteradas"])}.
      </span>
      <div className="row wrap" style={{ gap: 6 }}>
        {[...outcome.created, ...outcome.written].map((path) => (
          <a key={path} className="chip cyan" href={href(noteRoute(path))}>
            {noteName(path)}
          </a>
        ))}
      </div>
      {outcome.failed.length > 0 && (
        <ul className="migrate-warnings small">
          {outcome.failed.map((f) => (
            <li key={f.path}>
              <span className="mono">{f.path}</span>: {f.error}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
