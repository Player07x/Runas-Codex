// Spike da etapa 2 (docs/adr/0015-android.md): quanto tempo o app leva para abrir e indexar um cofre de N notas no
// emulador. Mede do `am start` (feito pelo workflow, que passa a hora em ms) até as Configurações mostrarem as N notas.
// Uso: node mobile/tests/vault-index.cdp.mjs <endpoint devtools> <pasta de saída> <N> <início em ms>
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const [endpoint = 'http://127.0.0.1:9224', output = '/tmp/runas-android-vault', total = '5000', startedAt = String(Date.now())] = process.argv.slice(2)
await mkdir(output, { recursive: true })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
let page
for (let n = 0; n < 300 && !page; n++) {
  try { page = (await fetch(endpoint + '/json').then(r => r.json())).find(t => t.type === 'page' && t.webSocketDebuggerUrl) } catch { /* subindo */ }
  if (!page) await sleep(200)
}
if (!page) throw new Error('O WebView depurável não abriu.')
const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
let id = 0
const pending = new Map()
socket.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } }
const run = expression => new Promise(resolve => { const n = ++id; pending.set(n, r => resolve(r?.result?.value)); socket.send(JSON.stringify({ id: n, method: 'Runtime.evaluate', params: { expression, returnByValue: true } })) })
await run(`location.hash = '#/config'; true`)
const wanted = `${total} notas Markdown no índice`
let indexedAt = null
for (let n = 0; n < 1200 && !indexedAt; n++) {
  if (await run(`document.body.innerText.includes(${JSON.stringify(wanted)})`)) indexedAt = Date.now()
  else await sleep(100)
}
const memory = await run(`performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null`)
const result = { notes: Number(total), ok: Boolean(indexedAt), indexMs: indexedAt ? indexedAt - Number(startedAt) : null, heapMb: memory }
socket.close()
await writeFile(join(output, 'vault-index.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
if (!result.ok) process.exit(1)
