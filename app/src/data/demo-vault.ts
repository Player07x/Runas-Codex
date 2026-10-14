import formatadores from "./formatadores.md?raw"
import modeloDiario from "./modelos/Diário.md?raw"
import modeloNpc from "./modelos/NPC.md?raw"
import runa from "../assets/runa.png"

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
}

/** Anexos do exemplo: o caminho no cofre e o arquivo empacotado com o app. */
export const DEMO_ASSETS: Record<string, string> = {
  "Notas/runa.png": runa,
}
