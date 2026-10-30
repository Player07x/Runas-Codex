import { describe, expect, it } from "vitest"
import { DEFAULT_BACKUP_SCHEDULE, describeNextBackup, nextBackupAt, normalizeBackupSchedule, validBackupTime } from "./backup-schedule"

describe("backup schedule", () => {
  it("validates and normalizes local time", () => {
    expect(validBackupTime("03:00")).toBe(true)
    expect(validBackupTime("23:59")).toBe(true)
    expect(validBackupTime("24:00")).toBe(false)
    expect(validBackupTime("3:00")).toBe(false)
    expect(normalizeBackupSchedule({ time: "25:00", keep: 0 })).toEqual(DEFAULT_BACKUP_SCHEDULE)
    expect(normalizeBackupSchedule({ enabled: false, time: "01:30", keep: 200 })).toEqual({ enabled: false, time: "01:30", keep: 100 })
  })

  it("schedules today when the time is ahead and tomorrow when it passed", () => {
    const now = new Date("2026-10-22T02:00:00")
    expect(nextBackupAt(now, { enabled: true, time: "03:00", keep: 15 })?.toISOString()).toBe(new Date("2026-10-22T03:00:00").toISOString())
    expect(nextBackupAt(new Date("2026-10-22T04:00:00"), { enabled: true, time: "03:00", keep: 15 })?.toISOString()).toBe(new Date("2026-10-23T03:00:00").toISOString())
    expect(nextBackupAt(now, { enabled: false, time: "03:00", keep: 15 })).toBeNull()
  })

  it("descreve o próximo backup como hoje ou amanhã", () => {
    const schedule = { enabled: true, time: "03:00", keep: 15 }
    expect(describeNextBackup(new Date("2026-10-22T02:00:00"), schedule)).toBe("hoje às 03:00")
    expect(describeNextBackup(new Date("2026-10-22T04:00:00"), schedule)).toBe("amanhã às 03:00")
    expect(describeNextBackup(new Date("2026-10-31T23:30:00"), schedule)).toBe("amanhã às 03:00")
    expect(describeNextBackup(new Date("2026-10-22T02:00:00"), { ...schedule, enabled: false })).toBeNull()
  })
})
