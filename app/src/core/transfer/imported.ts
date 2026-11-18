import { bookRoute } from "../books"

/** Um atalho para o que acabou de entrar no cofre (U104). */
export interface ImportedPlace {
  label: string
  route: string
}

const encode = (path: string) => encodeURIComponent(path)

/**
 * Para onde levar depois de importar: cada wiki, campanha e livro que recebeu notas, as mesas do VTT e, para o resto,
 * a primeira nota (que abre na pasta dela em Notas). No máximo `limit` atalhos, na ordem em que aparecem.
 * `isBook` diz se uma nota é a nota de um livro (o índice sabe; aqui só os caminhos chegam).
 */
export function importedPlaces(paths: readonly string[], isBook: (path: string) => boolean = () => false, limit = 4): ImportedPlace[] {
  const places: ImportedPlace[] = []
  const seen = new Set<string>()
  const add = (key: string, place: ImportedPlace) => {
    if (seen.has(key) || places.length >= limit) return
    seen.add(key)
    places.push(place)
  }
  const notes = paths.filter((path) => /\.md$/i.test(path))
  for (const path of notes) {
    const wiki = /^Wikis\/([^/]+)\//.exec(path)?.[1]
    if (wiki) {
      // A nota principal da wiki, se veio; senão o primeiro artigo (a Wiki abre no mundo dele).
      const home = `Wikis/${wiki}/${wiki}.md`
      add(`wiki:${wiki}`, { label: `Wiki ${wiki}`, route: `/wiki/artigo/${encode(notes.includes(home) ? home : path)}` })
      continue
    }
    const campaign = /^Campanhas\/([^/]+)\//.exec(path)?.[1]
    if (campaign) { add(`campanha:${campaign}`, { label: `Campanha ${campaign}`, route: `/campanhas/${encode(campaign)}` }); continue }
    if (path.startsWith("Livros/") && isBook(path)) { add(`livro:${path}`, { label: `Livro ${path.slice(path.lastIndexOf("/") + 1, -3)}`, route: bookRoute(path) }); continue }
  }
  if (paths.some((path) => path.startsWith(".runas/mesas/") && !path.startsWith(".runas/mesas/biblioteca/"))) add("mesas", { label: "Mesas do VTT", route: "/vtt/criar" })
  const loose = notes.find((path) => !/^(Wikis|Campanhas)\//.test(path) && !(path.startsWith("Livros/") && isBook(path)))
  if (loose && !places.length) add("nota", { label: "Abrir em Notas", route: `/notas/${encode(loose)}` })
  else if (loose) add("nota", { label: "Outras notas", route: `/notas/${encode(loose)}` })
  return places
}
