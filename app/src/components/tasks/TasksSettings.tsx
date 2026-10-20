import { useState, type ReactNode } from "react"
import { ListChecks, Plus, Trash2 } from "lucide-react"
import { DEFAULT_TASKS_SETTINGS, type TasksSettings } from "../../core/tasks/settings"
import { STATUS_TYPES, type Status } from "../../core/tasks/status"
import { importTasksSettings, resetTasksSettings, saveTasksSettings, useTasksSettings } from "../../lib/tasks"
import { useVault } from "../../platform/VaultProvider"
import { Switch, useToast } from "../ui"

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="setting-row">
      <div>
        <span className="small" style={{ fontWeight: 650 }}>{title}</span>
        {hint && <span className="tiny faint">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

const STATUS_TYPE_LABEL: Record<string, string> = { TODO: "A fazer", DONE: "Feita", IN_PROGRESS: "Em andamento", ON_HOLD: "Em espera", CANCELLED: "Cancelada", NON_TASK: "Não é tarefa" }

/**
 * Configurações do plugin Tasks neste aparelho, para o cofre aberto. "Importar do Obsidian" lê o `data.json` do Tasks
 * (sem mudar o arquivo); daí em diante o app usa a cópia daqui.
 */
export function TasksSettingsCard() {
  const vault = useVault()
  const toast = useToast()
  const path = vault.info?.path
  const settings = useTasksSettings(path)
  const [report, setReport] = useState<string | null>(null)
  const set = (patch: Partial<TasksSettings>) => saveTasksSettings(path, { ...settings, ...patch })
  const statuses = [...settings.coreStatuses.map((s) => ({ s, core: true })), ...settings.customStatuses.map((s) => ({ s, core: false }))]
  const setStatus = (core: boolean, index: number, patch: Partial<Status>) => {
    const key = core ? "coreStatuses" : "customStatuses"
    set({ [key]: settings[key].map((s, i) => (i === index ? { ...s, ...patch } : s)) })
  }

  if (!path) return null
  return (
    <section className="card tasks-settings">
      <span className="section-title row settings-card-head">
        <ListChecks size={16} /> Tarefas (plugin Tasks)
      </span>
      <Row title="Configurações do Obsidian" hint="Lê .obsidian/plugins/obsidian-tasks-plugin/data.json deste cofre, sem mudar o arquivo.">
        <span className="row-wrap">
          <button
            className="btn sm"
            onClick={() =>
              void importTasksSettings(path, vault.platform.readTexts)
                .then((r) => setReport(r.ignored.length ? `Importado. Sem efeito no Runas-Codex (aparência ou recursos só do Obsidian): ${r.ignored.join(", ")}.` : "Importado."))
                .catch((e: unknown) => toast(e instanceof Error ? e.message : String(e)))
            }
          >
            Importar
          </button>
          <button className="btn sm ghost" onClick={() => (resetTasksSettings(path), setReport("Voltou aos padrões do Tasks."))}>
            Padrões
          </button>
        </span>
      </Row>
      {report && <p className="tiny faint">{report}</p>}
      <Row title="Filtro global" hint="Só linhas com este texto contam como tarefa (ex.: #tarefa). Vazio: toda caixa.">
        <input className="input sm" style={{ maxWidth: 160 }} value={settings.globalFilter} onChange={(e) => set({ globalFilter: e.target.value })} aria-label="Filtro global" />
      </Row>
      <Row title="Esconder o filtro global" hint="Não mostra o filtro nas listas de tarefas.">
        <Switch on={settings.removeGlobalFilter} onChange={(on) => set({ removeGlobalFilter: on })} label="Esconder o filtro global" />
      </Row>
      <Row title="Formato" hint="Como as datas e campos são escritos na linha.">
        <select className="select sm" value={settings.taskFormat} onChange={(e) => set({ taskFormat: e.target.value as TasksSettings["taskFormat"] })} aria-label="Formato das tarefas">
          <option value="tasksPluginEmoji">Emojis (📅 2026-10-18)</option>
          <option value="dataview">Dataview ([due:: 2026-10-18])</option>
        </select>
      </Row>
      <Row title="Data de criação nas tarefas novas" hint="➕ hoje na próxima ocorrência e nas tarefas criadas pela janela.">
        <Switch on={settings.setCreatedDate} onChange={(on) => set({ setCreatedDate: on })} label="Data de criação" />
      </Row>
      <Row title="Data de conclusão" hint="✅ hoje ao concluir.">
        <Switch on={settings.setDoneDate} onChange={(on) => set({ setDoneDate: on })} label="Data de conclusão" />
      </Row>
      <Row title="Data de cancelamento" hint="❌ hoje ao cancelar.">
        <Switch on={settings.setCancelledDate} onChange={(on) => set({ setCancelledDate: on })} label="Data de cancelamento" />
      </Row>
      <Row title="Próxima ocorrência na linha de baixo" hint="O padrão do Tasks é a linha de cima.">
        <Switch on={settings.recurrenceOnNextLine} onChange={(on) => set({ recurrenceOnNextLine: on })} label="Próxima ocorrência embaixo" />
      </Row>
      <Row title="Tirar a data agendada na recorrência" hint="Quando a tarefa tem prazo ou início.">
        <Switch on={settings.removeScheduledDateOnRecurrence} onChange={(on) => set({ removeScheduledDateOnRecurrence: on })} label="Tirar a data agendada" />
      </Row>
      <Row title="Adiar muda" hint="Campo que o botão de adiar altera primeiro.">
        <select className="select sm" value={settings.postponeDateField} onChange={(e) => set({ postponeDateField: e.target.value as TasksSettings["postponeDateField"] })} aria-label="Campo do adiar">
          <option value="due-scheduled-start">prazo, agendada, início</option>
          <option value="scheduled-due-start">agendada, prazo, início</option>
          <option value="start-scheduled-due">início, agendada, prazo</option>
          <option value="due">só o prazo</option>
          <option value="scheduled">só a agendada</option>
          <option value="start">só o início</option>
        </select>
      </Row>
      <Row title="Contagem nas consultas" hint="Onde aparece “N tarefas”.">
        <select className="select sm" value={settings.taskCountLocation} onChange={(e) => set({ taskCountLocation: e.target.value as "top" | "bottom" })} aria-label="Lugar da contagem">
          <option value="bottom">embaixo</option>
          <option value="top">em cima</option>
        </select>
      </Row>
      <Row title="Sugestões ao digitar" hint="No editor, numa linha de tarefa: campos, datas e regras (autocompletar do Tasks).">
        <Switch on={settings.autoSuggestInEditor} onChange={(on) => set({ autoSuggestInEditor: on })} label="Sugestões ao digitar" />
      </Row>
      <Row title="Nome do arquivo como data agendada" hint="Notas diárias: a data do nome vira a agendada das tarefas sem datas.">
        <Switch on={settings.useFilenameAsScheduledDate} onChange={(on) => set({ useFilenameAsScheduledDate: on })} label="Nome do arquivo como data" />
      </Row>
      {settings.useFilenameAsScheduledDate && (
        <>
          <Row title="Formato do nome" hint="Formato do moment (ex.: YYYYMMDD). Vazio: AAAA-MM-DD ou AAAAMMDD.">
            <input className="input sm mono" style={{ maxWidth: 140 }} value={settings.filenameAsScheduledDateFormat} onChange={(e) => set({ filenameAsScheduledDateFormat: e.target.value })} aria-label="Formato do nome do arquivo" />
          </Row>
          <Row title="Só nestas pastas" hint="Separadas por vírgula; vazio: todas.">
            <input className="input sm" style={{ maxWidth: 180 }} value={settings.filenameAsDateFolders.join(", ")} onChange={(e) => set({ filenameAsDateFolders: e.target.value.split(",").map((f) => f.trim().replace(/\/$/, "")).filter(Boolean) })} aria-label="Pastas das notas diárias" />
          </Row>
        </>
      )}
      <label className="field">
        <span className="small" style={{ fontWeight: 650 }}>Consulta global</span>
        <span className="tiny faint">Instruções somadas a toda consulta ```tasks (uma por linha).</span>
        <textarea className="input mono small" rows={3} value={settings.globalQuery} onChange={(e) => set({ globalQuery: e.target.value })} aria-label="Consulta global" />
      </label>
      <details>
        <summary className="small">Estados ({statuses.length})</summary>
        <div className="tasks-status-table">
          {statuses.map(({ s, core }, i) => {
            const index = core ? i : i - settings.coreStatuses.length
            return (
              <div key={`${core}-${index}`} className="row-wrap tasks-status-row">
                <input className="input sm mono" style={{ width: 44 }} maxLength={1} value={s.symbol} disabled={core} onChange={(e) => setStatus(core, index, { symbol: e.target.value })} aria-label="Caractere" />
                <input className="input sm grow" value={s.name} onChange={(e) => setStatus(core, index, { name: e.target.value })} aria-label="Nome do estado" />
                <input className="input sm mono" style={{ width: 44 }} maxLength={1} value={s.nextStatusSymbol} onChange={(e) => setStatus(core, index, { nextStatusSymbol: e.target.value })} aria-label="Próximo caractere" title="Próximo estado ao clicar" />
                <select className="select sm" value={s.type} disabled={core} onChange={(e) => setStatus(core, index, { type: e.target.value as Status["type"] })} aria-label="Tipo">
                  {STATUS_TYPES.filter((t) => t !== "EMPTY").map((t) => (
                    <option key={t} value={t}>
                      {STATUS_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
                {!core && (
                  <button className="icon-btn" aria-label={`Remover o estado ${s.name}`} onClick={() => set({ customStatuses: settings.customStatuses.filter((_, j) => j !== index) })}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )
          })}
          <button className="btn sm ghost" onClick={() => set({ customStatuses: [...settings.customStatuses, { symbol: "", name: "Novo estado", nextStatusSymbol: "x", availableAsCommand: false, type: "TODO" }] })}>
            <Plus size={14} /> Estado
          </button>
        </div>
      </details>
      <details>
        <summary className="small">Predefinições ({Object.keys(settings.presets).length})</summary>
        <div className="stack">
          {Object.entries(settings.presets).map(([name, value]) => (
            <div key={name} className="stack" style={{ gap: 4 }}>
              <span className="row">
                <code className="grow small">preset {name}</code>
                <button
                  className="icon-btn"
                  aria-label={`Remover a predefinição ${name}`}
                  onClick={() => {
                    const next = { ...settings.presets }
                    delete next[name]
                    set({ presets: next })
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </span>
              <textarea className="input mono small" rows={2} value={value} onChange={(e) => set({ presets: { ...settings.presets, [name]: e.target.value } })} aria-label={`Instruções de ${name}`} />
            </div>
          ))}
          <button
            className="btn sm ghost"
            onClick={() => {
              let n = 1
              while (settings.presets[`nova_${n}`]) n++
              set({ presets: { ...settings.presets, [`nova_${n}`]: "not done" } })
            }}
          >
            <Plus size={14} /> Predefinição
          </button>
          <button className="btn sm ghost" onClick={() => set({ presets: { ...DEFAULT_TASKS_SETTINGS.presets, ...settings.presets } })}>
            Restaurar as do Tasks
          </button>
        </div>
      </details>
    </section>
  )
}
