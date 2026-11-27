// Gera os ícones do sistema a partir da logo em recorte (app/src/core/logo.ts): o favicon e o ícone de notificação do
// Android (texto) e os PNGs do desktop, da bandeja, do Android e da abertura do Android. Cada PNG do Android sai no
// tamanho do arquivo que já existe. O Electron desenha (o mesmo Chromium do app), então não há dependência nova.
//
//   cd desktop && npx electron scripts/gerar-icones.mjs        (no Linux sem tela: xvfb-run -a npx electron …)
//
// Depois de mudar a geometria em logo.ts, rode de novo: o teste de logo.ts confere o favicon e o ícone de notificação.
import { app, BrowserWindow } from "electron"
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { androidStatusIcon, faviconSvg, LOGO_BACKGROUND, LOGO_CYAN, logoSvg } from "../../app/src/core/logo.ts"

const root = new URL("../../", import.meta.url)
const res = new URL("mobile/android/app/src/main/res/", root)

/** Largura e altura de um PNG (cabeçalho IHDR). */
function pngSize(url) {
  const head = readFileSync(url).subarray(16, 24)
  return [head.readUInt32BE(0), head.readUInt32BE(4)]
}

const cyan = { color: LOGO_CYAN }
const targets = [
  // Ícone do app no desktop (instalador, janela, barra de tarefas): ladrilho escuro com uma margem, como os vizinhos.
  { file: new URL("desktop/build/icon.png", root), size: [512, 512], svg: logoSvg({ ...cyan, scale: 0.76, background: { color: LOGO_BACKGROUND, shape: "rounded", inset: 24 } }) },
  // Bandeja: a versão pequena (sem a rachadura), maior no ladrilho, porque aparece com 24 px.
  { file: new URL("desktop/build/tray.png", root), size: [64, 64], svg: logoSvg({ ...cyan, small: true, scale: 0.9, background: { color: LOGO_BACKGROUND, shape: "rounded" } }) },
]
for (const dir of readdirSync(res).filter((name) => name.startsWith("mipmap-") && !name.includes("anydpi"))) {
  // Android antes do 8 (ícone pronto) e ícone redondo; do 8 em diante, só o primeiro plano: o fundo é a cor
  // ic_launcher_background, e a pedra fica dentro do círculo que todo formato de ícone mostra (66 de 108 dp).
  targets.push(
    { file: new URL(`${dir}/ic_launcher.png`, res), svg: logoSvg({ ...cyan, scale: 0.74, background: { color: LOGO_BACKGROUND, shape: "rounded" } }) },
    { file: new URL(`${dir}/ic_launcher_round.png`, res), svg: logoSvg({ ...cyan, scale: 0.7, background: { color: LOGO_BACKGROUND, shape: "circle" } }) },
    { file: new URL(`${dir}/ic_launcher_foreground.png`, res), svg: logoSvg({ ...cyan, scale: 0.66 }) },
  )
}
for (const dir of readdirSync(res).filter((name) => name === "drawable" || /^drawable-(land|port)-/.test(name))) {
  // Abertura: a pedra no meio do fundo escuro, com cerca de um terço do lado menor da tela.
  targets.push({ file: new URL(`${dir}/splash.png`, res), svg: logoSvg({ ...cyan, scale: 0.41 }), fill: LOGO_BACKGROUND })
}

/** Desenha o SVG num quadrado do lado menor, no meio de uma tela `width`×`height` (com `fill` atrás, se houver). */
async function render(window, svg, width, height, fill) {
  const side = Math.min(width, height)
  const sized = svg.replace("<svg ", `<svg width="${side}" height="${side}" `)
  const src = `data:image/svg+xml;base64,${Buffer.from(sized).toString("base64")}`
  const base64 = await window.webContents.executeJavaScript(`(async () => {
    const image = new Image()
    image.src = ${JSON.stringify(src)}
    await image.decode()
    const canvas = document.createElement("canvas")
    canvas.width = ${width}
    canvas.height = ${height}
    const context = canvas.getContext("2d")
    ${fill ? `context.fillStyle = ${JSON.stringify(fill)}; context.fillRect(0, 0, ${width}, ${height})` : ""}
    context.drawImage(image, ${(width - side) / 2}, ${(height - side) / 2}, ${side}, ${side})
    return canvas.toDataURL("image/png").split(",")[1]
  })()`)
  return Buffer.from(base64, "base64")
}

async function main() {
  const window = new BrowserWindow({ show: false })
  await window.loadURL("data:text/html;charset=utf-8,<!doctype html><title>ícones</title>")
  writeFileSync(new URL("app/public/favicon.svg", root), faviconSvg())
  writeFileSync(new URL("drawable/ic_stat_runa.xml", res), androidStatusIcon())
  for (const target of targets) {
    const [width, height] = target.size ?? pngSize(target.file)
    writeFileSync(target.file, await render(window, target.svg, width, height, target.fill))
    console.log(`${width}×${height}  ${target.file.pathname.slice(root.pathname.length)}`)
  }
}

// Sem `await` no topo: o Electron só emite o `ready` depois de o módulo de entrada terminar de carregar.
app.whenReady().then(main).then(() => app.quit(), (error) => {
  console.error(error)
  app.exit(1)
})
