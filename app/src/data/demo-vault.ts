import formatadores from "./formatadores.md?raw"
import runa from "../assets/runa.png"

/**
 * Arquivos a mais do cofre de exemplo (navegador): a nota de teste dos formatadores (a mesma do cofre de teste do
 * desktop, `desktop/tests/cofre-exemplo`) e o que ela cita.
 */
export const DEMO_TEXT_FILES: Record<string, string> = {
  "Notas/Formatadores.md": formatadores,
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
