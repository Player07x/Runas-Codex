import { flushOpenNotes } from "../../lib/vault-notes"
import { useToast } from "../../components/ui"
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Activity, BookOpen, CalendarDays, Castle, Cog, FileText, Flag, Flame, Folder, Gem, Hourglass, Landmark, Languages, Layers, Map, MapPin, PawPrint, ScrollText, Shield, Ship, Sparkles, Sun, Swords, User, Users,
  type LucideIcon,
} from "lucide-react"
import { articleKind, listCalendars, listWikis, mainCalendar, setCustomKinds, type CalendarRef, type WikiInfo } from "../../core/wiki"
import { customKindsIn } from "../../core/wiki-category"
import { publicWikiIndex } from "../../core/wiki-public"
import { VaultView, useVault } from "../../platform/VaultProvider"

const ICONS: Record<string, LucideIcon> = {
  user: User, "map-pin": MapPin, castle: Castle, landmark: Landmark, shield: Shield, flag: Flag, gem: Gem, layers: Layers, "paw-print": PawPrint, users: Users, sun: Sun, languages: Languages,
  sparkles: Sparkles, cog: Cog, ship: Ship, "book-open": BookOpen, flame: Flame, swords: Swords, "scroll-text": ScrollText, activity: Activity, hourglass: Hourglass, "calendar-days": CalendarDays, map: Map, folder: Folder,
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
  const toast = useToast()
  const index = vault.index
  const wikis = useMemo(() => (index ? listWikis(index) : []), [index, vault.version])
  // Categorias criadas pelo usuário: registradas antes de desenhar a Wiki, para `articleKind` reconhecer o tipo delas.
  useMemo(() => setCustomKinds(index ? customKindsIn(index) : []), [index, vault.version])
  const [chosen, setChosen] = useState(() => stored(CURRENT_KEY))
  const [players, setPlayersState] = useState(() => stored(PLAYERS_KEY) === "1")
  const fromArticle = articlePath ? wikis.find((w) => (articlePath === w.root.slice(0,-1) || articlePath.startsWith(w.root))) : undefined
  const wiki = fromArticle ?? wikis.find((w) => w.name === chosen) ?? wikis[0] ?? null
  useEffect(() => {
    if (fromArticle && fromArticle.name !== chosen) setChosen(fromArticle.name)
  }, [fromArticle, chosen])
  const calendars = useMemo(() => (index && wiki ? listCalendars(index, wiki.root).filter((c): c is CalendarRef => "calendar" in c && (!players || index.note(c.path)?.meta.frontmatter?.data?.segredo !== true)) : []), [index, wiki, players, vault.version])
  const calendar = useMemo(() => {
    if (!index || !wiki) return null
    const found = mainCalendar(index, wiki.root, wiki.home)
    return found && calendars.some((c) => c.path === found.path) ? found : (calendars[0] ?? null)
  }, [index, wiki, calendars, players])
  const publicIndex=useMemo(()=>players&&index?publicWikiIndex(index):null,[players,index,vault.version])
  const deny=()=>Promise.reject(new Error("Mude para a visão do mestre para editar o cofre."))
  const value: WikiState = {
    wikis,
    wiki,
    setWiki: (name) => {
      setChosen(name)
      store(CURRENT_KEY, name)
    },
    players,
    setPlayers: (v) => {
      void (async()=>{await flushOpenNotes();setPlayersState(v);store(PLAYERS_KEY,v?"1":"0")})().catch(error=>toast(String(error)))
    },
    calendar,
    calendars,
  }
  return <WikiContext.Provider value={value}>{players&&publicIndex?<VaultView value={{...vault,index:publicIndex,info:vault.info?{...vault.info,readOnly:true}:null,save:deny,createNote:deny,createFolder:deny,rename:deny,trash:deny,setProperty:deny,createFile:deny,restoreTrash:deny,addAttachment:deny,setWritable:deny}}>{children}</VaultView>:children}</WikiContext.Provider>
}

export function useWiki(): WikiState {
  const state = useContext(WikiContext)
  if (!state) throw new Error("useWiki fora do WikiProvider")
  return state
}
