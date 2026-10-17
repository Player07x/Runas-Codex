import { useCallback, useEffect, useState } from "react"
import { useRoute } from "./lib/router"
import { Shell } from "./components/Shell"
import { ToastProvider } from "./components/ui"
import { ReminderSync } from "./platform/ReminderSync"
import { VaultProvider } from "./platform/VaultProvider"
import { Home } from "./screens/Home"
import { NotesScreen } from "./screens/NotesScreen"
import { AgendaScreen } from "./screens/agenda/AgendaScreen"
import { WikiScreen } from "./screens/wiki/WikiScreen"
import { CampaignsScreen } from "./screens/campaigns/CampaignsScreen"
import { BooksScreen } from "./screens/books/BooksScreen"
import { VttScreen } from "./screens/vtt/VttScreen"
import { TransferScreen } from "./screens/TransferScreen"
import { SettingsScreen } from "./screens/SettingsScreen"
import { CanvasScreen } from "./components/canvas/CanvasScreen"
import { CustomizationRuntime } from "./components/vault/Customization"

function readTheme(): string {
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
    (first === "vtt" && (second === "mesa" || second === "jogador")) ||
    (first === "campanhas" && (route[2] === "quadro" || (route[2] === "sessoes" && Boolean(route[3])))) ||
    first === "quadro"
  )
}

export function App() {
  const route = useRoute()
  const [theme, setTheme] = useState(readTheme)

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
    case "quadro":
      screen = <CanvasScreen path={rest[0]} />
      break
    default:
      screen = <Home />
  }

  return (
    <VaultProvider>
      <ToastProvider>
        <ReminderSync />
        <Shell route={route} theme={theme} onToggleTheme={toggleTheme} fill={isFill(route)}>
          {screen}
        </Shell>
        <CustomizationRuntime />
        <ActiveRoom />
        <DesktopTrayRuntime />
      </ToastProvider>
    </VaultProvider>
  )
}

import { ActiveRoom } from "./vtt/ActiveRoom"
import { DesktopTrayRuntime } from "./platform/DesktopTray"
