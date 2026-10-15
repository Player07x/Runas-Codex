import { createContext, useContext } from "react"
import { FileAudio, FileText, FileVideo, ImageOff, Repeat } from "lucide-react"
import { parseEmbedOptions } from "../core/embeds"
import { extractSection, noteBody } from "../core/sections"
import { extname, noteName } from "../core/text"
import { resolveLink } from "../lib/links"
import { useNoteSet } from "../lib/note-set"
import { navigate } from "../lib/router"
import { wikiLabel } from "./remark-obsidian"
import { Markdown } from "../components/Markdown"
import { EmbedImage, ImageEditContext } from "./EmbedImage"

export const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".bmp"])
export const AUDIO_EXT = new Set([".mp3", ".wav", ".ogg", ".m4a", ".flac", ".opus", ".3gp"])
export const VIDEO_EXT = new Set([".mp4", ".webm", ".ogv", ".mov", ".mkv"])

/** Notas já abertas na cadeia de transclusões (para parar em laços e em profundidade demais, como o Obsidian). */
const EmbedChain = createContext<string[]>([])
const MAX_DEPTH = 4

/**
 * `|400` ou `|400x300` no fim do apelido é tamanho; antes dele, a posição (`direita|300`, ver `core/embeds.ts`) ou o
 * texto alternativo, como o Obsidian lê.
 */
export function embedSize(alias: string | undefined): { width?: number; height?: number; caption?: string } {
  const { width, height, caption } = parseEmbedOptions(alias)
  return { ...(width ? { width } : {}), ...(height ? { height } : {}), ...(caption ? { caption } : {}) }
}

/** `![[alvo#sub|apelido]]`: imagem, áudio, vídeo, PDF ou o texto de outra nota (transclusão). */
export function Embed({ target, alias, space }: { target: string; alias?: string; space?: Parameters<typeof resolveLink>[1] }) {
  const set = useNoteSet()
  const chain = useContext(EmbedChain)
  const hash = target.indexOf("#")
  const name = hash < 0 ? target : target.slice(0, hash)
  const subpath = hash < 0 ? "" : target.slice(hash)
  const ext = extname(name).toLowerCase()
  // Sem nome (`![[#Título]]`), o trecho é da própria nota.
  const found = set.resolve ? set.resolve(name, "wiki") : name ? demoResolve(name, space, set) : undefined
  const options = parseEmbedOptions(alias)
  const { width, height, caption } = options

  if (IMAGE_EXT.has(ext) || AUDIO_EXT.has(ext) || VIDEO_EXT.has(ext) || ext === ".pdf") {
    const url = found ? set.fileUrl?.(found.path) : undefined
    if (!found || !url) {
      const Icon = IMAGE_EXT.has(ext) ? ImageOff : AUDIO_EXT.has(ext) ? FileAudio : VIDEO_EXT.has(ext) ? FileVideo : FileText
      return (
        <span className={`embed-missing ${found ? "" : "broken"}`} title={found ? "Anexos aparecem no app desktop" : `“${name}” não está no cofre`}>
          <Icon size={14} /> {name}
        </span>
      )
    }
    if (IMAGE_EXT.has(ext)) return <EmbedImage src={url} alt={caption ?? noteName(name)} options={options} target={target} alias={alias} />
    if (AUDIO_EXT.has(ext)) return <audio className="embed-audio" src={url} controls preload="metadata" />
    if (VIDEO_EXT.has(ext)) return <video className="embed-video" src={url} controls preload="metadata" width={width} height={height} />
    const page = /page=(\d+)/.exec(subpath)?.[1]
    return (
      <button className="embed-file" onClick={() => set.openFile?.(found.path)} title="Abrir no leitor de PDF do sistema">
        <FileText size={16} /> <span className="grow truncate">{noteName(name)}</span>
        {page && <span className="chip">página {page}</span>}
      </button>
    )
  }

  const text = found ? (set.readNote?.(found.path) ?? set.notes.find((n) => n.path === found.path)?.markdown) : undefined
  if (!found || text === undefined) {
    return (
      <span className="embed-missing broken" title="A nota ainda não existe">
        <FileText size={14} /> {wikiLabel(name, subpath, undefined)}
      </span>
    )
  }
  if (chain.includes(found.path + subpath) || chain.length >= MAX_DEPTH) {
    return (
      <span className="embed-missing" title="Transclusão dentro dela mesma (ou funda demais)">
        <Repeat size={14} /> {wikiLabel(name, subpath, undefined)}
      </span>
    )
  }
  const section = extractSection(noteBody(text), subpath)
  return (
    <div className="embed-note" data-embed={found.path}>
      <div className="embed-head">
        <a
          href="#"
          className="wikilink"
          onClick={(event) => {
            event.preventDefault()
            if (found.route) navigate(found.route)
          }}
        >
          {wikiLabel(name || noteName(found.path), subpath, undefined)}
        </a>
      </div>
      <EmbedChain.Provider value={[...chain, found.path + subpath]}>
        {/* As imagens da nota transcluída são da outra nota: aqui não se editam. */}
        <ImageEditContext.Provider value={null}>
          {section === null ? <p className="muted small">Trecho “{subpath.slice(1)}” não encontrado na nota.</p> : section.trim() ? <Markdown source={section} space={space} /> : <p className="muted small">Vazio.</p>}
        </ImageEditContext.Provider>
      </EmbedChain.Provider>
    </div>
  )
}

/** Notas de exemplo (navegador sem cofre): resolve pela lista do protótipo. */
function demoResolve(name: string, space: Parameters<typeof resolveLink>[1], set: ReturnType<typeof useNoteSet>) {
  const note = resolveLink(name, space, set.notes)
  return note ? { path: note.path, route: set.routeOf(note), cross: false } : undefined
}
