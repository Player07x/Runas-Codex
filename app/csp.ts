import type { Plugin } from "vite"

/**
 * Política de conteúdo do app: nada sai da origem do próprio app (nenhuma chamada de rede, docs/02 seção 6) e HTML
 * vindo de notas importadas não consegue rodar script. `style-src 'unsafe-inline'` fica porque o dialeto Markdown usa
 * `<span style="…">`. A conexão com a sala do VTT entra aqui na etapa 4.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ")

/** Grava a política no `index.html` dos builds (o servidor de desenvolvimento do Vite precisa de script inline). */
export function contentSecurityPolicy(): Plugin {
  return {
    name: "runas-codex:csp",
    apply: "build",
    transformIndexHtml: (html) =>
      html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`),
  }
}
