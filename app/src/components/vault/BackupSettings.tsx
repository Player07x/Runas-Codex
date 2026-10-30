import { useEffect, useState } from "react"
import { Archive, FolderOpen } from "lucide-react"
import { describeNextBackup, validBackupTime, type BackupSchedule } from "../../core/backup-schedule"
import { useVault } from "../../platform/VaultProvider"
import type { BackupInfo } from "../../platform/platform"
import { Switch, useToast } from "../ui"

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)
const formatDate = (time: number) => new Date(time).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })

/**
 * Configurações › Backups (T1, ADR 0031): a agenda do backup automático (horário e quantos guardar), o backup na hora
 * e os últimos guardados. A agenda mora no processo principal; sem ela (celular), vale só o backup do primeiro
 * salvamento do dia.
 */
export function BackupSettings() {
  const vault = useVault()
  const toast = useToast()
  const platform = vault.platform
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null)
  const [keep, setKeep] = useState("")
  const [busy, setBusy] = useState(false)
  const scheduled = Boolean(platform.backupSchedule && platform.setBackupSchedule)

  useEffect(() => {
    if (vault.info) platform.listBackups().then(setBackups, () => setBackups([]))
  }, [vault.info, platform])
  useEffect(() => {
    platform.backupSchedule?.().then((value) => { setSchedule(value); setKeep(String(value.keep)) }, () => setSchedule(null))
  }, [platform, vault.info])

  const change = (patch: Partial<BackupSchedule>) => {
    platform.setBackupSchedule?.(patch).then(
      (value) => { setSchedule(value); setKeep(String(value.keep)) },
      (error: unknown) => toast(error instanceof Error ? error.message : String(error)),
    )
  }
  const commitKeep = () => {
    const value = Number(keep)
    if (!schedule || value === schedule.keep) return
    if (!Number.isInteger(value) || value < 1 || value > 100) { setKeep(String(schedule.keep)); toast("Guarde de 1 a 100 backups."); return }
    change({ keep: value })
  }
  const backupNow = () => {
    setBusy(true)
    platform.backup()
      .then(() => platform.listBackups().then(setBackups))
      .then(() => toast("Backup feito"))
      .catch((error: unknown) => toast(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(false))
  }

  const limit = schedule?.keep ?? 15
  const next = schedule ? describeNextBackup(new Date(), schedule) : null
  const desktop = platform.kind !== "memory"
  return (
    <section className="card backup-settings">
      <span className="section-title row settings-card-head"><Archive size={16} /> Backups</span>
      {scheduled && schedule ? (
        <>
          <div className="setting-row">
            <div>
              <span className="small" style={{ fontWeight: 650 }}>Backup automático todo dia</span>
              <span className="tiny faint">
                {schedule.enabled ? `Próximo: ${next}. Precisa do app aberto ou na bandeja; se estiver fechado, sai no primeiro salvamento do dia.` : "Desligado. Ainda sai um backup antes do primeiro salvamento de cada dia."}
              </span>
            </div>
            <Switch on={schedule.enabled} label="Backup automático todo dia" onChange={(enabled) => change({ enabled })} />
          </div>
          <label className="setting-row">
            <div>
              <span className="small" style={{ fontWeight: 650 }}>Horário</span>
              <span className="tiny faint">Hora deste aparelho.</span>
            </div>
            <input
              className="input sm backup-time"
              type="time"
              aria-label="Horário do backup automático"
              value={schedule.time}
              disabled={!schedule.enabled}
              onChange={(event) => { if (validBackupTime(event.target.value)) change({ time: event.target.value }) }}
            />
          </label>
          <label className="setting-row">
            <div>
              <span className="small" style={{ fontWeight: 650 }}>Quantos guardar</span>
              <span className="tiny faint">De 1 a 100. Ao passar disso, o mais antigo sai.</span>
            </div>
            <input
              className="input sm backup-keep"
              type="number"
              aria-label="Quantos backups guardar"
              inputMode="numeric"
              min={1}
              max={100}
              value={keep}
              onChange={(event) => setKeep(event.target.value)}
              onBlur={commitKeep}
              onKeyDown={(event) => { if (event.key === "Enter") commitKeep() }}
            />
          </label>
        </>
      ) : (
        <div className="setting-row">
          <div>
            <span className="small" style={{ fontWeight: 650 }}>Backup automático</span>
            <span className="tiny faint">Neste aparelho, sai um antes do primeiro salvamento de cada dia (até 15 guardados). O horário se escolhe no app do computador.</span>
          </div>
        </div>
      )}
      <div className="setting-row">
        <div>
          <span className="small" style={{ fontWeight: 650 }}>Backup do texto das notas</span>
          <span className="tiny faint">Só o texto das notas, fora do cofre. {backups.length ? `${backups.length} de até ${limit} guardados.` : "Nenhum ainda."}</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn sm" onClick={backupNow} disabled={!vault.info || busy}>
            <Archive size={14} /> Fazer agora
          </button>
          {desktop && (
            <button className="btn sm ghost" onClick={() => void platform.revealBackups().catch((error: unknown) => toast(String(error)))} disabled={!vault.info}>
              <FolderOpen size={14} /> Abrir pasta
            </button>
          )}
        </div>
      </div>
      {backups.length > 0 && (
        <ul className="backup-list" aria-label="Últimos backups">
          {backups.slice(0, 5).map((backup) => (
            <li key={backup.id}>
              <span>{formatDate(backup.createdAt)}</span>
              <span className="tiny faint">{[backup.files ? `${backup.files} ${backup.files === 1 ? "arquivo" : "arquivos"}` : "", backup.size ? formatSize(backup.size) : ""].filter(Boolean).join(" · ")}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="setting-row">
        <div>
          <span className="small" style={{ fontWeight: 650 }}>Cofre inteiro, com anexos e mesas</span>
          <span className="tiny faint">Para levar a outro aparelho ou guardar fora, gere um pacote do cofre em Importar e exportar.</span>
        </div>
        <a className="btn sm" href="#/transferir">Importar e exportar</a>
      </div>
    </section>
  )
}
