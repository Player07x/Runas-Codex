// Uso: RUNAS_PROFILE=1 npm run desktop:build; node desktop/benchmarks/run.mjs <saída> [--record]
import { spawn } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import electron from "electron"
import { createPerformanceFixture } from "./fixture.mjs"

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), ".."), output = resolve(process.argv[2] ?? "desempenho-local")
const ciNoSandbox = process.argv.includes("--ci-no-sandbox")
if (ciNoSandbox && (process.env.GITHUB_ACTIONS !== "true" || process.platform !== "linux")) throw Error("--ci-no-sandbox é exclusivo do runner Linux do GitHub Actions.")
const record = process.argv.includes("--record"), budgetFile = join(desktop, "benchmarks/baseline.json")
const work = await mkdtemp(join(tmpdir(), "codex-performance-"))
const reports = []
await mkdir(output, { recursive: true })
try {
  const fixture = await createPerformanceFixture(join(work, "cofre"), join(desktop, "tests/cofre-exemplo"))
  await writeFile(join(output, "fixture.json"), JSON.stringify(fixture, null, 2))
  console.log(JSON.stringify({ fixture }))
  for (let run = 1; run <= 3; run++) {
    const profile = join(work, "perfil-" + run), temporary = join(work, "tmp-" + run), reportFile = join(output, `run-${run}.json`)
    await mkdir(profile); await mkdir(temporary)
    const args = [".", "--smoke", "--performance", ...(ciNoSandbox ? ["--no-sandbox"] : []), "--vault=" + join(work, "cofre"), "--user-data-dir=" + profile, "--performance-output=" + reportFile]
    if (!record) args.push("--performance-budget=" + budgetFile, "--performance-median")
    const started = Date.now()
    args.push("--benchmark-start=" + started)
    const child = spawn(electron, args, { cwd: desktop, env: { ...process.env, TMPDIR: temporary, TMP: temporary, TEMP: temporary }, stdio: ["ignore", "pipe", "pipe"] })
    let log = ""
    child.stdout.on("data", data => { log += data; process.stdout.write(data) }); child.stderr.on("data", data => { log += data })
    const timeout = setTimeout(() => child.kill("SIGTERM"), 240000)
    const exit = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", (code, signal) => resolve({ code, signal })) }).finally(() => clearTimeout(timeout))
    await writeFile(join(output, `run-${run}.log`), log)
    if (exit.code !== 0) { console.error(log.slice(-20000)); throw Error(`Roteiro ${run} falhou (${JSON.stringify(exit)}). Veja ${join(output, `run-${run}.log`)}`) }
    const report = JSON.parse(await readFile(reportFile, "utf8")); reports.push(report)
    console.log(JSON.stringify({ run, ...report.numbers, rendererMemory: report.rendererMemory }))
    await rm(profile, { recursive: true, force: true, maxRetries: 30, retryDelay: 100 })
    await rm(temporary, { recursive: true, force: true, maxRetries: 30, retryDelay: 100 })
  }
  const median = values => values.toSorted((a,b) => a - b)[Math.floor(values.length / 2)]
  const numbers = Object.fromEntries(Object.keys(reports[0].numbers).map(key => [key, median(reports.map(report => report.numbers[key]))]))
  const summary = { fixture, numbers, environment: reports[0].environment, runs: reports.length, method: "Mediana de três perfis novos (o teto vale para a mediana); cache de arquivos do sistema não foi esvaziado; build de produção com Profiler." }
  // U108: o teto vale para a mediana das três execuções (números e cada tela), não para cada uma.
  const screens = Object.fromEntries(reports[0].screens.map(screen => [screen.name, median(reports.map(report => report.screens.find(item => item.name === screen.name)?.ms ?? Number.NaN))]))
  const runs = Object.fromEntries(Object.keys(reports[0].numbers).map(key => [key, reports.map(report => Math.round(report.numbers[key]))]))
  let regressions = []
  if (!record) {
    const { performanceRegressions, performanceScreenRegressions } = await import("../../app/src/core/performance-budget.ts")
    const budget = JSON.parse(await readFile(budgetFile, "utf8"))
    regressions = [...performanceRegressions(numbers, budget), ...performanceScreenRegressions(screens, budget)]
  }
  Object.assign(summary, { screens, runsByMetric: runs, regressions })
  await writeFile(join(output, "summary.json"), JSON.stringify(summary, null, 2))
  if (record) await writeFile(join(output, "baseline-candidate.json"), JSON.stringify({ baseline: numbers, factors: { openMs: 3, indexMs: 3, switchMs: 3, wiki420Ms: 3, jsBytes: 1.15 }, allowances: { openMs: 1000, indexMs: 500, switchMs: 300, wiki420Ms: 500, jsBytes: 100000 }, screens: Object.fromEntries(reports[0].screens.map(screen => [screen.name, Math.max(...reports.map(report => report.screens.find(item => item.name === screen.name).ms))])), reference: summary }, null, 2))
  console.log(JSON.stringify(summary))
  if (regressions.length) { console.error("Acima do orçamento (mediana de três execuções):\n" + regressions.join("\n")); process.exitCode = 1 }
} finally { await rm(work, { recursive: true, force: true, maxRetries: 30, retryDelay: 100 }) }
