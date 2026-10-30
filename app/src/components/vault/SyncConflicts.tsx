import { useEffect, useMemo, useState } from "react"
import { Archive, Check, FileWarning, GitCompare, RefreshCw } from "lucide-react"
import { diffHunks, lineDiff, type DiffItem } from "../../core/line-diff"
import { findSyncConflicts, SYNC_PROVIDER_LABEL, syncConflictDetails, type SyncConflict } from "../../core/sync-conflicts"
import { noteName } from "../../core/text"
import { href, useRoute } from "../../lib/router"
import { flushOpenNotes, noteRoute } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { Notice } from "../kit/Layout"
import { Modal, useToast } from "../ui"
import "./sync-conflicts.css"

/**
 * Cópias de conflito do Syncthing e do Obsidian Sync (T2, ADR 0031). Elas chegam ao índice como arquivos comuns; aqui
 * viram um aviso no topo do app e a seção Configurações › Conflitos, com o original ao lado e as ações: comparar,
 * ficar com a cópia ou arquivar a cópia (na lixeira do cofre, depois de um backup). O original nunca é apagado.
 */

const DISMISSED_KEY = "runas-codex:conflitos-dispensados"

function readDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]") as string[]) } catch { return new Set() }
}

/** As cópias de conflito do cofre aberto, atualizadas a cada mudança do índice. */
export function useSyncConflicts(): SyncConflict[] {
  const vault = useVault()
  return useMemo(() => (vault.index ? findSyncConflicts(vault.index.allFiles().map((file) => file.path)) : []), [vault.index, vault.version])
}

const fileName = (path: string) => path.slice(path.lastIndexOf("/") + 1)
const isNote = (path: string) => /\.md$/i.test(path)

