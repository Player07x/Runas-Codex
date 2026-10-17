import { findCodeBlocks } from "../codeblocks"
import { caseCollision, nameProblem } from "../names"
import { setProperty } from "../properties"
import { foldName, joinPath, noteName } from "../text"
import type { VaultIndex } from "../vault-index"
import { fencedBlocks, keepOriginal, quotedBlocks, replaceBlocks, type BlockReplacement } from "./blocks"
import { calendariumData, convertCalendar, parseNoteDate, type CmCalendar } from "./calendarium"
import { convertEncounter } from "./encounter"
import { convertLeaflet, leafletSavedMaps, linkTarget, readLeafletBlock, type LocatedNote } from "./leaflet"
import { convertStatblock, statblockBestiary } from "./statblock"
import { defaultAbbr, noteDateText } from "../calendar"
import { listCalendars, listWikis, wikiRootOf } from "../wiki"

/**
 * Migração do Obsidian (etapa 10, ADR 0014): acha no cofre os dados dos plugins de RPG que têm equivalente no app e
 * monta o plano — o texto novo de cada nota e as notas novas — sem gravar nada. A tela mostra o plano, faz o backup e
 * grava pelo `useVault()`. Fora dos blocos convertidos, nenhum byte das notas muda (o teste de ida e volta confere).
 */

export const PLUGIN_FILES = {
  calendarium: ".obsidian/plugins/calendarium/data.json",
  fantasyCalendar: ".obsidian/plugins/fantasy-calendar/data.json",
  leaflet: ".obsidian/plugins/obsidian-leaflet-plugin/data.json",
  statblocks: ".obsidian/plugins/obsidian-5e-statblocks/data.json",
  community: ".obsidian/community-plugins.json",
} as const

export type MigrationKind = "calendario" | "mapa" | "statblock" | "encontro"

export const KIND_LABEL: Record<MigrationKind, { plugin: string; result: string }> = {
  calendario: { plugin: "Calendarium / Fantasy-Calendar", result: "bloco runas-calendario" },
  mapa: { plugin: "Leaflet", result: "bloco runas-mapa" },
  statblock: { plugin: "Fantasy Statblocks", result: "callout [!statblock]" },
  encontro: { plugin: "Initiative Tracker", result: "bloco runas-encontro" },
}

const BLOCK_KIND: Record<string, Exclude<MigrationKind, "calendario">> = { leaflet: "mapa", statblock: "statblock", encounter: "encontro", "encounter-table": "encontro" }
const PLUGIN_NAME: Record<MigrationKind, string> = { calendario: "Calendarium", mapa: "Leaflet", statblock: "Fantasy Statblocks", encontro: "Initiative Tracker" }

export interface MigrationOptions {
  kinds: MigrationKind[]
  /** Guardar o bloco original num comentário `%% … %%`, para quem ainda usa o plugin no Obsidian. */
  keepOriginal: boolean
  /** Pasta das notas de calendário novas. */
  calendarFolder: string
}

export interface PlannedChange {
  kind: MigrationKind
  /** O que muda, em uma linha ("Mapa com 12 pinos", "Datas: data_mundo"…). */
  label: string
  line?: number
  warnings: string[]
}

export interface PlannedEdit {
  path: string
  before: string
  after: string
  changes: PlannedChange[]
}

export interface PlannedNote {
  path: string
  content: string
  label: string
  warnings: string[]
}

export interface MigrationNotice {
  kind: MigrationKind
  path?: string
  line?: number
  text: string
}

export interface MigrationPlan {
  /** Quanto de cada coisa foi encontrado (blocos ou calendários). */
  found: Record<MigrationKind, number>
  /** Plugins ligados no `.obsidian/community-plugins.json`. */
  enabledPlugins: string[]
  edits: PlannedEdit[]
  notes: PlannedNote[]
  /** O que não foi convertido (fica como está) e avisos gerais. */
  notices: MigrationNotice[]
}

export interface MigrationInput {
  index: VaultIndex
  /** Conteúdo dos arquivos de `PLUGIN_FILES` que existem no cofre. */
  files: Record<string, string>
  /** Tamanho de uma imagem do cofre (para os mapas do Leaflet), se der para ler. */
  imageSize(path: string): { width: number; height: number } | null
  /** Calendários de fora do cofre (JSON do site Fantasy-Calendar escolhido na tela). */
  extraCalendars?: { origin: string; calendars: CmCalendar[] }
  options: MigrationOptions
}

