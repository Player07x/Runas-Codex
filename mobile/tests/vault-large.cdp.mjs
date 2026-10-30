// R3 (docs/adr/0030-c9-desempenho-rede-instaladores.md): o cofre grande da T6 no emulador Android. Mede, no WebView do
// app, a abertura até o índice ter as N notas, a lista de notas, a busca digitada, o gráfico global e a memória. É
// medição, não teste de limite: só falha se uma etapa não terminar.
// Uso: node mobile/tests/vault-large.cdp.mjs <endpoint devtools> <pasta de saída> <N> <início em ms>
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { connectDevtools, sleep } from './devtools-client.mjs'

const [endpoint = 'http://127.0.0.1:9224', output = '/tmp/runas-android-vault/large', total = '10000', startedAt = String(Date.now())] = process.argv.slice(2)
await mkdir(output, { recursive: true })
const { run, send, errors, close } = await connectDevtools(endpoint, t => /^https?:\/\/localhost/.test(t.url ?? ''))
const result = { notes: Number(total), steps: {} }
const heap = () => run(`performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null`)
const waitFor = async (expression, limitMs) => {
  const begin = Date.now()
  while (Date.now() - begin < limitMs) {
    if (await run(`(()=>{try{return Boolean(${expression})}catch{return false}})()`)) return Date.now() - begin
    await sleep(100)
  }
  throw new Error(`Não aconteceu em ${limitMs} ms: ${expression}`)
}
// Tarefas longas (> 50 ms) do WebView desde a última leitura.
await run(`(()=>{window.__runasLong=[];new PerformanceObserver(list=>window.__runasLong.push(...list.getEntries().map(e=>Math.round(e.duration)))).observe({type:'longtask'});return true})()`)
const longTasks = async () => { const list = await run(`(()=>{const l=window.__runasLong;window.__runasLong=[];return l})()`); return { count: list.length, maxMs: Math.max(0, ...list), totalMs: list.reduce((a, b) => a + b, 0) } }
let pendingTasks = []
// Espera a tela parar de trabalhar: nenhuma tarefa longa por `quietMs` seguidos.
const settle = async (quietMs, limitMs) => {
  const begin = Date.now()
  let quietSince = Date.now()
  while (Date.now() - begin < limitMs) {
    const busy = await run(`window.__runasLong.length`)
    if (busy) { pendingTasks.push(...await run(`(()=>{const l=window.__runasLong;window.__runasLong=[];return l})()`)); quietSince = Date.now() }
    else if (Date.now() - quietSince >= quietMs) return quietSince - begin
    await sleep(100)
  }
  return null
}
const drained = () => { const list = pendingTasks; pendingTasks = []; return { count: list.length, maxMs: Math.max(0, ...list), totalMs: list.reduce((a, b) => a + b, 0) } }

// 1. Abertura: do `am start` (hora passada pelo workflow) até as Configurações mostrarem as N notas.
await run(`location.hash = '#/config/cofre'; true`)
await waitFor(`Number(/([\\d.]+) notas Markdown no índice/.exec(document.body.innerText)?.[1].replace(/\\./g, '')) >= ${Number(total)}`, 240_000)
result.steps.open = { indexMs: Date.now() - Number(startedAt), heapMb: await heap() }
await longTasks()

// 2. Lista de notas: quanto tempo até aparecer e quantos itens são desenhados.
let begin = Date.now()
await run(`location.hash = '#/notas'; true`)
await waitFor(`document.querySelector('[data-vault-tree]') && document.querySelector('[aria-label="Buscar notas"]')`, 60_000)
const listMs = Date.now() - begin
const quietList = await settle(1000, 60_000)
result.steps.list = { visibleMs: listMs, settledMs: quietList, drawnItems: await run(`document.querySelectorAll('[data-vault-tree] [data-note-path]').length`), longTasks: drained(), heapMb: await heap() }

// 3. Busca digitada letra a letra (“cidade valdris”: todas as notas têm a frase), como na T6.
const query = 'cidade valdris'
await run(`document.querySelector('[aria-label="Buscar notas"]').focus(); true`)
await longTasks()
begin = Date.now()
for (const letter of query) await send('Input.insertText', { text: letter })
const typingMs = Date.now() - begin
// A lista mostra os primeiros resultados; conta o tempo até eles aparecerem e a tela parar de trabalhar.
await waitFor(`/\\d+ resultado\\(s\\)/.test(document.querySelector('[data-vault-tree]')?.textContent ?? '')`, 120_000)
pendingTasks = []
const settleBegin = Date.now()
const quietSearch = await settle(1000, 120_000)
result.steps.search = {
  query, typingMs,
  // Do fim da digitação até a última tarefa longa da busca.
  resultsSettledAfterTypingMs: quietSearch === null ? null : settleBegin + quietSearch - begin - typingMs,
  shown: await run(`Number(/(\\d+) resultado\\(s\\)/.exec(document.querySelector('[data-vault-tree]').textContent)?.[1])`),
  longTasks: drained(), heapMb: await heap(),
}

// 4. Limpar a busca: a maior travada ao voltar para a árvore.
begin = Date.now()
await run(`(()=>{const input=document.querySelector('[aria-label="Buscar notas"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'');input.dispatchEvent(new Event('input',{bubbles:true}));return true})()`)
await waitFor(`!document.querySelector('[data-vault-tree]')?.textContent.includes('resultado(s)')`, 60_000)
result.steps.clear = { backToTreeMs: Date.now() - begin, longTasks: await longTasks() }

// 5. Gráfico global: até o canvas aparecer e até a simulação acalmar (2 s sem tarefa longa).
begin = Date.now()
await run(`location.hash = '#/notas/grafico'; true`)
await waitFor(`document.querySelector('.pane-center.graph canvas') || document.querySelector('.graph-error')`, 120_000)
const canvasMs = Date.now() - begin
const graphError = await run(`document.querySelector('.graph-error')?.textContent ?? null`)
pendingTasks = []
const quietGraph = graphError ? null : await settle(2000, 120_000)
result.steps.graph = { canvasMs, settledMs: quietGraph === null ? null : canvasMs + quietGraph, error: graphError, longTasks: drained(), heapMb: await heap() }

// 6. Memória do JavaScript no fim (a do processo inteiro vem do `dumpsys meminfo`, no workflow).
result.heapMb = await heap()
result.errors = errors.slice(0, 5)
close()
await writeFile(join(output, 'vault-large.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
if (result.steps.graph.error) { console.error('O gráfico não abriu: ' + result.steps.graph.error); process.exit(1) }
