import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "@fontsource/cinzel/500.css"
import "@fontsource/cinzel/700.css"
import "@fontsource-variable/eb-garamond"
import "@fontsource-variable/eb-garamond/wght-italic.css"
import "./styles/tokens.css"
import "./styles/base.css"
import "./styles/layout.css"
import "./styles/markdown.css"
import { App } from "./App"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
