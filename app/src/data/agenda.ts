import type { AgendaEvent } from "./types"

/** Hoje no protótipo (data real). */
export const TODAY = new Date("2026-10-13T10:00:00")

export const EVENTS: AgendaEvent[] = [
  { id: "e1", title: "Sessão 12 — As Cinzas de Valdris", start: "2026-10-17T19:30:00", end: "2026-10-17T23:30:00", color: "red", category: "Sessão", location: "Casa do Bruno", reminder: "1 dia antes", campaignId: "cinzas-de-valdris", sessionId: "s12", recurrence: "Toda semana (sábado)" },
  { id: "e2", title: "Sessão 13 — As Cinzas de Valdris", start: "2026-10-24T19:30:00", end: "2026-10-24T23:30:00", color: "red", category: "Sessão", campaignId: "cinzas-de-valdris", recurrence: "Toda semana (sábado)" },
  { id: "e3", title: "Sessão 11 — As Cinzas de Valdris", start: "2026-10-10T19:30:00", end: "2026-10-10T23:30:00", color: "red", category: "Sessão", campaignId: "cinzas-de-valdris" },
  { id: "e4", title: "Mandar lembrete no grupo", start: "2026-10-16T12:00:00", color: "cyan", category: "Tarefa", reminder: "Na hora" },
  { id: "e5", title: "Revisar plano do Runas-Codex", start: "2026-10-13T14:00:00", end: "2026-10-13T15:00:00", color: "gold", category: "Projeto" },
  { id: "e6", title: "Aniversário da Carla", start: "2026-10-21T00:00:00", allDay: true, color: "violet", category: "Pessoal", recurrence: "Todo ano" },
  { id: "e7", title: "Sessão zero — Coroa Partida (volta)", start: "2026-10-31T16:00:00", end: "2026-10-31T19:00:00", color: "gold", category: "Sessão", campaignId: "coroa-partida" },
  { id: "e8", title: "Comprar dados novos", start: "2026-10-15T18:00:00", color: "green", category: "Tarefa" },
  { id: "e9", title: "Dentista", start: "2026-10-14T09:00:00", end: "2026-10-14T10:00:00", color: "cyan", category: "Pessoal" },
  { id: "e10", title: "Sessão 10 — As Cinzas de Valdris", start: "2026-10-03T19:30:00", end: "2026-10-03T23:30:00", color: "red", category: "Sessão", campaignId: "cinzas-de-valdris" },
]
