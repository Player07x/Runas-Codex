import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { contentSecurityPolicy } from "./csp"

// `base: "./"` deixa o build abrir de qualquer pasta (e depois dentro do Electron/Capacitor).
export default defineConfig({
  base: "./",
  plugins: [react(), contentSecurityPolicy()],
  server: { port: 5180 },
  preview: { port: 5181 },
})
