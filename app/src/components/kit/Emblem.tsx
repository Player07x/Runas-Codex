import "../../styles/tones.css"
import { useState } from "react"
import {
  Anchor, BookOpen, Castle, Cog, Compass, Crown, Dices, Eye, Feather, Flag, Flame, Gem, Hourglass, KeyRound, Landmark, Languages, Layers, Leaf,
  Map, MapPin, Moon, Mountain, PawPrint, ScrollText, Shield, Ship, Skull, Sparkles, Star, Sun, Swords, TreePine, User, Users, Waves, Zap, type LucideIcon,
} from "lucide-react"
import { EMBLEMS, toneStyle, type Tone } from "../../core/tones"
import { articleCategory, categoryLook } from "../../core/personalization"
import { articleImage } from "../../core/wiki"
import { vaultNoteSet } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"

const BY_LUCIDE: Record<string, LucideIcon> = {
  swords: Swords, shield: Shield, crown: Crown, skull: Skull, flame: Flame, castle: Castle, landmark: Landmark, map: Map, compass: Compass,
  "map-pin": MapPin, "scroll-text": ScrollText, "book-open": BookOpen, gem: Gem, moon: Moon, sun: Sun, star: Star, sparkles: Sparkles,
  "tree-pine": TreePine, leaf: Leaf, mountain: Mountain, waves: Waves, ship: Ship, anchor: Anchor, feather: Feather, eye: Eye, "key-round": KeyRound,
  dices: Dices, user: User, users: Users, flag: Flag, "paw-print": PawPrint, zap: Zap, hourglass: Hourglass, languages: Languages, layers: Layers, cog: Cog,
}

/** O componente do ícone escolhido (`coroa` → Crown), ou nada. */
export function emblemIcon(id: string | null | undefined): LucideIcon | null {
  const lucide = EMBLEMS.find(([emblem]) => emblem === id)?.[2]
  return lucide ? BY_LUCIDE[lucide] ?? null : null
}

export const emblemLabel = (id: string | null | undefined) => EMBLEMS.find(([emblem]) => emblem === id)?.[1]

/** URL de uma imagem do cofre (capa, retrato), resolvida como um link a partir de `from`. No navegador de exemplo, nada. */
export function useVaultImage(target: string | null | undefined, from: string): string | undefined {
  const vault = useVault()
  if (!target || !vault.index || vault.platform.kind === "memory") return undefined
  const found = vaultNoteSet(vault.index, from, {}, vault.platform).resolve?.(target, "wiki")
  return found ? vault.platform.fileUrl(found.path) ?? undefined : undefined
}

/**
 * Brasão: a imagem, se houver; senão o ícone (ou a inicial) sobre o tom. Nunca um quadrado vazio, e a cor nunca é a
 * única pista (o nome sempre aparece ao lado, e o ícone também).
 */
export function Crest({ tone, emblem, image, from, name, size = 40, round = false }: { tone?: Tone | null; emblem?: string | null; image?: string | null; from?: string; name: string; size?: number; round?: boolean }) {
  const url = useVaultImage(image, from ?? "")
  const [failed, setFailed] = useState<string>()
  const Icon = emblemIcon(emblem)
  return (
    <span className={`crest${tone ? " toned" : ""}${round ? " round" : ""}`} style={{ width: size, height: size, fontSize: size * 0.42, ...toneStyle(tone) }} aria-hidden="true">
      {url && failed !== url ? <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFailed(url)} /> : Icon ? <Icon size={Math.round(size * 0.5)} /> : <span>{Array.from(name.trim())[0]?.toLocaleUpperCase("pt-BR") ?? "?"}</span>}
    </span>
  )
}

/** Faixa de capa: a imagem escolhida ou um degradê no tom. */
export function CoverBand({ tone, cover, from, height = 120, className = "" }: { tone?: Tone | null; cover?: string | null; from: string; height?: number; className?: string }) {
  const url = useVaultImage(cover, from)
  const [failed, setFailed] = useState<string>()
  return (
    <div className={`cover-band${tone ? " toned" : ""} ${className}`} style={{ height, ...toneStyle(tone) }} aria-hidden="true">
      {url && failed !== url && <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFailed(url)} />}
    </div>
  )
}

/**
 * Brasão de uma nota (personagem, NPC, facção, artigo): a imagem do artigo (`retrato`, `simbolo`… ou a primeira imagem
 * do texto); sem ela, o ícone e a cor da categoria da Wiki; sem categoria personalizada, a inicial.
 */
export function NoteCrest({ path, name, size = 32, round = true }: { path: string | null | undefined; name: string; size?: number; round?: boolean }) {
  const vault = useVault()
  const note = path && vault.index ? vault.index.note(path) : undefined
  const wikiRoot = path ? /^Wikis\/[^/]+\//.exec(path)?.[0] : undefined
  const category = path && wikiRoot && vault.index ? articleCategory(path, wikiRoot) : null
  const look = category && vault.index ? categoryLook(vault.index, category) : null
  return <Crest tone={look?.tone} emblem={look?.emblem} image={note ? articleImage(note) : null} from={path ?? ""} name={name} size={size} round={round} />
}
