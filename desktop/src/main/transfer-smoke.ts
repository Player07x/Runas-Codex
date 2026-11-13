import { strFromU8, unzipSync } from "fflate"
import type { BrowserWindow } from "electron"
import { open, readFile } from "node:fs/promises"
import { readTransferArchive, readTransferArchiveFrom } from "../../../app/src/core/transfer/archive"
import { checkPdf } from "./smoke"

/** Importa e exporta pela tela real; as gravações usam o cofre temporário do smoke. */
export async function checkTransfers(window: BrowserWindow): Promise<Record<string, unknown>> {
  const result = await window.webContents.executeJavaScript(String.raw`(async () => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
    const until = async test => { for (let i=0;i<200;i++) { const value=test(); if(value)return value; await wait(100) } throw Error("A tela de transferência não respondeu: " + test) }
    const button = text => [...document.querySelectorAll("button")].find(el => el.textContent.trim() === text)
    // U51: o filtro troca a árvore por uma lista com os caminhos inteiros.
    const filter = value => { const el=document.querySelector('[aria-label="Filtrar arquivos para exportar"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,value); el.dispatchEvent(new Event("input",{bubbles:true})) }
    const choose = text => [...document.querySelectorAll('[role=tab]')].find(el=>el.textContent.includes(text)).click()
    const select = (label, value) => { const el=document.querySelector('[aria-label="'+label+'"]'); el.value=value; el.dispatchEvent(new Event("change",{bubbles:true})) }
    const upload = () => { const input=document.querySelector('[aria-label="Arquivo para importar"]'), data=new DataTransfer(); data.items.add(new File(["\ufeff# Transferência\r\n\r\n![[Anexos-transfer-smoke.png]]\r\n\r\n> [!segredo]\r\n> X4_SEGREDO_NAO_EXPORTAR\r\n"],"Transfer-smoke.md")); data.items.add(new File([Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg=="),char=>char.charCodeAt(0))],"Anexos-transfer-smoke.png")); input.files=data.files; input.dispatchEvent(new Event("change",{bubbles:true})) }
    const api=window.runasCodex, checks={}
    location.hash="/transferir"
    await until(()=>document.querySelector("[data-transfer-workspace]"))
    ;[...document.querySelectorAll('[role=tab]')].find(el=>el.textContent.includes("Importar")).click()
    await until(()=>document.querySelector('[aria-label="Arquivo para importar"]'))
    upload()
    await until(()=>document.querySelector('[data-transfer-preview]')?.textContent.includes("2 arquivo(s)"))
    checks.preview=true
    button("Importar 2 arquivo(s)").click()
    await until(()=>document.querySelector(".transfer-status")?.textContent.includes("2 arquivo(s) importados"))
    const path="Notas/Importados/Transfer-smoke.md", asset="Notas/Importados/Anexos-transfer-smoke.png"
    checks.imported=(await api.vault.read([path]))[path] === "\ufeff# Transferência\r\n\r\n![[Anexos-transfer-smoke.png]]\r\n\r\n> [!segredo]\r\n> X4_SEGREDO_NAO_EXPORTAR\r\n" && (await api.vault.readBinary(asset)).length===70
    upload()
    await until(()=>document.querySelector('[data-transfer-preview]')?.textContent.includes("2 conflito(s)"))
    checks.merge=button("Importar 0 arquivo(s)")?.disabled===true
    select("Quando já existe","duplicate")
    await until(()=>button("Importar 2 arquivo(s)"))
    button("Importar 2 arquivo(s)").click()
    await until(()=>!document.querySelector('[data-transfer-preview]'))
    checks.duplicate=(await api.vault.list()).filter(entry=>entry.path.endsWith("/Transfer-smoke.md")).length===2
    ;[...document.querySelectorAll('[role=tab]')].find(el=>el.textContent.includes("Exportar")).click()
    await until(()=>[...document.querySelectorAll('[role=tab]')].some(el=>el.textContent.includes("Por notas")))
    choose("Por notas")
    await until(()=>document.querySelector('[aria-label="O que exportar"]'))
    select("O que exportar","Notas")
    await wait(150)
    document.querySelector("summary").click()
    button("Limpar seleção").click()
    await until(()=>document.querySelector("summary")?.textContent.includes("(0)") && ![...document.querySelectorAll(".transfer-files input")].some(input=>input.checked))
    filter(path)
    const choice=await until(()=>[...document.querySelectorAll(".transfer-files label")].find(el=>el.textContent.startsWith(path)))
    choice.querySelector("input").click()
    await until(()=>document.querySelector("summary")?.textContent.includes("(1)") && !button("Escolher onde salvar")?.disabled)
    const linked=[...document.querySelectorAll("label")].find(el=>el.textContent.includes("Incluir notas ligadas")).querySelector("input")
    if(linked.checked)linked.click()
    button("Escolher onde salvar").click()
    await until(()=>document.querySelector(".transfer-status")?.textContent.includes("arquivo(s) exportados:"))
    const exported=document.querySelector(".transfer-status").textContent.split("exportados: ")[1]
    checks.dependencies=document.querySelector(".transfer-status").textContent.startsWith("2 arquivo(s)")
    // Rework F5 (TRF-1): o documento e o pacote ficam em cartões de escolha; a seleção de arquivos continua valendo.
    const goal = text => [...document.querySelectorAll(".transfer-goal")].find(el=>el.textContent.includes(text)).querySelector("input").click()
    goal("Gerar documento ou site")
    await until(()=>button("Preparar documento"))
    const players=[...document.querySelectorAll("label")].find(el=>el.textContent.includes("Versão dos jogadores, sem artigos"))?.querySelector("input")
    if(!players)throw Error("Opção dos jogadores ausente.")
    if(!players.checked)players.click()
    await wait(100)
    button("Preparar documento").click()
    await until(()=>document.querySelector(".book-preview-output")?.dataset.pages || document.querySelector(".book-pages-output")?.dataset.pages || (document.querySelector("[data-book-pagination-status]")?.textContent.includes("páginas")))
    select("Formato de exportação","html")
    button("Exportar arquivo").click()
    await until(()=>document.querySelector("[data-book-export-status]")?.textContent.startsWith("Arquivo salvo:"))
    const html=document.querySelector("[data-book-export-status]").textContent.slice("Arquivo salvo: ".length).split(". ")[0]
    select("Formato de exportação","pdf")
    button("Exportar arquivo").click()
    await until(()=>document.querySelector("[data-book-export-status]")?.textContent.startsWith("PDF salvo:"))
    const pdf=document.querySelector("[data-book-export-status]").textContent.slice("PDF salvo: ".length)
    checks.publicPreview=!document.querySelector(".book-preview-source")?.textContent.includes("X4_SEGREDO_NAO_EXPORTAR")
    select("Formato de exportação","site")
    button("Exportar arquivo").click()
    await until(()=>document.querySelector("[data-book-export-status]")?.textContent.includes("site.zip"))
    const site=document.querySelector("[data-book-export-status]").textContent.slice("Arquivo salvo: ".length).split(". ")[0]
    button("Fechar prévia").click()
    goal("Levar para outro aparelho")
    await until(()=>document.querySelector('[aria-label="Formato do pacote"]'))
    select("Formato do pacote","markdown")
    button("Escolher onde salvar").click()
    await until(()=>document.querySelector(".transfer-status")?.textContent.includes(".zip"))
    const zip=document.querySelector(".transfer-status").textContent.split("exportados: ")[1]
    // U50 (ADR 0037): um pacote acima do limite antigo de 128 MB, gravado em pedaços pela tela.
    // O cofre recusa um arquivo único acima de 100 MB; dois de 70 MB passam de 128 MB juntos.
    const bigPaths=["Notas/Pacote-grande-smoke-1.png","Notas/Pacote-grande-smoke-2.png"], big=new Uint8Array(70*1048576)
    for(let i=0;i<big.length;i+=4096)big[i]=(i*2654435761)>>>24
    for(const bigPath of bigPaths)await api.vault.writeBinary(bigPath,big,null)
    select("Formato do pacote","runas")
    select("O que exportar","Agenda")
    await wait(300)
    select("O que exportar","Notas")
    const details=await until(()=>document.querySelector("details"))
    if(!details.open)details.querySelector("summary").click()
    filter("Pacote-grande-smoke")
    await until(()=>bigPaths.every(bigPath=>[...document.querySelectorAll(".transfer-files label")].some(el=>el.textContent.startsWith(bigPath))))
    button("Limpar seleção").click()
    await until(()=>document.querySelector("summary")?.textContent.includes("(0)"))
    for(const bigPath of bigPaths)[...document.querySelectorAll(".transfer-files label")].find(el=>el.textContent.startsWith(bigPath)).querySelector("input").click()
    await until(()=>document.querySelector("summary")?.textContent.includes("(2)") && !button("Escolher onde salvar")?.disabled)
    button("Escolher onde salvar").click()
    const bigStatus=await until(()=>{const text=document.querySelector(".transfer-status")?.textContent; return text?.includes("exportados:") && !text.includes(zip) && document.querySelector(".transfer-notice") && text})
    const large=bigStatus.split("exportados: ")[1]
    checks.largeNotice=document.querySelector(".transfer-notice").textContent.includes("1.4 ou mais novo")
    // U52: exportar por item (a wiki do cofre de exemplo), com a contagem antes e a conferência no fim.
    filter("")
    choose("Por itens")
    const wikiItem=await until(()=>[...document.querySelectorAll("[data-transfer-items] label")].find(el=>el.textContent.startsWith("Ordem x Caos")))
    wikiItem.querySelector("input").click()
    await until(()=>document.querySelector("[data-transfer-planned]")?.textContent.includes("de 1 item ") && !button("Escolher onde salvar")?.disabled)
    checks.itemPlanned=/Vai salvar [1-9][0-9]* notas/.test(document.querySelector("[data-transfer-planned]").textContent)
    button("Escolher onde salvar").click()
    const itemStatus=await until(()=>{const text=document.querySelector(".transfer-status")?.textContent; return text?.includes("exportados:") && !text.includes(large) && text})
    const byItem=itemStatus.split("exportados: ")[1]
    checks.itemChecked=document.querySelector(".transfer-notice")?.textContent.includes("Conferido:")
    const wikiNotes=(await api.vault.list()).filter(entry=>entry.path.startsWith("Wikis/Ordem x Caos/")&&entry.path.endsWith(".md")).map(entry=>entry.path)
    const managed=".runas/mesas/transfer-smoke/mesa.json", manifest=new TextEncoder().encode(JSON.stringify({formatVersion:1,id:"transfer-smoke",title:"Transferência",createdAt:1,updatedAt:1}))
    await api.vault.writeManagedTransfer(managed,manifest,null)
    checks.world=(await api.vault.listTransferFiles(true)).some(entry=>entry.path===managed) && !(await api.vault.listTransferFiles(false)).some(entry=>entry.path===managed)
    checks.hidden=await api.vault.writeManagedTransfer(".obsidian/teste.json",manifest,null).then(()=>false,()=>true)
    return {checks,exported,zip,html,pdf,site,large,byItem,wikiNotes}
  })()` ) as { checks: Record<string, boolean>; exported: string; zip: string; html: string; pdf: string; site: string; large: string; byItem: string; wikiNotes: string[] }
  const native = await readTransferArchive(new Uint8Array(await readFile(result.exported)))
  const markdown = await readTransferArchive(new Uint8Array(await readFile(result.zip)))
  const html = await readFile(result.html, "utf8")
  result.checks.nativeArchive = native.kind === "runas" && native.files.length === 2 && native.files.find(file => file.path.endsWith(".png"))?.bytes.length === 70
  result.checks.markdownArchive = markdown.kind === "markdown" && markdown.files.length === 2
  result.checks.html = html.includes("Transferência") && html.includes('aria-label="Sumário"') && !html.includes("X4_SEGREDO_NAO_EXPORTAR")
  const site = unzipSync(new Uint8Array(await readFile(result.site)))
  const first = strFromU8(site["notas/nota-1.html"] ?? new Uint8Array())
  result.checks.site = Boolean(site["index.html"] && site["book.css"]) && first.includes("Transferência") && first.includes('src="../assets/') && !first.includes("X4_SEGREDO_NAO_EXPORTAR") && !first.includes("<script")
  const pdf = await checkPdf(result.pdf)
  result.checks.pdf = Boolean(pdf && typeof pdf === "object" && "pages" in pdf && Number(pdf.pages) > 0)
  // O pacote grande é lido por partes, como a tela faz com o arquivo escolhido.
  const handle = await open(result.large)
  try {
    const size = (await handle.stat()).size
    const source = { size, read: async (offset: number, length: number) => { const buffer = new Uint8Array(length); const { bytesRead } = await handle.read(buffer, 0, length, offset); return buffer.subarray(0, bytesRead) } }
    const large = await readTransferArchiveFrom(source)
    const files = large.files.filter(item => item.path.startsWith("Notas/Pacote-grande-smoke-"))
    result.checks.largeArchive = size > 128 * 1048576 && large.kind === "runas" && files.length === 2 && files.every(file => file.bytes.length === 70 * 1048576 && file.bytes[4096] === ((4096 * 2654435761) >>> 24 & 255))
  } finally { await handle.close() }
  // O pacote por item tem todas as notas da wiki e nada de outra pasta de notas.
  const byItem = await readTransferArchive(new Uint8Array(await readFile(result.byItem)))
  const itemPaths = new Set(byItem.files.map(file => file.path))
  result.checks.itemArchive = byItem.kind === "runas" && result.wikiNotes.length > 0 && result.wikiNotes.every(path => itemPaths.has(path)) && !byItem.files.some(file => file.path.startsWith("Notas/Importados/"))
  return { ...result, nativePaths: native.files.map(file=>file.path), markdownPaths: markdown.files.map(file=>file.path), pdfCheck: pdf, ok: Object.values(result.checks).every(Boolean) }
}
