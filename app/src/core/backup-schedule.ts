/** Regras comuns da agenda de backups (a tela só edita este contrato). */
export interface BackupSchedule {
  enabled: boolean
  /** Horário local no formato `HH:mm`. */
  time: string
  /** Quantidade máxima de arquivos ZIP mantidos. */
  keep: number
}

export const DEFAULT_BACKUP_SCHEDULE: BackupSchedule = { enabled: true, time: "03:00", keep: 15 }

export function validBackupTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  return Boolean(match && Number(match[1]) < 24 && Number(match[2]) < 60)
}

export function normalizeBackupSchedule(value: Partial<BackupSchedule> | undefined): BackupSchedule {
  const time = typeof value?.time === "string" && validBackupTime(value.time) ? value.time : DEFAULT_BACKUP_SCHEDULE.time
  const keep = typeof value?.keep === "number" && Number.isInteger(value.keep) && value.keep >= 1 ? Math.min(100, value.keep) : DEFAULT_BACKUP_SCHEDULE.keep
  return { enabled: value?.enabled !== false, time, keep }
}

/** Próxima ocorrência do horário local. Se já passou hoje, devolve amanhã. */
export function nextBackupAt(now: Date, schedule: BackupSchedule): Date | null {
  if (!schedule.enabled || !validBackupTime(schedule.time)) return null
  const [hours, minutes] = schedule.time.split(":").map(Number)
  const next = new Date(now)
  next.setHours(hours!, minutes!, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
  return next
}

/** Quando sai o próximo backup agendado (“hoje às 03:00”, “amanhã às 03:00”), ou `null` com a agenda desligada. */
export function describeNextBackup(now: Date, schedule: BackupSchedule): string | null {
  const next = nextBackupAt(now, schedule)
  if (!next) return null
  return `${next.getDate() === now.getDate() ? "hoje" : "amanhã"} às ${schedule.time}`
}
