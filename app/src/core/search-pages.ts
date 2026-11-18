import { AGENDA_ROOT, parseEvent } from "./agenda"
import { bookRoute } from "./books"
import {
  campaignInfo, campaignNameOf, isPlayerNote, isQuestNote, isSessionNote, listPlayers, noteTitle, trackedLinks,
} from "./campaigns"
import { articleKind, declaredRelations } from "./wiki"
import type { IndexedNote, VaultIndex } from "./vault-index"

/**
 * Páginas da busca (U116): as telas do app onde uma nota aparece. O Ctrl K continua buscando no índice; esta regra só
 * diz, para cada nota achada, que páginas a mostram (a campanha no Painel, o artigo na Wiki, o personagem no Elenco…).
 */
export interface PageShortcut {
  label: string
  route: string
}

export interface SearchPage {
  key: string
  label: string
  /** O que é e onde fica (“Artigo · Wiki Valdris › Personagens”). */
  detail: string
  route: string
  /** A nota por trás da página (Ctrl Enter abre a nota no editor). Telas fixas não têm. */
  notePath?: string
  /** Atalhos para as abas da página (a campanha leva a Sessões, Missões, Elenco e Quadro). */
  shortcuts?: PageShortcut[]
}

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").trim()

/** A mesma rota de `campaignRoute` (screens/campaigns), aqui sem React. */
const campaignPage = (name: string, section = "", path?: string) =>
  `/campanhas/${encodeURIComponent(name)}${section ? `/${section}` : ""}${path ? `/${encodeURIComponent(path)}` : ""}`

const dataOf = (note: IndexedNote | undefined) => note?.meta.frontmatter?.data ?? {}

/** As telas fixas, achadas pelo nome. Os comandos que só levavam a uma tela passaram para cá. */
export const SCREEN_PAGES: readonly SearchPage[] = [
  { key: "tela:inicio", label: "Início", detail: "Tela", route: "/" },
  { key: "tela:notas", label: "Notas", detail: "Tela", route: "/notas" },
  { key: "tela:agenda", label: "Agenda", detail: "Tela", route: "/agenda" },
  { key: "tela:wiki", label: "Wiki", detail: "Tela", route: "/wiki" },
  { key: "tela:relacoes", label: "Relações", detail: "Wiki", route: "/wiki/relacoes" },
  { key: "tela:calendario", label: "Calendário do mundo", detail: "Wiki", route: "/wiki/calendario" },
  { key: "tela:linha", label: "Linha do tempo", detail: "Wiki", route: "/wiki/linha-do-tempo" },
  { key: "tela:mapa", label: "Mapa", detail: "Wiki", route: "/wiki/mapa" },
  { key: "tela:grafico", label: "Gráfico da wiki", detail: "Wiki", route: "/wiki/grafico" },
  { key: "tela:ferramentas", label: "Ferramentas da wiki", detail: "Wiki", route: "/wiki/ferramentas" },
  { key: "tela:campanhas", label: "Campanhas", detail: "Tela", route: "/campanhas" },
  { key: "tela:livros", label: "Livros", detail: "Tela", route: "/livros" },
  { key: "tela:vtt", label: "VTT", detail: "Tela", route: "/vtt" },
  { key: "tela:transferir", label: "Importar e exportar", detail: "Tela", route: "/transferir" },
  { key: "tela:config", label: "Configurações", detail: "Tela", route: "/config" },
  { key: "tela:acessibilidade", label: "Acessibilidade", detail: "Configurações", route: "/config/acessibilidade" },
  { key: "tela:aparencia", label: "Aparência", detail: "Configurações", route: "/config/aparencia" },
  { key: "tela:atalhos", label: "Atalhos", detail: "Configurações", route: "/config/editor" },
  { key: "tela:backups", label: "Backups", detail: "Configurações", route: "/config/backups" },
  { key: "tela:ajuda", label: "Ajuda e notas de exemplo", detail: "Ajuda", route: "/ajuda" },
]

/** As telas fixas cujo nome contém a busca (sem diferenciar acentos). Busca vazia não lista nenhuma. */
export function screenPages(query: string): SearchPage[] {
  const q = fold(query)
  if (!q) return []
  return SCREEN_PAGES.filter((page) => fold(page.label).includes(q))
}

const folderLine = (path: string, skip: number) => path.split("/").slice(skip, -1).join(" › ")

