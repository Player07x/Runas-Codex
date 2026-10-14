import { useMemo, useState } from "react"
import { ChevronLeft, Map as MapIcon, Pencil, Plus } from "lucide-react"
import { findCodeBlocks, replaceCodeBlock, setBlockKeys } from "../../core/codeblocks"
import { noteName } from "../../core/text"
import { articleKind, isMapNote, listMaps, newArticleNote, parseMap, pinsToYaml, type MapPin, type MapSpec } from "../../core/wiki"
import { useNoteSet } from "../../lib/note-set"
import { href, navigate } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import { useMarkdownOptions } from "../../components/Markdown"
import { useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import { MapView, type PinTarget } from "./MapView"
import { articleRoute, useWiki } from "./wiki-state"
import { NewArticleDialog } from "./WikiHome"

/** Bloco ```runas-mapa``` dentro de uma nota: o mapa navegável (os pinos se editam na tela Mapas). */
export function MapBlock({ code }: { code: string }) {
  const set = useNoteSet()
  const { showSecrets } = useMarkdownOptions()
  const here = set.resolve?.("", "wiki")?.path
  let spec: MapSpec
  try {
    spec = parseMap(code)
  } catch (error) {
    return (
      <div className="callout aviso">
        <div className="callout-title">Mapa com erro</div>
        <div className="callout-body small">{error instanceof Error ? error.message : String(error)}</div>
      </div>
    )
  }
  const image = set.resolve?.(spec.image, "wiki")
  return (
    <div className="map-block">
      <MapView
        compact
        spec={spec}
        imageUrl={image ? set.fileUrl?.(image.path) : undefined}
        showSecrets={showSecrets}
        resolvePin={(note) => {
          const found = set.resolve?.(note, "wiki")
          return found ? { path: found.path, route: found.route } : undefined
        }}
        onOpen={(target) => navigate(target.route)}
      />
      {here && (
        <a className="btn sm map-block-open" href={href(`/wiki/mapa/${encodeURIComponent(here)}`)}>
          <Pencil size={13} /> Abrir no editor de mapas
        </a>
      )}
    </div>
  )
}

/** Tela Mapas: a lista dos mapas da wiki ou um mapa aberto, com pinos editáveis. */
export function WikiMap({ path }: { path?: string }) {
  const vault = useVault()
  const { wiki } = useWiki()
  const index = vault.index!
  const maps = useMemo(() => listMaps(index, wiki!.root), [index, wiki, vault.version])
  const [creating, setCreating] = useState(false)
  const readOnly = vault.info?.readOnly ?? true
  if (path) return <MapEditor key={path} path={path} />
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Wiki · {wiki!.name}</span>
          <h1 className="page-title">Mapas</h1>
        </div>
        {!readOnly && (
          <button className="btn primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Novo mapa
          </button>
        )}
      </div>
      {maps.length === 0 ? (
        <p className="muted">Nenhum mapa. Um mapa é uma nota com um bloco <code>```runas-mapa</code> que aponta para uma imagem do cofre; os pinos ligam lugares do mapa a artigos da wiki.</p>
      ) : (
        <div className="category-grid">
          {maps.map((note) => (
            <a key={note.path} className="card category-card" href={href(`/wiki/mapa/${encodeURIComponent(note.path)}`)} style={{ ["--cat" as string]: "var(--green)", textDecoration: "none", color: "var(--text)" }}>
              <span className="cat-icon">
                <MapIcon size={18} />
              </span>
              <strong>{note.name}</strong>
              <span className="tiny muted">{(() => {
                try {
                  return `${parseMap(findCodeBlocks(note.text, "runas-mapa")[0]!.content).pins.length} pino(s)`
                } catch {
                  return "com erro"
                }
              })()}</span>
            </a>
          ))}
        </div>
      )}
      {creating && <NewArticleDialog onClose={() => setCreating(false)} />}
    </div>
  )
}

function MapEditor({ path }: { path: string }) {
  const vault = useVault()
  const toast = useToast()
  const { wiki, players, calendar } = useWiki()
  const index = vault.index!
  const note = index.note(path)
  const readOnly = vault.info?.readOnly ?? true
  const block = note ? findCodeBlocks(note.text, "runas-mapa")[0] : undefined
  const parsed = useMemo(() => {
    if (!block) return null
    try {
      return { spec: parseMap(block.content) }
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) }
    }
  }, [block?.content])
  const resolve = (target: string) => {
    const dest = index.resolve({ kind: "wiki", embed: false, target, start: 0, end: 0, raw: "", inFrontmatter: false }, path).dest
    return dest
  }
  const notes = useMemo(() => index.notesIn(wiki!.root).map((n) => n.name), [index, wiki, vault.version])

  if (!note || !block || !parsed) return <div className="page"><p className="muted">Mapa não encontrado. <a href={href("/wiki/mapa")}>Ver os mapas</a></p></div>
  if ("error" in parsed) {
    return (
      <div className="page">
        <div className="callout aviso">
          <div className="callout-title">Mapa com erro</div>
          <div className="callout-body small">{parsed.error}</div>
        </div>
        <a className="btn sm" href={href(articleRoute(path))}>
          Corrigir na nota
        </a>
      </div>
    )
  }
  const spec = parsed.spec
  const image = resolve(spec.image)

  const savePins = async (pins: MapPin[]) => {
    const current = index.note(path)!
    const currentBlock = findCodeBlocks(current.text, "runas-mapa")[0]!
    await vault.save(path, replaceCodeBlock(current.text, currentBlock, setBlockKeys(currentBlock.content, { pinos: pinsToYaml(pins) })))
  }
  const fail = (error: unknown) => toast(error instanceof Error ? error.message : String(error))

  const addPin = async (pin: MapPin) => {
    let next = pin
    if (pin.note) {
      const dest = resolve(pin.note)
      if (dest) next = { ...pin, note: index.linkTarget(dest, path) }
      else {
        // Nota nova a partir do pino: um Local da wiki.
        const local = articleKind("local")!
        const created = await vault.createNote(`${wiki!.root}${local.folder}`, pin.note, newArticleNote(local, pin.note, calendar ? noteName(calendar.path) : undefined))
        next = { ...pin, note: index.linkTarget(created, path) }
        toast(`Nota criada: ${created}`)
      }
    }
    // Os pinos de agora (a nota pode ter mudado enquanto a nota nova era criada).
    const currentPins = parseMap(findCodeBlocks(index.note(path)!.text, "runas-mapa")[0]!.content).pins
    await savePins([...currentPins, next])
  }

  return (
    <div className="map-screen">
      <div className="map-head">
        <button className="icon-btn" onClick={() => history.back()} aria-label="Voltar">
          <ChevronLeft size={18} />
        </button>
        <strong className="grow truncate">{note.name}</strong>
        <a className="btn sm ghost" href={href(articleRoute(path))}>
          <Pencil size={14} /> Nota
        </a>
      </div>
      <MapView
        spec={spec}
        imageUrl={image ? (vault.platform.fileUrl(image) ?? undefined) : undefined}
        showSecrets={!players}
        notes={notes}
        resolvePin={(target): PinTarget | undefined => {
          const dest = resolve(target)
          return dest ? { path: dest, route: noteRoute(dest), ...(isMapNote(index, dest) ? { map: dest } : {}), tipo: index.note(dest)?.meta.frontmatter?.data?.tipo } : undefined
        }}
        onOpen={(target, kind) => navigate(kind === "mapa" && target.map ? `/wiki/mapa/${encodeURIComponent(target.map)}` : target.route)}
        {...(readOnly ? {} : { onChange: (pins: MapPin[]) => void savePins(pins).catch(fail), onNewPin: (pin: MapPin) => void addPin(pin).catch(fail) })}
      />
      {readOnly && <span className="tiny faint map-hint">Somente leitura: libere a gravação para pôr e mover pinos.</span>}
    </div>
  )
}
