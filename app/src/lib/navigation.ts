import type { Note } from "../data/types"
import { vaultRoute } from "./vault-notes"

/** Rota da tela que abre uma nota, conforme o espaço dela. */
export function routeOfNote(note: Note): string {
  switch (note.space) {
    case "wiki":
      return `/wiki/artigo/${note.id}`
    case "campanhas":
      return `/campanhas/cinzas-de-valdris/sessao/s12`
    case "notas":
    default:
      return vaultRoute(note.path)
  }
}

export function formatDate(iso: string, options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }): string {
  return new Date(iso).toLocaleDateString("pt-BR", options)
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

export function relativeDays(iso: string, today: Date): string {
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((day(new Date(iso)) - day(today)) / 86_400_000)
  if (diff === 0) return "hoje"
  if (diff === 1) return "amanhã"
  if (diff === -1) return "ontem"
  return diff > 0 ? `em ${diff} dias` : `há ${-diff} dias`
}