/** As páginas que mostram a nota `path`, na ordem em que aparecem na busca. */
export function notePages(index: VaultIndex, path: string): SearchPage[] {
  const note = index.note(path)
  if (!note) return []
  const title = noteTitle(note)
  const pages: SearchPage[] = []
  const add = (page: Omit<SearchPage, "notePath">) => pages.push({ ...page, notePath: path })

  if (path.startsWith(AGENDA_ROOT)) {
    const event = parseEvent(path, note.text)
    if (event) add({ key: `evento:${path}`, label: event.title, detail: "Evento · Agenda", route: `/agenda/evento/${encodeURIComponent(path)}` })
  }

  const campaign = campaignNameOf(path)
  if (campaign) {
    const root = `Campanhas/${campaign}/`
    if (path === `${root}${campaign}.md`) {
      add({
        key: `campanha:${path}`, label: title, detail: "Campanha · Painel", route: campaignPage(campaign),
        shortcuts: [
          { label: "Sessões", route: campaignPage(campaign, "sessoes") },
          { label: "Missões", route: campaignPage(campaign, "missoes") },
          { label: "Elenco", route: campaignPage(campaign, "elenco") },
          { label: "Quadro", route: campaignPage(campaign, "quadro") },
        ],
      })
    } else if (isSessionNote(note, root)) add({ key: `sessao:${path}`, label: title, detail: `Sessão · ${campaign}`, route: campaignPage(campaign, "sessoes", path) })
    else if (isQuestNote(note, root)) add({ key: `missao:${path}`, label: title, detail: `Missão · ${campaign}`, route: campaignPage(campaign, "missoes", path) })
    else if (isPlayerNote(note, root)) add({ key: `elenco:${campaign}:${path}`, label: `${title} no Elenco`, detail: `Campanha · ${campaign}`, route: campaignPage(campaign, "elenco", path) })
  }

  const wiki = /^Wikis\/([^/]+)\//.exec(path)?.[1]
  if (wiki) {
    const where = folderLine(path, 2)
    add({ key: `artigo:${path}`, label: title, detail: `Artigo · Wiki ${wiki}${where ? ` › ${where}` : ""}`, route: `/wiki/artigo/${encodeURIComponent(path)}` })
    // No Elenco das campanhas que a citam como NPC, facção ou personagem. Só as notas de campanha que linkam a ela
    // são conferidas (os backlinks já ficam guardados no índice).
    const homes = new Set(index.backlinks(path).map((b) => b.from).filter((from) => {
      const name = campaignNameOf(from)
      return name !== null && from === `Campanhas/${name}/${name}.md`
    }))
    for (const home of homes) {
      const name = campaignNameOf(home)!
      const info = campaignInfo(index, name)
      const inCast = trackedLinks(index, info, "npcs").some((l) => l.dest === path)
        || trackedLinks(index, info, "faccoes").some((l) => l.dest === path)
        || listPlayers(index, info).some((p) => p.path === path)
      if (inCast) add({ key: `elenco:${name}:${path}`, label: `${title} no Elenco`, detail: `Campanha · ${name}`, route: campaignPage(name, "elenco", path) })
    }
    // No organograma (organizações e quem declara um vínculo com uma) e na árvore genealógica.
    const groups = new Set(declaredRelations(index, note).filter((r) => r.other).map((r) => r.type.group))
    const relations = `/wiki/relacoes/${encodeURIComponent(path)}`
    if (articleKind(dataOf(note).tipo)?.id === "organizacao" || groups.has("organizacao")) add({ key: `organograma:${path}`, label: `${title} no organograma`, detail: `Wiki ${wiki} › Relações`, route: relations })
    else if (groups.has("familia")) add({ key: `arvore:${path}`, label: `${title} na árvore genealógica`, detail: `Wiki ${wiki} › Relações`, route: relations })
  }

  const shelf = /^(Livros\/[^/]+\/)/.exec(path)?.[1]
  if (shelf) {
    if (dataOf(note).tipo === "livro") add({ key: `livro:${path}`, label: title, detail: "Livro", route: bookRoute(path) })
    else {
      const book = index.notesIn(shelf).find((n) => dataOf(n).tipo === "livro")
      if (book) add({ key: `capitulo:${path}`, label: title, detail: `Livro · ${noteTitle(book)}`, route: bookRoute(book.path) })
    }
  }
  return pages
}

/**
 * As páginas da busca: as das notas achadas (na ordem delas) e depois as telas fixas pelo nome, sem repetir, até
 * `limit`.
 */
export function searchPages(index: VaultIndex | null | undefined, query: string, notePaths: readonly string[], limit = 7, worlds: readonly { id: string; title: string }[] = []): SearchPage[] {
  const seen = new Set<string>()
  const pages: SearchPage[] = []
  const push = (page: SearchPage) => {
    if (pages.length >= limit || seen.has(page.key)) return
    seen.add(page.key)
    pages.push(page)
  }
  // A tela cujo nome começa pela busca vem antes (“acess” → Acessibilidade); as outras, depois das notas.
  const screens = screenPages(query)
  const q = fold(query)
  const tables: SearchPage[] = q ? worlds.filter((world) => fold(world.title).includes(q)).map((world) => ({
    key: `mesa:${world.id}`, label: world.title, detail: "Mesa · VTT", route: `/vtt/mesa/${encodeURIComponent(world.id)}`,
  })) : []
  for (const page of [...screens, ...tables]) if (fold(page.label).startsWith(q)) push(page)
  if (index && q) for (const path of notePaths) for (const page of notePages(index, path)) push(page)
  for (const page of [...screens, ...tables]) push(page)
  return pages
}
