import { BrowserWindow } from "electron"

/** Uma janela real, com o preload empacotado: confere a ponte e a recusa de edição concorrente. */
export async function checkNoteWindows(main: BrowserWindow): Promise<Record<string, boolean>> {
  const before = new Set(BrowserWindow.getAllWindows())
  await main.webContents.executeJavaScript(`window.runasCodex.openWindow('/notas/'+encodeURIComponent('Notas/C5c/Porto de teste.md'))`)
  const extra = BrowserWindow.getAllWindows().find(window => !before.has(window))
  if (!extra) return { opened: false }
  try {
    if (extra.webContents.isLoading()) await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("A janela de nota não carregou.")), 15000)
      extra.webContents.once("did-finish-load", () => { clearTimeout(timer); resolve() })
    })
    const bridge = await extra.webContents.executeJavaScript(`(async()=>{for(let n=0;n<100;n++){if(document.querySelector('.editor-status')?.getAttribute('title')==='Notas/C5c/Porto de teste.md')return (await window.runasCodex.vault.current()).readOnly===false;await new Promise(r=>setTimeout(r,100))}return false})()`)
    const path = "Notas/C5c/Concorrente.md"
    const entry = await main.webContents.executeJavaScript(`window.runasCodex.vault.write(${JSON.stringify(path)},'# Inicial',null)`)
    const write = (text: string) => `window.runasCodex.vault.write(${JSON.stringify(path)},${JSON.stringify(text)},${JSON.stringify(entry)})`
    const results = await Promise.allSettled([main.webContents.executeJavaScript(write("# Janela principal")), extra.webContents.executeJavaScript(write("# Outra janela"))])
    return { opened: true, bridge: bridge === true, conflict: results.filter(r => r.status === "fulfilled").length === 1 && results.some(r => r.status === "rejected" && String(r.reason).includes("mudou fora do app")) }
  } finally { extra.destroy() }
}
