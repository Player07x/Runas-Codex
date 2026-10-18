import type { Occurrence } from "./agenda"

/**
 * O que vem do "Compartilhar com" do Android vira uma nota: o título sai do assunto, da primeira linha do texto ou da
 * hora; o corpo leva o texto (links como estão) e as imagens embutidas.
 */
export const SHARE_FOLDER = "Notas/Caixa de entrada"

const pad = (n: number) => String(n).padStart(2, "0")

export function sharedNoteTitle(subject: string | undefined, text: string | undefined, now: Date): string {
  const first = (subject?.trim() || text?.trim().split("\n")[0]?.trim() || "").replace(/^https?:\/\/(www\.)?/, "")
  const clean = first.replace(/[[\]#^|\\/:*?"<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60).replace(/[. ]+$/, "")
  return clean || `Compartilhado ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}h${pad(now.getMinutes())}`
}

export function sharedNoteText(subject: string | undefined, text: string | undefined, embeds: string[], now: Date): string {
  const parts: string[] = [`---\ncompartilhado: "${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}"\n---`]
  if (subject?.trim() && text?.trim() && !text.trim().startsWith(subject.trim())) parts.push(`# ${subject.trim()}`)
  if (text?.trim()) parts.push(text.trim())
  parts.push(...embeds)
  return parts.join("\n\n") + "\n"
}

/** Os próximos eventos para o widget da Agenda (no máximo quatro): quando e o título. */
export function widgetItems(occurrences: Occurrence[], now: Date): { when: string; title: string }[] {
  return occurrences
    .filter((o) => o.end > now)
    .slice(0, 4)
    .map((o) => {
      const day = o.start.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "")
      return { when: o.event.allDay ? day : `${day} ${pad(o.start.getHours())}:${pad(o.start.getMinutes())}`, title: o.event.title }
    })
}
