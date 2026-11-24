import { useMemo } from "react"
import { Markdown } from "../components/Markdown"
import { NoteSetContext, type NoteSet } from "../lib/note-set"
import "../styles/markdown.css"

/**
 * O artigo que o mestre apresentou, na página do jogador (anexo 6, 24/11): o mesmo leitor do app, sem links para o
 * cofre (o texto público já trocou os links por nomes). As imagens embutidas vêm da mesa, pelo asset que a sala libera
 * enquanto o artigo estiver aberto; o resto do cofre não existe aqui.
 */
export function HandoutArticle({ title, text, images, assetUrl }: { title: string; text: string; images?: Record<string, string>; assetUrl(asset: string): string }) {
  const set = useMemo<NoteSet>(() => ({
    notes: [],
    routeOf: () => "",
    resolve: (target) => (images?.[target] ? { path: target, route: "", cross: false } : undefined),
    fileUrl: (path) => (images?.[path] ? assetUrl(images[path]!) : undefined),
  }), [images, assetUrl])
  // O título já está no cabeçalho do quadro: o `# Título` do começo do texto não se repete.
  const body = useMemo(() => {
    const first = /^#\s+(.+)\n?/.exec(text)
    return first && first[1]!.trim().toLocaleLowerCase("pt-BR") === title.trim().toLocaleLowerCase("pt-BR") ? text.slice(first[0].length) : text
  }, [text, title])
  return <NoteSetContext.Provider value={set}><Markdown source={body} className="player-handout-body" /></NoteSetContext.Provider>
}
