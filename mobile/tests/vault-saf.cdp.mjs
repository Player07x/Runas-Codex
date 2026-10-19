// Concede a pasta pelo seletor real do Android, sem MANAGE_EXTERNAL_STORAGE. O smoke seguinte reinicia o app e
// verifica que modo, permissão persistente e liberação de gravação sobreviveram ao encerramento do processo.
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, basename } from 'node:path'

const [endpoint = 'http://127.0.0.1:9224', output = '/tmp/runas-android-vault/saf', path = '/sdcard/Documents/cofre-smoke-saf', writable = 'true'] = process.argv.slice(2)
await mkdir(output, { recursive: true })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const adb = (...args) => execFileSync('adb', args, { timeout: 30000, maxBuffer: 4 * 1024 * 1024 }).toString()
const result = { ok: false }
let socket
const pending = new Map()
try {
  let target
  for (let n = 0; n < 150 && !target; n++) {
    try { target = (await fetch(endpoint + '/json').then(r => r.json())).find(t => t.type === 'page' && t.webSocketDebuggerUrl) } catch { /* iniciando */ }
    if (!target) await sleep(200)
  }
  if (!target) throw new Error('O WebView depurável não abriu.')
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  let id = 0
  socket.onmessage = event => {
    const message = JSON.parse(event.data), call = pending.get(message.id)
    if (!call) return
    pending.delete(message.id); clearTimeout(call.timer)
    if (message.error) call.reject(new Error(message.error.message))
    else if (message.result?.exceptionDetails) call.reject(new Error(message.result.exceptionDetails.exception?.description ?? 'Exceção no WebView.'))
    else call.resolve(message.result?.result?.value)
  }
  const run = expression => new Promise((resolve, reject) => {
    const sequence = ++id
    const timer = setTimeout(() => { pending.delete(sequence); reject(new Error('O WebView não respondeu.')) }, 30000)
    pending.set(sequence, { resolve, reject, timer })
    socket.send(JSON.stringify({ id: sequence, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }))
  })
  for (let n = 0; n < 150; n++) {
    if (await run('Boolean(window.Capacitor?.Plugins?.RunasVault)')) break
    await sleep(200)
  }
  const access = await run('window.Capacitor.Plugins.RunasVault.access()')
  if (access.granted) throw new Error('O teste SAF exige que o acesso a todos os arquivos esteja recusado.')
  const initialUri = 'content://com.android.externalstorage.documents/document/' + encodeURIComponent('primary:' + path.replace(/^\/sdcard\//, ''))
  await run(`window.__runasSafResult=null; window.Capacitor.Plugins.RunasVault.choose(${JSON.stringify({ saf: true, initialUri })}).then(value=>window.__runasSafResult={value},error=>window.__runasSafResult={error:String(error.message||error)}); true`)
  let selected = false
  for (let n = 0; n < 30 && !selected; n++) {
    let xml = ''
    try {
      adb('shell', 'uiautomator', 'dump', '/sdcard/runas-saf-window.xml')
      xml = adb('shell', 'cat', '/sdcard/runas-saf-window.xml')
    } catch { await sleep(500); continue }
    await writeFile(join(output, 'picker.xml'), xml)
    const nodes = xml.match(/<node\b[^>]*>/g) ?? []
    const button = nodes.find(node => node.includes('enabled="true"') && (selected
      ? /resource-id="android:id\/button1"/.test(node)
      : /resource-id="[^"]*:id\/action_menu_select"|text="(?:USE THIS FOLDER|Use this folder|USAR ESTA PASTA|Usar esta pasta)"/.test(node)))
    if (button) {
      const bounds = button.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
      if (bounds) {
        const [, x1, y1, x2, y2] = bounds.map(Number)
        adb('shell', 'input', 'tap', String(Math.round((x1 + x2) / 2)), String(Math.round((y1 + y2) / 2)))
        selected = true
      }
    }
    if (!selected) await sleep(500)
  }
  if (!selected) throw new Error('O seletor não ofereceu a pasta esperada; veja picker.xml.')
  let picked
  for (let n = 0; n < 30 && !picked; n++) {
    picked = await run('window.__runasSafResult')
    if (picked) break
    // O Android pede uma confirmação adicional depois de “Usar esta pasta”.
    try {
      adb('shell', 'uiautomator', 'dump', '/sdcard/runas-saf-window.xml')
      const xml = adb('shell', 'cat', '/sdcard/runas-saf-window.xml')
      await writeFile(join(output, 'confirmation.xml'), xml)
      const node = (xml.match(/<node\b[^>]*>/g) ?? []).find(n => /resource-id="android:id\/button1"/.test(n) && n.includes('enabled="true"'))
      const bounds = node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
      if (bounds) {
        const [, x1, y1, x2, y2] = bounds.map(Number)
        adb('shell', 'input', 'tap', String(Math.round((x1 + x2) / 2)), String(Math.round((y1 + y2) / 2)))
      }
    } catch { /* a confirmação pode já ter fechado */ }
    await sleep(300)
  }
  if (picked?.error) throw new Error(picked.error)
  const vault = picked?.value?.vault
  if (vault?.mode !== 'saf' || vault.name !== basename(path) || !vault.path.startsWith('content://')) throw new Error('O seletor abriu outro cofre: ' + JSON.stringify(picked))
  result.readOnlyOnOpen = vault.readOnly
  if (!vault.readOnly) throw new Error('Um cofre existente deve abrir em somente leitura.')
  const changed = await run(`window.Capacitor.Plugins.RunasVault.setWritable({writable:${writable === 'true'}})`)
  if (changed.vault.readOnly !== (writable !== 'true')) throw new Error('O modo de gravação não foi lembrado.')
  result.vault = changed.vault
  result.allFilesAccess = access.granted
  result.ok = true
  // SharedPreferences.apply termina a gravação em disco antes da reinicialização que vem no workflow.
  adb('shell', 'input', 'keyevent', 'KEYCODE_HOME')
  await sleep(1000)
} catch (error) {
  result.error = String(error.stack ?? error)
} finally {
  for (const item of pending.values()) clearTimeout(item.timer)
  socket?.close()
  await writeFile(join(output, 'saf-picker.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
}
if (!result.ok) process.exit(1)
