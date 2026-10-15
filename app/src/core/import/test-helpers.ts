import { expect } from "vitest"
import { parseFrontmatter } from "../parse"
import { fencedBlocks } from "./blocks"
import type { PlannedEdit } from "./obsidian"

/** O texto fora dos trechos `[start, end)` de `before` aparece igual, e na mesma ordem, em `after`. */
export function expectOutsideUnchanged(before: string, after: string, ranges: [number, number][]): void {
  const segments: string[] = []
  let at = 0
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    segments.push(before.slice(at, start))
    at = end
  }
  segments.push(before.slice(at))
  expect(after.startsWith(segments[0]!)).toBe(true)
  expect(after.endsWith(segments.at(-1)!)).toBe(true)
  let pos = segments[0]!.length
  for (const segment of segments.slice(1, -1)) {
    const found = after.indexOf(segment, pos)
    expect(found).toBeGreaterThanOrEqual(pos)
    pos = found + segment.length
  }
}

/**
 * Uma nota migrada só mudou nos blocos convertidos e, se ganhou datas, no frontmatter (que só ganha chaves: as que
 * existiam continuam com o mesmo valor).
 */
export function expectOnlyPlannedChanges(edit: PlannedEdit): void {
  const lines = new Set(edit.changes.filter((c) => c.kind !== "calendario" || c.line !== undefined).map((c) => c.line))
  const converted = fencedBlocks(edit.before).filter((b) => lines.has(b.line + 1))
  const datesChanged = edit.changes.some((c) => c.kind === "calendario" && c.line === undefined)
  let { before, after } = edit
  let shift = 0
  if (datesChanged) {
    const [fb, fa] = [parseFrontmatter(before), parseFrontmatter(after)]
    expect(fa?.data).toBeTruthy()
    for (const [key, value] of Object.entries(fb?.data ?? {})) expect(fa!.data![key]).toEqual(value)
    shift = fb?.end ?? 0
    before = before.slice(shift)
    after = after.slice(fa!.end)
  }
  expectOutsideUnchanged(before, after, converted.map((b) => [b.start - shift, b.end - shift]))
}
