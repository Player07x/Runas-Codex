import { resolve } from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"
import { contentSecurityPolicy } from "../app/csp"

// A interface é o próprio app web (`../app`), sem cópia: o mesmo código vai para o navegador, o Pages e,
// depois, o Capacitor. Aqui só entram o processo principal e o preload (docs/adr/0002-casca-desktop-electron.md).
export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()] },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: {
    root: resolve(__dirname, "../app"),
    plugins: [react(), contentSecurityPolicy()],
    build: {
      outDir: resolve(__dirname, "out/renderer"),
      rollupOptions: { input: { index: resolve(__dirname, "../app/index.html"), player: resolve(__dirname, "../app/player.html") } },
    },
  },
})
