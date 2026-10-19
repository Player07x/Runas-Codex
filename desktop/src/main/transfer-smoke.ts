import type { BrowserWindow } from "electron"
import { readFile } from "node:fs/promises"
import { readTransferArchive } from "../../../app/src/core/transfer/archive"
import { checkPdf } from "./smoke"

/** Importa e exporta pela tela real; as gravações usam o cofre temporário do smoke. */
export async function checkTransfers(window: BrowserWindow): Promise<Record<string, unknown>> {
  const result = await window.webContents.executeJavaScript(String.raw`(async () => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
    const until = async test => { for (let i=0;i<200;i++) { const value=test(); if(value)return value; await wait(100) } throw Error("A tela de transferência não respondeu: " + test) }
    const button = text => [...document.querySelectorAll("button")].find(el => el.textContent.trim() === text)
    const select = (label, value) => { const el=document.querySelector('[aria-label="'+label+'"]'); el.value=value; el.dispatchEvent(new Event("change",{bubbles:true})) }
    const upload = () => { const input=document.querySelector('[aria-label="Arquivo para importar"]'), data=new DataTransfer(); data.items.add(new File(["\ufeff# Transferência\r\n\r\n![[Anexos-transfer-smoke.png]]\r\n"],"Transfer-smoke.md")); data.items.add(new File([Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg=="),char=>char.charCodeAt(0))],"Anexos-transfer-smoke.png")); input.files=data.files; input.dispatchEvent(new Event("change",{bubbles:true})) }
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
    checks.imported=(await api.vault.read([path]))[path] === "\ufeff# Transferência\r\n\r\n![[Anexos-transfer-smoke.png]]\r\n" && (await api.vault.readBinary(asset)).length===70
    upload()
    await until(()=>document.querySelector('[data-transfer-preview]')?.textContent.includes("2 conflito(s)"))
    checks.merge=button("Importar 0 arquivo(s)")?.disabled===true
    select("Quando já existe","duplicate")
    await until(()=>button("Importar 2 arquivo(s)"))
    button("Importar 2 arquivo(s)").click()
    await until(()=>!document.querySelector('[data-transfer-preview]'))
    checks.duplicate=(await api.vault.list()).filter(entry=>entry.path.endsWith("/Transfer-smoke.md")).length===2
    ;[...document.querySelectorAll('[role=tab]')].find(el=>el.textContent.includes("Exportar")).click()
    await until(()=>document.querySelector('[aria-label="O que exportar"]'))
    select("O que exportar","Notas")
    await wait(150)
    document.querySelector("summary").click()
    button("Limpar seleção").click()
    const choice=await until(()=>[...document.querySelectorAll(".transfer-files label")].find(el=>el.textContent.startsWith(path)))
    choice.querySelector("input").click()
    const linked=[...document.querySelectorAll("label")].find(el=>el.textContent.includes("Incluir notas ligadas")).querySelector("input")
    if(linked.checked)linked.click()
    button("Escolher onde salvar").click()
    await until(()=>document.querySelector(".transfer-status")?.textContent.includes("arquivo(s) exportados:"))
    const exported=document.querySelector(".transfer-status").textContent.split("exportados: ")[1]
    checks.dependencies=document.querySelector(".transfer-status").textContent.startsWith("2 arquivo(s)")
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
    button("Fechar prévia").click()
    select("Formato do pacote","markdown")
    button("Escolher onde salvar").click()
    await until(()=>document.querySelector(".transfer-status")?.textContent.includes(".zip"))
    const zip=document.querySelector(".transfer-status").textContent.split("exportados: ")[1]
    const managed=".runas/mesas/transfer-smoke/mesa.json", manifest=new TextEncoder().encode(JSON.stringify({formatVersion:1,id:"transfer-smoke",title:"Transferência",createdAt:1,updatedAt:1}))
    await api.vault.writeManagedTransfer(managed,manifest,null)
    checks.world=(await api.vault.listTransferFiles(true)).some(entry=>entry.path===managed) && !(await api.vault.listTransferFiles(false)).some(entry=>entry.path===managed)
    checks.hidden=await api.vault.writeManagedTransfer(".obsidian/teste.json",manifest,null).then(()=>false,()=>true)
    return {checks,exported,zip,html,pdf}
  })()` ) as { checks: Record<string, boolean>; exported: string; zip: string; html: string; pdf: string }
  const native = await readTransferArchive(new Uint8Array(await readFile(result.exported)))
  const markdown = await readTransferArchive(new Uint8Array(await readFile(result.zip)))
  const html = await readFile(result.html, "utf8")
  result.checks.nativeArchive = native.kind === "runas" && native.files.length === 2 && native.files.find(file => file.path.endsWith(".png"))?.bytes.length === 70
  result.checks.markdownArchive = markdown.kind === "markdown" && markdown.files.length === 2
  result.checks.html = html.includes("Transferência") && html.includes('aria-label="Sumário"')
  const pdf = await checkPdf(result.pdf)
  result.checks.pdf = Boolean(pdf && typeof pdf === "object" && "pages" in pdf && Number(pdf.pages) > 0)
  return { ...result, pdfCheck: pdf, ok: Object.values(result.checks).every(Boolean) }
}
