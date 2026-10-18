// Smoke do cofre real no emulador (C8, docs/adr/0015-android.md): o equivalente Android do `--smoke --write` do
// desktop para o cofre, mais os spikes da etapa 2 (teclado no CodeMirror e um cofre de 5 mil notas).
// Uso: node mobile/tests/vault-smoke.cdp.mjs <endpoint devtools> <pasta de saída> <cofre no aparelho> <cofre local>
// O APK de depuração abre o cofre pelo extra `runasVault` (só em APK depurável).
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join, relative } from 'node:path'

const endpoint = process.argv[2] ?? 'http://127.0.0.1:9224'
const output = process.argv[3] ?? '/tmp/runas-android-vault'
const deviceVault = process.argv[4] ?? '/sdcard/Documents/cofre-smoke'
const localVault = process.argv[5] ?? 'desktop/tests/cofre-exemplo'
await mkdir(output, { recursive: true })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const adb = (...args) => execFileSync('adb', args, { timeout: 60000, maxBuffer: 64 * 1024 * 1024 }).toString()
const result = { checks: {}, metrics: {}, errors: [] }
const check = (name, ok, detail) => { result.checks[name] = ok ? true : { ok: false, detail }; if (!ok) console.error('FALHOU', name, detail ?? '') }

async function connect() {
  let page
  for (let n = 0; n < 150 && !page; n++) {
    try { page = (await fetch(endpoint + '/json').then(r => r.json())).find(t => t.type === 'page' && t.webSocketDebuggerUrl) } catch { /* o WebView ainda está subindo */ }
    if (!page) await sleep(300)
  }
  if (!page) throw new Error('O WebView depurável não abriu.')
  const socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  let sequence = 0
  const pending = new Map()
  socket.onmessage = event => {
    const message = JSON.parse(event.data)
    if (message.method === 'Runtime.exceptionThrown') result.errors.push(message.params?.exceptionDetails?.exception?.description ?? 'exceção')
    if (!message.id) return
    const action = pending.get(message.id)
    pending.delete(message.id)
    clearTimeout(action?.timer)
    if (message.error) action?.reject(new Error(message.error.message))
    else action?.resolve(message.result)
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence
    const timer = setTimeout(() => { if (pending.delete(id)) reject(new Error('Tempo excedido: ' + method)) }, 60000)
    pending.set(id, { resolve, reject, timer })
    socket.send(JSON.stringify({ id, method, params }))
  })
  await send('Runtime.enable')
  const run = async expression => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails))
    return r.result?.value
  }
  const until = async (expression, tries = 300) => {
    for (let n = 0; n < tries; n++) {
      // A espera só precisa da condição: serializar um nó DOM pelo CDP percorre referências do React.
      const value = await run(`(()=>{try{return Boolean(${expression})}catch{return false}})()`)
      if (value) return value
      await sleep(100)
    }
    throw new Error('Não aconteceu: ' + expression)
  }
  return { run, until, close: () => socket.close() }
}

async function localFiles(dir) {
  const out = []
  const walk = async (folder) => {
    for (const item of await readdir(folder, { withFileTypes: true })) {
      if (item.name.startsWith('.')) continue
      const full = join(folder, item.name)
      if (item.isDirectory()) await walk(full)
      else if (item.isFile()) out.push(relative(dir, full).split('\\').join('/'))
    }
  }
  await walk(dir)
  return out.sort()
}

// Chama o plugin pela ponte do Capacitor; erro vira `{ error }` (para conferir as recusas).
const call = (method, args = {}) => `window.Capacitor.Plugins.RunasVault.${method}(${JSON.stringify(args)}).then(v => ({ ok: v ?? null }), e => ({ error: String(e && e.message || e) }))`