/** Nome de nota a partir de um texto qualquer (sem os caracteres que quebram links). */
export function safeNoteName(name: string): string {
  const clean = name.replace(/[[\]#^|\\/:*?"<>\u0000-\u001f]/g, "-").replace(/\s+/g, " ").replace(/^[.\s]+|[.\s]+$/g, "")
  return clean && !nameProblem(clean) ? clean : "Calendário"
}

/** Os nomes de arquivo `.json` dos plugins que a migração lê. */
export const pluginFilePaths = (): string[] => Object.values(PLUGIN_FILES)

export function planObsidianMigration(input: MigrationInput): MigrationPlan {
  const { index, files, options } = input
  const kinds = new Set(options.kinds)
  const plan: MigrationPlan = { found: { calendario: 0, mapa: 0, statblock: 0, encontro: 0 }, enabledPlugins: [], edits: [], notes: [], notices: [] }
  try {
    const enabled = JSON.parse(files[PLUGIN_FILES.community] ?? "[]") as unknown
    if (Array.isArray(enabled)) plan.enabledPlugins = enabled.filter((p): p is string => typeof p === "string")
  } catch {
    /* lista de plugins ilegível: só não mostra quais estão ligados */
  }

  const edits = new Map<string, PlannedEdit>()
  const editOf = (path: string): PlannedEdit => {
    let edit = edits.get(path)
    if (!edit) {
      const text = index.note(path)!.text
      edit = { path, before: text, after: text, changes: [] }
      edits.set(path, edit)
    }
    return edit
  }

  // ---------- Blocos dos plugins nas notas ----------
  const savedMaps = files[PLUGIN_FILES.leaflet] ? leafletSavedMaps(files[PLUGIN_FILES.leaflet]!) : []
  const bestiary = files[PLUGIN_FILES.statblocks] ? statblockBestiary(files[PLUGIN_FILES.statblocks]!) : new Map<string, Record<string, unknown>>()
  // Bestiário em notas: frontmatter com `statblock: true` (o plugin lê essas notas também).
  for (const note of index.allNotes()) {
    const data = note.meta.frontmatter?.data
    if (data?.statblock === true || data?.statblock === "inline") bestiary.set((typeof data.name === "string" ? data.name : noteName(note.path)).toLowerCase(), data)
  }
  const located: LocatedNote[] = index.allNotes().flatMap((note) => {
    const data = note.meta.frontmatter?.data
    return data && (data.location !== undefined || data.mapmarkers !== undefined) ? [{ path: note.path, linkText: index.linkTarget(note.path, note.path), tags: note.meta.tags, data }] : []
  })

  for (const note of index.allNotes()) {
    const quoted = quotedBlocks(note.text, Object.keys(BLOCK_KIND))
    for (const [language, count] of quoted) plan.notices.push({ kind: BLOCK_KIND[language]!, path: note.path, text: `${count} bloco(s) ${language} dentro de citação ou callout ficaram como estão (converta à mão, se quiser).` })
    if (/`encounter:\s[^`\n]+`/.test(note.text)) plan.notices.push({ kind: "encontro", path: note.path, text: "Encontros em linha (`encounter: …`) ficam como estão." })

    const blocks = fencedBlocks(note.text).filter((b) => BLOCK_KIND[b.language])
    if (!blocks.length) continue
    const replacements: BlockReplacement[] = []
    const changes: PlannedChange[] = []
    const resolve = (target: string) => index.resolve({ kind: "wiki", embed: false, target, start: 0, end: 0, raw: "", inFrontmatter: false }, note.path).dest
    for (const block of blocks) {
      const kind = BLOCK_KIND[block.language]!
      plan.found[kind]++
      if (!kinds.has(kind)) continue
      let converted: string | null = null
      let label = ""
      let warnings: string[] = []
      if (kind === "mapa") {
        const id = /^id:\s*["']?([^"'\n]+?)["']?\s*$/m.exec(block.content)?.[1]
        const result = convertLeaflet(block.content, { resolve, imageSize: input.imageSize, saved: savedMaps.find((m) => m.id === id), located })
        warnings = result.warnings
        if (result.yaml !== null) [converted, label] = ["```runas-mapa\n" + result.yaml + "\n```", `Mapa com ${result.pins} pino(s)`]
      } else if (kind === "statblock") {
        const result = convertStatblock(block.content, (name) => bestiary.get(name.toLowerCase()))
        warnings = result.warnings
        if (result.markdown !== null) [converted, label] = [result.markdown, `Statblock “${result.name}”`]
      } else {
        const result = convertEncounter(block.content, (name) => {
          const dest = resolve(name)
          return dest && dest.endsWith(".md") ? index.linkTarget(dest, note.path) : null
        })
        warnings = result.warnings
        if (result.blocks.length) [converted, label] = [result.blocks.map((b) => "```runas-encontro\n" + b + "\n```").join("\n\n"), `${result.blocks.length > 1 ? `${result.blocks.length} encontros` : "Encontro"} com ${result.combatants} combatente(s)`]
      }
      if (converted === null) {
        plan.notices.push({ kind, path: note.path, line: block.line + 1, text: warnings.join(" ") || "O bloco não pôde ser convertido." })
        continue
      }
      if (options.keepOriginal) {
        const original = note.text.slice(block.start, block.end)
        if (original.includes("%%")) warnings.push("O bloco original tem “%%” e não pôde ser guardado num comentário.")
        else converted += "\n\n" + keepOriginal(note.text, block, PLUGIN_NAME[kind])
      }
      replacements.push({ block, text: converted })
      changes.push({ kind, label, line: block.line + 1, warnings })
    }
    if (!replacements.length) continue
    // Os blocos vêm antes das datas (que só mexem no frontmatter), com as posições do texto original.
    const edit = editOf(note.path)
    edit.after = replaceBlocks(edit.after, replacements)
    edit.changes.push(...changes)
  }

  // ---------- Calendários ----------
  const sources: { origin: string; data: NonNullable<ReturnType<typeof calendariumData>> }[] = []
  for (const [key, origin] of [[PLUGIN_FILES.calendarium, "Calendarium"], [PLUGIN_FILES.fantasyCalendar, "Fantasy Calendar"]] as const) {
    if (!files[key]) continue
    const data = calendariumData(files[key]!)
    if (data) sources.push({ origin, data })
    else plan.notices.push({ kind: "calendario", path: key, text: `O arquivo de dados do ${origin} não pôde ser lido.` })
  }
  if (input.extraCalendars) sources.push({ origin: input.extraCalendars.origin, data: { calendars: input.extraCalendars.calendars, defaultCalendar: null, dateFormat: "YYYY-MM-DD", paths: [] } })

  // Calendários que já existem no cofre (pelo `nome` do bloco): migrar de novo não duplica.
  const existing = new Map<string, string>()
  for (const note of index.allNotes()) {
    for (const block of findCodeBlocks(note.text, "runas-calendario")) {
      const name = /^nome:\s*(.+)$/m.exec(block.content)?.[1]?.trim().replace(/^["']|["']$/g, "")
      if (name) existing.set(foldName(name), noteName(note.path))
    }
  }
  const taken = index.allFiles().map((f) => f.path)
  /** Nota de cada calendário convertido (pelo id e pelo nome), para as datas das notas. */
  const calendarNote = new Map<string, { note: string; cal: CmCalendar }>()
  const allCalendars: { cal: CmCalendar; origin: string; defaultCalendar: string | null; paths: [string, string][] }[] = []
  for (const source of sources) for (const cal of source.data.calendars) allCalendars.push({ cal, origin: source.origin, defaultCalendar: source.data.defaultCalendar, paths: source.data.paths })
  plan.found.calendario = allCalendars.length

  if (kinds.has("calendario")) {
    // Numa wiki que já tem calendário, um segundo tira a data dos artigos que contam com "o único calendário da wiki".
    const wikiRoot = wikiRootOf(joinPath(options.calendarFolder, "x.md") ?? "")
    const wikiCalendars = wikiRoot ? listCalendars(index, wikiRoot).length : 0
    if (wikiRoot && wikiCalendars > 0 && allCalendars.some(({ cal }) => !existing.has(foldName(cal.name)))) {
      plan.notices.push({ kind: "calendario", text: `A wiki “${wikiRoot.replace(/^Wikis\/|\/$/g, "")}” já tem calendário: com outro lá, os artigos sem a propriedade calendario deixam de mostrar as datas. Prefira uma pasta fora dela.` })
    }
    for (const { cal, origin } of allCalendars) {
      const already = existing.get(foldName(cal.name))
      if (already) {
        calendarNote.set(cal.id || cal.name, { note: already, cal })
        calendarNote.set(foldName(cal.name), { note: already, cal })
        plan.notices.push({ kind: "calendario", text: `O calendário “${cal.name}” (${origin}) já está no cofre, em “${already}”; não foi criado de novo.` })
        continue
      }
      try {
        const conversion = convertCalendar(cal, origin)
        const base = safeNoteName(cal.name)
        let path = joinPath(options.calendarFolder, `${base}.md`) ?? `${base}.md`
        for (let n = 1; caseCollision(path, taken); n++) path = joinPath(options.calendarFolder, `${base} ${n}.md`) ?? `${base} ${n}.md`
        taken.push(path)
        plan.notes.push({ path, content: conversion.note, label: `Calendário “${cal.name}” (${origin}): ${cal.months.length} meses, ${cal.moons.length} lua(s), ${cal.events.filter((e) => !e.note).length} evento(s)`, warnings: conversion.warnings })
        calendarNote.set(cal.id || cal.name, { note: noteName(path), cal })
        calendarNote.set(foldName(cal.name), { note: noteName(path), cal })
      } catch (error) {
        plan.notices.push({ kind: "calendario", text: `O calendário “${cal.name}” (${origin}) não pôde ser convertido: ${error instanceof Error ? error.message : String(error)}` })
      }
    }

    // Datas das notas (`fc-date`): viram `data_mundo` no calendário convertido, sem tirar as chaves do Calendarium.
    for (const note of index.allNotes()) {
      const data = note.meta.frontmatter?.data
      if (!data || data["fc-ignore"] === true) continue
      const start = data["fc-date"] ?? data["fc-start"]
      if (start === undefined) continue
      const wanted = typeof data["fc-calendar"] === "string" ? data["fc-calendar"].trim() : ""
      // Pastas ligadas a um calendário nas configurações do Calendarium (`/` é o cofre inteiro).
      const fromPaths = allCalendars.flatMap((c) => c.paths).find(([prefix]) => {
        const folder = prefix.replace(/^\/+|\/+$/g, "")
        return !folder || note.path.startsWith(folder + "/")
      })?.[1]
      const fallback = allCalendars.find((c) => c.defaultCalendar)?.defaultCalendar ?? (allCalendars.length === 1 ? allCalendars[0]!.cal.id || allCalendars[0]!.cal.name : "")
      const target = [wanted, fromPaths, fallback].find(Boolean) ?? ""
      const found = calendarNote.get(target) ?? calendarNote.get(foldName(target)) ?? [...calendarNote.values()].find((c) => c.cal.id.toLowerCase() === target.toLowerCase())
      if (!found) {
        plan.notices.push({ kind: "calendario", path: note.path, text: target ? `A data desta nota é do calendário “${target}”, que não foi convertido.` : "A nota tem fc-date, mas não diz de qual calendário." })
        continue
      }
      const date = parseNoteDate(start, found.cal)
      if (!date) {
        plan.notices.push({ kind: "calendario", path: note.path, text: `A data “${typeof start === "string" ? start : JSON.stringify(start)}” repete ou não pôde ser lida; a nota ficou como está.` })
        continue
      }
      const end = data["fc-end"] !== undefined ? parseNoteDate(data["fc-end"], found.cal) : null
      // A sigla do calendário convertido vai em cada data ("4031-07-15 OC") e escolhe o calendário.
      const abbr = { abbr: defaultAbbr(found.cal.name) }
      const keys: [string, string][] = []
      if (data.data_mundo === undefined) keys.push(["data_mundo", noteDateText(date, abbr)])
      if (end && data.data_fim_mundo === undefined) keys.push(["data_fim_mundo", noteDateText(end, abbr)])
      if (!keys.length) continue
      const edit = editOf(note.path)
      try {
        let after = edit.after
        for (const [key, value] of keys) after = setProperty(after, key, value)
        edit.after = after
        edit.changes.push({ kind: "calendario", label: `Datas: ${keys.map(([k, v]) => `${k} ${v}`).join(", ")}`, warnings: [] })
      } catch (error) {
        plan.notices.push({ kind: "calendario", path: note.path, text: error instanceof Error ? error.message : String(error) })
      }
    }
  }

  plan.edits = [...edits.values()].filter((e) => e.after !== e.before).sort((a, b) => a.path.localeCompare(b.path, "pt-BR"))
  return plan
}

/** Imagens dos mapas do Leaflet no cofre (para a tela ler o tamanho antes de montar o plano). */
export function leafletImagePaths(index: VaultIndex): string[] {
  const paths = new Set<string>()
  for (const note of index.allNotes()) {
    for (const block of fencedBlocks(note.text).filter((b) => b.language === "leaflet")) {
      const target = linkTarget(readLeafletBlock(block.content).images[0])
      if (!target || /^[a-z][a-z0-9+.-]*:\/\//i.test(target)) continue
      const dest = index.resolve({ kind: "wiki", embed: false, target, start: 0, end: 0, raw: "", inFrontmatter: false }, note.path).dest
      if (dest) paths.add(dest)
    }
  }
  return [...paths]
}

/** O trecho que muda numa nota (linhas iguais no começo e no fim ficam de fora), para a prévia. */
export function changedRegion(before: string, after: string): { line: number; removed: string[]; added: string[] } {
  const a = before.split(/\r?\n/)
  const b = after.split(/\r?\n/)
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let end = 0
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++
  return { line: start + 1, removed: a.slice(start, a.length - end), added: b.slice(start, b.length - end) }
}

/** Pasta padrão dos calendários novos: a da wiki, se só há uma e ela ainda não tem calendário; senão, fora das wikis. */
export function defaultCalendarFolder(index: VaultIndex): string {
  const wikis = listWikis(index)
  return wikis.length === 1 && listCalendars(index, wikis[0]!.root).length === 0 ? `${wikis[0]!.root}Calendários` : "Calendários"
}
