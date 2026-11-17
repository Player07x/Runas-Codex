import { app, type BrowserWindow } from "electron"
import { readFile, readdir, stat, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { cpus, totalmem } from "node:os"
import { gzipSync } from "node:zlib"
import { performanceScreenRegressions, performanceRegressions, type PerformanceBudget } from "../../../app/src/core/performance-budget"
import type { RenderSample } from "../../../app/src/core/performance-budget"

interface ScreenMeasurement { name: string; route: string; ms: number; renders: RenderSample[]; images: number; heapBytes: number }

/** Roteiro somente por --performance; usa a mesma janela, ponte e cofre do app, sem instalar ferramentas no renderer. */
export async function runPerformance(window: BrowserWindow, vaultPath: string | null): Promise<void> {
  const loaded = window.webContents.isLoading()
    ? new Promise<void>(resolve => window.webContents.once("did-finish-load", () => resolve()))
    : Promise.resolve()
  if (!vaultPath) throw Error("O roteiro exige o cofre sintético.")
  const fixture = JSON.parse(await readFile(join(vaultPath, ".runas-performance.json"), "utf8")) as { format?: string }
  if (fixture.format !== "runas-performance-v1") throw Error("Use somente o cofre gerado pelo roteiro de desempenho.")
  const started = Number(process.argv.find(arg => arg.startsWith("--benchmark-start="))?.split("=")[1] ?? Date.now())
  await loaded
  window.setContentSize(1366, 900)
  window.webContents.setBackgroundThrottling(false)
  window.showInactive()
  const initial = await window.webContents.executeJavaScript(`(async () => {
    const end = performance.now() + 120000
    while (!window.runasPerformance?.ready) {
      if (performance.now() > end) throw Error("Índice não ficou pronto; use RUNAS_PROFILE=1 no build.")
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    return { notes: window.runasPerformance.notes, indexMs: window.runasPerformance.indexMs }
  })()`) as { notes: number; indexMs: number }
  const openMs = Date.now() - started
  await window.webContents.executeJavaScript("window.runasCodex.vault.setWritable(true)")
  const steps = [
    ["Notas", "/notas", ".notes-head"],
    ["Wiki", "/wiki", ".wiki-header"],
    ["Categoria com 420 artigos", "/wiki/categoria/" + encodeURIComponent("Wikis/Desempenho/Personagens"), ".wiki-category-article"],
    ["Livro", "/livros/" + encodeURIComponent("Livros/Guia de Valdris/Guia de Valdris.md"), ".book-bar"],
    ["Mesa", "/vtt/mesa/benchmark-mesa", ".vtt-root canvas"],
    ["Agenda", "/agenda", ".agenda"],
    ["Campanhas", "/campanhas", ".page"],
    ["Importar e exportar", "/transferir", "[data-transfer-workspace]"],
    ["Configurações", "/config", ".settings-page"],
    ["Início", "/", ".home"],
  ]
  const screens: ScreenMeasurement[] = []
  for (const [name, route, selector] of steps) {
    const sample = await window.webContents.executeJavaScript(`(async () => {
      const start = performance.now(), route = ${JSON.stringify(route)}, selector = ${JSON.stringify(selector)}
      window.runasPerformance.renders = []
      location.hash = route
      const end = start + 60000
      while (!document.querySelector(selector) || !window.runasPerformance.renders.some(sample => sample.route === "#" + route)) {
        if (performance.now() > end) throw Error("Tela não abriu: " + route + " / " + selector)
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      if (route.includes("/wiki/categoria/") && !document.querySelector(".wiki-category-page")?.textContent.includes("420 artigos")) throw Error("A categoria não tem 420 artigos.")
      // Só as imagens visíveis: loading=lazy não deve virar carregamento de todas as páginas da categoria.
      const images = [...document.querySelectorAll("img")].filter(img => { const box = img.getBoundingClientRect(); return box.width && box.height && box.top < innerHeight && box.bottom > 0 })
      await Promise.all(images.map(img => img.decode()))
      await document.fonts.ready
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const ms = performance.now() - start
      return { ms, images: images.length, renders: window.runasPerformance.renders, heapBytes: performance.memory?.usedJSHeapSize ?? 0 }
    })()`) as Omit<ScreenMeasurement, "name" | "route">
    screens.push({ name: name!, route: route!, ...sample })
    console.log(JSON.stringify({ measured: name, ms: Math.round(sample.ms), images: sample.images }))
  }
  // O roteiro sai da mesa antes da amostra final; a memória indica o que ficou retido depois de usar os módulos.
  await new Promise(resolve => setTimeout(resolve, 1000))
  const rendererPid = window.webContents.getOSProcessId()
  const rendererMemory = app.getAppMetrics().find(metric => metric.pid === rendererPid)?.memory
  const assets = join(__dirname, "../renderer/assets")
  const chunks = await Promise.all((await readdir(assets)).filter(name => name.endsWith(".js")).map(async name => {
    const file = join(assets, name)
    return { name, bytes: (await stat(file)).size, gzipBytes: gzipSync(await readFile(file)).length }
  }))
  chunks.sort((a,b) => b.bytes - a.bytes)
  const numbers = { openMs, indexMs: initial.indexMs, switchMs: Math.max(...screens.filter(screen => !screen.name.startsWith("Categoria")).map(screen => screen.ms)), wiki420Ms: screens.find(screen => screen.name.startsWith("Categoria"))!.ms, jsBytes: chunks.reduce((sum, chunk) => sum + chunk.bytes, 0) }
  const budgetPath = process.argv.find(arg => arg.startsWith("--performance-budget="))?.slice("--performance-budget=".length)
  const budget = budgetPath ? JSON.parse(await readFile(budgetPath, "utf8")) as PerformanceBudget : null
  const regressions = budget ? [...performanceRegressions(numbers, budget), ...performanceScreenRegressions(Object.fromEntries(screens.map(screen => [screen.name, screen.ms])), budget)] : []
  if (initial.notes < 10_000) regressions.push("O cofre do roteiro tem menos de 10 mil notas.")
  if (!screens.every(screen => screen.renders.length > 0)) regressions.push("O Profiler não registrou todas as telas.")
  const report = { numbers, notes: initial.notes, screens, rendererMemory, chunks, regressions, environment: { electron: process.versions.electron, node: process.versions.node, platform: process.platform, cpu: cpus()[0]?.model, cpuCount: cpus().length, ramBytes: totalmem(), viewport: [1366, 900], profiling: true } }
  const output = process.argv.find(arg => arg.startsWith("--performance-output="))?.slice("--performance-output=".length)
  if (!output) throw Error("Informe --performance-output=<arquivo.json>.")
  await writeFile(output, JSON.stringify(report, null, 2) + "\n")
  console.log(JSON.stringify({ performance: numbers, regressions, output }))
  if (regressions.length) throw Error(regressions.join("; "))
}
