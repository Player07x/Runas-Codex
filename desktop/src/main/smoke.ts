/**
 * Roteiro do `--smoke`, executado dentro da janela: confere a ponte, as recusas de segurança, o leitor de Notas e,
 * se o cofre for gravável (cópia temporária com `--write`), as gravações e o renomear com atualização de links.
 */
export const SMOKE_SCRIPT = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const until = async (test, tries = 60) => { for (let i = 0; i < tries; i++) { const v = test(); if (v) return v; await wait(100) } return null }
  const errorOf = async (promise) => { try { await promise; return "OK" } catch (e) { return e.message } }
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set
  const bridge = window.runasCodex
  const result = { bridge: Boolean(bridge), title: document.title }
  if (!bridge) return result
  result.vault = await bridge.vault.current()
  if (!result.vault) return result
  const entries = await bridge.vault.list()
  result.files = entries.length
  result.markdown = entries.filter((e) => e.path.endsWith(".md")).length
  result.escape = await errorOf(bridge.vault.read(["../fora.md"]))
  result.escapeAbs = await errorOf(bridge.vault.read(["/etc/passwd"]))

  location.hash = "/notas"
  await until(() => document.querySelector("[data-vault-tree]"))
  document.querySelector("[aria-label='Mostrar o cofre inteiro']")?.click()
  await wait(300)
  result.listed = [...document.querySelectorAll("[data-vault-tree] [data-note-path]")].map((el) => el.getAttribute("data-note-path"))
  const aldren = entries.find((e) => e.path.endsWith("Aldren.md"))
  if (aldren) {
    location.hash = "/notas/" + encodeURIComponent(aldren.path)
    ;(await until(() => [...document.querySelectorAll(".editor-bar [role=tab]")].find((tab) => tab.textContent.includes("Leitura"))))?.click()
    await until(() => document.querySelector(".editor-body .md .wikilink"))
    await wait(300)
    result.backlinks = [...document.querySelectorAll("[data-backlink]")].map((el) => el.getAttribute("data-backlink"))
    result.wikilinks = [...document.querySelectorAll(".editor-body .wikilink")].map((el) => (el.classList.contains("broken") ? "✗ " : "✓ ") + el.textContent)
  }

  if (result.vault.readOnly) {
    result.write = await errorOf(bridge.vault.write("Notas/Smoke.md", "x", null))
    return result
  }
  // Gravações (só numa cópia temporária do cofre).
  const created = await bridge.vault.write("Notas/Smoke.md", "# Smoke\\n", null)
  result.create = created.size === 8 ? "OK" : "tamanho " + created.size
  result.createAgain = await errorOf(bridge.vault.write("Notas/Smoke.md", "x", null))
  result.staleWrite = await errorOf(bridge.vault.write("Notas/Smoke.md", "y", { mtime: 1, size: 1 }))
  result.hiddenWrite = await errorOf(bridge.vault.write(".obsidian/app.json", "{}"))
  result.update = await errorOf(bridge.vault.write("Notas/Smoke.md", "# Smoke 2\\n", created))
  result.trash = await errorOf(bridge.vault.trash("Notas/Smoke.md"))
  result.trashed = !(await bridge.vault.list()).some((e) => e.path === "Notas/Smoke.md")
  result.backup = (await bridge.vault.backup()).files

  // Renomear pela interface: os links das outras notas precisam acompanhar.
  if (aldren) {
    location.hash = "/notas/" + encodeURIComponent(aldren.path)
    const button = await until(() => document.querySelector("[aria-label='Renomear nota']"))
    button.click()
    const input = await until(() => document.querySelector("[aria-label='Novo nome']"))
    setter.call(input, "Aldren Vael")
    input.dispatchEvent(new Event("input", { bubbles: true }))
    document.querySelector("[aria-label='Confirmar renomear']").click()
    await until(() => location.hash.includes("Aldren%20Vael"))
    await wait(500)
    const texts = await bridge.vault.read((await bridge.vault.list()).filter((e) => e.path.endsWith(".md")).map((e) => e.path))
    result.renamed = Object.keys(texts).some((p) => p.endsWith("Aldren Vael.md"))
    result.linksAfterRename = Object.values(texts).join("\\n").match(/\\[\\[Aldren[^\\]]*\\]\\]/g) ?? []
  }

  // Mesa (VTT): criar uma mesa e uma cena pela interface; os arquivos vão para .runas/mesas.
  location.hash = "/vtt/criar"
  ;(await until(() => document.querySelector(".empty .btn.primary, .mesa-card.new")))?.click()
  const mesaName = await until(() => document.querySelector("[aria-label='Nome da mesa']"))
  if (mesaName) {
    setter.call(mesaName, "Mesa do Smoke")
    mesaName.dispatchEvent(new Event("input", { bubbles: true }))
    document.querySelector("[aria-label='Confirmar criar mesa']").click()
    await until(() => location.hash.startsWith("#/vtt/mesa/"))
    ;(await until(() => [...document.querySelectorAll(".vtt-root button")].find((b) => b.textContent.trim() === "Nova cena")))?.click()
    await until(() => document.querySelector(".vtt-root canvas"))
    await wait(1600)
    result.mesaCanvas = Boolean(document.querySelector(".vtt-root canvas"))
    result.mesas = (await bridge.vtt.listWorlds()).map((m) => m.title + ":" + m.scenes)
    // Sala: o processo principal confere a página e o WebSocket como um jogador (checkRoom).
    const room = await bridge.vtt.player.start(30000 + Math.floor(Math.random() * 2000), 2)
    result.room = { port: room.port, key: room.key, codes: room.seats.map((seat) => seat.code) }
  }
  return result
})()`

/**
 * Confere a sala aberta pelo roteiro como um jogador faria, de fora da janela: a página com a chave, nada sem a
 * chave, o WebSocket entregando a cena e o ingresso num assento com o código.
 */
export async function checkRoom(room: { port: number; key: string; codes: string[] }): Promise<Record<string, unknown>> {
  const base = `http://127.0.0.1:${room.port}`
  const page = await fetch(`${base}/?k=${room.key}`)
  const html = await page.text()
  const withoutKey = (await fetch(`${base}/`)).status
  const scene = await new Promise<string | null>((resolve) => {
    const socket = new WebSocket(`ws://127.0.0.1:${room.port}/socket?k=${room.key}`)
    const timer = setTimeout(() => (socket.close(), resolve(null)), 5000)
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as { type: string; projection?: { scene: { data: { name: string } } | null } }
      if (message.type !== "snapshot") return
      clearTimeout(timer)
      socket.close()
      resolve(message.projection?.scene?.data.name ?? "(sem cena)")
    }
    socket.onerror = () => (clearTimeout(timer), resolve(null))
  })
  const join = await fetch(`${base}/seat/join?k=${room.key}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: room.codes[0] }) })
  return { page: page.status, csp: html.includes("connect-src 'self' ws: wss:"), withoutKey, scene, join: join.status }
}

/** O resultado do roteiro passou? */
export function smokePassed(result: Record<string, unknown>, hasVault: boolean): boolean {
  if (result.bridge !== true) return false
  if (!hasVault) return true
  const listed = Array.isArray(result.listed) ? result.listed.length : -1
  const vault = result.vault as { readOnly?: boolean } | undefined
  const readOk =
    typeof result.markdown === "number" &&
    result.markdown > 0 &&
    listed === result.markdown &&
    Array.isArray(result.backlinks) &&
    result.backlinks.length > 0 &&
    String(result.escape).startsWith("Caminho fora do cofre") &&
    String(result.escapeAbs).startsWith("Caminho fora do cofre")
  if (!readOk) return false
  if (vault?.readOnly) return String(result.write).startsWith("Cofre em somente leitura")
  const links = Array.isArray(result.linksAfterRename) ? (result.linksAfterRename as string[]) : []
  return (
    result.create === "OK" &&
    String(result.createAgain).startsWith("Já existe") &&
    String(result.staleWrite).includes("mudou fora do app") &&
    String(result.hiddenWrite).includes("ocultos") &&
    result.update === "OK" &&
    result.trash === "OK" &&
    result.trashed === true &&
    typeof result.backup === "number" &&
    result.renamed === true &&
    links.length > 0 &&
    links.every((link) => link.startsWith("[[Aldren Vael")) &&
    result.mesaCanvas === true &&
    Array.isArray(result.mesas) &&
    (result.mesas as string[]).includes("Mesa do Smoke:1") &&
    typeof result.roomCheck === "object" &&
    (result.roomCheck as Record<string, unknown>).page === 200 &&
    (result.roomCheck as Record<string, unknown>).csp === true &&
    (result.roomCheck as Record<string, unknown>).withoutKey === 404 &&
    (result.roomCheck as Record<string, unknown>).scene === "Cena 1" &&
    (result.roomCheck as Record<string, unknown>).join === 200
  )
}
