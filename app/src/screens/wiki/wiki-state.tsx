import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Activity, BookOpen, CalendarDays, Castle, Cog, FileText, Flag, Flame, Gem, Hourglass, Landmark, Languages, Layers, Map, MapPin, PawPrint, ScrollText, Shield, Ship, Sparkles, Sun, Swords, User, Users,
  type LucideIcon,
} from "lucide-react"
import { articleKind, calendarFor, listCalendars, listWikis, type CalendarRef, type WikiInfo } from "../../core/wiki"
import { useVault } from "../../platform/VaultProvider"

const ICONS: Record<string, LucideIcon> = {
  user: User, "map-pin": MapPin, castle: Castle, landmark: Landmark, shield: Shield, flag: Flag, gem: Gem, layers: Layers, "paw-print": PawPrint, users: Users, sun: Sun, languages: Languages,
  sparkles: Sparkles, cog: Cog, ship: Ship, "book-open": BookOpen, flame: Flame, swords: Swords, "scroll-text": ScrollText, activity: Activity, hourglass: Hourglass, "calendar-days": CalendarDays, map: Map,
}

/** Ícone do tipo de artigo (pela propriedade `tipo`). */
export function KindIcon({ tipo, size = 16 }: { tipo: unknown; size?: number }) {
  const Icon = ICONS[articleKind(tipo)?.icon ?? ""] ?? FileText
  return <Icon size={size} />
}

export function iconByName(name: string): LucideIcon {
  return ICONS[name] ?? FileText
}

/** Rota de um artigo da wiki. */
export const articleRoute = (path: string) => `/wiki/artigo/${encodeURIComponent(path)}`

/** Busca pedida de outra tela (clique numa tag dentro de um artigo); a página inicial da wiki lê uma vez. */
let pendingSearch = ""
export function askWikiSearch(query: string) {
  pendingSearch = query
}
export function takeWikiSearch(): string {
  const query = pendingSearch
  pendingSearch = ""
  return query
}

const CURRENT_KEY = "runas-codex:wiki-atual"
const PLAYERS_KEY = "runas-codex:wiki-jogadores"

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* só não é lembrado */
  }
}

interface WikiState {
  wikis: WikiInfo[]
  /** A wiki aberta (a escolhida, a do artigo aberto ou a primeira). */
  wiki: WikiInfo | null
  setWiki(name: string): void
  /** Versão dos jogadores: segredos do mestre somem (artigos, mapas, linha do tempo). */
  players: boolean
  setPlayers(value: boolean): void
  /** O calendário principal da wiki (o primeiro bloco runas-calendario), se houver. */
  calendar: CalendarRef | null
  calendars: CalendarRef[]
}

const WikiContext = createContext<WikiState | null>(null)

export function WikiProvider({ children, articlePath }: { children: ReactNode; articlePath?: string }) {
  const vault = useVault()
  const index = vault.index
  const wikis = useMemo(() => (index ? listWikis(index) : []), [index, vault.version])
  const [chosen, setChosen] = useState(() => stored(CURRENT_KEY))
  const [players, setPlayersState] = useState(() => stored(PLAYERS_KEY) === "1")
  const fromArticle = articlePath ? wikis.find((w) => articlePath.startsWith(w.root)) : undefined
  const wiki = fromArticle ?? wikis.find((w) => w.name === chosen) ?? wikis[0] ?? null
  useEffect(() => {
    if (fromArticle && fromArticle.name !== chosen) setChosen(fromArticle.name)
  }, [fromArticle, chosen])
  const calendars = useMemo(() => (index && wiki ? listCalendars(index, wiki.root).filter((c): c is CalendarRef => "calendar" in c) : []), [index, wiki, vault.version])
  const calendar = useMemo(() => {
    if (!index || !wiki) return null
    const fromHome = wiki.home ? calendarFor(index, wiki.home) : null
    return fromHome && "calendar" in fromHome ? fromHome : (calendars[0] ?? null)
  }, [index, wiki, calendars])
  const value: WikiState = {
    wikis,
    wiki,
    setWiki: (name) => {
      setChosen(name)
      store(CURRENT_KEY, name)
    },
    players,
    setPlayers: (v) => {
      setPlayersState(v)
      store(PLAYERS_KEY, v ? "1" : "0")
    },
    calendar,
    calendars,
  }
  return <WikiContext.Provider value={value}>{children}</WikiContext.Provider>
}

export function useWiki(): WikiState {
  const state = useContext(WikiContext)
  if (!state) throw new Error("useWiki fora do WikiProvider")
  return state
}
