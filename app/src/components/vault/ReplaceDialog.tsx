import { useMemo, useState } from "react"
import { planReplace, type ReplaceOptions } from "../../core/replace"
import { noteName } from "../../core/text"
import type { VaultIndex } from "../../core/vault-index"
import { useVault } from "../../platform/VaultProvider"
import { Modal, useToast } from "../ui"

/**
 * Buscar e substituir em várias notas: a prévia por nota (linhas de antes e depois), a escolha de quais mudam, o backup
 * antes e a gravação nota por nota pelo `useVault()` — uma nota que mudou desde a prévia não é regravada.
 */
export function ReplaceDialog({ index, paths, scopeLabel, onClose }: { index: VaultIndex; paths: string[]; scopeLabel: string; onClose(): void }) {
  const vault = useVault()
  const toast = useToast()
  const [options, setOptions] = useState<ReplaceOptions>({ find: "", replace: "", regex: false, caseSensitive: false, wholeWord: false, includeFrontmatter: false })
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<ReplaceOptions>) => setOptions((current) => ({ ...current, ...patch }))
  const plan = useMemo(() => (options.find ? planReplace(index, paths, options) : []), [index, paths, options, vault.version])
  const error = Array.isArray(plan) ? null : plan.error
  const items = Array.isArray(plan) ? plan : []
  const chosen = items.filter((p) => !skipped.has(p.path))
  const total = chosen.reduce((sum, p) => sum + p.count, 0)

  const run = async () => {
    setBusy(true)
    try {
      await vault.platform.backup()
      let done = 0
      const failed: string[] = []
      for (const item of chosen) {
        if (vault.index?.note(item.path)?.text !== item.before) {
          failed.push(`${noteName(item.path)} (mudou desde a prévia)`)
          continue
        }
        try {
          await vault.save(item.path, item.after)
          done++
        } catch (err) {
          failed.push(`${noteName(item.path)} (${err instanceof Error ? err.message : String(err)})`)
        }
      }
      toast(failed.length ? `Substituído em ${done} nota(s); ficaram de fora: ${failed.join(", ")}` : `Substituído em ${done} nota(s). Backup feito antes.`)
      if (!failed.length) onClose()
    } catch (err) {
      toast(`O backup falhou e nada foi trocado: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const check = (label: string, key: "regex" | "caseSensitive" | "wholeWord" | "includeFrontmatter") => (
    <label className="check">
      <input type="checkbox" checked={options[key]} onChange={(event) => set({ [key]: event.target.checked })} /> {label}
    </label>
  )
  return (
    <Modal
      title="Buscar e substituir"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Fechar</button>
          <button className="btn primary" disabled={busy || !total || Boolean(vault.info?.readOnly)} title={vault.info?.readOnly ? "Libere a gravação no cofre primeiro" : undefined} onClick={() => void run()}>
            {busy ? "Substituindo…" : `Fazer backup e substituir (${total} em ${chosen.length} nota${chosen.length === 1 ? "" : "s"})`}
          </button>
        </>
      }
    >
      <p className="small muted">Em: {scopeLabel} ({paths.length} notas).</p>
      <div className="replace-fields">
        <label className="field">
          <span>Procurar</span>
          <input className="input" value={options.find} onChange={(event) => set({ find: event.target.value })} aria-label="Procurar" autoFocus />
        </label>
        <label className="field">
          <span>Substituir por{options.regex ? " ($1, $2… para os grupos)" : ""}</span>
          <input className="input" value={options.replace} onChange={(event) => set({ replace: event.target.value })} aria-label="Substituir por" />
        </label>
      </div>
      <div className="row-wrap">
        {check("Expressão regular", "regex")}
        {check("Diferenciar maiúsculas", "caseSensitive")}
        {check("Palavra inteira", "wholeWord")}
        {check("Incluir as propriedades (frontmatter)", "includeFrontmatter")}
      </div>
      {error && (
        <p className="small" role="alert" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}
      {options.find && !error && items.length === 0 && <p className="small muted">Nada encontrado.</p>}
      <div className="replace-list">
        {items.map((item) => (
          <div key={item.path} className="card tight replace-item">
            <label className="check">
              <input
                type="checkbox"
                checked={!skipped.has(item.path)}
                onChange={(event) => {
                  const next = new Set(skipped)
                  if (event.target.checked) next.delete(item.path)
                  else next.add(item.path)
                  setSkipped(next)
                }}
              />
              <strong className="grow truncate" title={item.path}>
                {noteName(item.path)}
              </strong>
              <span className="chip">{item.count}×</span>
            </label>
            {item.samples.map((sample) => (
              <div key={sample.line} className="replace-sample tiny">
                <span className="faint">linha {sample.line}</span>
                <span className="removed">− {sample.before}</span>
                <span className="added">+ {sample.after}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  )
}