function copyLabel(conflict: SyncConflict): string {
  const { at, device } = syncConflictDetails(conflict.path)
  const when = at ? `de ${at.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""
  return [`Cópia do ${SYNC_PROVIDER_LABEL[conflict.provider]}`, when, device ? `do aparelho ${device}` : ""].filter(Boolean).join(" ")
}

/** Aviso no topo do app enquanto houver cópia nova; “Depois” guarda neste aparelho as que você já viu. */
export function SyncConflictBanner() {
  const conflicts = useSyncConflicts()
  const route = useRoute()
  const [dismissed, setDismissed] = useState(readDismissed)
  const fresh = conflicts.filter((conflict) => !dismissed.has(conflict.path))
  if (!fresh.length || (route[0] === "config" && route[1] === "conflitos")) return null
  const dismiss = () => {
    const next = new Set(conflicts.map((conflict) => conflict.path))
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])) } catch { /* só não é lembrado */ }
    setDismissed(next)
  }
  const first = fresh[0]!
  return (
    <div className="sync-banner">
      <Notice
        tone="warn"
        title={fresh.length === 1 ? `Cópia de conflito em “${noteName(first.originalPath)}”` : `${fresh.length} cópias de conflito da sincronização`}
        actions={<>
          <a className="btn sm" href={href("/config/conflitos")}>Revisar</a>
          <button className="btn sm ghost" onClick={dismiss}>Depois</button>
        </>}
      >
        {fresh.length === 1 ? `O ${SYNC_PROVIDER_LABEL[first.provider]} guardou duas versões. Compare e escolha qual fica.` : "O Syncthing ou o Obsidian Sync guardaram duas versões de algumas notas. Compare e escolha qual fica."}
      </Notice>
    </div>
  )
}

/** Configurações › Conflitos: cada cópia com o original, comparar, ficar com a cópia e arquivar. */
export function SyncConflictSettings() {
  const vault = useVault()
  const toast = useToast()
  const conflicts = useSyncConflicts()
  const [comparing, setComparing] = useState<SyncConflict | null>(null)
  const [busy, setBusy] = useState(false)
  const readOnly = Boolean(vault.info?.readOnly)
  const exists = (path: string) => Boolean(vault.index?.allFiles().some((file) => file.path === path))

  const archive = async (conflict: SyncConflict) => {
    // No computador o processo principal faz o backup antes; no celular e no navegador, a lixeira do cofre basta.
    const archived = vault.platform.archiveSyncConflict ? await vault.platform.archiveSyncConflict(conflict.path) : (await vault.trash(conflict.path), `.trash/${fileName(conflict.path)}`)
    toast(`Cópia arquivada em ${archived}`)
  }
  const keepCopy = async (conflict: SyncConflict) => {
    await flushOpenNotes()
    const texts = await vault.platform.readTexts([conflict.path])
    const copy = texts[conflict.path]
    if (copy === undefined) throw new Error("Não deu para ler a cópia.")
    // O texto atual do original fica no histórico de versões da nota e no backup feito antes de arquivar.
    await vault.platform.backup().catch(() => undefined)
    await vault.save(conflict.originalPath, copy)
    await archive(conflict)
  }
  const run = (action: () => Promise<void>) => {
    setBusy(true)
    action()
      .then(() => setComparing(null))
      .catch((error: unknown) => toast(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(false))
  }

  return (
    <section className="card sync-conflicts">
      <span className="section-title row settings-card-head"><FileWarning size={16} /> Conflitos de sincronização</span>
      <p className="tiny faint">
        Quando o Syncthing ou o Obsidian Sync recebem duas mudanças da mesma nota, guardam as duas: a cópia ganha um nome
        com <code>sync-conflict</code> ou <code>(conflicted copy)</code>. Arquivar manda a cópia para a lixeira do cofre
        (<code>.trash</code>); o original nunca é apagado.
      </p>
      {conflicts.length === 0 ? (
        <p className="sync-empty small muted"><Check size={15} aria-hidden="true" /> Nenhuma cópia de conflito neste cofre.</p>
      ) : (
        <ul className="sync-list" aria-label="Cópias de conflito">
          {conflicts.map((conflict) => {
            const original = exists(conflict.originalPath)
            return (
              <li key={conflict.path} className="sync-item">
                <div className="sync-item-text">
                  <strong className="small">{noteName(conflict.originalPath)}</strong>
                  <span className="tiny faint">{copyLabel(conflict)}</span>
                  <span className="tiny sync-paths">
                    <a href={href(noteRoute(conflict.path))}>Abrir a cópia</a>
                    {original ? <a href={href(noteRoute(conflict.originalPath))}>Abrir o original</a> : <span className="faint">O original não está mais no cofre.</span>}
                  </span>
                </div>
                <div className="row-wrap sync-actions">
                  {original && isNote(conflict.path) && (
                    <button className="btn sm" onClick={() => setComparing(conflict)}><GitCompare size={14} /> Comparar</button>
                  )}
                  <button className="btn sm ghost" disabled={readOnly || busy} title={readOnly ? "Libere a gravação no cofre primeiro" : undefined} onClick={() => run(() => archive(conflict))}>
                    <Archive size={14} /> Arquivar a cópia
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {comparing && (
        <CompareDialog
          conflict={comparing}
          busy={busy}
          readOnly={readOnly}
          onClose={() => setComparing(null)}
          onKeepCopy={() => run(() => keepCopy(comparing))}
          onArchive={() => run(() => archive(comparing))}
        />
      )}
    </section>
  )
}

function CompareDialog({ conflict, busy, readOnly, onClose, onKeepCopy, onArchive }: { conflict: SyncConflict; busy: boolean; readOnly: boolean; onClose(): void; onKeepCopy(): void; onArchive(): void }) {
  const vault = useVault()
  const [items, setItems] = useState<DiffItem[] | null>(null)
  const [error, setError] = useState("")
  useEffect(() => {
    vault.platform.readTexts([conflict.originalPath, conflict.path]).then(
      (texts) => setItems(diffHunks(lineDiff(texts[conflict.originalPath] ?? "", texts[conflict.path] ?? ""))),
      (reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)),
    )
  }, [vault.platform, conflict])
  const changes = items?.filter((item) => item.kind === "removed" || item.kind === "added").length ?? 0
  return (
    <Modal
      wide
      title={`Comparar “${noteName(conflict.originalPath)}”`}
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Fechar</button>
        <button className="btn" disabled={busy || readOnly || !items} onClick={onKeepCopy}><RefreshCw size={14} /> Ficar com a cópia</button>
        <button className="btn primary" disabled={busy || readOnly} onClick={onArchive}><Archive size={14} /> Manter o original e arquivar a cópia</button>
      </>}
    >
      <p className="small muted sync-legend">
        <span className="sync-key removed">− só no original</span>
        <span className="sync-key added">+ só na cópia</span>
        {items && <span>{changes === 0 ? "As duas versões têm o mesmo texto." : `${changes} ${changes === 1 ? "linha diferente" : "linhas diferentes"}.`}</span>}
      </p>
      {error && <p role="alert" className="query-error">{error}</p>}
      {!items && !error && <p className="small muted">Lendo as duas versões…</p>}
      {items && (
        <ol className="sync-diff" aria-label="Diferenças entre o original e a cópia">
          {items.map((item, index) => item.kind === "skip" ? (
            <li key={index} className="skip">… {item.count} {item.count === 1 ? "linha igual" : "linhas iguais"}</li>
          ) : (
            <li key={index} className={item.kind}>
              <span className="sync-mark" aria-hidden="true">{item.kind === "removed" ? "−" : item.kind === "added" ? "+" : " "}</span>
              {item.kind !== "same" && <span className="sr-only">{item.kind === "removed" ? "Só no original: " : "Só na cópia: "}</span>}
              <span className="sync-line">{item.text || " "}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="tiny faint">“Ficar com a cópia” põe o texto dela no original (o texto de antes fica no histórico de versões e num backup) e arquiva a cópia.</p>
    </Modal>
  )
}
