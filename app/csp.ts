import type { Plugin } from "vite"

/**
 * Política de conteúdo do app: nada sai da origem do próprio app (nenhuma chamada de rede, docs/02 seção 6) e HTML
 * vindo de notas importadas não consegue rodar script. `style-src 'unsafe-inline'` fica porque o dialeto Markdown usa
 * `<span style="…">`.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  // `vtt-asset:` = mapas, tokens e áudio da mesa aberta (desktop); `vault-file:` = anexos das notas (desktop);
  // `blob:` = arquivos importados na prévia do navegador.
  "img-src 'self' data: blob: vtt-asset: vault-file:",
  "media-src 'self' blob: vtt-asset: vault-file:",
  // `data:`: o Vite embute as fontes pequenas do KaTeX no CSS.
  "font-src 'self' data:",
  "connect-src 'self' blob: vtt-asset:",
  // O PixiJS decodifica imagens num worker criado a partir de `blob:`.
  "worker-src 'self' blob:",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ")

/** A página da sala dos jogadores conversa com o servidor do mestre por WebSocket (e só com ele). */
export const PLAYER_CONTENT_SECURITY_POLICY = CONTENT_SECURITY_POLICY.replace("connect-src 'self' blob: vtt-asset:", "connect-src 'self' ws: wss:")

/** Grava a política no HTML dos builds (o servidor de desenvolvimento do Vite precisa de script inline). */
export function contentSecurityPolicy(): Plugin {
  return {
    name: "runas-codex:csp",
    apply: "build",
    transformIndexHtml: (html, context) => {
      const policy = context.path.endsWith("player.html") ? PLAYER_CONTENT_SECURITY_POLICY : CONTENT_SECURITY_POLICY
      return html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
    },
  }
}
