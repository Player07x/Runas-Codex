import "../../styles/tones.css"
import { useState } from "react"
import {
  Activity, Anchor, BookOpen, CalendarDays, Castle, Cog, Compass, Crown, Dices, Eye, Feather, Flag, Flame, Gem, Hourglass, KeyRound, Landmark, Languages, Layers, Leaf,
  Map, MapPin, Moon, Mountain, PawPrint, ScrollText, Shield, Ship, Skull, Sparkles, Star, Sun, Swords, TreePine, User, Users, Waves, Zap, type LucideIcon,
} from "lucide-react"
import { EMBLEMS, parseEmblem, toneStyle, type Tone } from "../../core/tones"
import { articleCategory, categoryLook } from "../../core/personalization"
import { articleImage, articleKind } from "../../core/wiki"
import { thumbWidth } from "../../core/thumbnails"
import { vaultNoteSet } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"

const BY_LUCIDE: Record<string, LucideIcon> = {
  swords: Swords, shield: Shield, crown: Crown, skull: Skull, flame: Flame, castle: Castle, landmark: Landmark, map: Map, compass: Compass,
  "map-pin": MapPin, "scroll-text": ScrollText, "book-open": BookOpen, gem: Gem, moon: Moon, sun: Sun, star: Star, sparkles: Sparkles,
  "tree-pine": TreePine, leaf: Leaf, mountain: Mountain, waves: Waves, ship: Ship, anchor: Anchor, feather: Feather, eye: Eye, "key-round": KeyRound,
  dices: Dices, user: User, users: Users, flag: Flag, "paw-print": PawPrint, zap: Zap, hourglass: Hourglass, languages: Languages, layers: Layers, cog: Cog,
  activity: Activity, "calendar-days": CalendarDays,
}

/** O componente do ícone escolhido (`coroa` → Crown), ou nada. */
export function emblemIcon(id: string | null | undefined): LucideIcon | null {
  const lucide = EMBLEMS.find(([emblem]) => emblem === id)?.[2]
  return lucide ? BY_LUCIDE[lucide] ?? null : null
}

export const emblemLabel = (id: string | null | undefined) => EMBLEMS.find(([emblem]) => emblem === id)?.[1]

/**
 * URL de uma imagem do cofre (capa, retrato), resolvida como um link a partir de `from`. No navegador de exemplo, nada.
 * Com `cssWidth`, pede a miniatura que cobre essa largura na densidade da tela (U86), quando a plataforma tem.
 */
export function useVaultImage(target: string | null | undefined, from: string, cssWidth?: number): string | undefined {
  const vault = useVault()
  if (!target || !vault.index || vault.platform.kind === "memory") return undefined
  const found = vaultNoteSet(vault.index, from, {}, vault.platform).resolve?.(target, "wiki")
  if (!found) return undefined
  const width = cssWidth ? thumbWidth(cssWidth, typeof window === "undefined" ? 1 : window.devicePixelRatio) : null
  return (width && vault.platform.thumbnailUrl?.(found.path, width)) || (vault.platform.fileUrl(found.path) ?? undefined)
}

/**
 * Brasão: a imagem, se houver; senão o ícone (ou a inicial) sobre o tom. Nunca um quadrado vazio, e a cor nunca é a
 * única pista (o nome sempre aparece ao lado, e o ícone também).
 */
export function Crest({ tone, emblem, image, from, name, size = 40, round = false }: { tone?: Tone | null; emblem?: string | null; image?: string | null; from?: string; name: string; size?: number; round?: boolean }) {
  const url = useVaultImage(image, from ?? "", size)
  const [failed, setFailed] = useState<string>()
  const Icon = emblemIcon(emblem)
  return (
    <span className={`crest${tone ? " toned" : ""}${round ? " round" : ""}`} style={{ width: size, height: size, fontSize: size * 0.42, ...toneStyle(tone) }} aria-hidden="true">
      {url && failed !== url ? <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFailed(url)} /> : Icon ? <Icon size={Math.round(size * 0.5)} /> : <span>{Array.from(name.trim())[0]?.toLocaleUpperCase("pt-BR") ?? "?"}</span>}
    </span>
  )
}

/**
 * Faixa de capa: a imagem escolhida ou um degradê no tom. Com `art` (o ícone da categoria), a faixa sem imagem vira a
 * capa padrão: o ícone grande e uma trama dele sobre o degradê, desenhados pelo app (nada vem da rede nem vai ao cofre).
 */
export function CoverBand({ tone, cover, from, height = 120, className = "", art }: { tone?: Tone | null; cover?: string | null; from: string; height?: number; className?: string; art?: LucideIcon | null }) {
  // As faixas baixas são as dos cartões (até ~400 px de largura): miniatura. As altas ficam no topo da página, com a
  // largura toda: imagem inteira.
  const url = useVaultImage(cover, from, height <= 96 ? 400 : undefined)
  const [failed, setFailed] = useState<string>()
  const image = url && failed !== url
  const Art = art
  return (
    <div className={`cover-band${tone ? " toned" : ""}${!image && Art ? " cover-art" : ""} ${className}`} style={{ height, ...toneStyle(tone) }} aria-hidden="true">
      {image && <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFailed(url)} />}
      {!image && Art && <>
        <span className="cover-art-trama">{[0, 1, 2, 3, 4, 5].map((i) => <Art key={i} className={`cover-art-dot d${i}`} />)}</span>
        <span className="cover-art-ring outer" /><span className="cover-art-ring" />
        <Art className="cover-art-main" strokeWidth={1.25} />
      </>}
    </div>
  )
}

/**
 * Brasão de uma nota (personagem, NPC, facção, artigo): a imagem do artigo (`retrato`, `simbolo`… ou a primeira imagem
 * do texto); sem ela, o ícone e a cor da categoria da Wiki (as prontas têm um padrão), o ícone do tipo do artigo e,
 * por último, a inicial.
 */
export function NoteCrest({ path, name, size = 32, round = true }: { path: string | null | undefined; name: string; size?: number; round?: boolean }) {
  const vault = useVault()
  const note = path && vault.index ? vault.index.note(path) : undefined
  const wikiRoot = path ? /^Wikis\/[^/]+\//.exec(path)?.[0] : undefined
  const category = path && wikiRoot && vault.index ? articleCategory(path, wikiRoot) : null
  const look = category && vault.index ? categoryLook(vault.index, category) : null
  // Sem ícone de categoria, o do tipo do artigo (personagem → pessoa); a inicial só quando não há nenhum (24/11).
  const emblem = look?.emblem ?? parseEmblem(articleKind(note?.meta.frontmatter?.data?.tipo)?.icon)
  return <Crest tone={look?.tone} emblem={emblem} image={note ? articleImage(note) : null} from={path ?? ""} name={name} size={size} round={round} />
}
