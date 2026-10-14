import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { contentSecurityPolicy } from "./csp"

// `base: "./"` deixa o build abrir de qualquer pasta (e depois dentro do Electron/Capacitor).
export default defineConfig({
  base: "./",
  plugins: [react(), contentSecurityPolicy()],
  // Duas páginas: o app e a sala dos jogadores (servida pelo computador do mestre). Caminhos relativos à pasta
  // `app/`, de onde os scripts do projeto rodam o build.
  build: { rollupOptions: { input: { main: "index.html", player: "player.html" } } },
  server: { port: 5180 },
  preview: { port: 5181 },
})
