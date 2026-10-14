import { useCallback, useEffect, useState } from "react"
import { useRoute } from "./lib/router"
import { Shell } from "./components/Shell"
import { ToastProvider } from "./components/ui"
import { Home } from "./screens/Home"
import { NotesScreen } from "./screens/NotesScreen"
import { AgendaScreen } from "./screens/AgendaScreen"
import { WikiScreen } from "./screens/wiki/WikiScreen"
import { CampaignsScreen } from "./screens/campaigns/CampaignsScreen"
import { BooksScreen } from "./screens/books/BooksScreen"
import { VttScreen } from "./screens/vtt/VttScreen"
import { TransferScreen } from "./screens/TransferScreen"
import { SettingsScreen } from "./screens/SettingsScreen"
import { PrototypeBar, readDesign, type Design } from "./prototypes/PrototypeBar"
import { PrototypeHome } from "./prototypes/PrototypeHome"
import "./prototypes/prototypes.css"

function readTheme(): string {
  const design = readDesign()
  if (design !== "original") return design === "atlas" ? "light" : "dark"
  try {
    return localStorage.getItem("runas-codex:tema") ?? "dark"
  } catch {
    return "dark"
  }
}

/** Telas que ocupam a altura toda (painéis com rolagem própria). */
function isFill(route: string[]): boolean {
  const [first, second] = route
  return (
    first === "notas" ||
    (first === "wiki" && (second === "artigo" || second === "mapa" || second === "grafico")) ||
    (first === "livros" && Boolean(second)) ||
    (first === "vtt" && (second === "mesa" || second === "jogador"))
  )
}

export function App() {
  const route = useRoute()
  const [theme, setTheme] = useState(readTheme)
  const [design, setDesign] = useState<Design>(readDesign)

  useEffect(() => {
    document.documentElement.dataset.design = design
  }, [design])

  const changeDesign = (next: Design) => {
    setDesign(next)
    if (next !== "original") setTheme(next === "atlas" ? "light" : "dark")
    const url = new URL(window.location.href)
    url.searchParams.set("design", next)
    window.history.replaceState(null, "", url)
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem("runas-codex:tema", theme)
    } catch {
      /* armazenamento indisponível: o tema só não é lembrado */
    }
  }, [theme])

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), [])
  const [first, ...rest] = route

  let screen
  switch (first) {
    case undefined:
      screen = design === "original" ? <Home /> : <PrototypeHome design={design} />
      break
    case "notas":
      screen = <NotesScreen noteId={rest[0]} />
      break
    case "agenda":
      screen = <AgendaScreen />
      break
    case "wiki":
      screen = <WikiScreen route={rest} />
      break
    case "campanhas":
      screen = <CampaignsScreen route={rest} />
      break
    case "livros":
      screen = <BooksScreen bookId={rest[0]} />
      break
    case "vtt":
      screen = <VttScreen route={rest} />
      break
    case "transferir":
      screen = <TransferScreen />
      break
    case "config":
      screen = <SettingsScreen theme={theme} onTheme={setTheme} />
      break
    default:
      screen = design === "original" ? <Home /> : <PrototypeHome design={design} />
  }

  return (
    <ToastProvider>
      <PrototypeBar design={design} onChange={changeDesign} />
      <Shell route={route} theme={theme} onToggleTheme={toggleTheme} fill={isFill(route)}>
        {screen}
      </Shell>
    </ToastProvider>
  )
}
