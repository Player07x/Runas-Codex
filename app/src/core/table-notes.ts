import { newSessionNote, NOTES_HEADING, setSectionText } from "./campaigns"

/**
 * “Salvar Sessão” das Notas da mesa (U14): a nota de sessão da campanha, já realizada, com o texto do mestre em
 * Anotações. As datas vão entre aspas (regra 5), como as outras sessões.
 */
export function sessionFromTableNotes(input: { number: number; title?: string; date: string; text: string }): string {
  const note = newSessionNote({ number: input.number, ...(input.title?.trim() ? { title: input.title.trim() } : {}), date: input.date })
    .replace(/^status: planejada$/m, "status: realizada")
  return setSectionText(note, NOTES_HEADING, input.text)
}

/** Uma linha dos Acontecimentos (rolagens, avisos das regiões) copiada para o texto das Notas. */
export function eventLine(entry: { title: string; detail: string; tokenName: string; at: number }): string {
  const time = new Date(entry.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  return `- ${time} — ${[entry.tokenName, entry.title].filter(Boolean).join(": ")}${entry.detail ? ` (${entry.detail})` : ""}`
}

/** Acrescenta uma linha no fim do rascunho, sem colar na última. */
export function appendLine(text: string, line: string): string {
  return text.trim() ? `${text.replace(/\s+$/, "")}\n${line}\n` : `${line}\n`
}
