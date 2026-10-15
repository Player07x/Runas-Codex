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

  // Nota dos formatadores no modo leitura, com a CSP de verdade: KaTeX, Mermaid, anexos por vault-file:// e transclusão.
  const formatters = entries.find((e) => e.path.endsWith("Formatadores.md"))
  if (formatters) {
    location.hash = "/notas/" + encodeURIComponent(formatters.path)
    await until(() => document.querySelector(".editor-status")?.getAttribute("title") === formatters.path)
    ;(await until(() => [...document.querySelectorAll(".editor-bar [role=tab]")].find((tab) => tab.textContent.includes("Leitura"))))?.click()
    await until(() => document.querySelector(".editor-body .md .katex") && document.querySelector(".editor-body .md .mermaid svg"), 100)
    await wait(500)
    const md = document.querySelector(".editor-body .md")
    const images = md ? [...md.querySelectorAll("img")] : []
    // As imagens são "lazy": fora da tela não carregam sozinhas.
    for (const img of images) img.loading = "eager"
    await until(() => images.every((img) => img.complete), 50)
    result.formatters = {
      katex: md ? md.querySelectorAll(".katex").length : 0,
      mermaid: md ? md.querySelectorAll(".mermaid svg").length : 0,
      images: images.length,
      imagesLoaded: images.filter((img) => img.complete && img.naturalWidth > 0).length,
      embeds: md ? md.querySelectorAll(".embed-note").length : 0,
      footnotesLast: md ? md.lastElementChild?.classList.contains("footnotes") === true : false,
    }
  }

  // Gráfico global em WebGL (PixiJS) com a CSP de verdade.
  location.hash = "/notas/grafico"
  const graphCanvas = await until(() => document.querySelector(".graph-page canvas"))
  await wait(1500)
  result.graph = { canvas: Boolean(graphCanvas), stats: document.querySelector(".graph-toolbar .small")?.textContent ?? "" }

  // Wiki: ficha com datas calculadas, calendário fictício e mapa (imagem por vault-file:// e pinos).
  const aldrenWiki = entries.find((e) => e.path.endsWith("Personagens/Aldren.md"))
  const mapNote = entries.find((e) => e.path.endsWith("Mapas/Condado de Valdris.md"))
  if (aldrenWiki && mapNote) {
    location.hash = "/wiki/artigo/" + encodeURIComponent(aldrenWiki.path)
    await until(() => document.querySelector(".infobox"))
    await wait(300)
    const infobox = document.querySelector(".infobox")?.textContent ?? ""
    location.hash = "/wiki/calendario"
    await until(() => document.querySelector(".fmonth .month-head"))
    const weekdays = document.querySelectorAll(".fmonth .month-head").length
    location.hash = "/wiki/mapa/" + encodeURIComponent(mapNote.path)
    await until(() => document.querySelectorAll(".map-pin").length > 0, 60)
    const mapImage = document.querySelector(".map-world img")
    await until(() => mapImage && mapImage.complete, 30)
    result.wiki = { age: /32 anos/.test(infobox), weekdays, pins: document.querySelectorAll(".map-pin").length, image: Boolean(mapImage && mapImage.naturalWidth > 0) }
  }

  // Livros 8b: a prévia lazy precisa paginar com a CSP real, inclusive em somente leitura.
  location.hash = "/livros/" + encodeURIComponent("Livros/Caderno de formatadores/Caderno de formatadores.md")
  ;(await until(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "Prévia")))?.click()
  await until(() => Number(document.querySelector(".book-preview-output[aria-busy=false]")?.dataset.pages) > 1, 200)
  const bookPages = document.querySelector(".book-preview-output")
  result.bookPreview = { pages: Number(bookPages?.dataset.pages ?? 0), milliseconds: Number(bookPages?.dataset.paginationMs ?? 0),
    math: Boolean(bookPages?.querySelector(".katex")), diagram: Boolean(bookPages?.querySelector(".mermaid svg")),
    columns: Boolean(bookPages?.querySelector(".md-colunas")), images: [...(bookPages?.querySelectorAll("img") ?? [])].filter((img) => img.complete && img.naturalWidth > 0).length }

  // Confere o caminho Ctrl+P → Platform sem abrir uma impressora durante o smoke.
  const originalPrint = window.print
  let printRequested = false
  window.print = () => { printRequested = true }
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "p", ctrlKey: true, bubbles: true, cancelable: true }))
  window.print = originalPrint
  result.bookPreview.printShortcut = printRequested

  // Campanhas (etapa 7): o painel lê sessões, missões, pistas e relógios das notas; o quadro .canvas é desenhado.
  const campaignRoute = "/campanhas/" + encodeURIComponent("Cinzas de Valdris")
  const canvasPath = "Campanhas/Cinzas de Valdris/Quadro.canvas"
  location.hash = campaignRoute
  await until(() => document.querySelector(".campaign-clock"))
  await wait(300)
  const dashboard = document.querySelector(".main")?.textContent ?? ""
  const clocks = document.querySelectorAll(".campaign-clock").length
  location.hash = "/quadro/" + encodeURIComponent(canvasPath)
  await until(() => document.querySelectorAll(".canvas-card").length > 0)
  await wait(300)
  result.campaign = {
    clocks,
    quest: dashboard.includes("Entregar a carta"),
    clue: dashboard.includes("A carta selada pede a prisão"),
    cards: document.querySelectorAll(".canvas-card").length,
    edges: document.querySelectorAll(".canvas-edge").length,
  }

  if (result.vault.readOnly) {
    result.write = await errorOf(bridge.vault.write("Notas/Smoke.md", "x", null))
    result.snippet = await errorOf(bridge.vault.installSnippet("x"))
    result.binaryWrite = await errorOf(bridge.vault.writeBinary("Notas/smoke.png", new Uint8Array([1]), null))
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
  await bridge.vault.installSnippet("/* smoke */")
  result.snippet = (await bridge.vault.read([".obsidian/snippets/runas-codex.css"]))[".obsidian/snippets/runas-codex.css"] === "/* smoke */" ? "OK" : "não gravou"

  // Anexos: os bytes vão e voltam iguais, com as recusas do texto, e a imagem nova aparece por vault-file://.
  const pngBytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0))
  const binary = await bridge.vault.writeBinary("Notas/Anexos/smoke.png", pngBytes, null)
  const readBack = await bridge.vault.readBinary("Notas/Anexos/smoke.png")
  result.binary = {
    create: binary.size === pngBytes.length ? "OK" : "tamanho " + binary.size,
    same: readBack.length === pngBytes.length && readBack.every((b, i) => b === pngBytes[i]),
    again: await errorOf(bridge.vault.writeBinary("Notas/Anexos/smoke.png", pngBytes, null)),
    hidden: await errorOf(bridge.vault.writeBinary(".obsidian/smoke.png", pngBytes, null)),
    shown: await new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(img.naturalWidth); img.onerror = () => resolve(0); img.src = "vault-file://cofre/Notas/Anexos/smoke.png" }),
  }

  // Imagem colada (Ctrl+V) numa nota: o arquivo vai para a pasta de anexos (aqui, a raiz) e o link entra no texto.
  location.hash = "/notas/" + encodeURIComponent("Notas/Caderno.md")
  await until(() => document.querySelector(".editor-status")?.getAttribute("title") === "Notas/Caderno.md")
  ;(await until(() => [...document.querySelectorAll(".editor-bar [role=tab]")].find((tab) => tab.textContent.includes("Editar"))))?.click()
  const cm = await until(() => document.querySelector(".cm-content"))
  const clip = new DataTransfer()
  clip.items.add(new File([pngBytes], "image.png", { type: "image/png" }))
  cm?.dispatchEvent(new ClipboardEvent("paste", { clipboardData: clip, bubbles: true, cancelable: true }))
  let pastedPath = null
  for (let i = 0; i < 50 && !pastedPath; i++) {
    await wait(100)
    pastedPath = (await bridge.vault.list()).find((e) => /^Imagem colada \\d{14}\\.png$/.test(e.path))?.path ?? null
  }
  await wait(1500)
  const caderno = (await bridge.vault.read(["Notas/Caderno.md"]))["Notas/Caderno.md"] ?? ""
  ;[...document.querySelectorAll(".editor-bar [role=tab]")].find((tab) => tab.textContent.includes("Leitura"))?.click()
  const pastedImg = await until(() => [...document.querySelectorAll(".editor-body .md img")].find((img) => img.src.includes("Imagem%20colada")))
  if (pastedImg) { pastedImg.loading = "eager"; await until(() => pastedImg.complete, 30) }
  result.paste = { file: pastedPath, link: Boolean(pastedPath && caderno.includes("![[" + pastedPath + "]]")), shown: Boolean(pastedImg && pastedImg.naturalWidth > 0) }

  // Posição pelo menu da imagem no live preview (C2): só o apelido do link muda, e na leitura a imagem flutua.
  ;[...document.querySelectorAll(".editor-bar [role=tab]")].find((tab) => tab.textContent.includes("Editar"))?.click()
  const lastLine = await until(() => [...document.querySelectorAll(".cm-line")].at(-1))
  if (lastLine) {
    // O cursor sai da linha da imagem (senão o editor mostra o código dela).
    const box = lastLine.getBoundingClientRect()
    lastLine.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: box.left + 2, clientY: box.top + 4, button: 0 }))
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }))
  }
  ;(await until(() => document.querySelector(".img-edit [aria-label='À direita, com o texto em volta']")))?.click()
  await wait(1500)
  const positioned = (await bridge.vault.read(["Notas/Caderno.md"]))["Notas/Caderno.md"] ?? ""
  ;[...document.querySelectorAll(".editor-bar [role=tab]")].find((tab) => tab.textContent.includes("Leitura"))?.click()
  const floated = await until(() => document.querySelector(".editor-body .md img.pos-direita"))
  result.position = { link: Boolean(pastedPath && positioned.includes("![[" + pastedPath + "|direita]]")), float: floated ? getComputedStyle(floated).float : null }

  // Renomear pela interface: os links das outras notas precisam acompanhar.
  if (aldren) {
    location.hash = "/notas/" + encodeURIComponent(aldren.path)
    // Espera a nota trocar (o botão da nota anterior ainda pode estar na tela).
    await until(() => document.querySelector(".editor-status")?.getAttribute("title") === aldren.path)
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

  // Nota do dia: pasta, nome e modelo de .obsidian/daily-notes.json (variáveis preenchidas).
  location.hash = "/notas/hoje"
  await until(() => location.hash.includes(encodeURIComponent("Notas/Diário/")))
  await wait(300)
  const dailyPath = decodeURIComponent(location.hash.slice("#/notas/".length))
  const dailyText = (await bridge.vault.read([dailyPath]))[dailyPath] ?? ""
  result.daily = dailyText.includes("## Humor do dia") && !dailyText.includes("{{") ? "OK" : dailyPath + ": " + dailyText.slice(0, 60)

  // Wiki: "+1 dia" avança o "hoje" do mundo dentro do bloco runas-calendario (só aquela linha muda).
  location.hash = "/wiki/calendario"
  ;(await until(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "+1 dia")))?.click()
  await wait(700)
  const calendarPath = "Wikis/Ordem x Caos/Calendários/Calendário de Ordem x Caos.md"
  const calendarText = (await bridge.vault.read([calendarPath]))[calendarPath] ?? ""
  result.wikiToday = calendarText.includes('hoje: "4031-07-16"') ? "OK" : (calendarText.match(/hoje:.*$/m)?.[0] ?? "sem hoje")

  // Agenda: criar um evento pela tela; a nota vai para Agenda/ no formato do Full Calendar e aparece no mês.
  location.hash = "/agenda"
  ;(await until(() => [...document.querySelectorAll("[role=tab]")].find((tab) => tab.textContent.trim() === "Mês")))?.click()
  ;(await until(() => document.querySelector("[aria-label='Novo evento']")))?.click()
  const eventTitle = await until(() => document.querySelector("[aria-label='Título do evento']"))
  if (eventTitle) {
    const tomorrow = new Date(Date.now() + 86400000)
    const day = tomorrow.getFullYear() + "-" + String(tomorrow.getMonth() + 1).padStart(2, "0") + "-" + String(tomorrow.getDate()).padStart(2, "0")
    const fill = (label, value) => {
      const el = document.querySelector("[aria-label='" + label + "']")
      const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value)
      el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }))
    }
    fill("Título do evento", "Evento do smoke")
    fill("Data do evento", day)
    fill("Hora de início", "19:30")
    fill("Lembrete", "60")
    await wait(100)
    document.querySelector("[aria-label='Salvar evento']").click()
    await until(() => !document.querySelector("[aria-label='Salvar evento']"))
    await wait(300)
    const eventPath = "Agenda/" + day + " Evento do smoke.md"
    const eventText = (await bridge.vault.read([eventPath]))[eventPath] ?? ""
    result.agenda = {
      note: /type: single/.test(eventText) && eventText.includes('date: "' + day + '"') && eventText.includes('startTime: "19:30"') ? "OK" : eventText.slice(0, 80),
      inMonth: [...document.querySelectorAll("[data-day='" + day + "'] .event-pill")].some((pill) => pill.textContent.includes("Evento do smoke")),
      scheduled: await bridge.agenda.schedule([{ id: "smoke", at: Date.now() + 10 * 86400000, title: "Smoke", body: "teste", path: eventPath }]),
    }
  }

  // Livros: a criação pela tela precisa persistir o capítulo e seu link na estrutura.
  const bookPath = "Livros/Guia de Valdris/Guia de Valdris.md"
  location.hash = "/livros/" + encodeURIComponent(bookPath)
  ;(await until(() => document.querySelector("[aria-label='Criar capítulo']")))?.click()
  const chapterTitle = await until(() => document.querySelector("[aria-label='Título do capítulo']"))
  if (chapterTitle) {
    setter.call(chapterTitle, "Capítulo do smoke")
    chapterTitle.dispatchEvent(new Event("input", { bubbles: true }))
    await wait(100)
    document.querySelector("[aria-label='Confirmar criar capítulo']").click()
    await until(() => !document.querySelector("[aria-label='Confirmar criar capítulo']"))
    const chapterPath = "Livros/Guia de Valdris/Capítulo do smoke.md"
    const bookTexts = await bridge.vault.read([bookPath, chapterPath])
    result.books = Boolean(bookTexts[chapterPath]?.includes("tipo: capitulo") && bookTexts[bookPath]?.includes("[[Capítulo do smoke]]"))
  }

  // Campanhas: criar a Sessão 13 pela tela (nota + evento na Agenda, um apontando para o outro).
  location.hash = campaignRoute + "/sessoes"
  ;(await until(() => [...document.querySelectorAll(".page-head button")].find((b) => b.textContent.trim() === "Nova sessão")))?.click()
  const sessionTitle = await until(() => document.querySelector("[aria-label='Título da sessão']"))
  if (sessionTitle) {
    setter.call(sessionTitle, "Sessão do smoke")
    sessionTitle.dispatchEvent(new Event("input", { bubbles: true }))
    await wait(100)
    ;[...document.querySelectorAll(".modal-foot button")].find((b) => b.textContent.trim() === "Criar sessão")?.click()
    await until(() => location.hash.includes("/sessoes/"))
    await wait(300)
    const sessionPath = "Campanhas/Cinzas de Valdris/Sessões/Sessão 13.md"
    const eventPath = (await bridge.vault.list()).find((e) => e.path.startsWith("Agenda/") && e.path.includes("Sessão 13"))?.path ?? ""
    const sessionTexts = await bridge.vault.read(eventPath ? [sessionPath, eventPath] : [sessionPath])
    const sessionText = sessionTexts[sessionPath] ?? ""
    const sessionEvent = sessionTexts[eventPath] ?? ""
    result.campaignSession = {
      note: sessionText.includes("tipo: sessao") && sessionText.includes("numero: 13") && sessionText.includes("## Preparação") ? "OK" : sessionText.slice(0, 80),
      event: eventPath && sessionEvent.includes("[[Campanhas/Cinzas de Valdris/Sessões/Sessão 13]]") && sessionText.includes("[[" + eventPath.replace(/\\.md$/, "") + "]]") ? "OK" : eventPath + ": " + sessionEvent.slice(0, 80),
    }
  }

  // Quadro: um cartão novo pela barra; o JSON continua válido, com os campos desconhecidos e o link renomeado.
  location.hash = "/quadro/" + encodeURIComponent(canvasPath)
  await until(() => document.querySelectorAll(".canvas-card").length > 0)
  ;[...document.querySelectorAll(".canvas-toolbar button")].find((b) => b.textContent.trim() === "Texto")?.click()
  const cardText = await until(() => document.querySelector("[aria-label='Texto do cartão']"))
  if (cardText) {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(cardText, "Cartão do smoke")
    // O React ouve o blur como "focusout"; a janela do smoke pode estar sem foco.
    cardText.dispatchEvent(new FocusEvent("focusout", { bubbles: true }))
    await wait(1500)
    const canvasText = (await bridge.vault.read([canvasPath]))[canvasPath] ?? ""
    let canvas = null
    try { canvas = JSON.parse(canvasText) } catch { canvas = null }
    result.canvas = {
      json: Boolean(canvas),
      nodes: canvas ? canvas.nodes.length : 0,
      text: Boolean(canvas && canvas.nodes.some((n) => n.text === "Cartão do smoke")),
      unknown: Boolean(canvas && canvas["x-plugin-meta"]?.versao === 1 && canvas.nodes.some((n) => n["x-plugin-extra"]?.pin === true)),
      renamed: Boolean(canvas && canvas.nodes.some((n) => n.file === "Wikis/Ordem x Caos/Personagens/Aldren Vael.md")),
      // O checkout Windows usa CRLF; a tabulação deve ser preservada nos dois fins de linha.
      tabs: /^\\{\\r?\\n\\t"nodes"/.test(canvasText),
    }
  }

  // A sala do VTT fecha ao sair da mesa: o bloco da Mesa fica por último.
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
  const formatters = result.formatters as Record<string, unknown> | undefined
  const formattersOk =
    !!formatters &&
    Number(formatters.katex) > 0 &&
    Number(formatters.mermaid) > 0 &&
    Number(formatters.images) > 0 &&
    formatters.imagesLoaded === formatters.images &&
    Number(formatters.embeds) > 0 &&
    formatters.footnotesLast === true
  const graph = result.graph as { canvas?: boolean; stats?: string } | undefined
  const graphOk = graph?.canvas === true && /^[1-9]\d* nós/.test(graph.stats ?? "")
  const wiki = result.wiki as { age?: boolean; weekdays?: number; pins?: number; image?: boolean } | undefined
  const wikiOk = wiki?.age === true && wiki.weekdays === 6 && (wiki.pins ?? 0) >= 2 && wiki.image === true
  if (!readOk || !formattersOk || !graphOk || !wikiOk) return false
  const bookPreview = result.bookPreview as Record<string, unknown> | undefined
  if (!bookPreview || Number(bookPreview.pages) <= 1 || !bookPreview.math || !bookPreview.diagram || !bookPreview.columns || Number(bookPreview.images) < 1 || bookPreview.printShortcut !== true) return false
  const campaign = result.campaign as Record<string, unknown> | undefined
  if (!campaign || campaign.clocks !== 1 || campaign.quest !== true || campaign.clue !== true || campaign.cards !== 3 || campaign.edges !== 1) return false
  if (vault?.readOnly) return String(result.write).startsWith("Cofre em somente leitura") && String(result.snippet).startsWith("Cofre em somente leitura") && String(result.binaryWrite).startsWith("Cofre em somente leitura")
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
    result.snippet === "OK" &&
    result.daily === "OK" &&
    result.wikiToday === "OK" &&
    typeof result.agenda === "object" &&
    (result.agenda as Record<string, unknown>).note === "OK" &&
    (result.agenda as Record<string, unknown>).inMonth === true &&
    (result.agenda as Record<string, unknown>).scheduled === 1 &&
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
    (result.roomCheck as Record<string, unknown>).join === 200 &&
    result.books === true &&
    typeof result.campaignSession === "object" &&
    (result.campaignSession as Record<string, unknown>).note === "OK" &&
    (result.campaignSession as Record<string, unknown>).event === "OK" &&
    typeof result.canvas === "object" &&
    (result.canvas as Record<string, unknown>).json === true &&
    (result.canvas as Record<string, unknown>).nodes === 4 &&
    (result.canvas as Record<string, unknown>).text === true &&
    (result.canvas as Record<string, unknown>).unknown === true &&
    (result.canvas as Record<string, unknown>).renamed === true &&
    (result.canvas as Record<string, unknown>).tabs === true &&
    typeof result.binary === "object" &&
    (result.binary as Record<string, unknown>).create === "OK" &&
    (result.binary as Record<string, unknown>).same === true &&
    String((result.binary as Record<string, unknown>).again).startsWith("Já existe") &&
    String((result.binary as Record<string, unknown>).hidden).includes("ocultos") &&
    (result.binary as Record<string, unknown>).shown === 1 &&
    typeof result.paste === "object" &&
    typeof (result.paste as Record<string, unknown>).file === "string" &&
    (result.paste as Record<string, unknown>).link === true &&
    (result.paste as Record<string, unknown>).shown === true &&
    typeof result.position === "object" &&
    (result.position as Record<string, unknown>).link === true &&
    (result.position as Record<string, unknown>).float === "right"
  )
}
