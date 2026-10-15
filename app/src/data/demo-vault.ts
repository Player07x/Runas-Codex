import formatadores from "./formatadores.md?raw"
import modeloDiario from "./modelos/Diário.md?raw"
import modeloNpc from "./modelos/NPC.md?raw"
import runa from "../assets/runa.png"
import mapaValdris from "./mapa-condado-de-valdris.svg"
import { eventFileName, eventNote, type EventInput } from "../core/agenda"
import { EVENTS } from "./agenda"

/**
 * Arquivos a mais do cofre de exemplo (navegador): a nota de teste dos formatadores, os modelos e as configurações
 * do Obsidian — os mesmos do cofre de teste do desktop (`desktop/tests/cofre-exemplo`; um teste confere).
 */
export const DEMO_TEXT_FILES: Record<string, string> = {
  "Notas/Formatadores.md": formatadores,
  "Notas/Modelos/NPC.md": modeloNpc,
  "Notas/Modelos/Diário.md": modeloDiario,
  // Configurações do Obsidian (ocultas: só o app lê, não aparecem nas notas).
  ".obsidian/templates.json": `{\n  "folder": "Notas/Modelos",\n  "dateFormat": "DD/MM/YYYY"\n}\n`,
  ".obsidian/daily-notes.json": `{\n  "folder": "Notas/Diário",\n  "format": "YYYY-MM-DD",\n  "template": "Notas/Modelos/Diário"\n}\n`,
  "Notas/Caderno.md": `---
tags: [ideias]
aliases: [Caderno do mestre]
---
# Caderno

Pensar em [[Aldren]] e no [[Lago Espelhado]]. #rascunho

## Ideias

- Uma ponte que só aparece na lua cheia ^ponte
- Um mercador que vende mapas de lugares que ainda não existem
`,
  // Marcadores do Obsidian (plugin Marcadores): aparecem nos Favoritos das Notas, só para leitura.
  ".obsidian/bookmarks.json": `{\n  "items": [\n    { "type": "group", "ctime": 1, "title": "Mesa", "items": [\n      { "type": "search", "ctime": 2, "query": "tag:rascunho" },\n      { "type": "file", "ctime": 3, "path": "Notas/Caderno.md", "subpath": "#Ideias" }\n    ] }\n  ]\n}\n`,
}

/** Anexos do exemplo: o caminho no cofre e o arquivo empacotado com o app. */
export const DEMO_ASSETS: Record<string, string> = {
  "Notas/runa.png": runa,
  "Wikis/Ordem x Caos/Mapas/mapa-condado-de-valdris.svg": mapaValdris,
}

const REMINDERS: Record<string, number> = { "Na hora": 0, "1 hora antes": 60, "1 dia antes": 1440 }

/** Os eventos de exemplo da Agenda como notas no formato do Full Calendar (o mesmo de um cofre real). */
function demoEvents(): Record<string, string> {
  const files: Record<string, string> = {}
  for (const e of EVENTS) {
    const [date, time] = e.start.split("T") as [string, string]
    const input: EventInput = {
      title: e.title,
      allDay: Boolean(e.allDay),
      date,
      ...(e.allDay ? {} : { startTime: time.slice(0, 5), ...(e.end ? { endTime: e.end.split("T")[1]!.slice(0, 5) } : {}) }),
      repeat: e.recurrence === "Todo ano" ? { kind: "rrule", rule: "FREQ=YEARLY" } : { kind: "none" },
      skipDates: [],
      color: e.color,
      category: e.category,
      ...(e.location ? { location: e.location } : {}),
      reminders: e.reminder && e.reminder in REMINDERS ? [REMINDERS[e.reminder]!] : [],
      ...(e.sessionId === "s12" ? { session: "Campanhas/As Cinzas de Valdris/Sessões/Sessão 12" } : {}),
      countdown: e.id === "e1",
      notes: e.id === "e1" ? "## Preparação\n\n- [x] Confirmar presença no grupo\n- [ ] Imprimir o mapa da Cidade Alta\n- [ ] Separar as miniaturas dos lobos\n" : "",
    }
    files[`Agenda/${eventFileName(input)}.md`] = eventNote(input)
  }
  return files
}

Object.assign(DEMO_TEXT_FILES, demoEvents())

// Livros de exemplo como notas comuns, com a ordem registrada em links.
import { BOOKS } from "./books"
import { newBookText } from "../core/books"
import { stringify } from "yaml"
for (const book of BOOKS) {
  const folder = `Livros/${book.title}`
  const links: string[] = []
  for (const chapter of book.chapters) {
    const title = chapter.title.replaceAll(":", " —")
    links.push(`[[${folder}/${title}]]`)
    DEMO_TEXT_FILES[`${folder}/${title}.md`] = `---\n${stringify({ tipo: "capitulo", status: chapter.status === "revisão" ? "revisao" : chapter.status, resumo: chapter.part })}---\n${chapter.markdown}\n`
  }
  DEMO_TEXT_FILES[`${folder}/${book.title}.md`] = newBookText(book.title, links, book.subtitle, book.goal)
}

// Corpus visual da fase 8b, usando exatamente o leitor e o dialeto das Notas.
DEMO_TEXT_FILES["Livros/Caderno de formatadores/Caderno de formatadores.md"] = newBookText("Caderno de formatadores", ["[[Livros/Caderno de formatadores/Formatadores]]"], "O dialeto completo em páginas", 5000)
DEMO_TEXT_FILES["Livros/Caderno de formatadores/Formatadores.md"] = formatadores

// Campanhas de exemplo (etapa 7): sessões, missões, personagens e um quadro .canvas.
import { campaignDemoFiles } from "./campaign-demo"
Object.assign(DEMO_TEXT_FILES, campaignDemoFiles())

// Dados de plugins de RPG do Obsidian para a migração (etapa 10).
import { OBSIDIAN_PLUGIN_DEMO } from "./obsidian-plugins-demo"
Object.assign(DEMO_TEXT_FILES, OBSIDIAN_PLUGIN_DEMO)