const page = await connect()
const { run, until } = page
try {
  // ---------- O cofre abre e a interface lê ----------
  await until(`window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.RunasVault`)
  const current = await run(call('current'))
  check('cofre aberto e gravável', current.ok?.vault?.path === deviceVault && current.ok.vault.readOnly === false, current)
  const expected = await localFiles(localVault)
  // O plugin fica disponível antes de o VaultProvider terminar a leitura e ligar sua observação.
  await run(`location.hash = '#/config'; true`)
  await until(`document.body.innerText.includes(${JSON.stringify(`${expected.filter(p => p.endsWith('.md')).length} notas Markdown no índice`)})`)
  const listed = await run(call('list', { prefix: '' }))
  const paths = (listed.ok?.entries ?? []).map(e => e.path).sort()
  check('lista igual à do disco', JSON.stringify(paths) === JSON.stringify(expected), { device: paths.length, local: expected.length, missing: expected.filter(p => !paths.includes(p)).slice(0, 5) })
  const sample = expected.find(p => p.endsWith('.md'))
  const read = await run(call('read', { paths: [sample, 'nao-existe.md'] }))
  check('lê o texto sem mudar um byte', read.ok?.texts?.[sample] === await readFile(join(localVault, sample), 'utf8') && !('nao-existe.md' in (read.ok?.texts ?? {})), sample)

  // ---------- Gravação segura ----------
  const created = await run(call('write', { path: 'Notas/Smoke.md', content: '# Smoke\n', expected: null }))
  check('cria', Boolean(created.ok?.mtime), created)
  const again = await run(call('write', { path: 'Notas/Smoke.md', content: 'x', expected: null }))
  check('criar recusa se existe', /Já existe/.test(again.error ?? ''), again)
  const updated = await run(call('write', { path: 'Notas/Smoke.md', content: '# Smoke\nlinha\n', expected: { mtime: created.ok.mtime, size: created.ok.size } }))
  check('grava com a versão lida', Boolean(updated.ok?.mtime), updated)
  adb('shell', `echo "do Obsidian" > ${deviceVault}/Notas/Smoke.md`)
  await sleep(1200)
  const conflict = await run(call('write', { path: 'Notas/Smoke.md', content: 'minha', expected: { mtime: updated.ok.mtime, size: updated.ok.size } }))
  check('recusa se mudou fora do app', /mudou fora do app/.test(conflict.error ?? ''), conflict)
  check('nada se perde', adb('shell', 'cat', `${deviceVault}/Notas/Smoke.md`).trim() === 'do Obsidian')
  const hidden = await run(call('write', { path: '.obsidian/app.json', content: '{}' }))
  check('não grava em pasta oculta', /ocultos/.test(hidden.error ?? ''), hidden)
  const outside = await run(call('read', { paths: ['../fora.md'] }))
  check('não sai do cofre', /fora do cofre/.test(outside.error ?? ''), outside)
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg=='
  await run(call('writeBinary', { path: 'Notas/Anexos/smoke.png', base64: png, expected: null }))
  const back = await run(call('readBinary', { path: 'Notas/Anexos/smoke.png' }))
  check('anexo ida e volta', back.ok?.base64 === png, back)
  const tmp = adb('shell', 'ls', '-a', `${deviceVault}/Notas`)
  check('sem temporários', !/runas-tmp/.test(tmp), tmp)

  // ---------- Renomear, lixeira, backup, snippet ----------
  const renamed = await run(call('rename', { from: 'Notas/Smoke.md', to: 'Notas/Smoke renomeada.md' }))
  check('renomeia', renamed.ok !== undefined && adb('shell', 'ls', `${deviceVault}/Notas`).includes('Smoke renomeada.md'), renamed)
  await run(call('trash', { path: 'Notas/Smoke renomeada.md' }))
  const trash = await run(call('listTrash'))
  check('vai para a lixeira .trash', (trash.ok?.entries ?? []).some(e => e.path === '.trash/Smoke renomeada.md'), trash)
  const restored = await run(call('restoreTrash', { path: '.trash/Smoke renomeada.md', target: 'Notas/Smoke.md' }))
  check('volta da lixeira', Boolean(restored.ok?.path), restored)
  const backup = await run(call('backup'))
  const backups = await run(call('listBackups'))
  check('backup', backup.ok?.files > 0 && (backups.ok?.backups ?? []).length > 0, backup)
  const snippet = await run(call('installSnippet', { css: 'body{}' }))
  check('snippet', snippet.ok?.path === '.obsidian/snippets/runas-codex.css', snippet)

  // ---------- Mudança feita fora do app chega à interface ----------
  await run(`window.__runasChanges = []; window.Capacitor.Plugins.RunasVault.addListener('change', d => window.__runasChanges.push(...d.changes)); true`)
  adb('shell', `echo "nova do Obsidian" > ${deviceVault}/Notas/Externa.md`)
  const seen = await until(`window.__runasChanges.find(c => c.type === 'changed' && c.entry.path === 'Notas/Externa.md')`, 150).catch(() => null)
  check('observa mudanças de fora', Boolean(seen), await run('window.__runasChanges'))

  // ---------- A interface com o cofre real ----------
  // O aviso nativo chega antes de a leitura assíncrona atualizar o índice. Abre pela lista depois que ele aparecer,
  // como um toque do usuário, em vez de navegar para uma nota que a interface ainda está recebendo.
  await run(`location.hash = '#/notas'; true`)
  await until(`document.querySelector('[data-note-path="Notas/Externa.md"]')`, 150)
  await run(`document.querySelector('[data-note-path="Notas/Externa.md"]').click(); true`)
  const shown = await until(`document.body.innerText.includes('nova do Obsidian')`, 150).catch(() => false)
  check('a nota de fora aparece no app', Boolean(shown), await run(`({ hash: location.hash, status: document.querySelector('.editor-status')?.textContent, body: document.body.innerText.slice(-5000) })`))
  const image = await run(`(()=>{const u=window.Capacitor.convertFileSrc(${JSON.stringify(deviceVault + '/Notas/Anexos/smoke.png')}); return fetch(u).then(r=>r.ok && r.headers.get('content-type')).catch(e=>String(e))})()`)
  check('anexo carrega na interface', typeof image === 'string' && image.startsWith('image/'), image)

  // ---------- Spike: teclado do Android no CodeMirror ----------
  // As chamadas diretas acima não passam pelo VaultProvider. Uma nota nova de fora chega ao índice com a versão
  // atual; reutilizar Smoke.md depois de restaurá-la testava uma versão antiga, que o plugin deve mesmo recusar.
  adb('shell', `echo '# Teclado' > ${deviceVault}/Notas/Teclado.md`)
  await until(`window.__runasChanges.some(c => c.type === 'changed' && c.entry.path === 'Notas/Teclado.md')`, 150)
  await until(`document.querySelector('[data-note-path="Notas/Teclado.md"]')`, 150)
  await run(`document.querySelector('[data-note-path="Notas/Teclado.md"]').click(); true`)
  await until(`document.querySelector('.editor-status')?.getAttribute('title') === 'Notas/Teclado.md'`, 150)
  await until(`[...document.querySelectorAll('[role=tab]')].find(t => /Editar/.test(t.textContent))`, 150)
  await run(`[...document.querySelectorAll('[role=tab]')].find(t => /Editar/.test(t.textContent)).click(); true`)
  await until(`document.querySelector('.cm-content')`, 150)
  await run(`(()=>{const c=document.querySelector('.cm-content'); c.focus(); const r=document.createRange(); r.selectNodeContents(c); r.collapse(false); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return true})()`)
  await until(`document.activeElement === document.querySelector('.cm-content')`)
  // Dá ao Android tempo para ligar a conexão do teclado antes da primeira tecla.
  await sleep(1000)
  const typedAt = Date.now()
  let prefix = ''
  let typed = true
  // `input text` manda uma rajada de key events sem esperar o WebView. Cada tecla continua vindo do Android,
  // mas só envia a seguinte quando o CodeMirror processou a anterior (a métrica inclui essa cadência).
  for (const key of 'teclado Android') {
    adb('shell', 'input', 'text', key === ' ' ? '%s' : key)
    prefix += key
    if (!await until(`document.querySelector('.cm-content').innerText.includes(${JSON.stringify(prefix)})`, 100).catch(() => false)) {
      typed = false
      break
    }
  }
  result.metrics.keyboardMs = Date.now() - typedAt
  check('CodeMirror recebe o teclado do Android', Boolean(typed))
  // Espera a gravação real depois da pausa na digitação, inclusive num emulador mais lento.
  let saved = ''
  for (let n = 0; n < 150; n++) {
    saved = adb('shell', 'cat', `${deviceVault}/Notas/Teclado.md`)
    if (saved.includes('teclado Android')) break
    await sleep(100)
  }
  check('o texto digitado é gravado', saved.includes('teclado Android'), { disk: saved, status: await run(`document.querySelector('.editor-status')?.textContent`) })
} catch (error) {
  result.errors.push(String(error && error.stack || error))
} finally {
  page.close()
}

result.ok = result.errors.length === 0 && Object.values(result.checks).every(v => v === true)
await writeFile(join(output, 'vault-smoke.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
if (!result.ok) process.exit(1)
