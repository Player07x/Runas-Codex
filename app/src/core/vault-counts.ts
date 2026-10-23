import { findBooks } from "./books"
import { listCampaigns } from "./campaigns"
import { parseEvent } from "./agenda"
import { listWikis } from "./wiki"
import { isCategoryNote } from "./personalization"
import type { VaultIndex } from "./vault-index"
export interface VaultCounts { notas: number; agenda: number; wiki: number; campanhas: number; livros: number; mesas: number }
/** Conta entidades do cofre, sem substituir zero por dados do protótipo. */
export function vaultCounts(index: VaultIndex | null, worlds = 0): VaultCounts {
  if (!index) return { notas: 0, agenda: 0, wiki: 0, campanhas: 0, livros: 0, mesas: 0 }
  return { notas: index.notesIn("Notas/").length,
    agenda: index.notesIn("Agenda/").filter(note => parseEvent(note.path, note.text)).length,
    // A nota da categoria (`tipo: categoria`, ADR 0027) personaliza a pasta e não conta como artigo.
    wiki: listWikis(index).reduce((total, wiki) => total + wiki.articles, 0) - index.notesIn("Wikis/").filter(isCategoryNote).length,
    campanhas: listCampaigns(index).length, livros: findBooks(index).length, mesas: Math.max(0, Math.floor(worlds)) }
}
