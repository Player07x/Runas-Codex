import type { Note } from "../data/types"
import type { VaultEntry } from "../platform/platform"
import { basename, splitFrontmatter } from "./links"
import { spaceOfPath } from "./spaces"

/** `[a, "b c"]` ou `a, b` → lista (o editor real usa a lib `yaml` na etapa 3a). */
function listValue(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, "").replace(/^#/, ""))
    .filter(Boolean)
}

/** Tags no texto: `#tag` depois de espaço ou no começo da linha. Só números (`#1492`) não é tag no Obsidian. */
function inlineTags(body: string): string[] {
  const tags = [...body.replace(/```[\s\S]*?```|`[^`\n]*`/g, "").matchAll(/(?:^|\s)#([\p{L}\p{N}_/-]+)/gu)].map((match) => match[1]!)
  return tags.filter((tag) => !/^\d+$/.test(tag))
}

/**
 * Converte um arquivo `.md` do cofre numa nota para as telas. Só para leitura: BOM e CRLF somem do texto mostrado,
 * mas o arquivo no disco não é tocado (a gravação, na etapa 3a, preserva os bytes originais).
 */
export function toNote(entry: VaultEntry, content: string): Note {
  const markdown = content.replace(/^﻿/, "").replace(/\r\n?/g, "\n")
  const { properties, body } = splitFrontmatter(markdown)
  const prop = (...keys: string[]) => properties.find(([key]) => keys.includes(key))?.[1]
  const tags = [...new Set([...listValue(prop("tags", "tag")), ...inlineTags(body)].map((tag) => tag.toLocaleLowerCase("pt-BR")))]
  return {
    id: entry.path,
    title: basename(entry.path),
    space: spaceOfPath(entry.path) ?? "notas",
    path: entry.path,
    markdown,
    tags,
    aliases: listValue(prop("aliases", "alias")),
    updated: new Date(entry.mtime).toISOString(),
  }
}

/** Rota que abre uma nota do cofre no leitor de Notas (o caminho vai codificado num segmento só). */
export function vaultRoute(note: Note): string {
  return `/notas/${encodeURIComponent(note.id)}`
}
