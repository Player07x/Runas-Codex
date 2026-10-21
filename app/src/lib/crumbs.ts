import { noteName } from "../core/text"
import { BOOKS } from "../data/books"
import { CAMPAIGNS } from "../data/campaigns"

export type Crumb = { label: string; to?: string }

export const SPACE_LABELS: Record<string, string> = {
  "": "Início", notas: "Notas", agenda: "Agenda", wiki: "Wiki", campanhas: "Campanhas", livros: "Livros", vtt: "VTT",
  transferir: "Importar e exportar", config: "Configurações", quadro: "Quadro",
}
const SPACE_ROUTES: Record<string, string> = { "": "/", notas: "/notas", agenda: "/agenda", wiki: "/wiki", campanhas: "/campanhas", livros: "/livros", vtt: "/vtt", transferir: "/transferir", config: "/config" }

const WIKI_LABELS: Record<string, string> = { calendario: "Calendário", "linha-do-tempo": "Linha do tempo", mapa: "Mapas", categoria: "Categoria", relacoes: "Relações", grafico: "Gráfico", ferramentas: "Ferramentas" }
const CAMPAIGN_LABELS: Record<string, string> = { sessao: "Sessão", missoes: "Missões", canvas: "Quadro", sessoes: "Sessões", elenco: "Elenco", quadro: "Quadro", ferramentas: "Ferramentas", painel: "Painel" }
const VTT_LABELS: Record<string, string> = { criar: "Criar Sala", entrar: "Entrar Sala", jogador: "Vista do jogador" }

/** Segmento que ninguém nomeou: primeira letra maiúscula, sem hífens (nunca o caminho cru). */
function label(segment: string): string {
  const text = segment.includes("/") ? noteName(segment) : segment.replace(/-/g, " ")
  return text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1)
}
/** Nomes de notas, livros e quadros: o nome do arquivo, sem pasta nem extensão. */
const fileLabel = (segment: string) => (segment.includes("/") || /\.(md|canvas)$/i.test(segment) ? noteName(segment.split("/").pop()!.replace(/\.canvas$/i, "")) : segment)

/** Migalha da barra de cima: nomes que a pessoa reconhece, nunca caminhos de arquivo. */
export function crumbsFor(route: readonly string[]): Crumb[] {
  const [first = "", second, third, fourth] = route
  const crumbs: Crumb[] = [{ label: SPACE_LABELS[first] ?? label(first), to: SPACE_ROUTES[first] }]
  if (first === "notas" && second) crumbs.push({ label: second === "nova" ? "Nova nota" : second === "hoje" ? "Nota do dia" : second === "grafico" ? "Gráfico" : second === "aleatoria" ? "Nota aleatória" : fileLabel(second) })
  if (first === "wiki" && second) {
    // Artigos, mapas e calendários abertos levam o caminho da nota na rota.
    const path = third ?? ""
    if (second === "artigo") crumbs.push({ label: path ? fileLabel(path) : "Artigo" })
    else {
      crumbs.push({ label: WIKI_LABELS[second] ?? label(second), ...(path && second !== "categoria" ? { to: `/wiki/${second}` } : {}) })
      if (path) crumbs.push({ label: fileLabel(path) })
    }
  }
  if (first === "campanhas" && second) {
    crumbs.push({ label: CAMPAIGNS.find((c) => c.id === second)?.title ?? fileLabel(second), to: `/campanhas/${encodeURIComponent(second)}` })
    if (third) crumbs.push({ label: third === "sessao" ? `Sessão ${fourth?.replace("s", "") ?? ""}`.trim() : CAMPAIGN_LABELS[third] ?? label(third), ...(fourth && third !== "sessao" ? { to: `/campanhas/${encodeURIComponent(second)}/${third}` } : {}) })
    // Campanhas da etapa 7: o quarto segmento é o caminho da nota (sessão) ou do quadro.
    if (third && third !== "sessao" && fourth) crumbs.push({ label: fileLabel(fourth) })
  }
  if (first === "livros" && second) crumbs.push({ label: BOOKS.find((b) => b.id === second)?.title ?? fileLabel(second) })
  if (first === "vtt" && second) {
    if (second === "mesa") crumbs.push({ label: "Criar Sala", to: "/vtt/criar" }, { label: "Mesa" })
    else crumbs.push({ label: VTT_LABELS[second] ?? label(second) })
  }
  if (first === "config" && second) crumbs.push({ label: label(second) })
  return crumbs
}
